/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolResult } from './tools.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
} from './tools.js';
import type { FunctionDeclaration } from '@google/genai';
import { createDebugLogger } from '../utils/debugLogger.js';

const debugLogger = createDebugLogger('REQUEST_LOG_PATTERN');

export interface LogPatternSampleLine {
  line: string;
  lineNumber: number;
}

export interface RequestLogPatternParams {
  serviceName: string;
  description: string;
  sampleLines: LogPatternSampleLine[];
  suggestedPattern?: string;
  metadata?: {
    source?: string;
  };
}

const requestLogPatternToolDescription = `Request a log pattern rule from the user for handling similar logs in the future.
Provide sample lines and optionally a suggested regex pattern. User can accept, modify, or provide custom regex.
Once accepted, the pattern can be used to automatically suppress, analyze, or fix similar logs.
`;

const requestLogPatternToolSchemaData: FunctionDeclaration = {
  name: 'request_log_pattern',
  description: requestLogPatternToolDescription,
  parametersJsonSchema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      serviceName: {
        description: 'The name of the service this log pattern applies to.',
        type: 'string',
      },
      description: {
        description:
          'A brief description of what this log pattern represents (e.g., "Connection timeout errors").',
        type: 'string',
      },
      sampleLines: {
        description:
          'Example log lines that match this pattern (2-5 lines). Each line should include line number context.',
        type: 'array',
        minItems: 2,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            line: {
              description: 'The actual log line content.',
              type: 'string',
            },
            lineNumber: {
              description: 'The line number where this appeared in the log.',
              type: 'number',
            },
          },
          required: ['line', 'lineNumber'],
        },
      },
      suggestedPattern: {
        description:
          'Optional: A suggested regex pattern to match these logs. User can accept or modify it.',
        type: 'string',
      },
      metadata: {
        description: 'Optional metadata for tracking purposes.',
        type: 'object',
        additionalProperties: false,
      },
    },
    required: ['serviceName', 'description', 'sampleLines'],
    additionalProperties: false,
  },
};

class RequestLogPatternToolInvocation extends BaseToolInvocation<
  RequestLogPatternParams,
  ToolResult
> {
  constructor(
    params: RequestLogPatternParams,
  ) {
    super(params);
  }

  getDescription(): string {
    return `Request log pattern for service "${this.params.serviceName}": ${this.params.description}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const sampleLinesText = this.params.sampleLines
        .map((s) => `  Line ${s.lineNumber}: ${s.line}`)
        .join('\n');

      const suggestedPatternText =
        this.params.suggestedPattern 
          ? `\nSuggested pattern: \`${this.params.suggestedPattern}\``
          : '';

      const resultContent = [
        `Pattern rule requested for service "${this.params.serviceName}": ${this.params.description}`,
        '',
        'Sample lines:',
        sampleLinesText,
        suggestedPatternText,
        '',
        'User should provide a regex pattern to match these logs and specify action (suppress/analyze/auto-fix).',
      ].join('\n');

      return {
        llmContent: resultContent,
        returnDisplay: resultContent,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debugLogger.error(
        `[RequestLogPatternTool] Error: ${errorMessage}`,
      );

      const errorContent = `Failed to request log pattern: ${errorMessage}`;
      return {
        llmContent: errorContent,
        returnDisplay: errorContent,
      };
    }
  }
}

export class RequestLogPatternTool extends BaseDeclarativeTool<
  RequestLogPatternParams,
  ToolResult
> {
  static readonly Name: string = 'request_log_pattern';

  constructor() {
    super(
      RequestLogPatternTool.Name,
      'RequestLogPattern',
      requestLogPatternToolDescription,
      Kind.Think,
      requestLogPatternToolSchemaData.parametersJsonSchema as Record<
        string,
        unknown
      >,
    );
  }

  override validateToolParams(params: RequestLogPatternParams): string | null {
    if (!params.serviceName || typeof params.serviceName !== 'string') {
      return 'serviceName must be a non-empty string.';
    }

    if (!params.description || typeof params.description !== 'string') {
      return 'description must be a non-empty string.';
    }

    if (!Array.isArray(params.sampleLines)) {
      return 'sampleLines must be an array.';
    }

    if (params.sampleLines.length < 2 || params.sampleLines.length > 5) {
      return 'sampleLines must contain between 2 and 5 sample lines.';
    }

    for (let i = 0; i < params.sampleLines.length; i++) {
      const sample = params.sampleLines[i];
      if (!sample.line || typeof sample.line !== 'string') {
        return `sampleLines[${i}].line must be a non-empty string.`;
      }
      if (typeof sample.lineNumber !== 'number') {
        return `sampleLines[${i}].lineNumber must be a number.`;
      }
    }

    return null;
  }

  override createInvocation(
    params: RequestLogPatternParams,
  ): BaseToolInvocation<RequestLogPatternParams, ToolResult> {
    return new RequestLogPatternToolInvocation(params);
  }
}

