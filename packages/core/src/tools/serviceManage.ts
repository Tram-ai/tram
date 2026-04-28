/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FunctionDeclaration } from "@google/genai";
import { ToolDisplayNames, ToolNames } from "./tool-names.js";
import type { ToolResult } from "./tools.js";
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import type { Config } from "../config/config.js";
import { ServiceRuntimeManager } from "../services/serviceRuntimeManager.js";
import { tt } from "../i18n/index.js";

type ServiceAction =
  | "list"
  | "register"
  | "start"
  | "stop"
  | "restart"
  | "remove"
  | "follow"
  | "unfollow"
  | "log"
  | "alert"
  | "analyze"
  | "send"
  | "suppress"
  | "unsuppress"
  | "list-rules";

export interface ServiceManageParams {
  action: ServiceAction;
  name?: string;
  command?: string;
  cwd?: string;
  autoStart?: boolean;
  watchPatterns?: string[];
  stopInputs?: string[];
  tail?: number;
  follow?: boolean;
  mode?: "all" | "errors";
  input?: string;
  pattern?: string;
  ruleDescription?: string;
  ruleId?: string;
}

const description =
  "Manage background services through structured parameters. Supports register/start/stop/restart/remove/follow/unfollow/log/alert/analyze/send/list/suppress/unsuppress/list-rules. Important: after send, wait briefly and then read logs (for example, call log with tail) before concluding. Note: alert action triggers ask_user_question tool; after receiving user response, you automatically decide next steps (e.g., analyze logs, defer alert) based on the chosen action. Use suppress to add regex patterns that filter log lines from analysis; use unsuppress to remove a rule by id; use list-rules to see all active rules.";
const schema: FunctionDeclaration = {
  name: ToolNames.SERVICE_MANAGE,
  description,
  parametersJsonSchema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
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
          "suppress",
          "unsuppress",
          "list-rules",
        ],
      },
      name: { type: "string" },
      command: { type: "string" },
      cwd: { type: "string" },
      autoStart: { type: "boolean" },
      watchPatterns: {
        type: "array",
        items: { type: "string" },
      },
      stopInputs: {
        type: "array",
        items: { type: "string" },
      },
      tail: { type: "number" },
      follow: { type: "boolean" },
      mode: { type: "string", enum: ["all", "errors"] },
      input: { type: "string" },
      pattern: {
        type: "string",
        description: "Regex pattern for suppress/unsuppress rules",
      },
      ruleDescription: {
        type: "string",
        description: "Description for suppress rule",
      },
      ruleId: { type: "string", description: "Rule ID for unsuppress action" },
    },
    required: ["action"],
    additionalProperties: false,
  },
};

class ServiceManageToolInvocation extends BaseToolInvocation<
  ServiceManageParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: ServiceManageParams,
  ) {
    super(params);
  }

  getDescription(): string {
    return tt("Manage service action: {{action}}", {
      action: this.params.action,
    });
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const manager = ServiceRuntimeManager.forConfig(this.config);
    await manager.initialize();

    const { action, name } = this.params;
    let output = "";

    try {
      switch (action) {
        case "list": {
          const services = manager.listServices();
          if (services.length === 0) {
            output = tt("No services registered.");
          } else {
            output = services
              .map((s) => {
                const status = s.hasPendingAlert
                  ? "ALERT"
                  : s.running
                    ? "RUNNING"
                    : "STOPPED";
                return `- ${s.name} [${status}] cmd: ${s.command} (follow: ${s.followLogs})`;
              })
              .join("\n");
          }
          break;
        }

        case "register":
          if (!name || !this.params.command)
            throw new Error(tt("name and command required"));
          await manager.registerService({
            name,
            command: this.params.command,
            cwd: this.params.cwd,
            autoStart: this.params.autoStart,
            watchPatterns: this.params.watchPatterns,
            stopInputs: this.params.stopInputs,
          });
          output = tt("Service {{name}} registered successfully.", { name });
          break;

        case "start":
          if (!name) throw new Error(tt("name required"));
          await manager.startService(name);
          output = tt("Service {{name}} start initiated.", { name });
          break;

        case "stop":
          if (!name) throw new Error(tt("name required"));
          await manager.stopService(name);
          output = tt("Service {{name}} stopped.", { name });
          break;

        case "restart":
          if (!name) throw new Error(tt("name required"));
          await manager.restartService(name);
          output = tt("Service {{name}} restarted.", { name });
          break;

        case "remove":
          if (!name) throw new Error(tt("name required"));
          await manager.removeService(name);
          output = tt("Service {{name}} removed.", { name });
          break;

        case "follow":
          if (!name) throw new Error(tt("name required"));
          manager.setNotificationsEnabled(name, true);
          manager.setFollowLogs(name, true);
          output = tt("Now following logs for {{name}} in UI.", { name });
          break;

        case "unfollow":
          if (!name) throw new Error(tt("name required"));
          manager.setFollowLogs(name, false);
          manager.setNotificationsEnabled(name, false);
          output = tt("Unfollowed logs for {{name}}.", { name });
          break;

        case "log": {
          if (!name) throw new Error(tt("name required"));
          const tail = this.params.tail || 100;
          if (this.params.follow) {
            manager.setFollowLogs(name, true);
          }
          if (this.config.getServiceOutputToLLM()) {
            // Inline logs directly into LLM context
            const lines = manager.getLogs(name, tail);
            output = lines.length === 0
              ? `[No logs for ${name}]`
              : lines.join("\n");
          } else {
            // Store logs as file variable, return reference only (protects context)
            output = await manager.getLogsAsVariable(name, tail);
          }
          break;
        }

        case "alert": {
          if (!name) throw new Error(tt("name required"));
          const snapshot = manager.getAlertSnapshot(name);
          if (!snapshot.hasAlert) {
            output = tt("No pending alert for service {{name}}.", { name });
          } else {
            output = tt(
              "Alert detected for {{name}}. Please use analyze action to read alert logs.",
              { name },
            );
          }
          break;
        }

        case "analyze": {
          if (!name) throw new Error(tt("name required"));
          const snapshot = manager.getAlertSnapshot(name);
          if (!snapshot.hasAlert) {
            output = tt("No pending alerts for {{name}}.", { name });
          } else {
            manager.clearAlert(name);
            if (this.config.getServiceOutputToLLM()) {
              // Inline alert logs directly into LLM context
              const lines = manager.readAlertLogs(
                name,
                this.params.mode || "all",
              );
              output = lines.length === 0
                ? `[No alert logs for ${name}]`
                : lines.join("\n");
            } else {
              // Store alert logs as file variable, return reference only
              output = await manager.getAlertLogsAsVariable(
                name,
                this.params.mode || "all",
              );
            }
          }
          break;
        }

        case "send":
          if (!name || !this.params.input)
            throw new Error(tt("name and input required"));
          await manager.sendInput(name, this.params.input);
          output = tt(
            "Sent input to {{name}}. Consider checking logs after a brief moment.",
            { name },
          );
          break;

        case "suppress": {
          if (!name || !this.params.pattern)
            throw new Error(tt("name and pattern required"));
          await manager.addLogPatternRule(name, {
            pattern: this.params.pattern,
            action: "suppress",
            description:
              this.params.ruleDescription ||
              `Suppress lines matching: ${this.params.pattern}`,
          });
          output = tt("Added suppress rule for {{name}}: {{pattern}}", {
            name,
            pattern: this.params.pattern,
          });
          break;
        }

        case "unsuppress": {
          if (!name || !this.params.ruleId)
            throw new Error(tt("name and ruleId required"));
          const removed = await manager.removeLogPatternRule(
            name,
            this.params.ruleId,
          );
          output = removed
            ? tt("Removed suppress rule {{ruleId}} for {{name}}.", {
                ruleId: this.params.ruleId,
                name,
              })
            : tt("Rule {{ruleId}} not found for {{name}}.", {
                ruleId: this.params.ruleId,
                name,
              });
          break;
        }

        case "list-rules": {
          if (!name) throw new Error(tt("name required"));
          const rules = manager.getLogPatternRules(name);
          if (rules.length === 0) {
            output = tt("No log pattern rules for {{name}}.", { name });
          } else {
            output =
              tt("Log pattern rules for {{name}}:", { name }) +
              "\n" +
              rules
                .map(
                  (r) =>
                    `  [${r.id}] ${r.action}: /${r.pattern}/ - ${r.description} (applied ${r.appliedCount ?? 0} times)`,
                )
                .join("\n");
          }
          break;
        }

        default:
          output = tt("Unknown action: {{action}}", { action: String(action) });
      }
    } catch (e) {
      output = tt("Error executing action {{action}}: {{error}}", {
        action,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return {
      llmContent: output,
      returnDisplay: output,
    };
  }
}

export class ServiceManageTool extends BaseDeclarativeTool<
  ServiceManageParams,
  ToolResult
> {
  static readonly Name = ToolNames.SERVICE_MANAGE;

  constructor(private readonly config: Config) {
    super(
      ToolNames.SERVICE_MANAGE,
      ToolDisplayNames.SERVICE_MANAGE,
      description,
      Kind.Execute,
      schema.parametersJsonSchema as Record<string, unknown>,
    );
  }

  override validateToolParamValues(params: ServiceManageParams): string | null {
    const needName = new Set<ServiceAction>([
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
    ]);

    if (needName.has(params.action) && !params.name) {
      return `name is required for action: ${params.action}`;
    }

    if (params.action === "register" && !params.command) {
      return "command is required for register action";
    }

    if (params.action === "send" && !params.input) {
      return "input is required for send action";
    }

    if (
      params.action === "log" &&
      params.tail !== undefined &&
      params.tail <= 0
    ) {
      return "tail must be a positive integer when provided";
    }

    return null;
  }

  override createInvocation(
    params: ServiceManageParams,
  ): BaseToolInvocation<ServiceManageParams, ToolResult> {
    return new ServiceManageToolInvocation(this.config, params);
  }
}
