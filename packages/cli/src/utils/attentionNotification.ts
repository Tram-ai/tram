/**
 * @license
 * Copyright 2025 TRAM Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Lightweight terminal/desktop attention notification helpers.
 *
 * TODO(merge-v0.15.10): this module was lost in the upstream merge — the
 * consuming hook (`useAttentionNotifications.ts`) survived but its util
 * dependency did not. The implementation here keeps the public surface
 * compatible (named exports + reason enum) while delegating actual delivery
 * to `notificationService.sendNotification` where reasonable. Revisit when
 * porting the rest of the upstream notification refactor.
 */

export enum AttentionNotificationReason {
  ToolApproval = "tool_approval",
  LongTaskComplete = "long_task_complete",
}

interface NotificationToggle {
  enabled: boolean;
}

/**
 * Ring the terminal bell to draw the user's attention to the current window.
 * No-op when disabled.
 */
export function notifyTerminalAttention(
  _reason: AttentionNotificationReason,
  options: NotificationToggle,
): void {
  if (!options.enabled) return;
  try {
    // BEL — terminals with focus-aware bells will flash / ring.
    process.stderr.write("\x07");
  } catch {
    // best-effort; ignore write failures
  }
}

/**
 * Emit a desktop notification (where supported) for the given reason.
 * Stub: currently a no-op until the full desktop integration is restored.
 */
export function notifyDesktop(
  _reason: AttentionNotificationReason,
  _options: NotificationToggle,
): void {
  // TODO(merge-v0.15.10): wire up the cross-platform desktop notifier once
  // the upstream `desktopNotifier` module is ported.
}
