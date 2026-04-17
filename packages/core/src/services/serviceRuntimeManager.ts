/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptions,
} from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Config } from '../config/config.js';

const SERVICE_CONFIG_FILENAME = 'services.json';
const MAX_LOG_LINES = 2000;
const DEFAULT_MAX_RUNNING_SERVICES = 1;
const RAPID_CRASH_WINDOW_MS = 30_000; // If restart crashes within 30s, escalate to SubLM
const LOG_VARIABLES_DIR = 'log-variables';

/**
 * Resolve a $LOG_xxx variable name to its actual file path.
 * Returns the resolved path if it matches the pattern, or null otherwise.
 */
export function resolveLogVariable(variableName: string, projectTempDir: string): string | null {
  const match = variableName.match(/^\$?(LOG_[A-Z0-9_-]+_\d+)$/);
  if (!match) return null;
  return path.join(projectTempDir, LOG_VARIABLES_DIR, `${match[1]}.log`);
}

export interface LogVariableRef {
  variableName: string;
  filePath: string;
  lineCount: number;
}

export type ServiceAlertLevel = 'info' | 'warning' | 'error';

export interface ServiceAlertEvent {
  level: ServiceAlertLevel;
  message: string;
}

export interface ServiceDefinition {
  name: string;
  command: string;
  cwd?: string;
  autoStart?: boolean;
  watchPatterns?: string[];
  stopInputs?: string[];
}

interface ServiceState {
  definition: ServiceDefinition;
  child?: ChildProcessWithoutNullStreams;
  pid?: number;
  startedAt?: number;
  logs: string[];
  followLogs: boolean;
  notificationsEnabled: boolean;
  expectedStop: boolean;
  activeAlertStartIndex: number | null;
  hasNotifiedForCurrentAlert: boolean;
  lastAlertAt?: number;
  pendingAlertPrompt: boolean;
  remindAlertAt?: number;
  lastExit?: {
    code: number | null;
    signal: NodeJS.Signals | null;
    at: number;
  };
}

export interface ServiceListItem {
  name: string;
  running: boolean;
  pid?: number;
  autoStart: boolean;
  cwd?: string;
  command: string;
  watchPatterns: string[];
  followLogs: boolean;
  notificationsEnabled: boolean;
  hasPendingAlert: boolean;
}

export interface ServiceAlertSnapshot {
  hasAlert: boolean;
  alertStartedAtLine: number;
  totalLinesFromAlert: number;
  errorLinesFromAlert: number;
}

type AlertMode = 'all' | 'errors';

export interface LogPatternRule {
  id: string;
  pattern: string;
  action: 'suppress' | 'analyze' | 'auto-fix';
  description: string;
  createdAt: number;
  appliedCount?: number;
}

interface PersistedServiceConfig {
  maxRunningServices: number;
  services: ServiceDefinition[];
  logPatternRules?: Record<string, LogPatternRule[]>;
}

function isWindows(): boolean {
  return process.platform === 'win32';
}

async function runCommand(
  command: string,
  args: string[],
  options: SpawnOptions,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, options);
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code ?? 'null'}`));
      }
    });
  });
}

export class ServiceRuntimeManager {
  private static instances = new Map<string, ServiceRuntimeManager>();
  private static shutdownHooksRegistered = false;

  private static registerShutdownHooks(): void {
    if (ServiceRuntimeManager.shutdownHooksRegistered) {
      return;
    }

    ServiceRuntimeManager.shutdownHooksRegistered = true;

    process.on('beforeExit', () => {
      for (const manager of ServiceRuntimeManager.instances.values()) {
        void manager.stopAllServicesForHostShutdown();
      }
    });

    process.on('exit', () => {
      for (const manager of ServiceRuntimeManager.instances.values()) {
        manager.forceKillAllServices();
      }
    });

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.on(signal, () => {
        for (const manager of ServiceRuntimeManager.instances.values()) {
          void manager.stopAllServicesForHostShutdown();
        }
      });
    }
  }

  static forConfig(config: Config): ServiceRuntimeManager {
    ServiceRuntimeManager.registerShutdownHooks();
    const root = config.getProjectRoot();
    let manager = ServiceRuntimeManager.instances.get(root);
    if (!manager) {
      manager = new ServiceRuntimeManager(config);
      ServiceRuntimeManager.instances.set(root, manager);
    }
    return manager;
  }

  private readonly services = new Map<string, ServiceState>();
  private notifier?: (event: ServiceAlertEvent) => void;
  private initialized = false;
  private maxRunningServices = DEFAULT_MAX_RUNNING_SERVICES;
  private logPatternRules = new Map<string, LogPatternRule[]>();

  private constructor(private readonly config: Config) {}

  attachNotifier(notifier?: (event: ServiceAlertEvent) => void): void {
    this.notifier = notifier;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const { services, maxRunningServices, logPatternRules } = await this.loadConfig();
    this.maxRunningServices = maxRunningServices;
    
    if (logPatternRules) {
      for (const [serviceName, rules] of Object.entries(logPatternRules)) {
        this.logPatternRules.set(serviceName, rules);
      }
    }

    for (const definition of services) {
      const normalized = this.normalizeDefinition(definition);
      this.services.set(normalized.name, {
        definition: normalized,
        logs: [],
        followLogs: false,
        notificationsEnabled: true,
        expectedStop: false,
        activeAlertStartIndex: null,
        hasNotifiedForCurrentAlert: false,
        lastAlertAt: undefined,
        pendingAlertPrompt: false,
        remindAlertAt: undefined,
      });
    }

    this.initialized = true;

    for (const state of this.services.values()) {
      if (state.definition.autoStart) {
        try {
          await this.startService(state.definition.name);
        } catch (error) {
          this.emit({
            level: 'error',
            message: `[service/${state.definition.name}] auto-start failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      }
    }
  }

  getMaxRunningServices(): number {
    return this.maxRunningServices;
  }

  async registerService(
    definition: ServiceDefinition,
    options?: { startNow?: boolean },
  ): Promise<void> {
    const normalized = this.normalizeDefinition(definition);
    const prevState = this.services.get(normalized.name);

    if (prevState?.child) {
      await this.stopService(normalized.name);
    }

    this.services.set(normalized.name, {
      definition: normalized,
      logs: prevState?.logs ?? [],
      followLogs: prevState?.followLogs ?? false,
      notificationsEnabled: prevState?.notificationsEnabled ?? true,
      expectedStop: false,
      activeAlertStartIndex: prevState?.activeAlertStartIndex ?? null,
      hasNotifiedForCurrentAlert: prevState?.hasNotifiedForCurrentAlert ?? false,
      lastAlertAt: prevState?.lastAlertAt,
      pendingAlertPrompt: prevState?.pendingAlertPrompt ?? false,
      remindAlertAt: prevState?.remindAlertAt,
      lastExit: prevState?.lastExit,
    });

    await this.saveConfig();

    if (options?.startNow) {
      await this.startService(normalized.name);
    }
  }

  async removeService(name: string): Promise<boolean> {
    const state = this.services.get(name);
    if (!state) {
      return false;
    }

    if (state.child) {
      await this.stopService(name);
    }

    this.services.delete(name);
    await this.saveConfig();
    return true;
  }

  getService(name: string): ServiceListItem | undefined {
    const state = this.services.get(name);
    if (!state) {
      return undefined;
    }
    return this.toListItem(state);
  }

  listServices(): ServiceListItem[] {
    return Array.from(this.services.values())
      .map((state) => this.toListItem(state))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async startService(name: string): Promise<void> {
    const state = this.requireState(name);
    if (state.child) {
      return;
    }

    // Starting a new process should begin a fresh alert window.
    state.activeAlertStartIndex = null;
    state.hasNotifiedForCurrentAlert = false;
    state.lastAlertAt = undefined;
    state.pendingAlertPrompt = false;
    state.remindAlertAt = undefined;

    const runningCount = Array.from(this.services.values()).filter(
      (svc) => Boolean(svc.child),
    ).length;

    if (runningCount >= this.maxRunningServices) {
      throw new Error(
        `Only ${this.maxRunningServices} service(s) can run at the same time. ` +
          `Edit ${this.getConfigPath()} and increase maxRunningServices if you want to run more.`,
      );
    }

    const resolvedCwd = this.resolveCwd(state.definition.cwd);
    const child = spawn(state.definition.command, {
      cwd: resolvedCwd,
      shell: true,
      stdio: 'pipe',
      env: process.env,
      windowsHide: true,
    });

    state.child = child;
    state.pid = child.pid;
    state.startedAt = Date.now();
    state.expectedStop = false;

    child.stdout.on('data', (chunk: Buffer) => {
      this.handleOutput(name, 'stdout', chunk.toString());
    });

    child.stderr.on('data', (chunk: Buffer) => {
      this.handleOutput(name, 'stderr', chunk.toString());
    });

    child.on('error', (error) => {
      this.emit({
        level: 'error',
        message: `[service/${name}] process error: ${error.message}`,
      });
    });

    child.on('exit', (code, signal) => {
      const latest = this.services.get(name);
      if (!latest) {
        return;
      }

      const exitedAt = Date.now();
      const previousExit = latest.lastExit;

      latest.child = undefined;
      latest.pid = undefined;
      latest.startedAt = undefined;
      latest.lastExit = {
        code,
        signal,
        at: exitedAt,
      };

      const abnormal = !latest.expectedStop && (code !== 0 || signal !== null);
      latest.expectedStop = false;

      if (abnormal) {
        this.activateAlertIfNeeded(name, `abnormal-exit code=${code ?? 'null'} signal=${signal ?? 'null'}`);

        // Auto-restart logic: if the previous exit was recent (rapid crash), escalate to SubLM
        const isRapidCrash = previousExit && (exitedAt - previousExit.at) < RAPID_CRASH_WINDOW_MS;

        if (isRapidCrash) {
          // Rapid crash detected — don't auto-restart, send logs for SubLM analysis
          this.emit({
            level: 'error',
            message: `[service/${name}] rapid crash detected (two exits within ${RAPID_CRASH_WINDOW_MS / 1000}s). ` +
              `Auto-restart disabled. Please analyze logs with SubLM:\n` +
              `Use service_manage tool with action "read-alert-logs" for service "${name}" to review, ` +
              `then use task tool to spawn a SubAgent for log analysis.`,
          });
        } else {
          // First abnormal exit — auto-restart
          this.emit({
            level: 'warning',
            message: `[service/${name}] abnormal exit detected. Auto-restarting...`,
          });
          // Delayed restart to avoid tight loops
          setTimeout(() => {
            void this.startService(name).catch((err) => {
              this.emit({
                level: 'error',
                message: `[service/${name}] auto-restart failed: ${err instanceof Error ? err.message : String(err)}`,
              });
            });
          }, 2000);
        }
      }
    });

    this.emit({
      level: 'info',
      message: `[service/${name}] started (pid ${child.pid ?? 'unknown'})`,
    });
  }

  async stopService(name: string): Promise<void> {
    const state = this.requireState(name);
    if (!state.child) {
      return;
    }

    const child = state.child;
    const pid = child.pid;
    state.expectedStop = true;

    const gracefulStopped = await this.tryGracefulStopInput(state, child);
    if (!gracefulStopped) {
      await this.terminateProcess(child, pid);
    }

    this.emit({
      level: 'info',
      message: `[service/${name}] stopped`,
    });
  }

  async restartService(name: string): Promise<void> {
    await this.stopService(name);
    await this.startService(name);
  }

  setFollowLogs(name: string, enabled: boolean): void {
    const state = this.requireState(name);
    state.followLogs = enabled;
  }

  setNotificationsEnabled(name: string, enabled: boolean): void {
    const state = this.requireState(name);
    state.notificationsEnabled = enabled;
  }

  sendInput(name: string, input: string): void {
    const state = this.requireState(name);
    if (!state.child?.stdin.writable) {
      throw new Error(`Service "${name}" is not running or stdin is closed.`);
    }

    this.appendDecoratedLogLine(state, 'stdin', `send: ${input}`);
    state.child.stdin.write(`${input}\n`);
  }

  getLogs(name: string, tail = 200): string[] {
    const state = this.requireState(name);
    const rawLogs = state.logs.slice(-Math.max(1, tail));
    // Filter out lines matching "suppress" pattern rules
    return this.filterSuppressedLines(name, rawLogs);
  }

  getServiceNames(): string[] {
    return Array.from(this.services.keys()).sort();
  }

  getAlertSnapshot(name: string): ServiceAlertSnapshot {
    const state = this.requireState(name);
    if (state.activeAlertStartIndex === null) {
      return {
        hasAlert: false,
        alertStartedAtLine: 0,
        totalLinesFromAlert: 0,
        errorLinesFromAlert: 0,
      };
    }

    const lines = state.logs.slice(state.activeAlertStartIndex);
    return {
      hasAlert: true,
      alertStartedAtLine: state.activeAlertStartIndex + 1,
      totalLinesFromAlert: lines.length,
      errorLinesFromAlert: lines.filter((line) => this.isErrorDecoratedLine(line)).length,
    };
  }

  getLatestAlertServiceName(): string | undefined {
    let latest: { name: string; at: number } | undefined;

    for (const [name, state] of this.services.entries()) {
      if (state.activeAlertStartIndex === null) {
        continue;
      }
      const at = state.lastAlertAt ?? 0;
      if (!latest || at > latest.at) {
        latest = { name, at };
      }
    }

    return latest?.name;
  }

  readAlertLogs(name: string, mode: AlertMode = 'all'): string[] {
    const state = this.requireState(name);
    if (state.activeAlertStartIndex === null) {
      return [];
    }

    let lines = state.logs.slice(state.activeAlertStartIndex);
    // Filter out lines matching "suppress" pattern rules
    lines = this.filterSuppressedLines(name, lines);
    if (mode === 'errors') {
      return lines.filter((line) => this.isErrorDecoratedLine(line));
    }
    return lines;
  }

  clearAlert(name: string): void {
    const state = this.requireState(name);
    state.activeAlertStartIndex = null;
    state.hasNotifiedForCurrentAlert = false;
    state.pendingAlertPrompt = false;
    state.remindAlertAt = undefined;
  }

  scheduleAlertReprompt(name: string, delayMs: number): void {
    const state = this.requireState(name);
    if (state.activeAlertStartIndex === null) {
      return;
    }

    state.remindAlertAt = Date.now() + Math.max(1000, delayMs);
  }

  consumePendingAlertPromptServiceName(): string | undefined {
    const now = Date.now();
    let latest: { name: string; at: number } | undefined;

    for (const [name, state] of this.services.entries()) {
      if (state.activeAlertStartIndex === null) {
        continue;
      }

      if (state.remindAlertAt && state.remindAlertAt <= now) {
        state.pendingAlertPrompt = true;
        state.remindAlertAt = undefined;
      }

      if (!state.pendingAlertPrompt) {
        continue;
      }

      const at = state.lastAlertAt ?? 0;
      if (!latest || at > latest.at) {
        latest = { name, at };
      }
    }

    if (!latest) {
      return undefined;
    }

    const state = this.services.get(latest.name);
    if (state) {
      state.pendingAlertPrompt = false;
    }

    return latest.name;
  }

  async addLogPatternRule(
    serviceName: string,
    rule: {
      pattern: string;
      action: 'suppress' | 'analyze' | 'auto-fix';
      description: string;
    },
  ): Promise<void> {
    this.requireState(serviceName);

    const newRule: LogPatternRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      pattern: rule.pattern,
      action: rule.action,
      description: rule.description,
      createdAt: Date.now(),
      appliedCount: 0,
    };

    const rules = this.logPatternRules.get(serviceName) ?? [];
    rules.push(newRule);
    this.logPatternRules.set(serviceName, rules);

    await this.saveConfig();

    this.emit({
      level: 'info',
      message: `[service/${serviceName}] added log pattern rule: ${rule.pattern} (action: ${rule.action})`,
    });
  }

  getLogPatternRules(serviceName: string): LogPatternRule[] {
    return this.logPatternRules.get(serviceName) ?? [];
  }

  async removeLogPatternRule(serviceName: string, ruleId: string): Promise<boolean> {
    const rules = this.logPatternRules.get(serviceName);
    if (!rules) {
      return false;
    }

    const index = rules.findIndex((r) => r.id === ruleId);
    if (index >= 0) {
      rules.splice(index, 1);
      if (rules.length === 0) {
        this.logPatternRules.delete(serviceName);
      }
      await this.saveConfig();
      return true;
    }

    return false;
  }

  checkLogLineAgainstPatterns(serviceName: string, line: string): LogPatternRule[] {
    const rules = this.logPatternRules.get(serviceName) ?? [];
    const matched: LogPatternRule[] = [];

    for (const rule of rules) {
      try {
        const regex = new RegExp(rule.pattern);
        if (regex.test(line)) {
          matched.push(rule);
          rule.appliedCount = (rule.appliedCount ?? 0) + 1;
        }
      } catch {
        // ignore invalid regex patterns
      }
    }

    return matched;
  }

  /**
   * Store log lines into a temp file and return a variable reference.
   * The main LM sees only the variable name; SubLM or file read tool can access full text.
   */
  async storeLogsAsVariable(serviceName: string, lines: string[]): Promise<LogVariableRef> {
    const varDir = path.join(this.config.storage.getProjectTempDir(), LOG_VARIABLES_DIR);
    await fs.mkdir(varDir, { recursive: true });

    const varId = `LOG_${serviceName.toUpperCase()}_${Date.now()}`;
    const filePath = path.join(varDir, `${varId}.log`);
    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');

    return {
      variableName: `$${varId}`,
      filePath,
      lineCount: lines.length,
    };
  }

  /**
   * Get logs as a variable reference instead of full content.
   * Returns a summary string for the LM with the variable name.
   */
  async getLogsAsVariable(name: string, tail = 200): Promise<string> {
    const lines = this.getLogs(name, tail);
    if (lines.length === 0) {
      return `[No logs for ${name}]`;
    }

    const ref = await this.storeLogsAsVariable(name, lines);
    return `[Log content stored as ${ref.variableName} (${ref.lineCount} lines)]\n` +
      `To read full logs, use read_file with absolute_path: ${ref.variableName}\n` +
      `To analyze with SubLM, reference ${ref.variableName} in filePaths`;
  }

  /**
   * Get alert logs as a variable reference.
   */
  async getAlertLogsAsVariable(name: string, mode: AlertMode = 'all'): Promise<string> {
    const lines = this.readAlertLogs(name, mode);
    if (lines.length === 0) {
      return `[No alert logs for ${name}]`;
    }

    const ref = await this.storeLogsAsVariable(name, lines);
    return `[Alert log content stored as ${ref.variableName} (${ref.lineCount} lines, mode: ${mode})]\n` +
      `To read full logs, use read_file with absolute_path: ${ref.variableName}\n` +
      `To analyze with SubLM, reference ${ref.variableName} in filePaths`;
  }

  private emit(event: ServiceAlertEvent): void {
    this.notifier?.(event);
  }

  /**
   * Filter out log lines that match "suppress" pattern rules for a given service.
   * Lines matching suppress rules are hidden from LM analysis but remain in the raw log buffer.
   */
  private filterSuppressedLines(serviceName: string, lines: string[]): string[] {
    const rules = this.logPatternRules.get(serviceName) ?? [];
    const suppressRules = rules.filter(r => r.action === 'suppress');

    if (suppressRules.length === 0) {
      return lines;
    }

    const compiledRules = suppressRules
      .map(rule => {
        try {
          return { rule, regex: new RegExp(rule.pattern) };
        } catch {
          return null;
        }
      })
      .filter((item): item is { rule: LogPatternRule; regex: RegExp } => item !== null);

    return lines.filter(line => {
      for (const { rule, regex } of compiledRules) {
        if (regex.test(line)) {
          rule.appliedCount = (rule.appliedCount ?? 0) + 1;
          return false; // Suppress this line
        }
      }
      return true;
    });
  }

  private resolveCwd(cwd?: string): string {
    if (!cwd) {
      return this.config.getProjectRoot();
    }
    if (path.isAbsolute(cwd)) {
      return cwd;
    }
    return path.resolve(this.config.getProjectRoot(), cwd);
  }

  private handleOutput(
    name: string,
    stream: 'stdout' | 'stderr',
    chunk: string,
  ): void {
    const state = this.services.get(name);
    if (!state) {
      return;
    }

    const lines = chunk
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return;
    }

    for (const line of lines) {
      this.appendDecoratedLogLine(state, stream, line);

      if (state.followLogs && state.notificationsEnabled) {
        this.emit({
          level: 'info',
          message: `[service/${name}] ${line}`,
        });
      }

      const matchedPattern = this.matchesWatchPattern(
        state.definition.watchPatterns ?? [],
        line,
      );

      if (matchedPattern) {
        this.activateAlertIfNeeded(name, line);
      }
    }
  }

  private appendDecoratedLogLine(
    state: ServiceState,
    stream: 'stdout' | 'stderr' | 'stdin',
    line: string,
  ): void {
    const decorated = `[${new Date().toISOString()}][${stream}] ${line}`;
    state.logs.push(decorated);

    if (state.logs.length > MAX_LOG_LINES) {
      const overflow = state.logs.length - MAX_LOG_LINES;
      state.logs.splice(0, overflow);
      if (state.activeAlertStartIndex !== null) {
        state.activeAlertStartIndex = Math.max(
          0,
          state.activeAlertStartIndex - overflow,
        );
      }
    }
  }

  private async tryGracefulStopInput(
    state: ServiceState,
    child: ChildProcessWithoutNullStreams,
  ): Promise<boolean> {
    if (!child.stdin.writable) {
      return false;
    }

    const stopInputs = (state.definition.stopInputs ?? ['stop', 'end'])
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    for (const input of stopInputs) {
      this.appendDecoratedLogLine(state, 'stdin', `graceful-stop: ${input}`);
      child.stdin.write(`${input}\n`);

      const exited = await this.waitForExit(child, 1800);
      if (exited) {
        return true;
      }
    }

    return false;
  }

  private waitForExit(
    child: ChildProcessWithoutNullStreams,
    timeoutMs: number,
  ): Promise<boolean> {
    if (child.exitCode !== null || child.killed) {
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      const onExit = () => {
        clearTimeout(timer);
        child.off('exit', onExit);
        resolve(true);
      };

      const timer = setTimeout(() => {
        child.off('exit', onExit);
        resolve(child.exitCode !== null || child.killed);
      }, timeoutMs);

      child.once('exit', onExit);
    });
  }

  private async stopAllServicesForHostShutdown(): Promise<void> {
    const running = Array.from(this.services.values())
      .filter((state) => Boolean(state.child))
      .map((state) => state.definition.name);

    await Promise.allSettled(running.map((name) => this.stopService(name)));
  }

  private forceKillAllServices(): void {
    for (const state of this.services.values()) {
      try {
        state.child?.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
  }

  private activateAlertIfNeeded(name: string, sourceLine: string): void {
    const state = this.services.get(name);
    if (!state) {
      return;
    }

    if (state.activeAlertStartIndex === null) {
      state.activeAlertStartIndex = Math.max(0, state.logs.length - 1);
      state.hasNotifiedForCurrentAlert = false;
      state.pendingAlertPrompt = true;
      state.remindAlertAt = undefined;
    }
    state.lastAlertAt = Date.now();

    if (!state.notificationsEnabled || state.hasNotifiedForCurrentAlert) {
      return;
    }

    state.hasNotifiedForCurrentAlert = true;
    this.emit({
      level: 'warning',
      message: `[service/${name}] detected error signal: ${sourceLine}\nLogs were buffered from this point. The first alert will auto-open ask flow. You can also use /service alert ${name} manually.\nThen use /service analyze ${name} all or /service analyze ${name} errors.\nTip: Press \`+Tab to switch to Servers Log, then press again to return to Chat.`,
    });
  }

  private isErrorDecoratedLine(line: string): boolean {
    const lower = line.toLowerCase();
    return (
      lower.includes('[stderr]') ||
      lower.includes('error') ||
      lower.includes('warn') ||
      lower.includes('exception') ||
      lower.includes('fatal')
    );
  }

  private matchesWatchPattern(patterns: string[], line: string): boolean {
    if (patterns.length === 0) {
      return false;
    }

    return patterns.some((pattern) => {
      const normalized = pattern.trim();
      if (!normalized) {
        return false;
      }
      return line.toLowerCase().includes(normalized.toLowerCase());
    });
  }

  private normalizeDefinition(definition: ServiceDefinition): ServiceDefinition {
    const name = definition.name.trim();
    if (!name) {
      throw new Error('Service name is required.');
    }

    const command = definition.command.trim();
    if (!command) {
      throw new Error('Service command is required.');
    }

    const normalizedWatchPatterns = (definition.watchPatterns ?? [])
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0);

    const normalizedStopInputs = (definition.stopInputs ?? [])
      .map((input) => input.trim())
      .filter((input) => input.length > 0);

    return {
      name,
      command,
      cwd: definition.cwd?.trim() || undefined,
      autoStart: Boolean(definition.autoStart),
      watchPatterns: normalizedWatchPatterns,
      stopInputs: normalizedStopInputs,
    };
  }

  private toListItem(state: ServiceState): ServiceListItem {
    return {
      name: state.definition.name,
      running: Boolean(state.child),
      pid: state.pid,
      autoStart: Boolean(state.definition.autoStart),
      cwd: state.definition.cwd,
      command: state.definition.command,
      watchPatterns: state.definition.watchPatterns ?? [],
      followLogs: state.followLogs,
      notificationsEnabled: state.notificationsEnabled,
      hasPendingAlert: state.activeAlertStartIndex !== null,
    };
  }

  private requireState(name: string): ServiceState {
    const state = this.services.get(name);
    if (!state) {
      throw new Error(`Service "${name}" is not registered.`);
    }
    return state;
  }

  private async terminateProcess(
    child: ChildProcessWithoutNullStreams,
    pid?: number,
  ): Promise<void> {
    const waitForExit = new Promise<void>((resolve) => {
      child.once('exit', () => resolve());
    });

    try {
      if (pid) {
        if (isWindows()) {
          await runCommand('taskkill', ['/PID', String(pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
          });
        } else {
          try {
            process.kill(pid, 'SIGTERM');
          } catch {
            // ignore and continue waiting
          }
        }
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
    }

    await Promise.race([
      waitForExit,
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]);

    if (child.exitCode === null && !child.killed) {
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
      await Promise.race([
        waitForExit,
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
  }

  private getConfigPath(): string {
    return path.join(this.config.storage.getProjectDir(), SERVICE_CONFIG_FILENAME);
  }

  private async loadConfig(): Promise<PersistedServiceConfig> {
    const configPath = this.getConfigPath();
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content) as unknown;

      if (Array.isArray(parsed)) {
        return {
          maxRunningServices: DEFAULT_MAX_RUNNING_SERVICES,
          services: this.parseServiceDefinitions(parsed),
          logPatternRules: {},
        };
      }

      if (typeof parsed !== 'object' || parsed === null) {
        return {
          maxRunningServices: DEFAULT_MAX_RUNNING_SERVICES,
          services: [],
          logPatternRules: {},
        };
      }

      const obj = parsed as {
        maxRunningServices?: unknown;
        services?: unknown;
        logPatternRules?: unknown;
      };
      const max =
        typeof obj.maxRunningServices === 'number' && obj.maxRunningServices > 0
          ? Math.floor(obj.maxRunningServices)
          : DEFAULT_MAX_RUNNING_SERVICES;

      const rules = this.parseLogPatternRules(obj.logPatternRules);

      return {
        maxRunningServices: max,
        services: this.parseServiceDefinitions(
          Array.isArray(obj.services) ? obj.services : [],
        ),
        logPatternRules: rules,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          maxRunningServices: DEFAULT_MAX_RUNNING_SERVICES,
          services: [],
          logPatternRules: {},
        };
      }

      this.emit({
        level: 'warning',
        message: `[service] failed to load config: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });

      return {
        maxRunningServices: DEFAULT_MAX_RUNNING_SERVICES,
        services: [],
        logPatternRules: {},
      };
    }
  }

  private parseServiceDefinitions(input: unknown[]): ServiceDefinition[] {
    return input
      .filter((item): item is ServiceDefinition => {
        return (
          typeof item === 'object' &&
          item !== null &&
          'name' in item &&
          'command' in item
        );
      })
      .map((item) => ({
        name: String(item.name),
        command: String(item.command),
        cwd:
          typeof item.cwd === 'string' && item.cwd.trim().length > 0
            ? item.cwd
            : undefined,
        autoStart: Boolean(item.autoStart),
        watchPatterns: Array.isArray(item.watchPatterns)
          ? item.watchPatterns
              .filter((pattern): pattern is string => typeof pattern === 'string')
              .map((pattern) => pattern.trim())
              .filter((pattern) => pattern.length > 0)
          : ['WARN', 'ERROR'],
        stopInputs: Array.isArray(item.stopInputs)
          ? item.stopInputs
              .filter((input): input is string => typeof input === 'string')
              .map((input) => input.trim())
              .filter((input) => input.length > 0)
          : ['stop', 'end'],
      }));
  }

  private parseLogPatternRules(
    input: unknown,
  ): Record<string, LogPatternRule[]> {
    if (typeof input !== 'object' || input === null) {
      return {};
    }

    const result: Record<string, LogPatternRule[]> = {};

    for (const [serviceName, rules] of Object.entries(input)) {
      if (Array.isArray(rules)) {
        result[serviceName] = rules
          .filter((rule): rule is LogPatternRule => {
            return (
              typeof rule === 'object' &&
              rule !== null &&
              'id' in rule &&
              'pattern' in rule &&
              'action' in rule &&
              'description' in rule &&
              'createdAt' in rule &&
              typeof String(rule.id) === 'string' &&
              typeof String(rule.pattern) === 'string' &&
              ['suppress', 'analyze', 'auto-fix'].includes(String(rule.action)) &&
              typeof String(rule.description) === 'string' &&
              typeof Number(rule.createdAt) === 'number'
            );
          });
      }
    }

    return result;
  }

  private async saveConfig(): Promise<void> {
    const configPath = this.getConfigPath();
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    const rulesPayload: Record<string, LogPatternRule[]> = {};
    for (const [serviceName, rules] of this.logPatternRules.entries()) {
      rulesPayload[serviceName] = rules;
    }

    const payload: PersistedServiceConfig = {
      maxRunningServices: this.maxRunningServices,
      services: Array.from(this.services.values()).map((state) => state.definition),
      logPatternRules: rulesPayload,
    };

    await fs.writeFile(configPath, JSON.stringify(payload, null, 2), 'utf-8');
  }
}
