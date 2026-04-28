/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  CommandContext,
  SlashCommand,
  SlashCommandActionReturn,
} from "./types.js";
import { getCurrentGeminiMdFilename } from "@tram-ai/tram-core";
import { CommandKind } from "./types.js";
import { Text } from "ink";
import React from "react";
import { t } from "../../i18n/index.js";

export const initCommand: SlashCommand = {
  name: "init",
  get description() {
    return t("Analyzes the project and creates a tailored TRAM.md file.");
  },
  kind: CommandKind.BUILT_IN,
  action: async (
    context: CommandContext,
    _args: string,
  ): Promise<SlashCommandActionReturn> => {
    if (!context.services.config) {
      return {
        type: "message",
        messageType: "error",
        content: t("Configuration not available."),
      };
    }
    const targetDir = context.services.config.getTargetDir();
    const contextFileName = getCurrentGeminiMdFilename();
    const contextFileDir = path.join(targetDir, ".tram");
    const contextFilePath = path.join(contextFileDir, contextFileName);

    try {
      fs.mkdirSync(contextFileDir, { recursive: true });

      if (fs.existsSync(contextFilePath)) {
        // If file exists but is empty (or whitespace), continue to initialize
        try {
          const existing = fs.readFileSync(contextFilePath, "utf8");
          if (existing && existing.trim().length > 0) {
            // File exists and has content - ask for confirmation to overwrite
            if (!context.overwriteConfirmed) {
              return {
                type: "confirm_action",
                // TODO: Move to .tsx file to use JSX syntax instead of React.createElement
                // For now, using React.createElement to maintain .ts compatibility for PR review
                prompt: React.createElement(
                  Text,
                  null,
                  `A ${contextFileName} file already exists in this directory. Do you want to regenerate it?`,
                ),
                originalInvocation: {
                  raw: context.invocation?.raw || "/init",
                },
              };
            }
            // User confirmed overwrite, continue with regeneration
          }
        } catch {
          // If we fail to read, conservatively proceed to (re)create the file
        }
      }

      // Ensure an empty context file exists before prompting the model to populate it
      try {
        fs.writeFileSync(contextFilePath, "", "utf8");
        context.ui.addItem(
          {
            type: "info",
            text: `Empty ${contextFileName} created. Now analyzing the project to populate it.`,
          },
          Date.now(),
        );
      } catch (err) {
        return {
          type: "message",
          messageType: "error",
          content: `Failed to create ${contextFileName}: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    } catch (error) {
      return {
        type: "message",
        messageType: "error",
        content: `Unexpected error preparing ${contextFileName}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    return {
      type: "submit_prompt",
      content: `
  You are TRAM, an interactive CLI agent. Analyze the current directory and generate a comprehensive ${contextFileName} file to be used as instructional context for future interactions.

  CRITICAL: Prevent main-agent context pollution.

  You must execute /init with a subagent-first workflow:
  1. The main agent acts as orchestrator and quality gate.
  2. The main agent must delegate repository exploration and first-draft writing to the task tool with an available subagent type.
  3. Prefer subagent_type = "general-purpose" when available.
  4. The main agent must pass along relevant main-agent context in the task prompt, including:
     - current user goals from this conversation,
     - explicit constraints and preferences,
     - important conventions already discovered,
     - target output path: ${contextFilePath}.
  5. After subagent completion, the main agent performs targeted review/fixes only.

  Subagent task requirements:
  - Explore repository structure and key files (README, manifests, build scripts, test config, entrypoints).
  - Infer project type and workflows using evidence, not guesses.
  - Write the complete ${contextFileName} content to ${contextFilePath} in Markdown.

  ${contextFileName} content requirements:

  For code projects, include:
  - Project overview (purpose, stack, architecture).
  - Build/run/test commands with exact command lines when discoverable.
  - Development conventions (style, testing patterns, contribution cues).
  - Repository-specific operational guardrails.

  For non-code projects, include:
  - Directory overview and primary purpose.
  - Key files and what they contain.
  - How the material should be used and maintained.

  Quality rules:
  - Do not hallucinate commands; use TODO markers when evidence is missing.
  - Keep it concise but actionable.
  - Do not dump the full document in chat unless asked.

  Final step:
  - Ensure ${contextFilePath} contains the final version of ${contextFileName}.
`,
    };
  },
};
