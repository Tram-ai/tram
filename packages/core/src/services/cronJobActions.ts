/**
 * Shared cron job action types and execution helpers.
 */

import type { Config } from "../config/config.js";
import { ServiceRuntimeManager } from "./serviceRuntimeManager.js";

export interface CronPromptAction {
  type: "prompt";
  prompt: string;
}

export interface CronServiceSendAction {
  type: "service_send";
  serviceName: string;
  input: string;
}

export interface CronServiceLifecycleAction {
  type: "service_start" | "service_stop" | "service_restart";
  serviceName: string;
}

export type CronJobAction =
  | CronPromptAction
  | CronServiceSendAction
  | CronServiceLifecycleAction;

export function isCronPromptAction(
  action: CronJobAction,
): action is CronPromptAction {
  return action.type === "prompt";
}

export function cronJobActionSummary(action: CronJobAction): string {
  switch (action.type) {
    case "prompt":
      return action.prompt;
    case "service_send":
      return `Send "${action.input}" to service ${action.serviceName}`;
    case "service_start":
      return `Start service ${action.serviceName}`;
    case "service_stop":
      return `Stop service ${action.serviceName}`;
    case "service_restart":
      return `Restart service ${action.serviceName}`;
  }
}

export async function executeCronServiceAction(
  config: Config,
  action: Exclude<CronJobAction, CronPromptAction>,
): Promise<void> {
  const manager = ServiceRuntimeManager.forConfig(config);
  await manager.initialize();

  switch (action.type) {
    case "service_send":
      await manager.sendInput(action.serviceName, action.input);
      return;
    case "service_start":
      await manager.startService(action.serviceName);
      return;
    case "service_stop":
      await manager.stopService(action.serviceName);
      return;
    case "service_restart":
      await manager.restartService(action.serviceName);
      return;
  }
}
