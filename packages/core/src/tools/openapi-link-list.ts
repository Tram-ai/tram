/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolInvocation,
  type ToolResult,
} from "./tools.js";
import { ToolDisplayNames, ToolNames } from "./tool-names.js";
import { safeJsonStringify } from "../utils/safeJsonStringify.js";

interface OpenApiEntry {
  name: string;
  category: string;
  specUrl: string;
  docsUrl?: string;
  notes: string;
}

const COMMON_OPENAPI_ENTRIES: OpenApiEntry[] = [
  {
    name: "Modrinth API",
    category: "gaming",
    specUrl: "https://docs.modrinth.com/openapi.yaml",
    docsUrl: "https://docs.modrinth.com/",
    notes:
      "Minecraft mod, plugin, and modpack discovery and management API for server deployment.",
  },
  {
    name: "CurseForge API",
    category: "gaming",
    specUrl:
      "https://raw.githubusercontent.com/aternosorg/php-curseforge-api/master/openapi.yaml",
    docsUrl: "https://docs.curseforge.com/",
    notes:
      "CurseForge mod and plugin API for Minecraft server resource management. Use curseforgeapi.912778.xyz instead of api.curseforge.com to avoid API key requirement.",
  },
  {
    name: "MCJars API",
    category: "gaming",
    specUrl: "https://mcjars.app/openapi.json",
    docsUrl: "https://mcjars.app/",
    notes:
      "Minecraft jar file and version information API for server deployment.",
  },
  {
    name: "SpiGet API",
    category: "gaming",
    specUrl:
      "https://raw.githubusercontent.com/SpiGetOrg/Documentation/master/swagger.yml",
    docsUrl: "https://spiget.org/",
    notes:
      "Spigot/SpigotMC resource API for Bukkit/Spigot plugins discovery and download.",
  },
  {
    name: "Hangar API",
    category: "gaming",
    specUrl: "https://hangar.papermc.io/v3/api-docs/public",
    docsUrl: "https://hangar.papermc.io/",
    notes:
      "PaperMC Hangar plugin repository API for Paper/Velocity/Waterfall plugins.",
  },
];

export interface OpenApiLinkListParams {
  keyword?: string;
  category?: string;
  maxResults?: number;
}

class OpenApiLinkListInvocation extends BaseToolInvocation<
  OpenApiLinkListParams,
  ToolResult
> {
  override getDescription(): string {
    const queryParts = [
      this.params.keyword ? `keyword=${this.params.keyword}` : null,
      this.params.category ? `category=${this.params.category}` : null,
      this.params.maxResults ? `maxResults=${this.params.maxResults}` : null,
    ].filter(Boolean);
    const query = queryParts.length > 0 ? queryParts.join(", ") : "all entries";
    return `List Minecraft game server API specifications (${query}).`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const keyword = this.params.keyword?.trim().toLowerCase();
    const category = this.params.category?.trim().toLowerCase();
    const maxResults = this.params.maxResults ?? COMMON_OPENAPI_ENTRIES.length;

    let entries = COMMON_OPENAPI_ENTRIES.filter((entry) => {
      if (category && entry.category.toLowerCase() !== category) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return (
        entry.name.toLowerCase().includes(keyword) ||
        entry.category.toLowerCase().includes(keyword) ||
        entry.notes.toLowerCase().includes(keyword)
      );
    });

    entries = entries.slice(0, maxResults);

    if (entries.length === 0) {
      return {
        llmContent:
          "No matching Minecraft game server API links were found for the provided filters.",
        returnDisplay:
          "No matching Minecraft game server API links were found for the provided filters.",
      };
    }

    const lines = entries.map((entry, index) => {
      const docsLine = entry.docsUrl ? `\n   Docs: ${entry.docsUrl}` : "";
      return `${index + 1}. ${entry.name} [${entry.category}]\n   Spec: ${entry.specUrl}${docsLine}\n   Notes: ${entry.notes}`;
    });

    const structured = {
      count: entries.length,
      entries,
    };

    return {
      llmContent: safeJsonStringify(structured),
      returnDisplay: `Minecraft Game Server API links:\n\n${lines.join("\n\n")}`,
    };
  }
}

export class OpenApiLinkListTool extends BaseDeclarativeTool<
  OpenApiLinkListParams,
  ToolResult
> {
  static readonly Name: string = ToolNames.OPENAPI_LINK_LIST;

  constructor() {
    super(
      OpenApiLinkListTool.Name,
      ToolDisplayNames.OPENAPI_LINK_LIST,
      "Returns OpenAPI specification links for Minecraft game server APIs (Modrinth, CurseForge, MCJars) that the game server agent can use for autonomous server resource management and deployment automation. Supports filtering by keyword/category and limiting the number of returned items.",
      Kind.Read,
      {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description:
              "Optional keyword filter. Matches API name, category, or notes.",
          },
          category: {
            type: "string",
            description:
              "Optional exact category filter, for example: ai, payments, cloud-native, devops.",
          },
          maxResults: {
            type: "number",
            description:
              "Optional maximum number of entries to return. Default is all.",
          },
        },
        additionalProperties: false,
      },
    );
  }

  protected override validateToolParamValues(
    params: OpenApiLinkListParams,
  ): string | null {
    if (params.maxResults !== undefined) {
      if (!Number.isInteger(params.maxResults) || params.maxResults <= 0) {
        return "The 'maxResults' parameter must be a positive integer when provided.";
      }
      if (params.maxResults > 50) {
        return "The 'maxResults' parameter cannot exceed 50.";
      }
    }

    return null;
  }

  protected createInvocation(
    params: OpenApiLinkListParams,
  ): ToolInvocation<OpenApiLinkListParams, ToolResult> {
    return new OpenApiLinkListInvocation(params);
  }
}
