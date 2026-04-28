/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from "node:path";
import os from "node:os";
import type { Config } from "../config/config.js";
import { ToolNames, ToolDisplayNames } from "./tool-names.js";
import { ToolErrorType } from "./tool-error.js";
import type {
  ToolInvocation,
  ToolResult,
  ToolResultDisplay,
  ToolCallConfirmationDetails,
  ToolExecuteConfirmationDetails,
  ToolConfirmationPayload,
  ToolConfirmationOutcome,
} from "./tools.js";
import type { PermissionDecision } from "../permissions/types.js";
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import { getErrorMessage } from "../utils/errors.js";
import { truncateToolOutput } from "../utils/truncation.js";
import type {
  ShellExecutionConfig,
  ShellOutputEvent,
} from "../services/shellExecutionService.js";
import { ShellExecutionService } from "../services/shellExecutionService.js";
import { formatMemoryUsage } from "../utils/formatters.js";
import type { AnsiOutput } from "../utils/terminalSerializer.js";
import { isSubpaths } from "../utils/paths.js";
import {
  getCommandRoot,
  getCommandRoots,
  splitCommands,
  stripShellWrapper,
} from "../utils/shell-utils.js";
import { createDebugLogger } from "../utils/debugLogger.js";
import {
  isShellCommandReadOnlyAST,
  extractCommandRules,
} from "../utils/shellAstParser.js";

const debugLogger = createDebugLogger("SHELL");

export const OUTPUT_UPDATE_INTERVAL_MS = 1000;
const DEFAULT_FOREGROUND_TIMEOUT_MS = 120000;
const DEFAULT_BACKGROUND_OUTPUT_TAIL_LINES = 200;
const MAX_BACKGROUND_OUTPUT_LINES = 2000;

type ShellAction = "start" | "stop" | "output" | "input" | "list";

interface BackgroundShellSession {
  pid: number;
  command: string;
  directory: string;
  startedAt: number;
  updatedAt: number;
  outputLines: string[];
  running: boolean;
  exitCode: number | null;
  signal: number | null;
  errorMessage: string | null;
  abortController: AbortController;
}

const backgroundSessions = new Map<number, BackgroundShellSession>();

function normalizeShellAction(action?: string): ShellAction {
  switch (action) {
    case "stop":
    case "output":
    case "input":
    case "list":
      return action;
    case "start":
    default:
      return "start";
  }
}

function ansiOutputToText(output: AnsiOutput): string {
  return output
    .map((line) => line.map((segment) => segment.text).join(""))
    .join("\n");
}

function appendOutput(session: BackgroundShellSession, chunk: string): void {
  if (!chunk) {
    return;
  }

  const normalized = chunk.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  session.outputLines.push(...lines);
  if (session.outputLines.length > MAX_BACKGROUND_OUTPUT_LINES) {
    session.outputLines.splice(
      0,
      session.outputLines.length - MAX_BACKGROUND_OUTPUT_LINES,
    );
  }
  session.updatedAt = Date.now();
}

export interface ShellToolParams {
  action?: ShellAction;
  command?: string;
  is_background?: boolean;
  timeout?: number;
  description?: string;
  directory?: string;
  pid?: number;
  input?: string;
  tail_lines?: number;
}

export class ShellToolInvocation extends BaseToolInvocation<
  ShellToolParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: ShellToolParams,
  ) {
    super(params);
  }

  getDescription(): string {
    const action = normalizeShellAction(this.params.action);

    if (action === "list") {
      return "list background shell sessions";
    }
    if (action === "stop") {
      return `stop background shell session [pid: ${this.params.pid ?? "?"}]`;
    }
    if (action === "output") {
      return `read background shell output [pid: ${this.params.pid ?? "?"}]`;
    }
    if (action === "input") {
      return `send input to background shell [pid: ${this.params.pid ?? "?"}]`;
    }

    let description = `${this.params.command ?? ""}`;
    if (this.params.directory) {
      description += ` [in ${this.params.directory}]`;
    }
    if (this.params.is_background) {
      description += " [background]";
    } else if (this.params.timeout) {
      description += ` [timeout: ${this.params.timeout}ms]`;
    }
    if (this.params.description) {
      description += ` (${this.params.description.replace(/\n/g, " ")})`;
    }
    return description.trim();
  }

  /**
   * AST-based permission check for the shell command.
   * - Read-only commands (via AST analysis) → 'allow'
   * - All other commands → 'ask'
   */
  override async getDefaultPermission(): Promise<PermissionDecision> {
    const action = normalizeShellAction(this.params.action);

    if (action === "list" || action === "output" || action === "input") {
      return "allow";
    }

    if (action === "stop") {
      return "ask";
    }

    const command = stripShellWrapper(this.params.command ?? "");

    // AST-based read-only detection
    try {
      const isReadOnly = await isShellCommandReadOnlyAST(command);
      if (isReadOnly) {
        return "allow";
      }
    } catch (e) {
      debugLogger.warn("AST read-only check failed, falling back to ask:", e);
    }

    return "ask";
  }

  /**
   * Constructs confirmation dialog details for a shell command that needs
   * user approval.  For compound commands (e.g. `cd foo && npm run build`),
   * sub-commands that are already allowed (read-only) are excluded from both
   * the displayed root-command list and the suggested permission rules.
   */
  override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails> {
    const action = normalizeShellAction(this.params.action);
    if (action === "stop") {
      return {
        type: "exec",
        title: "Confirm Background Shell Stop",
        command: `stop pid ${this.params.pid}`,
        rootCommand: "kill",
        permissionRules: ["Bash(kill *)"],
        onConfirm: async (
          _outcome: ToolConfirmationOutcome,
          _payload?: ToolConfirmationPayload,
        ) => {
          // No-op: persistence is handled by coreToolScheduler via PM rules
        },
      };
    }

    const command = stripShellWrapper(this.params.command ?? "");
    const pm = this.config.getPermissionManager?.();

    // Split compound command and filter out already-allowed (read-only) sub-commands
    const subCommands = splitCommands(command);
    const confirmableSubCommands: string[] = [];
    for (const sub of subCommands) {
      let isReadOnly = false;
      try {
        isReadOnly = await isShellCommandReadOnlyAST(sub);
      } catch {
        // conservative: treat unknown commands as requiring confirmation
      }

      if (isReadOnly) {
        continue;
      }

      if (pm) {
        try {
          if ((await pm.isCommandAllowed(sub)) === "allow") {
            continue;
          }
        } catch (e) {
          debugLogger.warn("PermissionManager command check failed:", e);
        }
      }

      confirmableSubCommands.push(sub);
    }

    // Fallback to all sub-commands if everything was filtered out (shouldn't
    // normally happen since getDefaultPermission already returned 'ask').
    const effectiveSubCommands =
      confirmableSubCommands.length > 0 ? confirmableSubCommands : subCommands;

    const rootCommands = [
      ...new Set(
        effectiveSubCommands
          .map((c) => getCommandRoot(c))
          .filter((c): c is string => !!c),
      ),
    ];

    // Extract minimum-scope permission rules only for sub-commands that
    // actually need confirmation.
    let permissionRules: string[] = [];
    try {
      const allRules: string[] = [];
      for (const sub of effectiveSubCommands) {
        const rules = await extractCommandRules(sub);
        allRules.push(...rules);
      }
      permissionRules = [...new Set(allRules)].map((rule) => `Bash(${rule})`);
    } catch (e) {
      debugLogger.warn("Failed to extract command rules:", e);
    }

    const confirmationDetails: ToolExecuteConfirmationDetails = {
      type: "exec",
      title: "Confirm Shell Command",
      command: this.params.command ?? "",
      rootCommand: rootCommands.join(", "),
      permissionRules,
      onConfirm: async (
        _outcome: ToolConfirmationOutcome,
        _payload?: ToolConfirmationPayload,
      ) => {
        // No-op: persistence is handled by coreToolScheduler via PM rules
      },
    };
    return confirmationDetails;
  }

  async execute(
    signal: AbortSignal,
    updateOutput?: (output: ToolResultDisplay) => void,
    shellExecutionConfig?: ShellExecutionConfig,
    setPidCallback?: (pid: number) => void,
  ): Promise<ToolResult> {
    const action = normalizeShellAction(this.params.action);

    if (action === "list") {
      return this.listBackgroundSessions();
    }
    if (action === "output") {
      return this.readBackgroundOutput();
    }
    if (action === "input") {
      return this.sendInputToBackgroundSession();
    }
    if (action === "stop") {
      return this.stopBackgroundSession();
    }

    const strippedCommand = stripShellWrapper(this.params.command ?? "");

    if (signal.aborted) {
      return {
        llmContent: "Command was cancelled by user before it could start.",
        returnDisplay: "Command cancelled by user.",
      };
    }

    const shouldRunInBackground = Boolean(this.params.is_background);
    const effectiveTimeout = shouldRunInBackground
      ? undefined
      : (this.params.timeout ?? DEFAULT_FOREGROUND_TIMEOUT_MS);

    // Create combined signal with timeout for foreground execution
    let combinedSignal = signal;
    if (effectiveTimeout) {
      const timeoutSignal = AbortSignal.timeout(effectiveTimeout);
      combinedSignal = AbortSignal.any([signal, timeoutSignal]);
    }

    // Add co-author to git commit commands
    const processedCommand = this.addCoAuthorToGitCommit(strippedCommand);
    const commandToExecute = shouldRunInBackground
      ? processedCommand.trim().replace(/&+$/, "").trim()
      : processedCommand;
    const cwd = this.params.directory || this.config.getTargetDir();
    let activeBackgroundSession: BackgroundShellSession | undefined;

    let cumulativeOutput: string | AnsiOutput = "";
    let lastUpdateTime = Date.now();
    let isBinaryStream = false;

    const onOutputEvent = (event: ShellOutputEvent) => {
      let shouldUpdate = false;

      switch (event.type) {
        case "data":
          if (isBinaryStream) break;
          cumulativeOutput = event.chunk;
          if (shouldRunInBackground && activeBackgroundSession) {
            appendOutput(
              activeBackgroundSession,
              typeof event.chunk === "string"
                ? event.chunk
                : ansiOutputToText(event.chunk),
            );
          }
          shouldUpdate = true;
          break;
        case "binary_detected":
          isBinaryStream = true;
          cumulativeOutput = "[Binary output detected. Halting stream...]";
          if (shouldRunInBackground && activeBackgroundSession) {
            appendOutput(activeBackgroundSession, cumulativeOutput);
          }
          shouldUpdate = true;
          break;
        case "binary_progress":
          isBinaryStream = true;
          cumulativeOutput = `[Receiving binary output... ${formatMemoryUsage(
            event.bytesReceived,
          )} received]`;
          if (shouldRunInBackground && activeBackgroundSession) {
            appendOutput(activeBackgroundSession, cumulativeOutput);
          }
          if (Date.now() - lastUpdateTime > OUTPUT_UPDATE_INTERVAL_MS) {
            shouldUpdate = true;
          }
          break;
        default: {
          throw new Error("An unhandled ShellOutputEvent was found.");
        }
      }

      if (shouldUpdate && updateOutput) {
        updateOutput(
          typeof cumulativeOutput === "string"
            ? cumulativeOutput
            : { ansiOutput: cumulativeOutput },
        );
        lastUpdateTime = Date.now();
      }
    };

    const { result: resultPromise, pid } = await ShellExecutionService.execute(
      commandToExecute,
      cwd,
      onOutputEvent,
      combinedSignal,
      shouldRunInBackground
        ? true
        : this.config.getShouldUseNodePtyShell(),
      shellExecutionConfig ?? {},
    );

    if (pid && setPidCallback) {
      setPidCallback(pid);
    }

    if (shouldRunInBackground) {
      if (!pid) {
        return {
          llmContent: "Failed to start background command: no PID was returned.",
          returnDisplay:
            "Failed to start background command: no PID was returned.",
          error: {
            message: "Background command did not return a PID.",
            type: ToolErrorType.SHELL_EXECUTE_ERROR,
          },
        };
      }

      const abortController = new AbortController();
      const session: BackgroundShellSession = {
        pid,
        command: this.params.command ?? commandToExecute,
        directory: cwd,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        outputLines: [],
        running: true,
        exitCode: null,
        signal: null,
        errorMessage: null,
        abortController,
      };
      backgroundSessions.set(pid, session);
      activeBackgroundSession = session;

      void resultPromise.then((result) => {
        session.running = false;
        session.exitCode = result.exitCode;
        session.signal = result.signal;
        session.errorMessage = result.error?.message ?? null;
        if (result.output.trim()) {
          session.outputLines = [];
          appendOutput(session, result.output);
        }
      });

      // Use internal abort signal to terminate the running command later.
      abortController.signal.addEventListener("abort", () => {
        if (ShellExecutionService.isPtyActive(pid)) {
          ShellExecutionService.writeToPty(pid, "\u0003");
        }
      });

      const started = [
        `Background command started. PID: ${pid}`,
        `Use action=list to see sessions, action=output with pid=${pid} to read output, action=input with pid=${pid} to send input, action=stop with pid=${pid} to terminate.`,
      ].join("\n");

      return {
        llmContent: started,
        returnDisplay: `Background command started. PID: ${pid}`,
      };
    }

    const result = await resultPromise;

    let llmContent = "";
    if (result.aborted) {
      const wasTimeout =
        !shouldRunInBackground &&
        effectiveTimeout &&
        combinedSignal.aborted &&
        !signal.aborted;

      if (wasTimeout) {
        llmContent = `Command timed out after ${effectiveTimeout}ms before it could complete.`;
        if (result.output.trim()) {
          llmContent += ` Below is the output before it timed out:\n${result.output}`;
        } else {
          llmContent += " There was no output before it timed out.";
        }
      } else {
        llmContent = "Command was cancelled by user before it could complete.";
        if (result.output.trim()) {
          llmContent += ` Below is the output before it was cancelled:\n${result.output}`;
        } else {
          llmContent += " There was no output before it was cancelled.";
        }
      }
    } else {
      const finalError = result.error
        ? result.error.message.replace(commandToExecute, this.params.command ?? "")
        : "(none)";

      llmContent = [
        `Command: ${this.params.command}`,
        `Directory: ${this.params.directory || "(root)"}`,
        `Output: ${result.output || "(empty)"}`,
        `Error: ${finalError}`,
        `Exit Code: ${result.exitCode ?? "(none)"}`,
        `Signal: ${result.signal ?? "(none)"}`,
        `Process Group PGID: ${result.pid ?? "(none)"}`,
      ].join("\n");
    }

    let returnDisplayMessage = "";
    if (this.config.getDebugMode()) {
      returnDisplayMessage = llmContent;
    } else {
      if (result.output.trim()) {
        returnDisplayMessage = result.output;
      } else {
        if (result.aborted) {
          const wasTimeout =
            !shouldRunInBackground &&
            effectiveTimeout &&
            combinedSignal.aborted &&
            !signal.aborted;

          returnDisplayMessage = wasTimeout
            ? `Command timed out after ${effectiveTimeout}ms.`
            : "Command cancelled by user.";
        } else if (result.signal) {
          returnDisplayMessage = `Command terminated by signal: ${result.signal}`;
        } else if (result.error) {
          returnDisplayMessage = `Command failed: ${getErrorMessage(
            result.error,
          )}`;
        } else if (result.exitCode !== null && result.exitCode !== 0) {
          returnDisplayMessage = `Command exited with code: ${result.exitCode}`;
        }
      }
    }

    if (typeof llmContent === "string") {
      const truncatedResult = await truncateToolOutput(
        this.config,
        ShellTool.Name,
        llmContent,
      );

      if (truncatedResult.outputFile) {
        llmContent = truncatedResult.content;
        returnDisplayMessage +=
          (returnDisplayMessage ? "\n" : "") +
          `Output too long and was saved to: ${truncatedResult.outputFile}`;
      }
    }

    const executionError = result.error
      ? {
          error: {
            message: result.error.message,
            type: ToolErrorType.SHELL_EXECUTE_ERROR,
          },
        }
      : {};

    return {
      llmContent,
      returnDisplay: returnDisplayMessage,
      ...executionError,
    };
  }

  private listBackgroundSessions(): ToolResult {
    const sessions = [...backgroundSessions.values()]
      .filter((session) => session.running)
      .sort((a, b) => a.startedAt - b.startedAt);
    if (sessions.length === 0) {
      return {
        llmContent: "No running background shell sessions found.",
        returnDisplay: "No running background shell sessions found.",
      };
    }

    const lines = sessions.map((session) => {
      const status = session.running ? "running" : "exited";
      const exitText = session.running
        ? ""
        : `, exit=${session.exitCode ?? "none"}, signal=${session.signal ?? "none"}`;
      return `PID=${session.pid}, status=${status}, cwd=${session.directory}, command=${session.command}${exitText}`;
    });

    const content = lines.join("\n");
    return {
      llmContent: content,
      returnDisplay: content,
    };
  }

  private readBackgroundOutput(): ToolResult {
    const pid = this.params.pid ?? -1;
    const session = backgroundSessions.get(pid);
    if (!session) {
      return {
        llmContent: `No background shell session found for PID ${pid}.`,
        returnDisplay: `No background shell session found for PID ${pid}.`,
      };
    }

    const tailLines =
      this.params.tail_lines ?? DEFAULT_BACKGROUND_OUTPUT_TAIL_LINES;
    const lines = session.outputLines.slice(-tailLines);
    const output = lines.join("\n").trim();
    const status = session.running ? "running" : "exited";
    const header = `PID: ${pid}\nStatus: ${status}\nCommand: ${session.command}`;
    const body = output ? `Output:\n${output}` : "Output: (empty)";

    return {
      llmContent: `${header}\n${body}`,
      returnDisplay: output || "(empty)",
    };
  }

  private sendInputToBackgroundSession(): ToolResult {
    const pid = this.params.pid ?? -1;
    const session = backgroundSessions.get(pid);
    if (!session) {
      return {
        llmContent: `No background shell session found for PID ${pid}.`,
        returnDisplay: `No background shell session found for PID ${pid}.`,
      };
    }

    if (!session.running || !ShellExecutionService.isPtyActive(pid)) {
      session.running = false;
      return {
        llmContent: `Background shell session PID ${pid} is not running.`,
        returnDisplay: `Background shell session PID ${pid} is not running.`,
      };
    }

    const input = this.params.input ?? "";
    ShellExecutionService.writeToPty(pid, input);
    appendOutput(session, `[stdin] ${input}`);

    return {
      llmContent: `Sent input to PID ${pid}.`,
      returnDisplay: `Sent input to PID ${pid}.`,
    };
  }

  private stopBackgroundSession(): ToolResult {
    const pid = this.params.pid ?? -1;
    const session = backgroundSessions.get(pid);
    if (!session) {
      return {
        llmContent: `No background shell session found for PID ${pid}.`,
        returnDisplay: `No background shell session found for PID ${pid}.`,
      };
    }

    if (!session.running || !ShellExecutionService.isPtyActive(pid)) {
      session.running = false;
      return {
        llmContent: `Background shell session PID ${pid} is already stopped.`,
        returnDisplay: `Background shell session PID ${pid} is already stopped.`,
      };
    }

    session.abortController.abort();
    session.running = false;

    return {
      llmContent: `Stop signal sent to background shell session PID ${pid}.`,
      returnDisplay: `Stop signal sent to PID ${pid}.`,
    };
  }

  private addCoAuthorToGitCommit(command: string): string {
    // Check if co-author feature is enabled
    const gitCoAuthorSettings = this.config.getGitCoAuthor();

    if (!gitCoAuthorSettings.enabled) {
      return command;
    }

    // Check if this is a git commit command (anywhere in the command, e.g., after "cd /path &&")
    const gitCommitPattern = /\bgit\s+commit\b/;
    if (!gitCommitPattern.test(command)) {
      return command;
    }

    // Define the co-author line using configuration
    const coAuthor = `

Co-authored-by: ${gitCoAuthorSettings.name} <${gitCoAuthorSettings.email}>`;

    // Handle different git commit patterns:
    // Match -m "message" or -m 'message', including combined flags like -am
    // Use separate patterns to avoid ReDoS (catastrophic backtracking)
    //
    // Pattern breakdown:
    //   -[a-zA-Z]*m  matches -m, -am, -nm, etc. (combined short flags)
    //   \s+          matches whitespace after the flag
    //   [^"\\]       matches any char except double-quote and backslash
    //   \\.          matches escape sequences like \" or \\
    //   (?:...|...)* matches normal chars or escapes, repeated
    const doubleQuotePattern = /(-[a-zA-Z]*m\s+)"((?:[^"\\]|\\.)*)"/;
    const singleQuotePattern = /(-[a-zA-Z]*m\s+)'((?:[^'\\]|\\.)*)'/;
    const doubleMatch = command.match(doubleQuotePattern);
    const singleMatch = command.match(singleQuotePattern);
    const match = doubleMatch ?? singleMatch;
    const quote = doubleMatch ? '"' : "'";

    if (match) {
      const [fullMatch, prefix, existingMessage] = match;
      const newMessage = existingMessage + coAuthor;
      const replacement = prefix + quote + newMessage + quote;

      return command.replace(fullMatch, replacement);
    }

    // If no -m flag found, the command might open an editor
    // In this case, we can't easily modify it, so return as-is
    return command;
  }
}

function getShellToolDescription(): string {
  const isWindows = os.platform() === "win32";
  const executionWrapper = isWindows
    ? "cmd.exe /c <command>"
    : "bash -c <command>";
  const processGroupNote = isWindows
    ? ""
    : "\n  - Command is executed as a subprocess that leads its own process group. Command process group can be terminated as `kill -- -PGID` or signaled as `kill -s SIGNAL -- -PGID`.";

  return `Executes a given shell command (as \`${executionWrapper}\`) in a persistent shell session with optional timeout, ensuring proper handling and security measures.

IMPORTANT: This tool is for terminal operations like git, npm, docker, etc. DO NOT use it for file operations (reading, writing, editing, searching, finding files) - use the specialized tools for this instead.

**Usage notes**:
- Default action is \'start\'. You can also use action=\'list\'|\'output\'|\'input\'|\'stop\' to manage background sessions by PID.
- For action=start, the command argument is required.
- You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 120000ms (2 minutes).
- It is very helpful if you write a clear, concise description of what this command does in 5-10 words.

- Avoid using run_shell_command with the \`find\`, \`grep\`, \`cat\`, \`head\`, \`tail\`, \`sed\`, \`awk\`, or \`echo\` commands, unless explicitly instructed or when these commands are truly necessary for the task. Instead, always prefer using the dedicated tools for these commands:
  - File search: Use ${ToolNames.GLOB} (NOT find or ls)
  - Content search: Use ${ToolNames.GREP} (NOT grep or rg)
  - Read files: Use ${ToolNames.READ_FILE} (NOT cat/head/tail)
  - Edit files: Use ${ToolNames.EDIT} (NOT sed/awk)
  - Write files: Use ${ToolNames.WRITE_FILE} (NOT echo >/cat <<EOF)
  - Communication: Output text directly (NOT echo/printf)
- When issuing multiple commands:
  - If the commands are independent and can run in parallel, make multiple run_shell_command tool calls in a single message. For example, if you need to run "git status" and "git diff", send a single message with two run_shell_command tool calls in parallel.
  - If the commands depend on each other and must run sequentially, use a single run_shell_command call with '&&' to chain them together (e.g., \`git add . && git commit -m "message" && git push\`). For instance, if one operation must complete before another starts (like mkdir before cp, Write before run_shell_command for git operations, or git add before git commit), run these operations sequentially instead.
  - Use ';' only when you need to run commands sequentially but don't care if earlier commands fail
  - DO NOT use newlines to separate commands (newlines are ok in quoted strings)
- Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it.
  <good-example>
  pytest /foo/bar/tests
  </good-example>
  <bad-example>
  cd /foo/bar && pytest tests
  </bad-example>

**Background vs Foreground Execution:**
- You should decide whether commands should run in background or foreground based on their nature:
- Use background execution (is_background: true) for:
  - Long-running development servers: \`npm run start\`, \`npm run dev\`, \`yarn dev\`, \`bun run start\`
  - Build watchers: \`npm run watch\`, \`webpack --watch\`
  - Database servers: \`mongod\`, \`mysql\`, \`redis-server\`
  - Web servers: \`python -m http.server\`, \`php -S localhost:8000\`
  - Any command expected to run indefinitely until manually stopped
${processGroupNote}
- Use foreground execution (is_background: false) for:
  - One-time commands: \`ls\`, \`cat\`, \`grep\`
  - Build commands: \`npm run build\`, \`make\`
  - Installation commands: \`npm install\`, \`pip install\`
  - Git operations: \`git commit\`, \`git push\`
  - Test runs: \`npm test\`, \`pytest\`
`;
}

function getCommandDescription(): string {
  if (os.platform() === "win32") {
    return "Exact command to execute as `cmd.exe /c <command>`";
  } else {
    return "Exact bash command to execute as `bash -c <command>`";
  }
}

export class ShellTool extends BaseDeclarativeTool<
  ShellToolParams,
  ToolResult
> {
  static Name: string = ToolNames.SHELL;

  constructor(private readonly config: Config) {
    super(
      ShellTool.Name,
      ToolDisplayNames.SHELL,
      getShellToolDescription(),
      Kind.Execute,
      {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["start", "list", "output", "input", "stop"],
            description:
              "Optional action. Defaults to 'start'. Use 'list' to show background sessions, 'output' to read output by pid, 'input' to send input by pid, and 'stop' to terminate by pid.",
          },
          command: {
            type: "string",
            description: getCommandDescription(),
          },
          is_background: {
            type: "boolean",
            description:
              "Optional: Whether to run the command in background. If not specified, defaults to false (foreground execution). Explicitly set to true for long-running processes like development servers, watchers, or daemons that should continue running without blocking further commands.",
          },
          timeout: {
            type: "number",
            description: "Optional timeout in milliseconds (max 600000)",
          },
          description: {
            type: "string",
            description:
              "Brief description of the command for the user. Be specific and concise. Ideally a single sentence. Can be up to 3 sentences for clarity. No line breaks.",
          },
          directory: {
            type: "string",
            description:
              "(OPTIONAL) The absolute path of the directory to run the command in. If not provided, the project root directory is used. Must be a directory within the workspace and must already exist.",
          },
          pid: {
            type: "number",
            description:
              "PID of a background shell session. Required for action=output|input|stop.",
          },
          input: {
            type: "string",
            description:
              "Text to send to a background shell session for action=input.",
          },
          tail_lines: {
            type: "number",
            description:
              "Number of trailing lines to read for action=output. Defaults to 200.",
          },
        },
        required: [],
      },
      false, // output is not markdown
      true, // output can be updated
    );
  }

  protected override validateToolParamValues(
    params: ShellToolParams,
  ): string | null {
    if (
      params.action !== undefined &&
      !["start", "list", "output", "input", "stop"].includes(
        params.action,
      )
    ) {
      return "action must be one of: start, list, output, input, stop.";
    }

    const action = normalizeShellAction(params.action);

    if (params.pid !== undefined) {
      if (!Number.isInteger(params.pid) || params.pid <= 0) {
        return "pid must be a positive integer.";
      }
    }

    if (params.tail_lines !== undefined) {
      if (!Number.isInteger(params.tail_lines) || params.tail_lines <= 0) {
        return "tail_lines must be a positive integer.";
      }
      if (params.tail_lines > MAX_BACKGROUND_OUTPUT_LINES) {
        return `tail_lines cannot exceed ${MAX_BACKGROUND_OUTPUT_LINES}.`;
      }
    }

    if (action === "list") {
      return null;
    }

    if (action === "output" || action === "stop") {
      if (params.pid === undefined) {
        return `pid is required for action=${action}.`;
      }
      return null;
    }

    if (action === "input") {
      if (params.pid === undefined) {
        return "pid is required for action=input.";
      }
      if (typeof params.input !== "string") {
        return "input is required for action=input.";
      }
      return null;
    }

    // NOTE: Permission checks (read-only detection, PM rules) are handled at
    // L3 (getDefaultPermission) and L4 (PM override) in coreToolScheduler.
    // This method only performs pure parameter validation.
    if (!params.command?.trim()) {
      return "Command cannot be empty.";
    }
    if (getCommandRoots(params.command).length === 0) {
      return "Could not identify command root to obtain permission from user.";
    }
    if (params.timeout !== undefined) {
      if (
        typeof params.timeout !== "number" ||
        !Number.isInteger(params.timeout)
      ) {
        return "Timeout must be an integer number of milliseconds.";
      }
      if (params.timeout <= 0) {
        return "Timeout must be a positive number.";
      }
      if (params.timeout > 600000) {
        return "Timeout cannot exceed 600000ms (10 minutes).";
      }
    }
    if (params.directory) {
      if (!path.isAbsolute(params.directory)) {
        return "Directory must be an absolute path.";
      }

      const userSkillsDirs = this.config.storage.getUserSkillsDirs();
      const resolvedDirectoryPath = path.resolve(params.directory);
      const isWithinUserSkills = isSubpaths(
        userSkillsDirs,
        resolvedDirectoryPath,
      );
      if (isWithinUserSkills) {
        return `Explicitly running shell commands from within the user skills directory is not allowed. Please use absolute paths for command parameter instead.`;
      }

      const workspaceDirs = this.config.getWorkspaceContext().getDirectories();
      const isWithinWorkspace = workspaceDirs.some((wsDir) =>
        params.directory!.startsWith(wsDir),
      );

      if (!isWithinWorkspace) {
        return `Directory '${params.directory}' is not within any of the registered workspace directories.`;
      }
    }
    return null;
  }

  protected createInvocation(
    params: ShellToolParams,
  ): ToolInvocation<ShellToolParams, ToolResult> {
    return new ShellToolInvocation(this.config, params);
  }
}
