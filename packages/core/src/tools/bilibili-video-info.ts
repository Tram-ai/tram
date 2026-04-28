/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FunctionDeclaration } from "@google/genai";
import { ToolDisplayNames, ToolNames } from "./tool-names.js";
import type { ToolResult } from "./tools.js";
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import { safeJsonStringify } from "../utils/safeJsonStringify.js";
import { createDebugLogger } from "../utils/debugLogger.js";

const debugLogger = createDebugLogger("BILIBILI_VIDEO_INFO");

export interface BilibiliVideoInfoParams {
  action: "search" | "detail";
  /** Search keyword (required for action=search) */
  keyword?: string;
  /** BV number (required for action=detail) */
  bvid?: string;
  /** Page number for search results (default: 1) */
  page?: number;
  /** Page size for search results (default: 10, max: 50) */
  pageSize?: number;
}

interface BilibiliSearchResult {
  title: string;
  author: string;
  play: number;
  duration: string;
  bvid: string;
  description?: string;
}

interface BilibiliVideoDetail {
  title: string;
  bvid: string;
  aid: number;
  cid: number;
  owner: string;
  desc: string;
  duration: number;
  stat: {
    view: number;
    like: number;
    coin: number;
    favorite: number;
    share: number;
    danmaku: number;
    reply: number;
  };
}

const description =
  "Search Bilibili videos or get video details. Supports keyword search and fetching metadata by BV number. Returns titles, authors, play counts, duration, likes, coins, favorites, etc. No authentication required.";

const schema: FunctionDeclaration = {
  name: ToolNames.BILIBILI_VIDEO_INFO,
  description,
  parametersJsonSchema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["search", "detail"],
        description:
          'Action to perform: "search" to search videos by keyword, "detail" to get video details by BV number.',
      },
      keyword: {
        type: "string",
        description: 'Search keyword (required when action is "search").',
      },
      bvid: {
        type: "string",
        description:
          'Bilibili video BV number, e.g. "BV1hNFdz4EZp" (required when action is "detail").',
      },
      page: {
        type: "number",
        description: "Page number for search results. Default is 1.",
      },
      pageSize: {
        type: "number",
        description: "Number of results per page. Default is 10, maximum 50.",
      },
    },
    required: ["action"],
    additionalProperties: false,
  },
};

class BilibiliVideoInfoInvocation extends BaseToolInvocation<
  BilibiliVideoInfoParams,
  ToolResult
> {
  getDescription(): string {
    if (this.params.action === "search") {
      return `Search Bilibili: "${this.params.keyword}"`;
    }
    return `Get Bilibili video info: ${this.params.bvid}`;
  }

  private async searchVideos(): Promise<BilibiliSearchResult[]> {
    const keyword = this.params.keyword || "";
    const page = this.params.page || 1;
    const pageSize = Math.min(this.params.pageSize || 10, 50);

    const url = new URL("https://api.bilibili.com/x/web-interface/search/type");
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("search_type", "video");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.bilibili.com",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Bilibili search API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      code: number;
      message: string;
      data?: {
        result?: Array<{
          title: string;
          author: string;
          play: number;
          duration: string;
          bvid: string;
          description?: string;
        }>;
      };
    };

    if (data.code !== 0) {
      throw new Error(`Bilibili API returned error: ${data.message}`);
    }

    return (data.data?.result || []).map((item) => ({
      // Strip HTML tags from title (Bilibili wraps keywords in <em>)
      title: item.title.replace(/<[^>]*>/g, ""),
      author: item.author,
      play: item.play,
      duration: item.duration,
      bvid: item.bvid,
      description: item.description,
    }));
  }

  private async getVideoDetail(): Promise<BilibiliVideoDetail> {
    const bvid = this.params.bvid || "";

    const url = new URL("https://api.bilibili.com/x/web-interface/view");
    url.searchParams.set("bvid", bvid);

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.bilibili.com",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Bilibili view API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      code: number;
      message: string;
      data?: {
        title: string;
        bvid: string;
        aid: number;
        cid: number;
        owner: { name: string };
        desc: string;
        duration: number;
        stat: {
          view: number;
          like: number;
          coin: number;
          favorite: number;
          share: number;
          danmaku: number;
          reply: number;
        };
      };
    };

    if (data.code !== 0) {
      throw new Error(`Bilibili API returned error: ${data.message}`);
    }

    if (!data.data) {
      throw new Error("Video not found");
    }

    const v = data.data;
    return {
      title: v.title,
      bvid: v.bvid,
      aid: v.aid,
      cid: v.cid,
      owner: v.owner.name,
      desc: v.desc,
      duration: v.duration,
      stat: {
        view: v.stat.view,
        like: v.stat.like,
        coin: v.stat.coin,
        favorite: v.stat.favorite,
        share: v.stat.share,
        danmaku: v.stat.danmaku,
        reply: v.stat.reply,
      },
    };
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      if (this.params.action === "search") {
        const results = await this.searchVideos();

        if (results.length === 0) {
          return {
            llmContent: `No Bilibili videos found for "${this.params.keyword}"`,
            returnDisplay: `No videos found for "${this.params.keyword}"`,
          };
        }

        const displayLines = results.map((v, idx) => {
          return `${idx + 1}. **${v.title}** by ${v.author}\n   BV: ${v.bvid} | Plays: ${v.play.toLocaleString()} | Duration: ${v.duration}\n   URL: https://www.bilibili.com/video/${v.bvid}`;
        });

        return {
          llmContent: safeJsonStringify({
            keyword: this.params.keyword,
            count: results.length,
            results,
          }),
          returnDisplay: `Found ${results.length} Bilibili video(s):\n\n${displayLines.join("\n\n")}`,
        };
      } else {
        const detail = await this.getVideoDetail();

        const durationMin = Math.floor(detail.duration / 60);
        const durationSec = detail.duration % 60;
        const durationStr = `${durationMin}:${String(durationSec).padStart(2, "0")}`;

        const display = [
          `**${detail.title}**`,
          `UP: ${detail.owner} | BV: ${detail.bvid} | AV: ${detail.aid}`,
          `Duration: ${durationStr}`,
          `Description: ${detail.desc || "N/A"}`,
          "",
          `Views: ${detail.stat.view.toLocaleString()} | Likes: ${detail.stat.like.toLocaleString()} | Coins: ${detail.stat.coin.toLocaleString()}`,
          `Favorites: ${detail.stat.favorite.toLocaleString()} | Shares: ${detail.stat.share.toLocaleString()}`,
          `Danmaku: ${detail.stat.danmaku.toLocaleString()} | Replies: ${detail.stat.reply.toLocaleString()}`,
          `URL: https://www.bilibili.com/video/${detail.bvid}`,
        ].join("\n");

        return {
          llmContent: safeJsonStringify(detail),
          returnDisplay: display,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debugLogger.warn("Bilibili API error:", errorMessage);
      return {
        llmContent: `Bilibili API error: ${errorMessage}`,
        returnDisplay: `Error: ${errorMessage}`,
      };
    }
  }
}

export class BilibiliVideoInfoTool extends BaseDeclarativeTool<
  BilibiliVideoInfoParams,
  ToolResult
> {
  static readonly Name = ToolNames.BILIBILI_VIDEO_INFO;

  constructor() {
    super(
      ToolNames.BILIBILI_VIDEO_INFO,
      ToolDisplayNames.BILIBILI_VIDEO_INFO,
      description,
      Kind.Search,
      schema.parametersJsonSchema as Record<string, unknown>,
      true,
      false,
      true, // isLmOnly
    );
  }

  override validateToolParamValues(
    params: BilibiliVideoInfoParams,
  ): string | null {
    if (
      params.action === "search" &&
      (!params.keyword || params.keyword.trim().length === 0)
    ) {
      return "keyword is required for search action.";
    }
    if (
      params.action === "detail" &&
      (!params.bvid || params.bvid.trim().length === 0)
    ) {
      return "bvid is required for detail action.";
    }
    if (
      params.pageSize !== undefined &&
      (params.pageSize < 1 || params.pageSize > 50)
    ) {
      return "pageSize must be between 1 and 50.";
    }
    return null;
  }

  override createInvocation(params: BilibiliVideoInfoParams) {
    return new BilibiliVideoInfoInvocation(params);
  }
}
