/**
 * @license
 * Copyright 2025 TRAM Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// TODO(merge-v0.15.10): upstream moved ErrorHandler/RequestContext into ./types.js with a different RequestContext shape (no isStreaming, userPromptId, authType, duration). TRAM's EnhancedErrorHandler reads isStreaming/authType/userPromptId via optional fields; we re-export RequestContext/ErrorHandler from ./types.js as the single source of truth, while still augmenting it with TRAM-specific optional context fields.
import type { GenerateContentParameters } from "@google/genai";
import { createDebugLogger } from "../../utils/debugLogger.js";
import type {
  RequestContext as BaseRequestContext,
  ErrorHandler,
} from "./types.js";

const debugLogger = createDebugLogger("OPENAI_ERROR");

/**
 * TRAM-extended request context. Adds optional fields consumed by the
 * local error-handling/troubleshooting code so we don't have to widen the
 * upstream RequestContext shape used by the converter functions.
 */
export type RequestContext = BaseRequestContext & {
  userPromptId?: string;
  authType?: string;
  duration?: number;
  isStreaming?: boolean;
};

export type { ErrorHandler };

export class EnhancedErrorHandler implements ErrorHandler {
  constructor(
    private shouldSuppressLogging: (
      error: unknown,
      request: GenerateContentParameters,
    ) => boolean = () => false,
  ) {}

  handle(
    error: unknown,
    context: RequestContext,
    request: GenerateContentParameters,
  ): never {
    const isTimeoutError = this.isTimeoutError(error);
    const errorMessage = this.buildErrorMessage(error, context, isTimeoutError);

    // Allow subclasses to suppress error logging for specific scenarios
    if (!this.shouldSuppressErrorLogging(error, request)) {
      const logPrefix = context.isStreaming
        ? "OpenAI API Streaming Error:"
        : "OpenAI API Error:";
      debugLogger.error(logPrefix, errorMessage);
    }

    // Provide helpful timeout-specific error message
    if (isTimeoutError) {
      throw new Error(
        `${errorMessage}\n\n${this.getTimeoutTroubleshootingTips(context)}`,
      );
    }

    throw error;
  }

  shouldSuppressErrorLogging(
    error: unknown,
    request: GenerateContentParameters,
  ): boolean {
    return this.shouldSuppressLogging(error, request);
  }

  private isTimeoutError(error: unknown): boolean {
    if (!error) return false;

    const errorMessage =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorCode = (error as any)?.code;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorType = (error as any)?.type;

    // Check for common timeout indicators
    return (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out") ||
      errorMessage.includes("connection timeout") ||
      errorMessage.includes("request timeout") ||
      errorMessage.includes("read timeout") ||
      errorMessage.includes("etimedout") ||
      errorMessage.includes("esockettimedout") ||
      errorCode === "ETIMEDOUT" ||
      errorCode === "ESOCKETTIMEDOUT" ||
      errorType === "timeout" ||
      errorMessage.includes("request timed out") ||
      errorMessage.includes("deadline exceeded")
    );
  }

  private buildErrorMessage(
    error: unknown,
    context: RequestContext,
    isTimeoutError: boolean,
  ): string {
    const durationSeconds = Math.round((Date.now() - context.startTime) / 1000);

    if (isTimeoutError) {
      const prefix = context.isStreaming
        ? "Streaming request timeout"
        : "Request timeout";
      return `${prefix} after ${durationSeconds}s. Try reducing input length or increasing timeout in config.`;
    }

    return error instanceof Error ? error.message : String(error);
  }

  private getTimeoutTroubleshootingTips(context: RequestContext): string {
    const baseTitle = context.isStreaming
      ? "Streaming timeout troubleshooting:"
      : "Troubleshooting tips:";

    const baseTips = [
      "- Reduce input length or complexity",
      "- Increase timeout in config: contentGenerator.timeout",
      "- Check network connectivity",
    ];

    const streamingSpecificTips = context.isStreaming
      ? [
          "- Check network stability for streaming connections",
          "- Consider using non-streaming mode for very long inputs",
        ]
      : ["- Consider using streaming mode for long responses"];

    return `${baseTitle}\n${[...baseTips, ...streamingSpecificTips].join("\n")}`;
  }
}
