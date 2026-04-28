/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from "node:fs";
import type { FunctionDeclaration } from "@google/genai";
import { ToolDisplayNames, ToolNames } from "./tool-names.js";
import type { ToolResult } from "./tools.js";
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import { safeJsonStringify } from "../utils/safeJsonStringify.js";
import { createDebugLogger } from "../utils/debugLogger.js";

const debugLogger = createDebugLogger("SHARE_LOG");

export interface ShareLogParams {
  /** Path to the log file, or raw log content */
  content: string;
  /** Whether 'content' is a file path (true) or raw text (false). Default: true */
  isFilePath?: boolean;
  /** Source label, e.g. domain or software name */
  source?: string;
  /** Optional metadata entries to attach to the log */
  metadata?: Array<{
    key: string;
    value: string | number | boolean | null;
    label?: string;
    visible?: boolean;
  }>;
}

const description =
  "Share a log file to mclo.gs (Minecraft log sharing service). Can accept a file path or raw log content. Returns a shareable URL for the uploaded log. Useful for sharing crash logs, server logs, or debug output.";

const schema: FunctionDeclaration = {
  name: ToolNames.SHARE_LOG,
  description,
  parametersJsonSchema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      content: {
        type: "string",
        description:
          "File path to log file, or raw log content string. Set isFilePath=false if providing raw text.",
      },
      isFilePath: {
        type: "boolean",
        description:
          "If true (default), content is treated as a file path. If false, content is raw log text.",
      },
      source: {
        type: "string",
        description:
          'Source label for the log, e.g. "minecraft-server" or a domain name.',
      },
      metadata: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: {},
            label: { type: "string" },
            visible: { type: "boolean" },
          },
          required: ["key", "value"],
        },
        description: "Optional metadata entries to display on the log page.",
      },
    },
    required: ["content"],
    additionalProperties: false,
  },
};

class ShareLogInvocation extends BaseToolInvocation<
  ShareLogParams,
  ToolResult
> {
  getDescription(): string {
    const isFile = this.params.isFilePath !== false;
    return isFile
      ? `Share log file: ${this.params.content}`
      : `Share log content (${this.params.content.length} chars)`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      let logContent: string;

      if (this.params.isFilePath !== false) {
        // Read log from file
        try {
          logContent = await fs.readFile(this.params.content, "utf-8");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            llmContent: `Failed to read log file: ${msg}`,
            returnDisplay: `Failed to read log file: ${msg}`,
          };
        }
      } else {
        logContent = this.params.content;
      }

      if (!logContent || logContent.trim().length === 0) {
        return {
          llmContent: "Log content is empty, nothing to share.",
          returnDisplay: "Log content is empty, nothing to share.",
        };
      }

      // Truncate to mclo.gs limits: 10 MiB / 25000 lines
      const MAX_BYTES = 10 * 1024 * 1024;
      const MAX_LINES = 25000;
      const lines = logContent.split("\n");
      if (lines.length > MAX_LINES) {
        logContent = lines.slice(0, MAX_LINES).join("\n");
      }
      if (Buffer.byteLength(logContent, "utf-8") > MAX_BYTES) {
        // Binary-safe truncation
        const buf = Buffer.from(logContent, "utf-8");
        logContent = buf.subarray(0, MAX_BYTES).toString("utf-8");
      }

      // Build request body
      const body: Record<string, unknown> = {
        content: logContent,
      };
      if (this.params.source) {
        body["source"] = this.params.source;
      }
      if (this.params.metadata && this.params.metadata.length > 0) {
        body["metadata"] = this.params.metadata;
      }

      const response = await fetch("https://api.mclo.gs/1/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(
          `mclo.gs API error: ${response.status} ${response.statusText}`,
        );
      }

      const result = (await response.json()) as {
        success: boolean;
        id?: string;
        url?: string;
        raw?: string;
        error?: string;
        lines?: number;
        size?: number;
      };

      if (!result.success) {
        return {
          llmContent: `mclo.gs upload failed: ${result.error || "Unknown error"}`,
          returnDisplay: `mclo.gs upload failed: ${result.error || "Unknown error"}`,
        };
      }

      const display = [
        `Log shared successfully!`,
        `URL: ${result.url}`,
        `Raw: ${result.raw}`,
        `Lines: ${result.lines ?? "N/A"}`,
        `Size: ${result.size != null ? `${(result.size / 1024).toFixed(1)} KB` : "N/A"}`,
      ].join("\n");

      return {
        llmContent: safeJsonStringify({
          success: true,
          url: result.url,
          raw: result.raw,
          id: result.id,
          lines: result.lines,
          size: result.size,
        }),
        returnDisplay: display,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debugLogger.warn("Share log failed:", errorMessage);
      return {
        llmContent: `Share log error: ${errorMessage}`,
        returnDisplay: `Share log error: ${errorMessage}`,
      };
    }
  }
}

export class ShareLogTool extends BaseDeclarativeTool<
  ShareLogParams,
  ToolResult
> {
  static readonly Name = ToolNames.SHARE_LOG;

  constructor() {
    super(
      ToolNames.SHARE_LOG,
      ToolDisplayNames.SHARE_LOG,
      description,
      Kind.Fetch,
      schema.parametersJsonSchema as Record<string, unknown>,
      true,
      false,
      false,
    );
  }

  override validateToolParamValues(params: ShareLogParams): string | null {
    if (!params.content || params.content.trim().length === 0) {
      return "content parameter is required and cannot be empty.";
    }
    return null;
  }

  override createInvocation(params: ShareLogParams) {
    return new ShareLogInvocation(params);
  }
}
