/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { convert } from "html-to-text";
import type { Config } from "../config/config.js";
import { fetchWithTimeout, isPrivateIp } from "../utils/fetch.js";
import { ToolErrorType } from "./tool-error.js";
import type {
  ToolCallConfirmationDetails,
  ToolInvocation,
  ToolResult,
  ToolConfirmationPayload,
  ToolConfirmationOutcome,
} from "./tools.js";
import type { PermissionDecision } from "../permissions/types.js";
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import { ToolNames, ToolDisplayNames } from "./tool-names.js";
import { createDebugLogger, type DebugLogger } from "../utils/debugLogger.js";

const URL_FETCH_TIMEOUT_MS = 10000;
const MAX_CONTENT_LENGTH = 100000;

/**
 * Parameters for the WebFetch tool
 */
export interface WebFetchToolParams {
  /**
   * The URL to fetch content from
   */
  url: string;
  /**
   * The prompt to run on the fetched content
   */
  prompt: string;
}

/**
 * Implementation of the WebFetch tool invocation logic
 */
class WebFetchToolInvocation extends BaseToolInvocation<
  WebFetchToolParams,
  ToolResult
> {
  private readonly debugLogger: DebugLogger;

  constructor(_config: Config, params: WebFetchToolParams) {
    super(params);
    this.debugLogger = createDebugLogger("WEB_FETCH");
  }

  private async executeDirectFetch(signal: AbortSignal): Promise<ToolResult> {
    let url = this.params.url;

    // Convert GitHub blob URL to raw URL
    if (url.includes("github.com") && url.includes("/blob/")) {
      url = url
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
      this.debugLogger.debug(
        `[WebFetchTool] Converted GitHub blob URL to raw URL: ${url}`,
      );
    }

    try {
      this.debugLogger.debug(`[WebFetchTool] Fetching content from: ${url}`);
      const response = await fetchWithTimeout(url, URL_FETCH_TIMEOUT_MS);

      // Collect response metadata for the model
      const responseStatus = response.status;
      const responseStatusText = response.statusText;
      const contentType = response.headers.get("content-type") || "unknown";
      const contentLength = response.headers.get("content-length") || "unknown";
      const finalUrl = response.url || url;
      const wasRedirected = response.redirected || finalUrl !== url;

      const headerInfo = [
        `HTTP ${responseStatus} ${responseStatusText}`,
        `Content-Type: ${contentType}`,
        `Content-Length: ${contentLength}`,
        wasRedirected ? `Redirected: ${url} → ${finalUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      if (!response.ok) {
        const errorMessage = `Request failed with status code ${responseStatus} ${responseStatusText}`;
        this.debugLogger.error(`[WebFetchTool] ${errorMessage}`);
        return {
          llmContent: `${headerInfo}\n\nError: ${errorMessage}`,
          returnDisplay: `Error: ${errorMessage}\n${headerInfo}`,
        };
      }

      this.debugLogger.debug(
        `[WebFetchTool] Successfully fetched content from ${finalUrl}`,
      );
      const rawContent = await response.text();
      const isHtmlContent = /html|xml/i.test(contentType);
      const extractedText = isHtmlContent
        ? convert(rawContent, {
            wordwrap: false,
            selectors: [
              { selector: "a", options: { ignoreHref: true } },
              { selector: "img", format: "skip" },
            ],
          })
        : rawContent;
      const textContent = extractedText.substring(0, MAX_CONTENT_LENGTH);
      const wasTruncated = extractedText.length > MAX_CONTENT_LENGTH;

      this.debugLogger.debug(
        `[WebFetchTool] Extracted response text (${textContent.length} characters)` +
          (wasTruncated ? " [truncated]" : ""),
      );

      return {
        llmContent: [
          `Fetched content from ${finalUrl}.`,
          `Requested extraction goal: ${this.params.prompt}`,
          `Response metadata:\n${headerInfo}`,
          "Fetched text:",
          textContent,
          wasTruncated
            ? `Note: content was truncated to ${MAX_CONTENT_LENGTH} characters.`
            : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        returnDisplay: `Content from ${finalUrl} fetched successfully.\n${headerInfo}`,
      };
    } catch (e) {
      const error = e as Error;
      const errorMessage = `Error during fetch for ${url}: ${error.message}`;
      this.debugLogger.error(`[WebFetchTool] ${errorMessage}`, error);
      return {
        llmContent: `Error: ${errorMessage}`,
        returnDisplay: `Error: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.WEB_FETCH_FALLBACK_FAILED,
        },
      };
    }
  }

  override getDescription(): string {
    const displayPrompt =
      this.params.prompt.length > 100
        ? this.params.prompt.substring(0, 97) + "..."
        : this.params.prompt;
    return `Fetching content from ${this.params.url} and processing with prompt: "${displayPrompt}"`;
  }

  /**
   * WebFetch is a read-like tool (fetches content) but requires confirmation
   * because it makes external network requests.
   */
  override async getDefaultPermission(): Promise<PermissionDecision> {
    return "ask";
  }

  /**
   * Constructs the web fetch confirmation details.
   */
  override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails> {
    // Extract the domain for the permission rule.
    let domain: string;
    try {
      domain = new URL(this.params.url).hostname;
    } catch {
      domain = this.params.url;
    }
    const permissionRules = [`WebFetch(${domain})`];

    const confirmationDetails: ToolCallConfirmationDetails = {
      type: "info",
      title: `Confirm Web Fetch`,
      prompt: `Fetch content from ${this.params.url} and process with: ${this.params.prompt}`,
      urls: [this.params.url],
      permissionRules,
      onConfirm: async (
        _outcome: ToolConfirmationOutcome,
        _payload?: ToolConfirmationPayload,
      ) => {
        // No-op: persistence is handled by coreToolScheduler via PM rules
      },
    };
    return confirmationDetails;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    // Check if URL is private/localhost
    const isPrivate = isPrivateIp(this.params.url);

    if (isPrivate) {
      this.debugLogger.debug(
        `[WebFetchTool] Private IP detected for ${this.params.url}, using direct fetch`,
      );
    } else {
      this.debugLogger.debug(
        `[WebFetchTool] Public URL detected for ${this.params.url}, using direct fetch`,
      );
    }

    return this.executeDirectFetch(signal);
  }
}

/**
 * Implementation of the WebFetch tool logic
 */
export class WebFetchTool extends BaseDeclarativeTool<
  WebFetchToolParams,
  ToolResult
> {
  static readonly Name: string = ToolNames.WEB_FETCH;

  constructor(private readonly config: Config) {
    super(
      WebFetchTool.Name,
      ToolDisplayNames.WEB_FETCH,
      'Fetches content from a specified URL and processes it using an AI model\n- Takes a URL and a prompt as input\n- Fetches the URL content, converts HTML to markdown\n- Processes the content with the prompt using a small, fast model\n- Returns the model\'s response about the content\n- Use this tool when you need to retrieve and analyze web content\n\nUsage notes:\n  - IMPORTANT: If an MCP-provided web fetch tool is available, prefer using that tool instead of this one, as it may have fewer restrictions. All MCP-provided tools start with "mcp__".\n  - The URL must be a fully-formed valid URL\n  - The prompt should describe what information you want to extract from the page\n  - This tool is read-only and does not modify any files\n  - Results may be summarized if the content is very large\n  - Supports both public and private/localhost URLs using direct fetch',
      Kind.Fetch,
      {
        properties: {
          url: {
            description: "The URL to fetch content from",
            type: "string",
          },
          prompt: {
            description: "The prompt to run on the fetched content",
            type: "string",
          },
        },
        required: ["url", "prompt"],
        type: "object",
      },
    );
  }

  protected override validateToolParamValues(
    params: WebFetchToolParams,
  ): string | null {
    if (!params.url || params.url.trim() === "") {
      return "The 'url' parameter cannot be empty.";
    }
    if (
      !params.url.startsWith("http://") &&
      !params.url.startsWith("https://")
    ) {
      return "The 'url' must be a valid URL starting with http:// or https://.";
    }
    if (!params.prompt || params.prompt.trim() === "") {
      return "The 'prompt' parameter cannot be empty.";
    }
    return null;
  }

  protected createInvocation(
    params: WebFetchToolParams,
  ): ToolInvocation<WebFetchToolParams, ToolResult> {
    return new WebFetchToolInvocation(this.config, params);
  }
}
