/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FunctionDeclaration } from '@google/genai';
import { ToolDisplayNames, ToolNames } from './tool-names.js';
import type { ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { safeJsonStringify } from '../utils/safeJsonStringify.js';
import { createDebugLogger } from '../utils/debugLogger.js';

const debugLogger = createDebugLogger('SCHEDULED_TASK');

export interface ScheduledTaskParams {
  action: 'create' | 'list' | 'cancel' | 'cancel_all';
  /** Task name/label (required for create) */
  name?: string;
  /** Shell command to execute (required for create) */
  command?: string;
  /** Delay in seconds before first execution (default: 0) */
  delaySeconds?: number;
  /** Repeat interval in seconds (0 = one-shot, no repeat) */
  intervalSeconds?: number;
  /** Maximum number of repetitions (0 = unlimited until cancelled) */
  maxRepeat?: number;
  /** Task ID to cancel (required for cancel action) */
  taskId?: string;
}

interface ScheduledTaskEntry {
  id: string;
  name: string;
  command: string;
  delaySeconds: number;
  intervalSeconds: number;
  maxRepeat: number;
  executionCount: number;
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  createdAt: string;
  nextRunAt?: string;
  lastOutput?: string;
}

/** In-memory registry of scheduled tasks */
const taskRegistry = new Map<string, ScheduledTaskEntry>();
const taskTimers = new Map<string, NodeJS.Timeout>();
let taskIdCounter = 0;

function generateTaskId(): string {
  taskIdCounter++;
  return `task_${taskIdCounter}_${Date.now()}`;
}

const description =
  'Create, list, or cancel scheduled tasks. Tasks can execute shell commands after a delay and/or at regular intervals. Useful for periodic checks, monitoring, automated builds, and timed operations.';

const schema: FunctionDeclaration = {
  name: ToolNames.SCHEDULED_TASK,
  description,
  parametersJsonSchema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'list', 'cancel', 'cancel_all'],
        description: 'Action: "create" a new scheduled task, "list" all tasks, "cancel" a task by ID, or "cancel_all" to stop all tasks.',
      },
      name: {
        type: 'string',
        description: 'Human-readable name for the task (required for create).',
      },
      command: {
        type: 'string',
        description: 'Shell command to execute (required for create).',
      },
      delaySeconds: {
        type: 'number',
        description: 'Seconds to wait before first execution. Default is 0 (immediate).',
      },
      intervalSeconds: {
        type: 'number',
        description: 'Repeat interval in seconds. 0 means one-shot (no repeat). Default is 0.',
      },
      maxRepeat: {
        type: 'number',
        description: 'Maximum repetitions. 0 means unlimited (until cancelled). Default is 0.',
      },
      taskId: {
        type: 'string',
        description: 'Task ID to cancel (required for cancel action).',
      },
    },
    required: ['action'],
    additionalProperties: false,
  },
};

class ScheduledTaskInvocation extends BaseToolInvocation<
  ScheduledTaskParams,
  ToolResult
> {
  getDescription(): string {
    switch (this.params.action) {
      case 'create':
        return `Schedule task: "${this.params.name}"`;
      case 'list':
        return 'List scheduled tasks';
      case 'cancel':
        return `Cancel task: ${this.params.taskId}`;
      case 'cancel_all':
        return 'Cancel all tasks';
    }
  }

  private createTask(): ToolResult {
    const { name, command, delaySeconds = 0, intervalSeconds = 0, maxRepeat = 0 } = this.params;
    if (!name || !command) {
      return {
        llmContent: 'Error: name and command are required for create action.',
        returnDisplay: 'Error: name and command are required.',
      };
    }

    const id = generateTaskId();
    const entry: ScheduledTaskEntry = {
      id,
      name,
      command,
      delaySeconds,
      intervalSeconds,
      maxRepeat,
      executionCount: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      nextRunAt: new Date(Date.now() + delaySeconds * 1000).toISOString(),
    };

    taskRegistry.set(id, entry);

    const executeTask = async () => {
      const task = taskRegistry.get(id);
      if (!task || task.status === 'cancelled') {
        const timer = taskTimers.get(id);
        if (timer) {
          clearInterval(timer);
          taskTimers.delete(id);
        }
        return;
      }

      task.status = 'running';
      task.executionCount++;

      try {
        const { execSync } = await import('node:child_process');
        const output = execSync(task.command, {
          encoding: 'utf-8',
          timeout: 60_000,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        task.lastOutput = output.slice(0, 2000); // Limit output size
        debugLogger.debug(`Task ${id} executed: ${task.lastOutput}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        task.lastOutput = `Error: ${errorMsg}`;
        debugLogger.warn(`Task ${id} failed:`, errorMsg);
      }

      // Check if we should stop repeating
      if (maxRepeat > 0 && task.executionCount >= maxRepeat) {
        task.status = 'completed';
        const timer = taskTimers.get(id);
        if (timer) {
          clearInterval(timer);
          taskTimers.delete(id);
        }
      } else if (intervalSeconds <= 0) {
        task.status = 'completed';
      } else {
        task.status = 'pending';
        task.nextRunAt = new Date(Date.now() + intervalSeconds * 1000).toISOString();
      }
    };

    if (intervalSeconds > 0) {
      // Repeating task
      const initialTimer = setTimeout(() => {
        void executeTask();
        const interval = setInterval(() => {
          void executeTask();
        }, intervalSeconds * 1000);
        taskTimers.set(id, interval);
      }, delaySeconds * 1000);
      taskTimers.set(id, initialTimer);
    } else {
      // One-shot task
      const timer = setTimeout(() => {
        void executeTask();
        taskTimers.delete(id);
      }, delaySeconds * 1000);
      taskTimers.set(id, timer);
    }

    const repeatInfo = intervalSeconds > 0
      ? ` (repeating every ${intervalSeconds}s${maxRepeat > 0 ? `, max ${maxRepeat} times` : ''})`
      : ' (one-shot)';
    const delayInfo = delaySeconds > 0 ? ` after ${delaySeconds}s delay` : '';

    return {
      llmContent: safeJsonStringify({ id, name, command, delaySeconds, intervalSeconds, maxRepeat, status: 'pending' }),
      returnDisplay: `Scheduled task created:\n  ID: ${id}\n  Name: ${name}\n  Command: ${command}\n  Execution: ${delayInfo}${repeatInfo}`,
    };
  }

  private listTasks(): ToolResult {
    const tasks = Array.from(taskRegistry.values());
    if (tasks.length === 0) {
      return {
        llmContent: '[]',
        returnDisplay: 'No scheduled tasks.',
      };
    }

    const displayLines = tasks.map((t, idx) => {
      const repeatInfo = t.intervalSeconds > 0
        ? `every ${t.intervalSeconds}s`
        : 'one-shot';
      return `${idx + 1}. [${t.status}] **${t.name}** (${t.id})\n   Command: ${t.command}\n   Mode: ${repeatInfo} | Runs: ${t.executionCount}${t.maxRepeat > 0 ? `/${t.maxRepeat}` : ''}\n   Next: ${t.nextRunAt || 'N/A'}${t.lastOutput ? `\n   Last output: ${t.lastOutput.slice(0, 200)}` : ''}`;
    });

    return {
      llmContent: safeJsonStringify(tasks),
      returnDisplay: `Scheduled tasks (${tasks.length}):\n\n${displayLines.join('\n\n')}`,
    };
  }

  private cancelTask(): ToolResult {
    const { taskId } = this.params;
    if (!taskId) {
      return {
        llmContent: 'Error: taskId is required for cancel action.',
        returnDisplay: 'Error: taskId is required.',
      };
    }

    const task = taskRegistry.get(taskId);
    if (!task) {
      return {
        llmContent: `Error: Task ${taskId} not found.`,
        returnDisplay: `Task ${taskId} not found.`,
      };
    }

    task.status = 'cancelled';
    const timer = taskTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      clearTimeout(timer);
      taskTimers.delete(taskId);
    }

    return {
      llmContent: safeJsonStringify({ id: taskId, status: 'cancelled' }),
      returnDisplay: `Task "${task.name}" (${taskId}) cancelled.`,
    };
  }

  private cancelAllTasks(): ToolResult {
    let count = 0;
    for (const [id, task] of taskRegistry.entries()) {
      if (task.status !== 'cancelled' && task.status !== 'completed') {
        task.status = 'cancelled';
        const timer = taskTimers.get(id);
        if (timer) {
          clearInterval(timer);
          clearTimeout(timer);
          taskTimers.delete(id);
        }
        count++;
      }
    }

    return {
      llmContent: safeJsonStringify({ cancelledCount: count }),
      returnDisplay: `Cancelled ${count} task(s).`,
    };
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    switch (this.params.action) {
      case 'create':
        return this.createTask();
      case 'list':
        return this.listTasks();
      case 'cancel':
        return this.cancelTask();
      case 'cancel_all':
        return this.cancelAllTasks();
      default:
        return {
          llmContent: `Unknown action: ${this.params.action}`,
          returnDisplay: `Unknown action: ${this.params.action}`,
        };
    }
  }
}

export class ScheduledTaskTool extends BaseDeclarativeTool<
  ScheduledTaskParams,
  ToolResult
> {
  static readonly Name = ToolNames.SCHEDULED_TASK;

  constructor() {
    super(
      ToolNames.SCHEDULED_TASK,
      ToolDisplayNames.SCHEDULED_TASK,
      description,
      Kind.Execute,
      schema.parametersJsonSchema as Record<string, unknown>,
      true,
      false,
      false,
    );
  }

  override validateToolParamValues(params: ScheduledTaskParams): string | null {
    if (params.action === 'create') {
      if (!params.name || params.name.trim().length === 0) {
        return 'name is required for create action.';
      }
      if (!params.command || params.command.trim().length === 0) {
        return 'command is required for create action.';
      }
      if (params.delaySeconds !== undefined && params.delaySeconds < 0) {
        return 'delaySeconds must be non-negative.';
      }
      if (params.intervalSeconds !== undefined && params.intervalSeconds < 0) {
        return 'intervalSeconds must be non-negative.';
      }
      if (params.maxRepeat !== undefined && params.maxRepeat < 0) {
        return 'maxRepeat must be non-negative.';
      }
    }
    if (params.action === 'cancel' && (!params.taskId || params.taskId.trim().length === 0)) {
      return 'taskId is required for cancel action.';
    }
    return null;
  }

  override createInvocation(params: ScheduledTaskParams) {
    return new ScheduledTaskInvocation(params);
  }
}
