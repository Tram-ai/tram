/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolInvocation,
  type ToolResult,
} from './tools.js';
import type { Config } from '../config/config.js';
import { ToolDisplayNames, ToolNames } from './tool-names.js';
import { DEFAULT_TRAM_FLASH_MODEL } from '../config/models.js';
import { getResponseText } from '../utils/partUtils.js';
import { ToolErrorType } from './tool-error.js';
import { getErrorMessage } from '../utils/errors.js';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { resolveLogVariable } from '../services/serviceRuntimeManager.js';
import { isSubpath } from '../utils/paths.js';
import { Storage } from '../config/storage.js';

const DEFAULT_MAX_INPUT_CHARS = 12000;
const SUBLM_PROMPT_ID_SUFFIX = ':sublm';
const DEFAULT_SYSTEM_PROMPT =
  'You are a careful sub-model. Follow the user prompt exactly. Only use provided materials. If information is missing, explicitly state that it is not present in the provided input.';

export interface SubLmParams {
  systemPrompt?: string;
  userPrompt: string;
  filePaths?: string[];
  inlineContent?: string;
  maxInputChars?: number;
  model?: string;
}

class SubLmToolInvocation extends BaseToolInvocation<SubLmParams, ToolResult> {
  constructor(
    private readonly config: Config,
    params: SubLmParams,
  ) {
    super(params);
  }

  override getDescription(): string {
    const fileCount = this.params.filePaths?.length ?? 0;
    return `Run reduced-context sub-model call (files: ${fileCount}, hasInlineContent: ${Boolean(this.params.inlineContent)}).`;
  }

  private resolveAndValidatePath(filePath: string): string {
    const trimmedPath = filePath.trim();

    // Resolve $LOG_xxx variable names to actual file paths
    const resolved = resolveLogVariable(trimmedPath, this.config.storage.getProjectTempDir());
    const targetPath = resolved ?? trimmedPath;

    const absolutePath = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(this.config.getTargetDir(), targetPath);

    const workspaceContext = this.config.getWorkspaceContext();
    const globalTempDir = Storage.getGlobalTempDir();
    const projectTempDir = this.config.storage.getProjectTempDir();
    const isWithinTempDir =
      isSubpath(projectTempDir, absolutePath) ||
      isSubpath(globalTempDir, absolutePath);
    if (!workspaceContext.isPathWithinWorkspace(absolutePath) && !isWithinTempDir) {
      const directories = workspaceContext.getDirectories();
      throw new Error(
        `File path must be within one of the workspace directories: ${directories.join(', ')}`,
      );
    }

    const fileService = this.config.getFileService();
    if (fileService.shouldTramIgnoreFile(absolutePath)) {
      throw new Error(`File path '${trimmedPath}' is ignored by .tramignore pattern(s).`);
    }

    return absolutePath;
  }

  private appendByBudget(
    content: string,
    state: { usedChars: number; maxInputChars: number },
  ): string {
    if (state.usedChars >= state.maxInputChars) {
      return '';
    }
    const remain = state.maxInputChars - state.usedChars;
    const clipped = content.slice(0, remain);
    state.usedChars += clipped.length;
    return clipped;
  }

  private async buildInputMaterials(maxInputChars: number): Promise<{
    inputText: string;
    truncated: boolean;
    warnings: string[];
  }> {
    const sections: string[] = [];
    const warnings: string[] = [];
    const state = { usedChars: 0, maxInputChars };
    let truncated = false;

    if (this.params.inlineContent?.trim()) {
      const inlineSection = `Inline content:\n${this.params.inlineContent.trim()}\n`;
      const clipped = this.appendByBudget(inlineSection, state);
      if (clipped.length < inlineSection.length) {
        truncated = true;
      }
      if (clipped) {
        sections.push(clipped);
      }
    }

    for (const rawPath of this.params.filePaths ?? []) {
      try {
        const absolutePath = this.resolveAndValidatePath(rawPath);
        const fileContent = await readFile(absolutePath, 'utf8');
        const fileSection = `File: ${absolutePath}\n${fileContent}\n`;
        const clipped = this.appendByBudget(fileSection, state);
        if (clipped.length < fileSection.length) {
          truncated = true;
        }
        if (clipped) {
          sections.push(clipped);
        }
        if (state.usedChars >= state.maxInputChars) {
          truncated = true;
          break;
        }
      } catch (error) {
        warnings.push(`Failed to read '${rawPath}': ${getErrorMessage(error)}`);
      }
    }

    return {
      inputText: sections.join('\n\n'),
      truncated,
      warnings,
    };
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const maxInputChars = this.params.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS;
    const systemPrompt =
      this.params.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;

    const { inputText, truncated, warnings } = await this.buildInputMaterials(
      maxInputChars,
    );

    if (!inputText.trim()) {
      const reason =
        warnings.length > 0
          ? `No readable content was collected. ${warnings.join(' | ')}`
          : 'No readable content was collected from inlineContent or filePaths.';
      return {
        llmContent: `Error: ${reason}`,
        returnDisplay: reason,
        error: {
          message: reason,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }

    const prompt = [this.params.userPrompt.trim(), '', 'Provided input:', inputText].join('\n');

    const model =
      this.params.model || this.config.getModel() || DEFAULT_TRAM_FLASH_MODEL;

    try {
      const subLmPromptId = `${this.config.getSessionId()}${SUBLM_PROMPT_ID_SUFFIX}`;
      const response = await this.config.getContentGenerator().generateContent(
        {
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            abortSignal: signal,
            temperature: 0,
            systemInstruction: systemPrompt,
          },
        },
        subLmPromptId,
      );

      const summary = getResponseText(response)?.trim() || '';
      const truncationNote = truncated
        ? `\n\n[Input was truncated to ${maxInputChars} characters.]`
        : '';
      const warningNote =
        warnings.length > 0 ? `\n\n[Warnings] ${warnings.join(' | ')}` : '';

      return {
        llmContent: summary,
        returnDisplay: `${summary}${truncationNote}${warningNote}`,
      };
    } catch (error) {
      const errorMessage = `SubLM generation failed: ${getErrorMessage(error)}`;
      return {
        llmContent: `Error: ${errorMessage}`,
        returnDisplay: errorMessage,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
}

export class SubLmTool extends BaseDeclarativeTool<SubLmParams, ToolResult> {
  static readonly Name: string = ToolNames.SUBLM;

  constructor(private readonly config: Config) {
    super(
      SubLmTool.Name,
      ToolDisplayNames.SUBLM,
      'Runs a sub-model call with custom system/user prompts and optional file paths. The tool reads files internally and sends only compacted input to reduce main-conversation context usage, then returns the summarized result back to the current model.',
      Kind.Think,
      {
        type: 'object',
        properties: {
          systemPrompt: {
            type: 'string',
            description:
              'Optional system prompt for sub-model behavior. If omitted, a strict anti-hallucination system prompt is used.',
          },
          userPrompt: {
            type: 'string',
            description:
              'User prompt for the sub-model task, for example: "Summarize key errors and root causes in bullet points."',
          },
          filePaths: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Optional list of file paths (absolute or workspace-relative). Files are read inside the tool and clipped by maxInputChars budget.',
          },
          inlineContent: {
            type: 'string',
            description:
              'Optional raw text content to include along with files. Useful for direct snippets.',
          },
          maxInputChars: {
            type: 'number',
            description:
              'Optional maximum number of input characters sent to sub-model. Default: 12000.',
          },
          model: {
            type: 'string',
            description:
              'Optional model override for sub-model call. If omitted, uses current model.',
          },
        },
        required: ['userPrompt'],
        additionalProperties: false,
      },
    );
  }

  protected override validateToolParamValues(params: SubLmParams): string | null {
    if (!params.userPrompt || params.userPrompt.trim() === '') {
      return "The 'userPrompt' parameter cannot be empty.";
    }
    const hasInline = Boolean(params.inlineContent && params.inlineContent.trim());
    const hasPaths = Boolean(params.filePaths && params.filePaths.length > 0);
    if (!hasInline && !hasPaths) {
      return "At least one of 'inlineContent' or 'filePaths' must be provided.";
    }
    if (params.filePaths) {
      if (!Array.isArray(params.filePaths)) {
        return "The 'filePaths' parameter must be an array of strings when provided.";
      }
      if (params.filePaths.length > 50) {
        return "The 'filePaths' parameter cannot include more than 50 paths.";
      }
      if (params.filePaths.some((p) => typeof p !== 'string' || p.trim() === '')) {
        return "Each item in 'filePaths' must be a non-empty string.";
      }
    }
    if (params.maxInputChars !== undefined) {
      if (!Number.isInteger(params.maxInputChars) || params.maxInputChars <= 0) {
        return "The 'maxInputChars' parameter must be a positive integer when provided.";
      }
      if (params.maxInputChars > 100000) {
        return "The 'maxInputChars' parameter cannot exceed 100000.";
      }
    }

    return null;
  }

  protected createInvocation(
    params: SubLmParams,
  ): ToolInvocation<SubLmParams, ToolResult> {
    return new SubLmToolInvocation(this.config, params);
  }
}
