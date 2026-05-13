/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import { StreamingState } from "../types.js";
import {
  notifyTerminalAttention,
  notifyDesktop,
  AttentionNotificationReason,
} from "../../utils/attentionNotification.js";
import type { LoadedSettings } from "../../config/settings.js";
import type { Config } from "@tram-ai/tram-core";
import {
  fireNotificationHook,
  NotificationType,
} from "@tram-ai/tram-core";
import type { TerminalNotification } from "./useTerminalNotification.js";
import type { TrackedToolCall } from "./useReactToolScheduler.js";
import { sendNotification } from "../../services/notificationService.js";

export const LONG_TASK_NOTIFICATION_THRESHOLD_SECONDS = 20;

const NOTIFICATION_TITLE = "TRAM";

interface UseAttentionNotificationsOptions {
  isFocused: boolean;
  streamingState: StreamingState;
  elapsedTime: number;
  settings: LoadedSettings;
  config?: Config;
  terminal: TerminalNotification;
  pendingToolCalls?: TrackedToolCall[];
}

export const useAttentionNotifications = ({
  isFocused,
  streamingState,
  elapsedTime,
  settings,
  config,
  terminal,
}: UseAttentionNotificationsOptions) => {
  const terminalBellEnabled = settings?.merged?.general?.terminalBell ?? true;
  const desktopNotificationEnabled =
    settings?.merged?.general?.desktopNotification ?? true;

  const awaitingNotificationSentRef = useRef(false);
  const respondingElapsedRef = useRef(0);
  const idleNotificationSentRef = useRef(false);

  useEffect(() => {
    if (
      streamingState === StreamingState.WaitingForConfirmation &&
      !isFocused &&
      !awaitingNotificationSentRef.current &&
      terminalBellEnabled
    ) {
      notifyTerminalAttention(AttentionNotificationReason.ToolApproval, {
        enabled: terminalBellEnabled,
      });
      notifyDesktop(AttentionNotificationReason.ToolApproval, {
        enabled: desktopNotificationEnabled,
      });
      awaitingNotificationSentRef.current = true;
    }

    if (streamingState !== StreamingState.WaitingForConfirmation || isFocused) {
      awaitingNotificationSentRef.current = false;
    }
  }, [
    isFocused,
    streamingState,
    terminalBellEnabled,
    desktopNotificationEnabled,
  ]);

  useEffect(() => {
    if (streamingState === StreamingState.Responding) {
      respondingElapsedRef.current = elapsedTime;
      idleNotificationSentRef.current = false;
      return;
    }

    if (streamingState === StreamingState.Idle) {
      const wasLongTask =
        respondingElapsedRef.current >=
        LONG_TASK_NOTIFICATION_THRESHOLD_SECONDS;
      if (wasLongTask && !isFocused && terminalBellEnabled) {
        sendNotification(
          {
            message: "TRAM is waiting for your input",
            title: NOTIFICATION_TITLE,
          },
          terminal,
          terminalBellEnabled,
        );
      }

      // Send desktop notification whenever conversation enters idle state
      if (!isFocused && !idleNotificationSentRef.current) {
        notifyDesktop(AttentionNotificationReason.LongTaskComplete, {
          enabled: desktopNotificationEnabled,
        });
      }
      // Reset tracking for next task
      respondingElapsedRef.current = 0;

      // Fire idle_prompt notification hook when entering idle state
      if (config && !idleNotificationSentRef.current) {
        const messageBus = config.getMessageBus();
        const hooksEnabled = !config.getDisableAllHooks();
        if (hooksEnabled && messageBus) {
          fireNotificationHook(
            messageBus,
            "TRAM is waiting for your input",
            NotificationType.IdlePrompt,
            "Waiting for input",
          ).catch(() => {
            // Silently ignore errors - fireNotificationHook has internal error handling
          });
        }
        idleNotificationSentRef.current = true;
      }
      return;
    }

    idleNotificationSentRef.current = false;
  }, [
    streamingState,
    elapsedTime,
    isFocused,
    terminalBellEnabled,
    desktopNotificationEnabled,
    config,
    terminal,
  ]);
};
