/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import { ToolNames, ToolDisplayNames } from "./tool-names.js";
import type { ToolResult, ToolResultDisplay } from "./tools.js";
import type { Config } from "../config/config.js";
import { getCurrentGeminiMdFilename, TRAM_CONFIG_DIR } from "./memoryTool.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { createDebugLogger } from "../utils/debugLogger.js";

const debugLogger = createDebugLogger("INIT_PROJECT");

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InitProjectParams {}

/**
 * Tool that initializes a project by creating the TRAM.md context file.
 * This tool creates the .tram/ directory and an empty context file,
 * then returns instructions for the LM to explore the repository and populate it.
 */
export class InitProjectTool extends BaseDeclarativeTool<
  InitProjectParams,
  ToolResult
> {
  static readonly Name: string = ToolNames.INIT_PROJECT;

  constructor(private readonly config: Config) {
    super(
      InitProjectTool.Name,
      ToolDisplayNames.INIT_PROJECT,
      "Initialize a project by analyzing the repository and generating a TRAM.md context file. Use this when no project memory is loaded or when the user wants to (re)generate TRAM.md.",
      Kind.Edit,
      {
        type: "object",
        properties: {},
        additionalProperties: false,
        $schema: "http://json-schema.org/draft-07/schema#",
      },
      false,
      false,
    );
  }

  protected createInvocation(params: InitProjectParams) {
    return new InitProjectInvocation(this.config, params);
  }
}

class InitProjectInvocation extends BaseToolInvocation<
  InitProjectParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: InitProjectParams,
  ) {
    super(params);
  }

  getDescription(): string {
    return "Initialize project context (TRAM.md)";
  }

  async shouldConfirmExecute(): Promise<false> {
    return false;
  }

  async execute(
    _signal?: AbortSignal,
    _updateOutput?: (output: ToolResultDisplay) => void,
  ): Promise<ToolResult> {
    try {
      const targetDir = this.config.getWorkingDir();
      const contextFileName = getCurrentGeminiMdFilename();
      const contextFileDir = path.join(targetDir, TRAM_CONFIG_DIR);
      const contextFilePath = path.join(contextFileDir, contextFileName);

      // Create .tram/ directory
      fs.mkdirSync(contextFileDir, { recursive: true });

      // Check if file already exists with content
      let alreadyExists = false;
      if (fs.existsSync(contextFilePath)) {
        try {
          const existing = fs.readFileSync(contextFilePath, "utf8");
          if (existing && existing.trim().length > 0) {
            alreadyExists = true;
          }
        } catch {
          // If we fail to read, proceed to (re)create
        }
      }

      // Create or overwrite with empty file
      fs.writeFileSync(contextFilePath, "", "utf8");

      debugLogger.info(
        `${alreadyExists ? "Reset" : "Created"} ${contextFileName} at ${contextFilePath}`,
      );

      const instructions = `Project initialization started. ${alreadyExists ? `Existing ${contextFileName} has been reset.` : `Empty ${contextFileName} created at ${contextFilePath}.`}

Now analyze the repository and populate ${contextFilePath} with comprehensive project context.

You must execute this with a subagent-first workflow:
1. The main agent acts as orchestrator and quality gate.
2. Delegate repository exploration and first-draft writing to the ${ToolNames.TASK} tool with an available subagent type.
3. Prefer subagent_type = "general-purpose" when available.
4. Pass along relevant main-agent context in the task prompt, including:
   - current user goals from this conversation,
   - explicit constraints and preferences,
   - important conventions already discovered,
   - target output path: ${contextFilePath}.
5. After subagent completion, perform targeted review/fixes only.

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
- Ensure ${contextFilePath} contains the final version of ${contextFileName}.`;

      return {
        llmContent: instructions,
        returnDisplay: `${alreadyExists ? "Reset" : "Created"} ${contextFileName}. Now analyzing project...`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debugLogger.error(`Failed to initialize project: ${errorMessage}`);
      return {
        llmContent: `Failed to initialize project: ${errorMessage}`,
        returnDisplay: `Failed to initialize project: ${errorMessage}`,
      };
    }
  }
}
