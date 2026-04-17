/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export const SERVICE_NAME = 'tram';

export const EVENT_USER_PROMPT = 'tram.user_prompt';
export const EVENT_USER_RETRY = 'tram.user_retry';
export const EVENT_TOOL_CALL = 'tram.tool_call';
export const EVENT_API_REQUEST = 'tram.api_request';
export const EVENT_API_ERROR = 'tram.api_error';
export const EVENT_API_CANCEL = 'tram.api_cancel';
export const EVENT_API_RESPONSE = 'tram.api_response';
export const EVENT_CLI_CONFIG = 'tram.config';
export const EVENT_EXTENSION_DISABLE = 'tram.extension_disable';
export const EVENT_EXTENSION_ENABLE = 'tram.extension_enable';
export const EVENT_EXTENSION_INSTALL = 'tram.extension_install';
export const EVENT_EXTENSION_UNINSTALL = 'tram.extension_uninstall';
export const EVENT_EXTENSION_UPDATE = 'tram.extension_update';
export const EVENT_FLASH_FALLBACK = 'tram.flash_fallback';
export const EVENT_RIPGREP_FALLBACK = 'tram.ripgrep_fallback';
export const EVENT_NEXT_SPEAKER_CHECK = 'tram.next_speaker_check';
export const EVENT_SLASH_COMMAND = 'tram.slash_command';
export const EVENT_IDE_CONNECTION = 'tram.ide_connection';
export const EVENT_CHAT_COMPRESSION = 'tram.chat_compression';
export const EVENT_INVALID_CHUNK = 'tram.chat.invalid_chunk';
export const EVENT_CONTENT_RETRY = 'tram.chat.content_retry';
export const EVENT_CONTENT_RETRY_FAILURE =
  'tram.chat.content_retry_failure';
export const EVENT_CONVERSATION_FINISHED = 'tram.conversation_finished';
export const EVENT_MALFORMED_JSON_RESPONSE =
  'tram.malformed_json_response';
export const EVENT_FILE_OPERATION = 'tram.file_operation';
export const EVENT_MODEL_SLASH_COMMAND = 'tram.slash_command.model';
export const EVENT_SUBAGENT_EXECUTION = 'tram.subagent_execution';
export const EVENT_SKILL_LAUNCH = 'tram.skill_launch';
export const EVENT_AUTH = 'tram.auth';
export const EVENT_USER_FEEDBACK = 'tram.user_feedback';

// Performance Events
export const EVENT_STARTUP_PERFORMANCE = 'tram.startup.performance';
export const EVENT_MEMORY_USAGE = 'tram.memory.usage';
export const EVENT_PERFORMANCE_BASELINE = 'tram.performance.baseline';
export const EVENT_PERFORMANCE_REGRESSION = 'tram.performance.regression';
