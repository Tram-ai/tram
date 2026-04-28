/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tool name constants to avoid circular dependencies.
 * These constants are used across multiple files and should be kept in sync
 * with the actual tool class names.
 */
export const ToolNames = {
  EDIT: "edit",
  WRITE_FILE: "write_file",
  READ_FILE: "read_file",
  GREP: "grep_search",
  GLOB: "glob",
  SHELL: "run_shell_command",
  TODO_WRITE: "todo_write",
  MEMORY: "save_memory",
  AGENT: "agent",
  SKILL: "skill",
  EXIT_PLAN_MODE: "exit_plan_mode",
  WEB_FETCH: "web_fetch",
  OPENAPI_LINK_LIST: "openapi_link_list",
  SUBLM: "sublm",
  LS: "list_directory",
  LSP: "lsp",
  ASK_USER_QUESTION: "ask_user_question",
  CRON_CREATE: "cron_create",
  CRON_LIST: "cron_list",
  CRON_DELETE: "cron_delete",
  MOD_HASH_LOOKUP: "mod_hash_lookup",
  MOD_SEARCH: "mod_search",
  MODPACK_SERVER_PACK: "modpack_server_pack",
  SCHEDULED_TASK: "scheduled_task",
  SERVICE_MANAGE: "service_manage",
  SHARE_LOG: "share_log",
  VIDEO_TO_AUDIO: "video_to_audio",
  BILIBILI_VIDEO_INFO: "bilibili_video_info",
  DOWNLOAD_FILE: "download_file",
  INIT_PROJECT: "init_project",
  KNOWLEDGE_SEARCH: "knowledge_search",
  MEDIA_COMPRESS: "media_compress",
  MINECRAFT_SERVER_INFO: "minecraft_server_info",
  TASK: "task",
  REQUEST_LOG_PATTERN: "request_log_pattern",
  WEB_SEARCH: "web_search",
} as const;

/**
 * Tool display name constants to avoid circular dependencies.
 * These constants are used across multiple files and should be kept in sync
 * with the actual tool display names.
 */
export const ToolDisplayNames = {
  EDIT: "Edit",
  WRITE_FILE: "WriteFile",
  READ_FILE: "ReadFile",
  GREP: "Grep",
  GLOB: "Glob",
  SHELL: "Shell",
  TODO_WRITE: "TodoWrite",
  MEMORY: "SaveMemory",
  AGENT: "Agent",
  SKILL: "Skill",
  EXIT_PLAN_MODE: "ExitPlanMode",
  WEB_FETCH: "WebFetch",
  OPENAPI_LINK_LIST: "OpenApiLinkList",
  SUBLM: "SubLm",
  LS: "ListFiles",
  LSP: "Lsp",
  ASK_USER_QUESTION: "AskUserQuestion",
  CRON_CREATE: "CronCreate",
  CRON_LIST: "CronList",
  CRON_DELETE: "CronDelete",
  MOD_HASH_LOOKUP: "ModHashLookup",
  MOD_SEARCH: "ModSearch",
  MODPACK_SERVER_PACK: "ModpackServerPack",
  SCHEDULED_TASK: "ScheduledTask",
  SERVICE_MANAGE: "ServiceManage",
  SHARE_LOG: "ShareLog",
  VIDEO_TO_AUDIO: "VideoToAudio",
  BILIBILI_VIDEO_INFO: "BilibiliVideoInfo",
  DOWNLOAD_FILE: "DownloadFile",
  INIT_PROJECT: "InitProject",
  KNOWLEDGE_SEARCH: "KnowledgeSearch",
  MEDIA_COMPRESS: "MediaCompress",
  MINECRAFT_SERVER_INFO: "MinecraftServerInfo",
  TASK: "Task",
  REQUEST_LOG_PATTERN: "RequestLogPattern",
  WEB_SEARCH: "WebSearch",
} as const;

// Migration from old tool names to new tool names
// These legacy tool names were used in earlier versions and need to be supported
// for backward compatibility with existing user configurations
export const ToolNamesMigration = {
  search_file_content: ToolNames.GREP, // Legacy name from grep tool
  replace: ToolNames.EDIT, // Legacy name from edit tool
  task: ToolNames.AGENT, // Legacy name from agent tool (renamed from task)
} as const;

// Migration from old tool display names to new tool display names
// These legacy display names were used before the tool naming standardization
export const ToolDisplayNamesMigration = {
  SearchFiles: ToolDisplayNames.GREP, // Old display name for Grep
  FindFiles: ToolDisplayNames.GLOB, // Old display name for Glob
  ReadFolder: ToolDisplayNames.LS, // Old display name for ListFiles
  Task: ToolDisplayNames.AGENT, // Old display name for Agent (renamed from Task)
} as const;
