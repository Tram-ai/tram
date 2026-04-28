//TRAM Core by GeminiCLI
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { ToolNames } from "../tools/tool-names.js";
import process from "node:process";
import { TRAM_CONFIG_DIR } from "../tools/memoryTool.js";
import type { GenerateContentConfig } from "@google/genai";
import { createDebugLogger } from "../utils/debugLogger.js";

const debugLogger = createDebugLogger("PROMPTS");

export function resolvePathFromEnv(envVar?: string): {
  isSwitch: boolean;
  value: string | null;
  isDisabled: boolean;
} {
  // Handle the case where the environment variable is not set, empty, or just whitespace.
  const trimmedEnvVar = envVar?.trim();
  if (!trimmedEnvVar) {
    return { isSwitch: false, value: null, isDisabled: false };
  }

  const lowerEnvVar = trimmedEnvVar.toLowerCase();
  // Check if the input is a common boolean-like string.
  if (["0", "false", "1", "true"].includes(lowerEnvVar)) {
    // If so, identify it as a "switch" and return its value.
    const isDisabled = ["0", "false"].includes(lowerEnvVar);
    return { isSwitch: true, value: lowerEnvVar, isDisabled };
  }

  // If it's not a switch, treat it as a potential file path.
  let customPath = trimmedEnvVar;

  // Safely expand the tilde (~) character to the user's home directory.
  if (customPath.startsWith("~/") || customPath === "~") {
    try {
      const home = os.homedir(); // This is the call that can throw an error.
      if (customPath === "~") {
        customPath = home;
      } else {
        customPath = path.join(home, customPath.slice(2));
      }
    } catch (error) {
      // If os.homedir() fails, we catch the error instead of crashing.
      debugLogger.warn(
        `Could not resolve home directory for path: ${trimmedEnvVar}`,
        error,
      );
      // Return null to indicate the path resolution failed.
      return { isSwitch: false, value: null, isDisabled: false };
    }
  }

  // Return it as a non-switch with the fully resolved absolute path.
  return {
    isSwitch: false,
    value: path.resolve(customPath),
    isDisabled: false,
  };
}

/**
 * Generates a system reminder about an active Arena session.
 *
 * @param configFilePath - Absolute path to the arena session's `config.json`
 * @returns A formatted system reminder string wrapped in XML tags
 */
export function getArenaSystemReminder(configFilePath: string): string {
  return `<system-reminder>An Arena session is active. For details, read: ${configFilePath}. This message is for internal use only. Do not mention this to user in your response.</system-reminder>`;
}
/**
 * Processes a custom system instruction by appending user memory if available.
 * This function should only be used when there is actually a custom instruction.
 *
 * @param customInstruction - Custom system instruction (ContentUnion from @google/genai)
 * @param userMemory - User memory to append
 * @returns Processed custom system instruction with user memory appended
 */
export function getCustomSystemPrompt(
  customInstruction: GenerateContentConfig["systemInstruction"],
  userMemory?: string,
  appendInstruction?: string,
): string {
  // Extract text from custom instruction
  let instructionText = "";

  if (typeof customInstruction === "string") {
    instructionText = customInstruction;
  } else if (Array.isArray(customInstruction)) {
    // PartUnion[]
    instructionText = customInstruction
      .map((part) => (typeof part === "string" ? part : part.text || ""))
      .join("");
  } else if (customInstruction && "parts" in customInstruction) {
    // Content
    instructionText =
      customInstruction.parts
        ?.map((part) => (typeof part === "string" ? part : part.text || ""))
        .join("") || "";
  } else if (customInstruction && "text" in customInstruction) {
    // PartUnion (single part)
    instructionText = customInstruction.text || "";
  }

  // Append user memory using the same pattern as getCoreSystemPrompt

  // Append user memory using the same pattern as getCoreSystemPrompt
  const memorySuffix = buildSystemPromptSuffix(userMemory);

  return `${instructionText}${memorySuffix}${buildSystemPromptSuffix(appendInstruction)}`;
}

function buildSystemPromptSuffix(text?: string): string {
  const trimmed = text?.trim();
  return trimmed ? `\n\n---\n\n${trimmed}` : "";
}

export function getCoreSystemPrompt(
  userMemory?: string,
  model?: string,
  appendInstruction?: string,
  omitToolInstructions?: boolean,
): string {
  // if TRAM_SYSTEM_MD is set (and not 0|false), override system prompt from file
  // default path is .tram/system.md but can be modified via custom path in TRAM_SYSTEM_MD
  let systemMdEnabled = false;
  // The default path for the system prompt file. This can be overridden.
  let systemMdPath = path.resolve(path.join(TRAM_CONFIG_DIR, "system.md"));
  // Resolve the environment variable to get either a path or a switch value.
  const systemMdResolution = resolvePathFromEnv(process.env["TRAM_SYSTEM_MD"]);

  // Proceed only if the environment variable is set and is not disabled.
  if (systemMdResolution.value && !systemMdResolution.isDisabled) {
    systemMdEnabled = true;

    // We update systemMdPath to this new custom path.
    if (!systemMdResolution.isSwitch) {
      systemMdPath = systemMdResolution.value;
    }

    // require file to exist when override is enabled
    if (!fs.existsSync(systemMdPath)) {
      throw new Error(`missing system prompt file '${systemMdPath}'`);
    }
  }

  const basePrompt = systemMdEnabled
    ? fs.readFileSync(systemMdPath, "utf8")
    : `
You are TRAM, an interactive CLI agent specialized in Minecraft server operations and management.

Primary focus:
- Minecraft server operations and maintenance (运维): server deployment, version management, mod/plugin installation, configuration, logs, performance tuning, and reliability.
- General server operations: process/service lifecycle, runtime config, and system maintenance.

# Core Rules

- **Read Before Edit:** Inspect relevant files first, then make the smallest safe change.
- **Risk Awareness:** Explain impact before risky actions (service restart, destructive file operations, force git actions, external side effects).
- **Truthful Verification:** Never claim tests/build/validation succeeded unless you actually ran them.
- **No Unauthorized Reverts:** Never revert user changes unless the user explicitly asks.
- **Secure By Default:** Keep secrets out of logs, code, and commits.

# Execution Patterns

- **Task Tracking:** Use ${ToolNames.TODO_WRITE} frequently for non-trivial work, keep statuses up to date.
- **Tool-First Execution:** Prefer direct tool execution over long narration, and parallelize independent read-only exploration.
- **Subagent Delegation:** Delegate heavy exploration or specialized analysis to ${ToolNames.TASK} when appropriate.
- **Clarify Only When Blocking:** Ask with ${ToolNames.ASK_USER_QUESTION} when a decision is genuinely blocking progress.

# Persistent Context And /init

- **Per-Turn Memory:** Treat hierarchical memory from TRAM.md and related files as mandatory context each turn.
- **Proactive Suggestion:** If hierarchical memory is empty in a newly initialized repository, proactively use the ${ToolNames.INIT_PROJECT} tool to analyze the project and generate TRAM.md.
- **Subagent-First Init:** During init, the main agent orchestrates and quality-checks; delegate deep repository scan and first draft generation via ${ToolNames.TASK} to reduce context pollution.
- **Context Handoff:** Pass user goals, explicit constraints, discovered conventions, and target output path into subagent prompts.

${
  omitToolInstructions
    ? ""
    : `
# Tool Usage Guide

## File & Search
- \`${ToolNames.READ_FILE}\`: Read files (text/image/PDF). Supports offset/limit.
- \`${ToolNames.WRITE_FILE}\`: Create/overwrite files. Auto-creates dirs.
- \`${ToolNames.EDIT}\`: Precise text replacement. Read first, provide 3+ lines context.
- \`${ToolNames.LS}\` / \`${ToolNames.GLOB}\` / \`${ToolNames.GREP}\`: List dirs, find files by glob, search by text/regex.

## Shell & Services
- \`${ToolNames.SHELL}\`: Run commands. \`is_background: true\` for long-running processes.
- \`${ToolNames.SERVICE_MANAGE}\`: Service lifecycle (register/start/stop/restart/remove/list/log/follow/send/alert/analyze). **Important:** When telling users how to manage services via CLI, always refer to the user-facing command as \`/service <action>\`, NOT \`service_manage\`. Example: tell users \`/service follow myserver\`, not \`service_manage follow myserver\`.

## Memory & Tasks
- \`${ToolNames.MEMORY}\`: Persist facts to global (~/TRAM.md) or project (./TRAM.md) scope.
- \`${ToolNames.TODO_WRITE}\`: Track multi-step work.
- \`${ToolNames.TASK}\`: Delegate complex work to subagents.
- \`${ToolNames.ASK_USER_QUESTION}\`: Ask user only when genuinely blocked.

## Analysis
- \`${ToolNames.SUBLM}\`: Route large logs/code (>50 lines) through lightweight model. Mandatory for crash reports and log files.
- \`${ToolNames.REQUEST_LOG_PATTERN}\`: Define regex rules for log filtering.
- \`${ToolNames.SHARE_LOG}\`: Upload logs, generate shareable links.

## Web & Media
- \`${ToolNames.WEB_FETCH}\`: Fetch URL and extract info.
- \`${ToolNames.OPENAPI_LINK_LIST}\`: Discover OpenAPI endpoints.
- \`${ToolNames.VIDEO_TO_AUDIO}\` / \`${ToolNames.MEDIA_COMPRESS}\`: Media conversion and compression.

## Knowledge Base
- \`${ToolNames.KNOWLEDGE_SEARCH}\`: Search offline knowledge base (docs, guides). Supports browse, read, full-text search, and RAG vector search.
- **Proactive usage:** Whenever you are not fully confident about a concept, workflow, configuration, command, or error message that may be covered by docs or guides, **proactively call \`${ToolNames.KNOWLEDGE_SEARCH}\` before responding or acting**. This is especially important for Minecraft concepts, mods, plugins, server software, configuration options, and error messages. Do not guess or rely on potentially outdated training data — verify against the knowledge base first whenever relevant. Also use it to discover relevant docs before attempting any complex Minecraft server task.

## Minecraft
- \`${ToolNames.MINECRAFT_SERVER_INFO}\`: Query server versions, download info, Java requirements, JAR identification by hash, and live server status on localhost or another host. Use \`get-live-status\` when the user wants the state of a running server. **Always use \`get-java-requirements\`** for Java version.
- \`${ToolNames.MOD_SEARCH}\`: Search mods across CurseForge/Modrinth/Hangar/Spigot. Filter by loader/gameVersion. **Always use this tool for spigotmc.org resource URLs** such as https://www.spigotmc.org/resources/574/. SpigotMC itself does not provide the API used here; the lookup is resolved through SpiGet, but the source type exposed to the model is spigot, and such links must not be routed to the ${ToolNames.WEB_FETCH} tool.
- \`${ToolNames.MOD_HASH_LOOKUP}\`: Identify mods by file hash.
- \`${ToolNames.DOWNLOAD_FILE}\`: Download files from URL.
- \`${ToolNames.MODPACK_SERVER_PACK}\`: Analyze modpack for server deployment.

## Planning
- \`${ToolNames.EXIT_PLAN_MODE}\`: Present plan for user approval in plan mode.

`
}
# Server Operations Defaults

- **Working Directory:** Server files go in CWD unless user specifies otherwise.
- **Latest Version:** Default to latest stable. Use \`minecraft_server_info\` -> \`list-versions\` to confirm.
- **Java Version:** Use \`get-java-requirements\` action for accurate Java info. Do NOT hardcode.

# Main Server Identification

1. **Service-First:** Check \`${ToolNames.SERVICE_MANAGE}\` -> \`list\` for registered services.
2. **Hash Verify:** SHA-256 the server JAR -> \`${ToolNames.MINECRAFT_SERVER_INFO}\` -> \`get-by-hash\` to identify exact type/version.
3. **Fallback:** Look for common JAR files (server.jar, paper*.jar) in CWD and identify by hash.

# Interaction Style

- Keep responses concise, direct, and actionable.
- Avoid filler and focus on execution outcomes.
- If blocked, explain briefly and provide the best viable next step.
- Use '/help' for help and '/bug' for feedback.

${(function () {
  // Determine sandbox status based on environment variables
  const isSandboxExec = process.env["SANDBOX"] === "sandbox-exec";
  const isGenericSandbox = !!process.env["SANDBOX"]; // Check if SANDBOX is set to any non-empty value

  if (isSandboxExec) {
    return `
# macOS Seatbelt
You are running under macos seatbelt with limited access to files outside the project directory or system temp directory, and with limited access to host system resources such as ports. If you encounter failures that could be due to MacOS Seatbelt (e.g. if a command fails with 'Operation not permitted' or similar error), as you report the error to the user, also explain why you think it could be due to MacOS Seatbelt, and how the user may need to adjust their Seatbelt profile.
`;
  } else if (isGenericSandbox) {
    return `
# Sandbox
You are running in a sandbox container with limited access to files outside the project directory or system temp directory, and with limited access to host system resources such as ports. If you encounter failures that could be due to sandboxing (e.g. if a command fails with 'Operation not permitted' or similar error), when you report the error to the user, also explain why you think it could be due to sandboxing, and how the user may need to adjust their sandbox configuration.
`;
  } else {
    return `
# Outside of Sandbox
You are running outside of a sandbox container, directly on the user's system. For critical commands that are particularly likely to modify the user's system outside of the project directory or system temp directory, as you explain the command to the user (per the Explain Critical Commands rule above), also remind the user to consider enabling sandboxing.
`;
  }
})()}

${omitToolInstructions ? "" : getToolCallExamples(model || "")}

# Final Reminder
Your core function is efficient and safe assistance. Balance extreme conciseness with the crucial need for clarity, especially regarding safety and potential system modifications. Always prioritize user control and project conventions. Never make assumptions about the contents of files; instead use '${ToolNames.READ_FILE}' to ensure you aren't making broad assumptions. Finally, you are an agent - please keep going until the user's query is completely resolved.
`.trim();

  // if TRAM_WRITE_SYSTEM_MD is set (and not 0|false), write base system prompt to file
  const writeSystemMdResolution = resolvePathFromEnv(
    process.env["TRAM_WRITE_SYSTEM_MD"],
  );

  // Check if the feature is enabled. This proceeds only if the environment
  // variable is set and is not explicitly '0' or 'false'.
  if (writeSystemMdResolution.value && !writeSystemMdResolution.isDisabled) {
    const writePath = writeSystemMdResolution.isSwitch
      ? systemMdPath
      : writeSystemMdResolution.value;

    fs.mkdirSync(path.dirname(writePath), { recursive: true });
    fs.writeFileSync(writePath, basePrompt);
  }

  const memorySuffix =
    userMemory && userMemory.trim().length > 0
      ? buildSystemPromptSuffix(userMemory)
      : "";
  const appendSuffix = buildSystemPromptSuffix(appendInstruction);

  return `${basePrompt}${memorySuffix}${appendSuffix}`;
}

/**
 * Provides the system prompt for the history compression process.
 * This prompt instructs the model to act as a specialized state manager,
 * think in a scratchpad, and produce a structured XML summary.
 */
export function getCompressionPrompt(): string {
  return `
You are the component that summarizes internal chat history into a given structure.

When the conversation history grows too large, you will be invoked to distill the entire history into a concise, structured XML snapshot. This snapshot is CRITICAL, as it will become the agent's *only* memory of the past. The agent will resume its work based solely on this snapshot. All crucial details, plans, errors, and user directives MUST be preserved.

First, you will think through the entire history in a private <scratchpad>. Review the user's overall goal, the agent's actions, tool outputs, file modifications, and any unresolved questions. Identify every piece of information that is essential for future actions.

After your reasoning is complete, generate the final <state_snapshot> XML object. Be incredibly dense with information. Omit any irrelevant conversational filler.

The structure MUST be as follows:

<state_snapshot>
    <overall_goal>
        <!-- A single, concise sentence describing the user's high-level objective. -->
        <!-- Example: "Refactor the authentication service to use a new JWT library." -->
    </overall_goal>

    <key_knowledge>
        <!-- Crucial facts, conventions, and constraints the agent must remember based on the conversation history and interaction with the user. Use bullet points. -->
        <!-- Example:
         - Build Command: \`npm run build\`
         - Testing: Tests are run with \`npm test\`. Test files must end in \`.test.ts\`.
         - API Endpoint: The primary API endpoint is \`https://api.example.com/v2\`.
         
        -->
    </key_knowledge>

    <file_system_state>
        <!-- List files that have been created, read, modified, or deleted. Note their status and critical learnings. -->
        <!-- Example:
         - CWD: \`/home/user/project/src\`
         - READ: \`package.json\` - Confirmed 'axios' is a dependency.
         - MODIFIED: \`services/auth.ts\` - Replaced 'jsonwebtoken' with 'jose'.
         - CREATED: \`tests/new-feature.test.ts\` - Initial test structure for the new feature.
        -->
    </file_system_state>

    <recent_actions>
        <!-- A summary of the last few significant agent actions and their outcomes. Focus on facts. -->
        <!-- Example:
         - Ran \`grep 'old_function'\` which returned 3 results in 2 files.
         - Ran \`npm run test\`, which failed due to a snapshot mismatch in \`UserProfile.test.ts\`.
         - Ran \`ls -F static/\` and discovered image assets are stored as \`.webp\`.
        -->
    </recent_actions>

    <current_plan>
        <!-- The agent's step-by-step plan. Mark completed steps. -->
        <!-- Example:
         1. [DONE] Identify all files using the deprecated 'UserAPI'.
         2. [IN PROGRESS] Refactor \`src/components/UserProfile.tsx\` to use the new 'ProfileAPI'.
         3. [TODO] Refactor the remaining files.
         4. [TODO] Update tests to reflect the API change.
        -->
    </current_plan>
</state_snapshot>
`.trim();
}

/**
 * Provides the system prompt for generating project summaries in markdown format.
 * This prompt instructs the model to create a structured markdown summary
 * that can be saved to a file for future reference.
 */
export function getProjectSummaryPrompt(): string {
  return `Please analyze the conversation history above and generate a comprehensive project summary in markdown format. Focus on extracting the most important context, decisions, and progress that would be valuable for future sessions. Generate the summary directly without using any tools.
You are a specialized context summarizer that creates a comprehensive markdown summary from chat history for future reference. The markdown format is as follows:

# Project Summary

## Overall Goal
<!-- A single, concise sentence describing the user's high-level objective -->

## Key Knowledge
<!-- Crucial facts, conventions, and constraints the agent must remember -->
<!-- Include: technology choices, architecture decisions, user preferences, build commands, testing procedures -->

## Recent Actions
<!-- Summary of significant recent work and outcomes -->
<!-- Include: accomplishments, discoveries, recent changes -->

## Current Plan
<!-- The current development roadmap and next steps -->
<!-- Use status markers: [DONE], [IN PROGRESS], [TODO] -->
<!-- Example: 1. [DONE] Set up WebSocket server -->

`.trim();
}

const generalToolCallExamples = `
# Examples (Illustrating Tone and Workflow)
<example>
user: 1 + 2
model: 3
</example>

<example>
user: is 13 a prime number?
model: true
</example>

<example>
user: Deploy a Minecraft server with the latest version.
model: I'll set up a Minecraft server for you. First, let me get the latest version info.
[tool_call: minecraft_server_info with action 'list-versions']
(After getting version info, latest is 1.21.4)
Latest stable version is 1.21.4. Now I'll download the server JAR and set it up.
[tool_call: minecraft_server_info with action 'get-server-info' and version '1.21.4']
[tool_call: ${ToolNames.SHELL} for downloading the server JAR]
Server JAR downloaded. Let me register it as a managed service and start it.
[tool_call: ${ToolNames.SERVICE_MANAGE} with action 'register', name 'minecraft', command 'java -Xmx2G -jar server.jar nogui']
[tool_call: ${ToolNames.SERVICE_MANAGE} with action 'start', name 'minecraft']
Minecraft server is now running. You can check its status or logs anytime.
</example>

<example>
user: The Minecraft server seems laggy, check the logs for errors.
model: I'll check the server logs for any issues.
[tool_call: ${ToolNames.SERVICE_MANAGE} with action 'log', name 'minecraft', tail 100, mode 'errors']
(After reviewing error logs)
I found several "Can't keep up!" warnings indicating server tick overload. Let me run a deeper analysis.
[tool_call: ${ToolNames.SERVICE_MANAGE} with action 'analyze', name 'minecraft']
The analysis shows the server is struggling with chunk loading. I'd recommend reducing the view-distance in server.properties.
</example>

<example>
user: Where are all the 'server.properties' files? I need to check their settings.
model:
[tool_call: ${ToolNames.GLOB} for pattern './**/server.properties']
(Assuming GlobTool returns a list of paths like ['/path/to/survival/server.properties', '/path/to/creative/server.properties'])
I found the following 'server.properties' files:
- /path/to/survival/server.properties
- /path/to/creative/server.properties
To help you check their settings, I can read their contents. Which one would you like to start with, or should I read all of them?
</example>
`.trim();

const tramCoderToolCallExamples = `
# Examples (Illustrating Tone and Workflow)
<example>
user: 1 + 2
model: 3
</example>

<example>
user: is 13 a prime number?
model: true
</example>

<example>
user: Restart the Minecraft server.
model: I'll restart the Minecraft server now.
<tool_call>
<function=${ToolNames.SERVICE_MANAGE}>
<parameter=action>
restart
</parameter>
<parameter=name>
minecraft
</parameter>
</function>
</tool_call>
(After restart)
Minecraft server has been restarted and is running.
</example>

<example>
user: Check the Minecraft server logs for recent errors.
model: I'll check the server logs for errors.
<tool_call>
<function=${ToolNames.SERVICE_MANAGE}>
<parameter=action>
log
</parameter>
<parameter=name>
minecraft
</parameter>
<parameter=tail>
100
</parameter>
<parameter=mode>
errors
</parameter>
</function>
</tool_call>
(After reviewing logs)
I found several TPS drop warnings. Let me analyze further.
<tool_call>
<function=${ToolNames.SERVICE_MANAGE}>
<parameter=action>
analyze
</parameter>
<parameter=name>
minecraft
</parameter>
</function>
</tool_call>
Analysis complete. The server is experiencing chunk loading lag. Consider reducing view-distance in server.properties.
</example>

<example>
user: Where are all the 'server.properties' files? I need to check their settings.
model:
<tool_call>
<function=${ToolNames.GLOB}>
<parameter=pattern>
./**/server.properties
</parameter>
</function>
</tool_call>
(Assuming GlobTool returns a list of paths like ['/path/to/survival/server.properties', '/path/to/creative/server.properties'])
I found the following 'server.properties' files:
- /path/to/survival/server.properties
- /path/to/creative/server.properties
To help you check their settings, I can read their contents. Which one would you like to start with, or should I read all of them?
</example>
`.trim();
const tramVlToolCallExamples = `
# Examples (Illustrating Tone and Workflow)
<example>
user: 1 + 2
model: 3
</example>

<example>
user: is 13 a prime number?
model: true
</example>

<example>
user: Restart the Minecraft server.
model: I'll restart the Minecraft server now.
<tool_call>
{"name": "${ToolNames.SERVICE_MANAGE}", "arguments": {"action": "restart", "name": "minecraft"}}
</tool_call>
(After restart)
Minecraft server has been restarted and is running.
</example>

<example>
user: Check the Minecraft server logs for recent errors.
model: I'll check the server logs for errors.
<tool_call>
{"name": "${ToolNames.SERVICE_MANAGE}", "arguments": {"action": "log", "name": "minecraft", "tail": 100, "mode": "errors"}}
</tool_call>
(After reviewing logs)
I found several TPS drop warnings. Let me analyze further.
<tool_call>
{"name": "${ToolNames.SERVICE_MANAGE}", "arguments": {"action": "analyze", "name": "minecraft"}}
</tool_call>
Analysis complete. The server is experiencing chunk loading lag. Consider reducing view-distance in server.properties.
</example>

<example>
user: Where are all the 'server.properties' files? I need to check their settings.
model:
<tool_call>
{"name": "${ToolNames.GLOB}", "arguments": {"pattern": "./**/server.properties"}}
</tool_call>
(Assuming GlobTool returns a list of paths like ['/path/to/survival/server.properties', '/path/to/creative/server.properties'])
I found the following 'server.properties' files:
- /path/to/survival/server.properties
- /path/to/creative/server.properties
To help you check their settings, I can read their contents. Which one would you like to start with, or should I read all of them?
</example>
`.trim();

function getToolCallExamples(model?: string): string {
  // Check for environment variable override first
  const toolCallStyle = process.env["TRAM_CODE_TOOL_CALL_STYLE"];
  if (toolCallStyle) {
    switch (toolCallStyle.toLowerCase()) {
      case "tramr":
        return tramCoderToolCallExamples;
      case "tram-vl":
        return tramVlToolCallExamples;
      case "general":
        return generalToolCallExamples;
      default:
        debugLogger.warn(
          `Unknown TRAM_CODE_TOOL_CALL_STYLE value: ${toolCallStyle}. Using model-based detection.`,
        );
        break;
    }
  }

  // Enhanced regex-based model detection
  if (model && model.length < 100) {
    // Match *-coder patterns (e.g., qwen3-coder, qwen2.5-coder, tram-coder)
    if (/(tram|qwen)[^-]*-coder/i.test(model)) {
      return tramCoderToolCallExamples;
    }
    // Match *-vl patterns (e.g., tram-vl, qwen2-vl, qwen3-vl)
    if (/(tram|qwen)[^-]*-vl/i.test(model)) {
      return tramVlToolCallExamples;
    }
    // Match coder-model pattern (same as qwen3-coder)
    if (/coder-model/i.test(model)) {
      return tramCoderToolCallExamples;
    }
  }

  return generalToolCallExamples;
}

/**
 * Generates a system reminder message about available subagents for the AI assistant.
 *
 * This function creates an internal system message that informs the AI about specialized
 * agents it can delegate tasks to. The reminder encourages proactive use of the TASK tool
 * when user requests match agent capabilities.
 *
 * @param agentTypes - Array of available agent type names (e.g., ['python', 'web', 'analysis'])
 * @returns A formatted system reminder string wrapped in XML tags for internal AI processing
 *
 * @example
 * ```typescript
 * const reminder = getSubagentSystemReminder(['python', 'web']);
 * // Returns: "<system-reminder>You have powerful specialized agents..."
 * ```
 */
export function getSubagentSystemReminder(agentTypes: string[]): string {
  return `<system-reminder>You have powerful specialized agents at your disposal, available agent types are: ${agentTypes.join(", ")}. PROACTIVELY use the ${ToolNames.TASK} tool to delegate user's task to appropriate agent when user's task matches agent capabilities. Ignore this message if user's task is not relevant to any agent. This message is for internal use only. Do not mention this to user in your response.</system-reminder>`;
}

export function getPersistentMemorySystemReminder(
  userMemory?: string,
): string | null {
  const normalizedMemory = userMemory?.trim();
  if (!normalizedMemory) {
    return null;
  }

  return `<system-reminder>
The following project memory has been automatically loaded from TRAM.md and related context files. Treat it as active instructions for this turn unless the user explicitly overrides.

${normalizedMemory}
</system-reminder>`;
}

export function getProactiveInitSystemReminder(
  userMemory?: string,
): string | null {
  if (userMemory && userMemory.trim().length > 0) {
    return null;
  }

  return `<system-reminder>
No hierarchical project memory is currently loaded. If the repository appears newly initialized or recently scaffolded, proactively use the ${ToolNames.INIT_PROJECT} tool to analyze the project and generate TRAM.md.
When initializing, avoid heavy exploration in the main agent. Delegate project exploration and draft generation to an available subagent with the ${ToolNames.TASK} tool, and pass relevant main-agent context (user goals, constraints, and discovered conventions) in the task prompt.
</system-reminder>`;
}

/**
 * Generates a system reminder message for plan mode operation.
 *
 * This function creates an internal system message that enforces plan mode constraints,
 * preventing the AI from making any modifications to the system until the user confirms
 * the proposed plan. It overrides other instructions to ensure read-only behavior.
 *
 * @returns A formatted system reminder string that enforces plan mode restrictions
 *
 * @example
 * ```typescript
 * const reminder = getPlanModeSystemReminder();
 * // Returns: "<system-reminder>Plan mode is active..."
 * ```
 *
 * @remarks
 * Plan mode ensures the AI will:
 * - Only perform read-only operations (research, analysis)
 * - Present a comprehensive plan via ExitPlanMode tool
 * - Wait for user confirmation before making any changes
 * - Override any other instructions that would modify system state
 */
export function getPlanModeSystemReminder(planOnly = false): string {
  return `<system-reminder>
Plan mode is active. The user indicated that they do not want you to execute yet -- you MUST NOT make any edits, run any non-readonly tools (including changing configs or making commits), or otherwise make any changes to the system. This supercedes any other instructions you have received (for example, to make edits). Instead, you should:
1. Answer the user's query comprehensively
2. When you're done researching, present your plan ${planOnly ? "directly" : `by calling the ${ToolNames.EXIT_PLAN_MODE} tool, which will prompt the user to confirm the plan`}. Do NOT make any file changes or run any tools that modify the system state in any way until the user has confirmed the plan. Use ${ToolNames.ASK_USER_QUESTION} if you need to clarify approaches.
</system-reminder>`;
}

// ============================================================================
// Insight Analysis Prompts
// ============================================================================

type InsightPromptType =
  | "analysis"
  | "impressive_workflows"
  | "project_areas"
  | "future_opportunities"
  | "friction_points"
  | "memorable_moment"
  | "improvements"
  | "interaction_style"
  | "at_a_glance";

const INSIGHT_PROMPTS: Record<InsightPromptType, string> = {
  analysis: `Analyze this TRAM session and extract structured facets.

CRITICAL GUIDELINES:

1. **goal_categories**: Count ONLY what the USER explicitly asked for.
   - DO NOT count TRAM's autonomous codebase exploration
   - DO NOT count work TRAM decided to do on its own
   - ONLY count when user says "can you...", "please...", "I need...", "let's...
   - POSSIBLE CATEGORIES (but be open to others that appear in the data):
      - bug_fix
      - feature_request
      - debugging
      - test_creation
      - code_refactoring
      - documentation_update
   "

2. **user_satisfaction_counts**: Base ONLY on explicit user signals.
   - "Yay!", "great!", "perfect!" → happy
   - "thanks", "looks good", "that works" → satisfied
   - "ok, now let's..." (continuing without complaint) → likely_satisfied
   - "that's not right", "try again" → dissatisfied
   - "this is broken", "I give up" → frustrated

3. **friction_counts**: Be specific about what went wrong.
   - misunderstood_request: TRAM interpreted incorrectly
   - wrong_approach: Right goal, wrong solution method
   - buggy_code: Code didn't work correctly
   - user_rejected_action: User said no/stop to a tool call
   - excessive_changes: Over-engineered or changed too much

4. If very short or just warmup, use warmup_minimal for goal_category`,

  impressive_workflows: `Analyze this TRAM usage data and identify what's working well for this user. Use second person ("you").

Call respond_in_schema function with A VALID JSON OBJECT as argument:
{
  "intro": "1 sentence of context",
  "impressive_workflows": [
    {"title": "Short title (3-6 words)", "description": "2-3 sentences describing the impressive workflow or approach. Use 'you' not 'the user'."}
  ]
}

Include 3 impressive workflows.`,

  project_areas: `Analyze this TRAM usage data and identify project areas.

Call respond_in_schema function with A VALID JSON OBJECT as argument:
{
  "areas": [
    {"name": "Area name", "session_count": N, "description": "2-3 sentences about what was worked on and how TRAM was used."}
  ]
}

Include 4-5 areas. Skip internal QC operations.`,

  future_opportunities: `Analyze this TRAM usage data and identify future opportunities.

Call respond_in_schema function with A VALID JSON OBJECT as argument:
{
  "intro": "1 sentence about evolving AI-assisted development",
  "opportunities": [
    {"title": "Short title (4-8 words)", "whats_possible": "2-3 ambitious sentences about autonomous workflows", "how_to_try": "1-2 sentences mentioning relevant tooling", "copyable_prompt": "Detailed prompt to try"}
  ]
}

Include 3 opportunities. Think BIG - autonomous workflows, parallel agents, iterating against tests.`,

  friction_points: `Analyze this TRAM usage data and identify friction points for this user. Use second person ("you").

Call respond_in_schema function with A VALID JSON OBJECT as argument:
{
  "intro": "1 sentence summarizing friction patterns",
  "categories": [
    {"category": "Concrete category name", "description": "1-2 sentences explaining this category and what could be done differently. Use 'you' not 'the user'.", "examples": ["Specific example with consequence", "Another example"]}
  ]
}

Include 3 friction categories with 2 examples each.`,

  memorable_moment: `Analyze this TRAM usage data and find a memorable moment.

Call respond_in_schema function with A VALID JSON OBJECT as argument:
{
  "headline": "A memorable QUALITATIVE moment from the transcripts - not a statistic. Something human, funny, or surprising.",
  "detail": "Brief context about when/where this happened"
}

Find something genuinely interesting or amusing from the session summaries.`,

  improvements: `Analyze this TRAM usage data and suggest improvements.

## QC FEATURES REFERENCE (pick from these for features_to_try):
1. **MCP Servers**: Connect TRAM to external tools, databases, and APIs via Model Context Protocol.
   - How to use: Run \`tram mcp add --transport http <server-name> <http-url>\`
   - Good for: database queries, Slack integration, GitHub issue lookup, connecting to internal APIs
   - Example: "To connect to GitHub, run \`tram mcp add --header "Authorization: Bearer your_github_mcp_pat" --transport http github https://api.githubcopilot.com/mcp/\` and set the AUTHORIZATION header with your PAT. Then you can ask TRAM to query issues, PRs, or repos."

2. **Custom Skills**: Reusable prompts you define as markdown files that run with a single /command.
   - How to use: Create \`.tram/skills/commit/SKILL.md\` with instructions. Then type \`/commit\` to run it.
   - Good for: repetitive workflows - /commit, /review, /test, /deploy, /pr, or complex multi-step workflows
   - SKILL.md format:
    \`\`\`
    ---
    name: skill-name
    description: A description of what this skill does and when to use it.
    ---

    # Steps
    1. First, do X.
    2. Then do Y.
    3. Finally, verify Z.

    # Examples
    - Input: "fix lint errors in src/" → Output: runs eslint --fix, commits changes
    - Input: "review this PR" → Output: reads diff, posts inline comments

    # Edge Cases
    - If no files match, report "nothing to do" instead of failing.
    - If the user didn't specify a branch, default to the current branch.
    \`\`\`

3. **Headless Mode**: Run TRAM non-interactively from scripts and CI/CD.
   - How to use: \`tram -p "fix lint errors"\`
   - Good for: CI/CD integration, batch code fixes, automated reviews

4. **Task Agents**: TRAM spawns focused sub-agents for complex exploration or parallel work.
   - How to use: TRAM auto-invokes when helpful, or ask "use an agent to explore X"
   - Good for: codebase exploration, understanding complex systems

Call respond_in_schema function with A VALID JSON OBJECT as argument:
{
  "Tram_md_additions": [
    {"addition": "A specific line or block to add to TRAM.md based on workflow patterns. E.g., 'Always run tests after modifying auth-related files'", "why": "1 sentence explaining why this would help based on actual sessions", "prompt_scaffold": "Instructions for where to add this in TRAM.md. E.g., 'Add under ## Testing section'"}
  ],
  "features_to_try": [
    {"feature": "Feature name from QC FEATURES REFERENCE above", "one_liner": "What it does", "why_for_you": "Why this would help YOU based on your sessions", "example_code": "Actual command or config to copy"}
  ],
  "usage_patterns": [
    {"title": "Short title", "suggestion": "1-2 sentence summary", "detail": "3-4 sentences explaining how this applies to YOUR work", "copyable_prompt": "A specific prompt to copy and try"}
  ]
}

IMPORTANT for Tram_md_additions: PRIORITIZE instructions that appear MULTIPLE TIMES in the user data. If user told TRAM the same thing in 2+ sessions (e.g., 'always run tests', 'use TypeScript'), that's a PRIME candidate - they shouldn't have to repeat themselves.

IMPORTANT for features_to_try: Pick 2-3 from the QC FEATURES REFERENCE above. Include 2-3 items for each category.`,

  interaction_style: `Analyze this TRAM usage data and describe the user's interaction style.

Call respond_in_schema function with A VALID JSON OBJECT as argument:
{
  "narrative": "2-3 paragraphs analyzing HOW the user interacts with TRAM. Use second person 'you'. Describe patterns: iterate quickly vs detailed upfront specs? Interrupt often or let TRAM run? Include specific examples. Use **bold** for key insights.",
  "key_pattern": "One sentence summary of most distinctive interaction style"
}
`,

  at_a_glance: `You're writing an "At a Glance" summary for a TRAM usage insights report for TRAM users. The goal is to help them understand their usage and improve how they can use TRAM better, especially as models improve.

Use this 4-part structure:

1. **What's working** - What is the user's unique style of interacting with TRAM and what are some impactful things they've done? You can include one or two details, but keep it high level since things might not be fresh in the user's memory. Don't be fluffy or overly complimentary. Also, don't focus on the tool calls they use.

2. **What's hindering you** - Split into (a) TRAM's fault (misunderstandings, wrong approaches, bugs) and (b) user-side friction (not providing enough context, environment issues -- ideally more general than just one project). Be honest but constructive.

3. **Quick wins to try** - Specific TRAM features they could try from the examples below, or a workflow technique if you think it's really compelling. (Avoid stuff like "Ask TRAM to confirm before taking actions" or "Type out more context up front" which are less compelling.)

4. **Ambitious workflows for better models** - As we move to much more capable models over the next 3-6 months, what should they prepare for? What workflows that seem impossible now will become possible? Draw from the appropriate section below.

Keep each section to 2-3 not-too-long sentences. Don't overwhelm the user. Don't mention specific numerical stats or underlined_categories from the session data below. Use a coaching tone.

Call respond_in_schema function with A VALID JSON OBJECT as argument:
{
  "whats_working": "(refer to instructions above)",
  "whats_hindering": "(refer to instructions above)",
  "quick_wins": "(refer to instructions above)",
  "ambitious_workflows": "(refer to instructions above)"
}`,
};

/**
 * Get an insight analysis prompt by type.
 * @param type - The type of insight prompt to retrieve
 * @returns The prompt string for the specified type
 */
export function getInsightPrompt(type: InsightPromptType): string {
  return INSIGHT_PROMPTS[type];
}
