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
  EDIT: 'edit',
  WRITE_FILE: 'write_file',
  READ_FILE: 'read_file',
  GREP: 'grep_search',
  GLOB: 'glob',
  SHELL: 'run_shell_command',
  TODO_WRITE: 'todo_write',
  MEMORY: 'save_memory',
  TASK: 'task',
  SKILL: 'skill',
  EXIT_PLAN_MODE: 'exit_plan_mode',
  WEB_FETCH: 'web_fetch',
  OPENAPI_LINK_LIST: 'openapi_link_list',
  SUBLM: 'sublm',
  LS: 'list_directory',
  LSP: 'lsp',
  ASK_USER_QUESTION: 'ask_user_question',
  REQUEST_LOG_PATTERN: 'request_log_pattern',
  SERVICE_MANAGE: 'service_manage',
  MOD_SEARCH: 'mod_search',
  MOD_HASH_LOOKUP: 'mod_hash_lookup',
  MINECRAFT_SERVER_INFO: 'minecraft_server_info',
  DOWNLOAD_FILE: 'download_file',
  MEDIA_COMPRESS: 'media_compress',
  SHARE_LOG: 'share_log',
  VIDEO_TO_AUDIO: 'video_to_audio',
  MODPACK_SERVER_PACK: 'modpack_server_pack',
  INIT_PROJECT: 'init_project',
  BILIBILI_VIDEO_INFO: 'bilibili_video_info',
  SCHEDULED_TASK: 'scheduled_task',
  KNOWLEDGE_SEARCH: 'knowledge_search',
} as const;

/**
 * Tool display name constants to avoid circular dependencies.
 * These constants are used across multiple files and should be kept in sync
 * with the actual tool display names.
 */
export const ToolDisplayNames = {
  EDIT: 'Edit',
  WRITE_FILE: 'WriteFile',
  READ_FILE: 'ReadFile',
  GREP: 'Grep',
  GLOB: 'Glob',
  SHELL: 'Shell',
  TODO_WRITE: 'TodoWrite',
  MEMORY: 'SaveMemory',
  TASK: 'Task',
  SKILL: 'Skill',
  EXIT_PLAN_MODE: 'ExitPlanMode',
  WEB_FETCH: 'WebFetch',
  OPENAPI_LINK_LIST: 'OpenApiLinkList',
  SUBLM: 'SubLm',
  LS: 'ListFiles',
  LSP: 'Lsp',
  ASK_USER_QUESTION: 'AskUserQuestion',
  REQUEST_LOG_PATTERN: 'RequestLogPattern',
  SERVICE_MANAGE: 'ServiceManage',
  MOD_SEARCH: 'ModSearch',
  MOD_HASH_LOOKUP: 'ModHashLookup',
  MINECRAFT_SERVER_INFO: 'MinecraftServerInfo',
  DOWNLOAD_FILE: 'DownloadFile',
  MEDIA_COMPRESS: 'MediaCompress',
  SHARE_LOG: 'ShareLog',
  VIDEO_TO_AUDIO: 'VideoToAudio',
  MODPACK_SERVER_PACK: 'ModpackServerPack',
  INIT_PROJECT: 'InitProject',
  BILIBILI_VIDEO_INFO: 'BilibiliVideoInfo',
  SCHEDULED_TASK: 'ScheduledTask',
  KNOWLEDGE_SEARCH: 'KnowledgeSearch',
} as const;

// Migration from old tool names to new tool names
// These legacy tool names were used in earlier versions and need to be supported
// for backward compatibility with existing user configurations
export const ToolNamesMigration = {
  search_file_content: ToolNames.GREP, // Legacy name from grep tool
  replace: ToolNames.EDIT, // Legacy name from edit tool
} as const;

// Migration from old tool display names to new tool display names
// These legacy display names were used before the tool naming standardization
export const ToolDisplayNamesMigration = {
  SearchFiles: ToolDisplayNames.GREP, // Old display name for Grep
  FindFiles: ToolDisplayNames.GLOB, // Old display name for Glob
  ReadFolder: ToolDisplayNames.LS, // Old display name for ListFiles
} as const;
