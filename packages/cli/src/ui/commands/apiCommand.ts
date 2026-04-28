/**
 * @license
 * Copyright 2025 TRAM
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CommandContext,
  MessageActionReturn,
  SlashCommand,
} from "./types.js";
import { CommandKind } from "./types.js";
import { t } from "../../i18n/index.js";
import {
  getMCPServerStatus,
  MCPServerStatus,
  type MCPServerConfig,
} from "@tram-ai/tram-core";

function maskApiKey(key: string | undefined): string {
  if (!key) return t("(未设置)");
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function statusIcon(connected: boolean): string {
  return connected ? "✅" : "❌";
}

function mcpStatusText(status: MCPServerStatus): string {
  switch (status) {
    case MCPServerStatus.CONNECTED:
      return "✅ " + t("已连接");
    case MCPServerStatus.CONNECTING:
      return "🔄 " + t("连接中...");
    case MCPServerStatus.DISCONNECTED:
      return "❌ " + t("已断开");
    default:
      return "❓ " + t("未知");
  }
}

function buildModelProviderInfo(
  config: NonNullable<CommandContext["services"]["config"]>,
): string {
  const genConfig = config.getContentGeneratorConfig();
  const lines: string[] = [];

  lines.push("═══ " + t("模型供应商") + " ═══");
  lines.push(
    `  ${t("当前模型")}: ${config.getModelName() || genConfig.model || t("(未设置)")}`,
  );
  lines.push(`  ${t("模型ID")}: ${genConfig.model || t("(未设置)")}`);
  lines.push(`  ${t("Base URL")}: ${genConfig.baseUrl || t("(默认)")}`);
  lines.push(`  ${t("API Key")}: ${maskApiKey(genConfig.apiKey)}`);
  lines.push(`  ${t("认证类型")}: ${genConfig.authType || "openai"}`);

  const hasApiKey = !!genConfig.apiKey;
  const hasBaseUrl = !!genConfig.baseUrl;
  lines.push(
    `  ${t("连接状态")}: ${statusIcon(hasApiKey)} ${hasApiKey ? t("API Key 已配置") : t("API Key 未配置")}${hasBaseUrl ? "" : " (" + t("使用默认端点") + ")"}`,
  );

  return lines.join("\n");
}

function buildMcpInfo(
  config: NonNullable<CommandContext["services"]["config"]>,
): string {
  const mcpServers = config.getMcpServers() || {};
  const lines: string[] = [];

  const builtinServers: Array<[string, MCPServerConfig]> = [];
  const userServers: Array<[string, MCPServerConfig]> = [];

  for (const [name, serverConfig] of Object.entries(mcpServers) as Array<
    [string, MCPServerConfig]
  >) {
    if (config.isMcpServerDisabled(name)) continue;
    if (serverConfig.hidden) {
      builtinServers.push([name, serverConfig]);
    } else {
      userServers.push([name, serverConfig]);
    }
  }

  lines.push("");
  lines.push("═══ " + t("内置 MCP 服务") + " ═══");
  if (builtinServers.length === 0) {
    lines.push("  " + t("(无)"));
  } else {
    for (const [name, serverConfig] of builtinServers) {
      const status = getMCPServerStatus(name);
      const desc = serverConfig.description || "";
      lines.push(
        `  ${mcpStatusText(status)} ${name}${desc ? " - " + desc : ""}`,
      );
    }
  }

  lines.push("");
  lines.push("═══ " + t("用户 MCP 服务") + " ═══");
  if (userServers.length === 0) {
    lines.push("  " + t("(无)"));
  } else {
    for (const [name, serverConfig] of userServers) {
      const status = getMCPServerStatus(name);
      const desc = serverConfig.description || "";
      lines.push(
        `  ${mcpStatusText(status)} ${name}${desc ? " - " + desc : ""}`,
      );
    }
  }

  // Show disabled servers
  const disabledServers: string[] = [];
  for (const [name] of Object.entries(mcpServers)) {
    if (config.isMcpServerDisabled(name)) {
      disabledServers.push(name);
    }
  }
  if (disabledServers.length > 0) {
    lines.push("");
    lines.push("═══ " + t("已禁用的 MCP 服务") + " ═══");
    for (const name of disabledServers) {
      lines.push(`  🚫 ${name}`);
    }
  }

  return lines.join("\n");
}

function buildVisionInfo(
  config: NonNullable<CommandContext["services"]["config"]>,
): string {
  const genConfig = config.getContentGeneratorConfig();
  const lines: string[] = [];

  lines.push("");
  lines.push("═══ " + t("视觉 API") + " ═══");

  const modalities = genConfig.modalities;
  if (modalities && modalities.image) {
    lines.push(`  ${statusIcon(true)} ${t("图片输入")}: ${t("已启用")}`);
  } else if (modalities && modalities.image === false) {
    lines.push(`  ${statusIcon(false)} ${t("图片输入")}: ${t("已禁用")}`);
  } else {
    lines.push(`  ℹ️ ${t("图片输入")}: ${t("自动检测 (取决于模型)")}`);
  }

  return lines.join("\n");
}

export const apiCommand: SlashCommand = {
  name: "api",
  altNames: ["connectivity", "conn", "status"],
  get description() {
    return t("查看 API 连接状态与 MCP 服务信息");
  },
  kind: CommandKind.BUILT_IN,
  action: async (context: CommandContext): Promise<MessageActionReturn> => {
    const config = context.services.config;
    if (!config) {
      return {
        type: "message",
        messageType: "error",
        content: t("配置服务不可用"),
      };
    }

    const sections = [
      buildModelProviderInfo(config),
      buildMcpInfo(config),
      buildVisionInfo(config),
      "",
      t(
        "提示: 使用 /mcp 管理 MCP 服务, 使用 /auth 管理认证, 使用 /model 切换模型",
      ),
    ];

    return {
      type: "message",
      messageType: "info",
      content: sections.join("\n"),
    };
  },
  subCommands: [
    {
      name: "reconnect",
      altNames: ["retry"],
      get description() {
        return t("重新连接断开的 MCP 服务");
      },
      kind: CommandKind.BUILT_IN,
      action: async (
        context: CommandContext,
        args: string,
      ): Promise<MessageActionReturn> => {
        const config = context.services.config;
        if (!config) {
          return {
            type: "message",
            messageType: "error",
            content: t("配置服务不可用"),
          };
        }

        const serverName = args.trim();
        const mcpServers = config.getMcpServers() || {};

        const toolRegistry = config.getToolRegistry();

        if (serverName) {
          // Reconnect specific server
          if (!mcpServers[serverName]) {
            return {
              type: "message",
              messageType: "error",
              content: t('MCP 服务 "{{name}}" 不存在', { name: serverName }),
            };
          }
          try {
            await toolRegistry.discoverToolsForServer(serverName);
            return {
              type: "message",
              messageType: "info",
              content: t("已重新连接 MCP 服务: {{name}}", { name: serverName }),
            };
          } catch {
            return {
              type: "message",
              messageType: "error",
              content: t('重新连接 MCP 服务 "{{name}}" 失败', {
                name: serverName,
              }),
            };
          }
        } else {
          // Reconnect all disconnected servers
          const disconnected: string[] = [];
          for (const [name] of Object.entries(mcpServers)) {
            if (config.isMcpServerDisabled(name)) continue;
            const status = getMCPServerStatus(name);
            if (status === MCPServerStatus.DISCONNECTED) {
              disconnected.push(name);
            }
          }

          if (disconnected.length === 0) {
            return {
              type: "message",
              messageType: "info",
              content: t("所有 MCP 服务均已连接，无需重连"),
            };
          }

          for (const name of disconnected) {
            try {
              await toolRegistry.discoverToolsForServer(name);
            } catch {
              // continue with others
            }
          }

          return {
            type: "message",
            messageType: "info",
            content: t("已重新连接 {{count}} 个断开的 MCP 服务: {{names}}", {
              count: String(disconnected.length),
              names: disconnected.join(", "),
            }),
          };
        }
      },
    },
  ],
};
