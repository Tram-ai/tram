/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import mime from "mime/lite";

import { ToolDisplayNames, ToolNames } from "./tool-names.js";
import type { ToolInvocation, ToolLocation, ToolResult } from "./tools.js";
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import type { PermissionDecision } from "../permissions/types.js";
import type { Config } from "../config/config.js";
import { Storage } from "../config/storage.js";
import { isSubpath, isSubpaths } from "../utils/paths.js";
import { createDebugLogger } from "../utils/debugLogger.js";
import {
  understandImage,
  type ImageUnderstandMode,
} from "../services/siliconFlowFallback.js";

const debugLogger = createDebugLogger("OCR_TOOL");

const SUPPORTED_IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
]);

const MAX_FILE_SIZE_BYTES = 9.9 * 1024 * 1024; // ~10MB, leave margin for base64

export interface OcrToolParams {
  /** Absolute path to the image file. */
  file_path: string;
  /**
   * Operation mode.
   * - "extract":   pure OCR — extract all text verbatim from the image.
   * - "summarize": describe / summarize the image content in natural
   *                language (objects, scene, charts, UI, gist of text,
   *                likely intent). Default.
   */
  mode?: ImageUnderstandMode;
  /**
   * Optional custom prompt. When provided, it overrides the built-in prompt
   * for the chosen mode. Useful for targeted questions like
   * "What error message is shown in this screenshot?".
   */
  prompt?: string;
}

class OcrToolInvocation extends BaseToolInvocation<OcrToolParams, ToolResult> {
  constructor(
    private config: Config,
    params: OcrToolParams,
  ) {
    super(params);
  }

  getDescription(): string {
    const mode = this.params.mode ?? "summarize";
    const base = path.basename(this.params.file_path);
    return `${mode === "extract" ? "OCR" : "Summarize"} image: ${base}`;
  }

  override toolLocations(): ToolLocation[] {
    return [{ path: this.params.file_path }];
  }

  /**
   * Mirror `read_file` permission policy: in-workspace / temp / user
   * skill / extension paths are auto-allowed; anything else needs user
   * confirmation.
   */
  override async getDefaultPermission(): Promise<PermissionDecision> {
    const filePath = path.resolve(this.params.file_path);
    const workspaceContext = this.config.getWorkspaceContext();
    const globalTempDir = Storage.getGlobalTempDir();
    const projectTempDir = this.config.storage.getProjectTempDir();
    const userSkillsDirs = this.config.storage.getUserSkillsDirs();
    const userExtensionsDir = Storage.getUserExtensionsDir();
    const osTempDir = os.tmpdir();

    if (
      workspaceContext.isPathWithinWorkspace(filePath) ||
      isSubpath(projectTempDir, filePath) ||
      isSubpath(globalTempDir, filePath) ||
      isSubpath(osTempDir, filePath) ||
      isSubpaths(userSkillsDirs, filePath) ||
      isSubpath(userExtensionsDir, filePath)
    ) {
      return "allow";
    }
    return "ask";
  }

  async execute(): Promise<ToolResult> {
    const filePath = this.params.file_path;
    const mode: ImageUnderstandMode = this.params.mode ?? "summarize";

    // 1) Existence + type
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(filePath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        llmContent: `OCR error: cannot access file '${filePath}': ${msg}`,
        returnDisplay: `Error: cannot access ${filePath}`,
        error: { message: msg },
      };
    }
    if (!stat.isFile()) {
      return {
        llmContent: `OCR error: '${filePath}' is not a regular file.`,
        returnDisplay: `Error: not a file`,
        error: { message: "Not a regular file" },
      };
    }
    if (stat.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
      return {
        llmContent: `OCR error: file too large (${sizeMb}MB, limit 10MB): ${filePath}`,
        returnDisplay: `Error: image > 10MB`,
        error: { message: `File too large: ${sizeMb}MB` },
      };
    }

    // 2) Must be an image
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_IMAGE_EXTS.has(ext)) {
      return {
        llmContent:
          `OCR error: unsupported file type '${ext || "(no ext)"}'. ` +
          `Supported: ${[...SUPPORTED_IMAGE_EXTS].join(", ")}`,
        returnDisplay: `Error: unsupported image type`,
        error: { message: `Unsupported file type: ${ext}` },
      };
    }

    // 3) API key
    const apiKey = this.config.getSiliconFlowApiKey();
    if (!apiKey) {
      return {
        llmContent:
          "OCR error: SiliconFlow API key is not configured. " +
          "Set 'siliconFlowApiKey' in your settings to enable image " +
          "understanding (OCR / summarization).",
        returnDisplay: "Error: SiliconFlow API key missing",
        error: { message: "Missing siliconFlowApiKey" },
      };
    }

    // 4) Read + base64-encode + call SiliconFlow
    let base64Data: string;
    let mimeType: string;
    try {
      const buf = await fs.promises.readFile(filePath);
      base64Data = buf.toString("base64");
      mimeType = mime.getType(filePath) || "application/octet-stream";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        llmContent: `OCR error: failed to read image: ${msg}`,
        returnDisplay: `Error reading image`,
        error: { message: msg },
      };
    }

    const displayName = path.basename(filePath);
    debugLogger.info(
      `Running image understanding (mode=${mode}) on: ${displayName}`,
    );

    const result = await understandImage(
      apiKey,
      base64Data,
      mimeType,
      displayName,
      { mode, prompt: this.params.prompt },
    );

    return {
      llmContent: result,
      returnDisplay:
        mode === "extract"
          ? `OCR (Qwen3.5-4B): ${displayName}`
          : `Image summary (Qwen3.5-4B): ${displayName}`,
    };
  }
}

export class OcrTool extends BaseDeclarativeTool<OcrToolParams, ToolResult> {
  static readonly Name: string = ToolNames.OCR;

  constructor(private config: Config) {
    super(
      OcrTool.Name,
      ToolDisplayNames.OCR,
      `Analyse an image file via a vision model (Qwen/Qwen3.5-4B on SiliconFlow). Two modes are supported:

- mode="extract": pure OCR. Extract all text content from the image verbatim, preserving layout.
- mode="summarize" (default): describe and summarize the image content in natural language (scene, objects, UI elements, charts, gist of any text, likely intent). This is more useful when the image is not primarily a wall of text — e.g. screenshots, diagrams, photos, error dialogs.

You may also supply a custom 'prompt' to ask a specific question about the image (e.g. "What error message is shown?"). When 'prompt' is set it overrides the built-in mode prompt.

Supported formats: PNG, JPG/JPEG, GIF, WEBP, BMP. Max size 10MB. Requires 'siliconFlowApiKey' to be configured.`,
      Kind.Read,
      {
        type: "object",
        properties: {
          file_path: {
            type: "string",
            description:
              "Absolute path to the image file (e.g., '/home/user/screenshot.png'). Relative paths are not supported.",
          },
          mode: {
            type: "string",
            enum: ["extract", "summarize"],
            description:
              "Operation mode. 'extract' = pure OCR (text extraction only). 'summarize' = natural-language description of the image content (default).",
          },
          prompt: {
            type: "string",
            description:
              "Optional custom prompt to ask a specific question about the image. When provided, overrides the default prompt of the chosen mode.",
          },
        },
        required: ["file_path"],
        additionalProperties: false,
      },
    );
  }

  protected override validateToolParamValues(
    params: OcrToolParams,
  ): string | null {
    if (!params.file_path || params.file_path.trim() === "") {
      return "The 'file_path' parameter must be a non-empty string.";
    }
    if (!path.isAbsolute(params.file_path)) {
      return `File path must be absolute, but was relative: ${params.file_path}`;
    }
    if (
      params.mode !== undefined &&
      params.mode !== "extract" &&
      params.mode !== "summarize"
    ) {
      return `Invalid mode '${params.mode}'. Allowed: 'extract', 'summarize'.`;
    }
    return null;
  }

  protected createInvocation(
    params: OcrToolParams,
  ): ToolInvocation<OcrToolParams, ToolResult> {
    return new OcrToolInvocation(this.config, params);
  }
}
