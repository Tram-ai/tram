/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type CommandContext,
  type MessageActionReturn,
  type SlashCommand,
  type SlashCommandActionReturn,
} from "./types.js";
import { CommandKind } from "./types.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { t } from "../../i18n/index.js";
import { ServiceRuntimeManager } from "@tram-ai/tram-core";

const DEFAULT_WATCH_PATTERNS = ["WARN", "ERROR"];

type AnalyzeMode = "all" | "errors";

function sanitizeToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_");
}

async function persistLogContext(
  context: CommandContext,
  serviceName: string,
  mode: AnalyzeMode,
  lines: string[],
): Promise<
  | {
      variableName: string;
      fileVariableName: string;
      filePath: string;
    }
  | undefined
> {
  const projectRoot = context.services.config?.getProjectRoot();
  if (!projectRoot) {
    return undefined;
  }

  const safeService = sanitizeToken(serviceName.toUpperCase());
  const safeMode = sanitizeToken(mode.toUpperCase());
  const variableName = `SERVICE_LOG_BLOB_${safeService}_${safeMode}`;
  const fileVariableName = `${variableName}_FILE`;

  const dirPath = path.join(projectRoot, ".tram", "tmp", "service-logs");
  await fs.mkdir(dirPath, { recursive: true });

  const fileName = `${sanitizeToken(serviceName)}-${mode}-${Date.now()}.log`;
  const filePath = path.join(dirPath, fileName);
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");

  return {
    variableName,
    fileVariableName,
    filePath,
  };
}

function splitArgs(raw: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const token = match[1] ?? match[2] ?? match[0];
    tokens.push(token.replace(/\\"/g, '"').replace(/\\'/g, "'"));
  }
  return tokens;
}

function helpText(): string {
  return [
    t("Manage persistent background services."),
    "",
    t("Usage:"),
    t("- /service list"),
    t(
      "- /service register <name> [--autostart] [--cwd <path>] [--watch WARN,ERROR] [--stop-inputs stop,end] -- <command>",
    ),
    t("- /service start <name>"),
    t("- /service stop <name>"),
    t("- /service restart <name>"),
    t("- /service remove <name>"),
    t("- /service log <name> [--tail <N>] [--follow]"),
    t("- /service follow <name>"),
    t("- /service unfollow <name>   (mute realtime notifications in chat)"),
    t("- /service alert <name>      (show buffered alert status)"),
    t("- /service analyze <name> [all|errors]   (display buffered alert logs)"),
    t("- /service pattern <name> [list|add|remove]   (manage log patterns)"),
    t("- /service send <name> <input>"),
  ].join("\n");
}

function ensureManager(context: CommandContext): ServiceRuntimeManager {
  const config = context.services.config;
  if (!config) {
    throw new Error(t("Config not loaded."));
  }
  return ServiceRuntimeManager.forConfig(config);
}

async function handleList(
  context: CommandContext,
): Promise<MessageActionReturn> {
  const manager = ensureManager(context);
  await manager.initialize();
  const list = manager.listServices();

  if (list.length === 0) {
    return {
      type: "message",
      messageType: "info",
      content: t(
        "No services registered. Use /service register ... to add one.\nCurrent max running services: {{maxRunningServices}}",
        {
          maxRunningServices: String(manager.getMaxRunningServices()),
        },
      ),
    };
  }

  const lines = list.map((svc) => {
    return t(
      "- {{runningStatus}} {{name}} | autoStart={{autoStart}} | pid={{pid}} | follow={{follow}} | notify={{notify}} | alert={{alert}} | cwd={{cwd}} | cmd={{command}}",
      {
        runningStatus: svc.running ? t("RUNNING") : t("STOPPED"),
        name: svc.name,
        autoStart: svc.autoStart ? t("yes") : t("no"),
        pid: String(svc.pid ?? "-"),
        follow: svc.followLogs ? t("on") : t("off"),
        notify: svc.notificationsEnabled ? t("on") : t("off"),
        alert: svc.hasPendingAlert ? t("pending") : t("none"),
        cwd: svc.cwd ?? ".",
        command: svc.command,
      },
    );
  });

  return {
    type: "message",
    messageType: "info",
    content: t(
      "Registered services ({{count}})\nMax running services: {{maxRunningServices}}\nTo change the limit manually, edit services.json in project storage.\n\n{{listLines}}",
      {
        count: String(list.length),
        maxRunningServices: String(manager.getMaxRunningServices()),
        listLines: lines.join("\n"),
      },
    ),
  };
}

async function handleRegister(
  context: CommandContext,
  args: string,
): Promise<MessageActionReturn> {
  const manager = ensureManager(context);
  await manager.initialize();

  const delimiter = args.indexOf(" -- ");
  if (delimiter < 0) {
    return {
      type: "message",
      messageType: "error",
      content: t(
        'Missing command after "--". Example: /service register api --autostart -- npm run dev',
      ),
    };
  }

  const optionsPart = args.slice(0, delimiter).trim();
  const commandPart = args.slice(delimiter + 4).trim();
  if (!commandPart) {
    return {
      type: "message",
      messageType: "error",
      content: t("Service command cannot be empty."),
    };
  }

  const tokens = splitArgs(optionsPart);
  const name = tokens.shift();
  if (!name) {
    return {
      type: "message",
      messageType: "error",
      content: t(
        "Service name is required. Example: /service register api -- npm run dev",
      ),
    };
  }

  let autoStart = false;
  let cwd: string | undefined;
  let watchPatterns = [...DEFAULT_WATCH_PATTERNS];
  let stopInputs: string[] = ["stop", "end"];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--autostart") {
      autoStart = true;
      continue;
    }

    if (token === "--no-autostart") {
      autoStart = false;
      continue;
    }

    if (token === "--cwd") {
      cwd = tokens[i + 1];
      if (!cwd) {
        return {
          type: "message",
          messageType: "error",
          content: t("--cwd requires a value."),
        };
      }
      i += 1;
      continue;
    }

    if (token === "--watch") {
      const value = tokens[i + 1];
      if (!value) {
        return {
          type: "message",
          messageType: "error",
          content: t("--watch requires a comma-separated value."),
        };
      }

      watchPatterns = value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      i += 1;
      continue;
    }

    if (token === "--stop-inputs") {
      const value = tokens[i + 1];
      if (!value) {
        return {
          type: "message",
          messageType: "error",
          content: t("--stop-inputs requires a comma-separated value."),
        };
      }

      stopInputs = value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      i += 1;
      continue;
    }

    return {
      type: "message",
      messageType: "error",
      content: t("Unknown option: {{option}}", {
        option: token,
      }),
    };
  }

  await manager.registerService(
    {
      name,
      command: commandPart,
      cwd,
      autoStart,
      watchPatterns,
      stopInputs,
    },
    { startNow: true },
  );

  return {
    type: "message",
    messageType: "info",
    content: t(
      'Service "{{name}}" registered and started.\nautoStart={{autoStart}}, watch={{watchPatterns}}',
      {
        name,
        autoStart: autoStart ? t("yes") : t("no"),
        watchPatterns: watchPatterns.join(", ") || t("(none)"),
      },
    ),
  };
}

async function handleSimpleAction(
  context: CommandContext,
  args: string,
  action: "start" | "stop" | "restart" | "remove" | "follow" | "unfollow",
): Promise<MessageActionReturn> {
  const manager = ensureManager(context);
  await manager.initialize();
  const name = args.trim();

  if (!name) {
    return {
      type: "message",
      messageType: "error",
      content: t("Service name is required for /service {{action}}.", {
        action,
      }),
    };
  }

  switch (action) {
    case "start":
      await manager.startService(name);
      return {
        type: "message",
        messageType: "info",
        content: t('Service "{{name}}" started.', { name }),
      };
    case "stop":
      await manager.stopService(name);
      return {
        type: "message",
        messageType: "info",
        content: t('Service "{{name}}" stopped.', { name }),
      };
    case "restart":
      await manager.restartService(name);
      return {
        type: "message",
        messageType: "info",
        content: t('Service "{{name}}" restarted.', { name }),
      };
    case "remove": {
      const removed = await manager.removeService(name);
      return {
        type: "message",
        messageType: removed ? "info" : "error",
        content: removed
          ? t('Service "{{name}}" removed.', { name })
          : t('Service "{{name}}" not found.', { name }),
      };
    }
    case "follow":
      manager.setNotificationsEnabled(name, true);
      manager.setFollowLogs(name, true);
      return {
        type: "message",
        messageType: "info",
        content: t('Service "{{name}}" realtime notifications enabled.', {
          name,
        }),
      };
    case "unfollow":
      manager.setFollowLogs(name, false);
      manager.setNotificationsEnabled(name, false);
      return {
        type: "message",
        messageType: "info",
        content: t(
          'Service "{{name}}" realtime notifications muted.\nErrors are still buffered. Use /service alert {{name}} to inspect buffered logs.',
          {
            name,
          },
        ),
      };
  }
}

async function handleLog(
  context: CommandContext,
  args: string,
): Promise<MessageActionReturn> {
  const manager = ensureManager(context);
  await manager.initialize();
  const tokens = splitArgs(args);
  const name = tokens.shift();

  if (!name) {
    return {
      type: "message",
      messageType: "error",
      content: t(
        "Service name is required. Usage: /service log <name> [--tail 200] [--follow]",
      ),
    };
  }

  let tail = 200;
  let follow = false;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--follow") {
      follow = true;
      continue;
    }
    if (token === "--tail") {
      const raw = tokens[i + 1];
      if (!raw) {
        return {
          type: "message",
          messageType: "error",
          content: t("--tail requires a number."),
        };
      }
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return {
          type: "message",
          messageType: "error",
          content: t("--tail must be a positive integer."),
        };
      }
      tail = parsed;
      i += 1;
      continue;
    }
    return {
      type: "message",
      messageType: "error",
      content: t("Unknown option for log: {{option}}", {
        option: token,
      }),
    };
  }

  if (follow) {
    manager.setNotificationsEnabled(name, true);
    manager.setFollowLogs(name, true);
  }

  const status = manager.getService(name);
  const logs = manager.getLogs(name, tail);

  return {
    type: "message",
    messageType: "info",
    content: t(
      "Service {{name}} ({{runningStatus}}, pid={{pid}})\nfollow={{followStatus}} notify={{notifyStatus}}\n\n{{logs}}",
      {
        name,
        runningStatus: status?.running ? t("RUNNING") : t("STOPPED"),
        pid: String(status?.pid ?? "-"),
        followStatus: status?.followLogs ? t("enabled") : t("disabled"),
        notifyStatus: status?.notificationsEnabled
          ? t("enabled")
          : t("disabled"),
        logs: logs.length > 0 ? logs.join("\n") : t("(no logs yet)"),
      },
    ),
  };
}

async function handleAlert(
  context: CommandContext,
  args: string,
): Promise<SlashCommandActionReturn> {
  const manager = ensureManager(context);
  await manager.initialize();
  const name = args.trim();

  if (!name) {
    return {
      type: "message",
      messageType: "error",
      content: t("Usage: /service alert <name>"),
    };
  }

  const snapshot = manager.getAlertSnapshot(name);
  if (!snapshot.hasAlert) {
    return {
      type: "message",
      messageType: "info",
      content: t('No pending alert buffer for service "{{name}}".', {
        name,
      }),
    };
  }

  return {
    type: "message",
    messageType: "info",
    content: t(
      'Service "{{name}}" has pending alerts.\nAlert started at line: {{startLine}}\nBuffered lines: {{bufferedLines}}\nError lines: {{errorLines}}\n\nUse /service analyze {{name}} all to analyze logs.\nUse /service analyze {{name}} errors to analyze error lines only.\nUse /service log {{name}} --tail 200 to inspect recent logs.',
      {
        name,
        startLine: String(snapshot.alertStartedAtLine),
        bufferedLines: String(snapshot.totalLinesFromAlert),
        errorLines: String(snapshot.errorLinesFromAlert),
      },
    ),
  };
}

async function handleAnalyze(
  context: CommandContext,
  args: string,
): Promise<SlashCommandActionReturn> {
  const manager = ensureManager(context);
  await manager.initialize();

  const [name, modeRaw] = splitArgs(args);
  if (!name) {
    return {
      type: "message",
      messageType: "error",
      content: t("Usage: /service analyze <name> [all|errors]"),
    };
  }

  const mode: AnalyzeMode = modeRaw === "errors" ? "errors" : "all";
  const snapshot = manager.getAlertSnapshot(name);
  if (!snapshot.hasAlert) {
    return {
      type: "message",
      messageType: "info",
      content: t('No pending alert logs for service "{{name}}".', {
        name,
      }),
    };
  }

  const lines = manager.readAlertLogs(name, mode);
  if (lines.length === 0) {
    manager.clearAlert(name);
    return {
      type: "message",
      messageType: "info",
      content: t(
        'No logs available in selected mode ({{mode}}) for service "{{name}}".',
        {
          mode,
          name,
        },
      ),
    };
  }

  let persistedContext:
    | {
        variableName: string;
        fileVariableName: string;
        filePath: string;
      }
    | undefined;
  try {
    persistedContext = await persistLogContext(context, name, mode, lines);
  } catch {
    persistedContext = undefined;
  }

  manager.clearAlert(name);

  const header = t(
    'Service "{{name}}" alert logs (mode: {{mode}}, {{count}} lines):',
    {
      name,
      mode,
      count: String(lines.length),
    },
  );

  if (persistedContext) {
    return {
      type: "message",
      messageType: "info",
      content: `${header}\n${t("Full logs saved to: {{filePath}}", { filePath: persistedContext.filePath })}\n\n${t("Preview (first 40 lines):")}\n${lines.slice(0, 40).join("\n")}`,
    };
  }

  return {
    type: "message",
    messageType: "info",
    content: `${header}\n\n${lines.join("\n")}`,
  };
}

async function handlePattern(
  context: CommandContext,
  args: string,
): Promise<SlashCommandActionReturn> {
  const manager = ensureManager(context);
  await manager.initialize();
  const tokens = splitArgs(args);
  const name = tokens.shift();
  const action = tokens.shift()?.toLowerCase();

  if (!name) {
    return {
      type: "message",
      messageType: "error",
      content: t("Usage: /service pattern <name> [list|add|remove]"),
    };
  }

  if (!action || action === "list") {
    const rules = manager.getLogPatternRules(name);
    if (rules.length === 0) {
      return {
        type: "message",
        messageType: "info",
        content: t('No log patterns configured for service "{{name}}".', {
          name,
        }),
      };
    }

    const listText = rules
      .map((rule) =>
        t(
          "- [{{id}}] Pattern: `{{pattern}}` | Action: {{action}} | Description: {{description}}",
          {
            id: rule.id,
            pattern: rule.pattern,
            action: rule.action,
            description: rule.description,
          },
        ),
      )
      .join("\n");

    return {
      type: "message",
      messageType: "info",
      content: t('Log patterns for service "{{name}}":\n{{listText}}', {
        name,
        listText,
      }),
    };
  }

  if (action === "add") {
    const patternStr = tokens.join(" ").trim();
    if (!patternStr) {
      return {
        type: "message",
        messageType: "error",
        content: t(
          "Usage: /service pattern <name> add <pattern-regex> <action> <description...>",
        ),
      };
    }

    // This would normally be invoked by LM via request_log_pattern tool
    // For now, return a message asking the user
    return {
      type: "message",
      messageType: "info",
      content: t(
        'To add log patterns for service "{{name}}", LM will use the request_log_pattern tool.',
        {
          name,
        },
      ),
    };
  }

  if (action === "remove") {
    const ruleId = tokens[0];
    if (!ruleId) {
      return {
        type: "message",
        messageType: "error",
        content: t("Usage: /service pattern <name> remove <rule-id>"),
      };
    }

    const removed = await manager.removeLogPatternRule(name, ruleId);
    return {
      type: "message",
      messageType: removed ? "info" : "error",
      content: removed
        ? t('Removed pattern rule "{{ruleId}}" from service "{{name}}".', {
            ruleId,
            name,
          })
        : t('Pattern rule "{{ruleId}}" not found in service "{{name}}".', {
            ruleId,
            name,
          }),
    };
  }

  return {
    type: "message",
    messageType: "error",
    content: t("Usage: /service pattern <name> [list|add|remove]"),
  };
}

async function handleSend(
  context: CommandContext,
  args: string,
): Promise<MessageActionReturn> {
  const manager = ensureManager(context);
  await manager.initialize();
  const tokens = splitArgs(args);
  const name = tokens.shift();
  const input = tokens.join(" ").trim();

  if (!name || !input) {
    return {
      type: "message",
      messageType: "error",
      content: t("Usage: /service send <name> <input>"),
    };
  }

  manager.sendInput(name, input);
  return {
    type: "message",
    messageType: "info",
    content: t(
      `Sent input to service "{{name}}".
Input has been recorded in service logs as "send: {{input}}".
Tip: wait a moment and run /service log {{name}} --tail 120 to inspect the output.`,
      { name, input },
    ),
  };
}

export const serviceCommand: SlashCommand = {
  name: "service",
  get description() {
    return t("Manage background services. Usage: /service <subcommand>");
  },
  kind: CommandKind.BUILT_IN,
  action: async (
    context: CommandContext,
    rawArgs: string,
  ): Promise<SlashCommandActionReturn> => {
    const trimmed = rawArgs.trim();
    if (!trimmed) {
      return {
        type: "message",
        messageType: "info",
        content: helpText(),
      };
    }

    const [subcommand, ...rest] = splitArgs(trimmed);
    const subArgs = trimmed.slice(subcommand.length).trim();

    switch (subcommand.toLowerCase()) {
      case "help":
        return {
          type: "message",
          messageType: "info",
          content: helpText(),
        };
      case "list":
        return handleList(context);
      case "register":
        return handleRegister(context, subArgs);
      case "start":
        return handleSimpleAction(context, rest.join(" "), "start");
      case "stop":
        return handleSimpleAction(context, rest.join(" "), "stop");
      case "restart":
        return handleSimpleAction(context, rest.join(" "), "restart");
      case "remove":
        return handleSimpleAction(context, rest.join(" "), "remove");
      case "follow":
        return handleSimpleAction(context, rest.join(" "), "follow");
      case "unfollow":
        return handleSimpleAction(context, rest.join(" "), "unfollow");
      case "log":
        return handleLog(context, subArgs);
      case "alert":
        return handleAlert(context, subArgs);
      case "analyze":
        return handleAnalyze(context, subArgs);
      case "pattern":
        return handlePattern(context, subArgs);
      case "send":
        return handleSend(context, subArgs);
      default:
        return {
          type: "message",
          messageType: "error",
          content: t("Unknown subcommand: {{subcommand}}\n\n{{helpText}}", {
            subcommand,
            helpText: helpText(),
          }),
        };
    }
  },
  completion: async (context: CommandContext, partialArg: string) => {
    const manager = context.services.config
      ? ServiceRuntimeManager.forConfig(context.services.config)
      : undefined;

    if (manager) {
      await manager.initialize();
    }

    const serviceNames = manager?.getServiceNames() ?? [];
    const subcommands = [
      "help",
      "list",
      "register",
      "start",
      "stop",
      "restart",
      "remove",
      "follow",
      "unfollow",
      "log",
      "alert",
      "analyze",
      "send",
    ];

    const parts = splitArgs(partialArg);
    if (parts.length === 0) {
      return subcommands;
    }

    if (parts.length === 1 && !partialArg.endsWith(" ")) {
      return subcommands.filter((cmd) => cmd.startsWith(parts[0]));
    }

    const sub = parts[0]?.toLowerCase();
    const namePrefix = parts[1] ?? "";
    if (
      [
        "start",
        "stop",
        "restart",
        "remove",
        "follow",
        "unfollow",
        "log",
        "alert",
        "analyze",
        "send",
      ].includes(sub)
    ) {
      return serviceNames.filter((name) => name.startsWith(namePrefix));
    }

    if (sub === "analyze" && parts.length >= 3) {
      return ["all", "errors"].filter((mode) =>
        mode.startsWith(parts[2] ?? ""),
      );
    }

    return [];
  },
};
