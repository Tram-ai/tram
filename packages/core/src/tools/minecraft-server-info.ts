/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getBedrockStatus,
  getLegacyStatus,
  getModernStatus,
  getQueryFull,
  type BedrockStatusResponse,
  type LegacyStatusResponse,
  type ModernStatusResponse,
  type QueryFullResponse,
} from "./mcquery.js";
import { ToolNames } from "./tool-names.js";
import type { ToolResult } from "./tools.js";
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import { safeJsonStringify } from "../utils/safeJsonStringify.js";
import { createDebugLogger } from "../utils/debugLogger.js";

const debugLogger = createDebugLogger("MINECRAFT_SERVER_INFO");

type LiveStatusProtocol = "modern" | "legacy" | "bedrock";

export interface MinecraftServerInfoParams {
  action:
    | "list-versions"
    | "get-server-info"
    | "get-java-requirements"
    | "get-by-hash"
    | "get-live-status";
  gameVersion?: string;
  serverType?: string;
  hash?: string;
  host?: string;
  port?: number;
  timeoutMs?: number;
  enableSRV?: boolean;
  statusProtocol?: LiveStatusProtocol;
}

interface VersionInfo {
  version: string;
  release: boolean;
  releaseTime?: string;
}

interface ServerInfo {
  name: string;
  version: string;
  downloadUrl: string;
  sha256: string;
  javaVersion: string;
  minRam: number;
  recommendedRam: number;
}

interface JavaRequirement {
  version: string;
  minJava: string;
  recommendedJava: string;
  eol: boolean;
}

interface LiveServerStatus {
  host: string;
  port: number;
  protocol: LiveStatusProtocol;
  version: string | null;
  protocolVersion: number | null;
  motd: string | null;
  players: {
    online: number | null;
    max: number | null;
    sample: string[];
  };
  latencyMs: number | null;
  srvRecord: unknown;
  mods:
    | {
        type: string;
        list: Array<{ id: string; version: string }>;
      }
    | null;
  query: QueryFullResponse | null;
  queryError: string | null;
}

const description =
  "Query Minecraft deployment metadata from MCJars and live server status from local or remote Minecraft instances. Supports listing versions, resolving downloads, Java requirements, SHA256 lookup, and live status checks via mcquery.";

const paramSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: [
        "list-versions",
        "get-server-info",
        "get-java-requirements",
        "get-by-hash",
        "get-live-status",
      ],
      description:
        "Action to perform: list-versions (get latest versions), get-server-info (get server download details), get-java-requirements (get Java version support), get-by-hash (find server by SHA256 hash), get-live-status (query a running Minecraft server on localhost or another host).",
    },
    gameVersion: {
      type: "string",
      description:
        'Minecraft game version (e.g., "1.20.1"). Required for get-server-info and get-java-requirements.',
    },
    serverType: {
      type: "string",
      enum: [
        "vanilla",
        "paper",
        "pufferfish",
        "spigot",
        "folia",
        "purpur",
        "waterfall",
        "velocity",
        "fabric",
        "bungeecord",
        "quilt",
        "forge",
        "neoforge",
        "mohist",
        "arclight",
        "sponge",
      ],
      description:
        'Server software type. Defaults to "paper" if not specified. Only for get-server-info and list-versions.',
    },
    hash: {
      type: "string",
      description:
        "SHA256 hash of the server JAR file. Required for get-by-hash action.",
    },
    host: {
      type: "string",
      description: 'Target host for get-live-status. Defaults to "127.0.0.1".',
    },
    port: {
      type: "number",
      description:
        "Target port for get-live-status. Defaults to 25565 for Java protocols or 19132 for bedrock.",
    },
    timeoutMs: {
      type: "number",
      description:
        "Network timeout in milliseconds for get-live-status. Defaults to 5000.",
    },
    enableSRV: {
      type: "boolean",
      description:
        "Whether get-live-status should resolve SRV records for modern Java status requests.",
    },
    statusProtocol: {
      type: "string",
      enum: ["modern", "legacy", "bedrock"],
      description:
        'Protocol used by get-live-status. Defaults to "modern".',
    },
  },
  required: ["action"],
  additionalProperties: false,
};

class MinecraftServerInfoInvocation extends BaseToolInvocation<
  MinecraftServerInfoParams,
  ToolResult
> {
  getDescription(): string {
    return `Get Minecraft server info (${this.params.action})${
      this.params.gameVersion ? ` for version ${this.params.gameVersion}` : ""
    }`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const action = this.params.action;

      switch (action) {
        case "list-versions":
          return await this.listVersions();
        case "get-server-info":
          return await this.getServerInfo();
        case "get-java-requirements":
          return await this.getJavaRequirements();
        case "get-by-hash":
          return await this.getByHash();
        case "get-live-status":
          return await this.getLiveStatus();
        default:
          return {
            llmContent: JSON.stringify({ error: `Unknown action: ${action}` }),
            returnDisplay: `Error: Unknown action "${action}"`,
          };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debugLogger.error("minecraft-server-info execution error:", error);
      return {
        llmContent: JSON.stringify({ error: errorMessage }),
        returnDisplay: `Error fetching Minecraft server info: ${errorMessage}`,
      };
    }
  }

  private async listVersions(): Promise<ToolResult> {
    const serverType = (this.params.serverType || "vanilla").toUpperCase();
    debugLogger.debug(
      `Fetching Minecraft version list from MCJars for type ${serverType}`,
    );

    try {
      const response = await fetch(
        `https://mcjars.app/api/v2/builds/${serverType}`,
      );
      if (!response.ok) {
        throw new Error(`MCJars API error: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;

      const versions: VersionInfo[] = [];

      if (data["builds"] && typeof data["builds"] === "object") {
        for (const [version, info] of Object.entries(
          data["builds"] as Record<string, unknown>,
        )) {
          if (typeof info === "object" && info !== null) {
            const versionInfo = info as Record<string, unknown>;
            versions.push({
              version,
              release: versionInfo["type"] === "RELEASE",
              releaseTime: versionInfo["created"] as string | undefined,
            });
          }
        }
      }

      versions.sort((a, b) => {
        const timeA = a.releaseTime ? new Date(a.releaseTime).getTime() : 0;
        const timeB = b.releaseTime ? new Date(b.releaseTime).getTime() : 0;
        return timeB - timeA;
      });

      const recentVersions = versions.slice(0, 20);

      const structured = {
        count: recentVersions.length,
        versions: recentVersions,
      };

      const displayLines = recentVersions
        .map(
          (v) =>
            `${v.version} [${v.release ? "Release" : "Snapshot"}]${v.releaseTime ? ` - ${v.releaseTime}` : ""}`,
        )
        .join("\n");

      return {
        llmContent: safeJsonStringify(structured),
        returnDisplay: `Latest Minecraft Versions:\n\n${displayLines}`,
      };
    } catch (error) {
      throw new Error(
        `Failed to list versions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getServerInfo(): Promise<ToolResult> {
    const gameVersion = this.params.gameVersion;
    const serverType = (this.params.serverType || "paper").toUpperCase();

    if (!gameVersion) {
      return {
        llmContent: JSON.stringify({
          error: "gameVersion is required for get-server-info",
        }),
        returnDisplay: "Error: gameVersion parameter is required",
      };
    }

    debugLogger.debug(
      `Fetching ${serverType} server info for version ${gameVersion}`,
    );

    try {
      const buildResponse = await fetch(
        `https://mcjars.app/api/v1/builds/${serverType}/${gameVersion}/latest`,
      );

      if (!buildResponse.ok) {
        if (buildResponse.status === 404) {
          return {
            llmContent: JSON.stringify({
              error: `Version ${gameVersion} not found for ${serverType}`,
            }),
            returnDisplay: `No ${serverType} server available for version ${gameVersion}`,
          };
        }
        throw new Error(`MCJars API error: ${buildResponse.statusText}`);
      }

      const buildResult = (await buildResponse.json()) as Record<
        string,
        unknown
      >;

      if (!buildResult["success"] || !buildResult["build"]) {
        throw new Error(
          "MCJars API returned invalid format or unsuccessful status",
        );
      }

      const buildData = buildResult["build"] as Record<string, unknown>;

      let javaVersion = "Unknown";
      try {
        const v2Response = await fetch(
          `https://mcjars.app/api/v2/builds/${serverType}`,
        );
        if (v2Response.ok) {
          const v2Data = (await v2Response.json()) as Record<string, unknown>;
          const builds = v2Data["builds"] as
            | Record<string, Record<string, unknown>>
            | undefined;
          if (
            builds &&
            builds[gameVersion] &&
            builds[gameVersion]["java"] != null
          ) {
            javaVersion = `Java ${builds[gameVersion]["java"]}`;
          }
        }
      } catch (v2Error) {
        debugLogger.warn(
          "Failed to fetch Java version from v2 API, falling back to Unknown:",
          v2Error,
        );
      }

      const serverInfo: ServerInfo = {
        name: (buildData["name"] as string) || `${serverType} ${gameVersion}`,
        version: gameVersion,
        downloadUrl: (buildData["jarUrl"] as string) || "",
        sha256: "",
        javaVersion,
        minRam: 2048,
        recommendedRam: 4096,
      };

      const displayText = `${serverType} ${serverInfo.version} (Build ${buildData["buildNumber"]})
Java Required: ${serverInfo.javaVersion}
Download: ${serverInfo.downloadUrl}`;

      return {
        llmContent: safeJsonStringify({
          build: buildData,
          javaVersion,
        }),
        returnDisplay: displayText,
      };
    } catch (error) {
      throw new Error(
        `Failed to get server info: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getJavaRequirements(): Promise<ToolResult> {
    const gameVersion = this.params.gameVersion;

    if (!gameVersion) {
      return {
        llmContent: JSON.stringify({
          error: "gameVersion is required for get-java-requirements",
        }),
        returnDisplay: "Error: gameVersion parameter is required",
      };
    }

    debugLogger.debug(`Fetching Java requirements for version ${gameVersion}`);

    try {
      const response = await fetch("https://mcjars.app/api/v2/builds/VANILLA");
      if (!response.ok) {
        throw new Error(`MCJars API error: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const builds = data["builds"] as
        | Record<string, Record<string, unknown>>
        | undefined;

      let versionEntry = builds?.[gameVersion];

      if (!versionEntry && builds) {
        const majorMinor = gameVersion.split(".").slice(0, 2).join(".");
        versionEntry = builds[majorMinor];
      }

      if (!versionEntry || versionEntry["java"] == null) {
        return {
          llmContent: JSON.stringify({
            error: `Java requirements not found for version ${gameVersion}`,
          }),
          returnDisplay: `No Java requirement data found for Minecraft ${gameVersion}`,
        };
      }

      const javaVersion = versionEntry["java"] as number;
      const supported = versionEntry["supported"] as boolean | undefined;

      const requirement: JavaRequirement = {
        version: gameVersion,
        minJava: `Java ${javaVersion}`,
        recommendedJava: `Java ${javaVersion}`,
        eol: supported === false,
      };

      const displayText = `Minecraft ${requirement.version} Java Requirements:
Minimum: ${requirement.minJava}
Recommended: ${requirement.recommendedJava}
Status: ${requirement.eol ? "End of Life / Unsupported" : "Active / Supported"}`;

      return {
        llmContent: safeJsonStringify(requirement),
        returnDisplay: displayText,
      };
    } catch (error) {
      throw new Error(
        `Failed to get Java requirements: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getByHash(): Promise<ToolResult> {
    const hash = this.params.hash;

    if (!hash) {
      return {
        llmContent: JSON.stringify({
          error: "hash is required for get-by-hash",
        }),
        returnDisplay: "Error: hash parameter is required",
      };
    }

    const cleanHash = hash.trim().toLowerCase();

    debugLogger.debug(`Fetching server info by hash: ${cleanHash}`);

    try {
      const response = await fetch(
        `https://mcjars.app/api/v1/build/${cleanHash}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            llmContent: JSON.stringify({
              error: `No server found for hash ${cleanHash}`,
            }),
            returnDisplay: `No Minecraft server JAR found for hash: ${cleanHash}`,
          };
        }
        throw new Error(`MCJars API error: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;

      if (!data["success"] || !data["build"]) {
        throw new Error(
          "MCJars API returned invalid format or unsuccessful status",
        );
      }

      const buildData = data["build"] as Record<string, unknown>;

      const serverInfo = {
        hash: cleanHash,
        name: (buildData["name"] as string) || "Unknown Server",
        type: (buildData["type"] as string) || "Unknown",
        versionId: (buildData["versionId"] as string) || "Unknown",
        buildNumber: (buildData["buildNumber"] as number) || 0,
        downloadUrl: (buildData["jarUrl"] as string) || "",
        releaseTime: (buildData["created"] as string) || "Unknown",
      };

      const displayText = `Server JAR Information:
Hash: ${serverInfo.hash}
Name: ${serverInfo.name}
Type: ${serverInfo.type}
Version: ${serverInfo.versionId}
Build: ${serverInfo.buildNumber}
Release Time: ${serverInfo.releaseTime}${serverInfo.downloadUrl ? `\nDownload: ${serverInfo.downloadUrl}` : ""}`;

      return {
        llmContent: safeJsonStringify(data),
        returnDisplay: displayText,
      };
    } catch (error) {
      throw new Error(
        `Failed to get server info by hash: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getLiveStatus(): Promise<ToolResult> {
    const protocol = this.params.statusProtocol || "modern";
    const host = this.params.host?.trim() || "127.0.0.1";
    const port = this.params.port ?? (protocol === "bedrock" ? 19132 : 25565);
    const timeoutMs = this.params.timeoutMs ?? 5000;

    debugLogger.debug(
      `Querying live Minecraft status for ${host}:${port} using ${protocol}`,
    );

    const statusOptions = {
      timeoutMs,
      enableSRV: this.params.enableSRV,
    };

    const liveStatus = await (async (): Promise<LiveServerStatus> => {
      switch (protocol) {
        case "legacy":
          return this.fromLegacyStatus(
            host,
            port,
            await getLegacyStatus(host, port, statusOptions),
          );
        case "bedrock":
          return this.fromBedrockStatus(
            host,
            port,
            await getBedrockStatus(host, port, statusOptions),
          );
        case "modern":
        default:
          return this.fromModernStatus(
            host,
            port,
            await getModernStatus(host, port, statusOptions),
          );
      }
    })();

    if (protocol !== "bedrock") {
      try {
        liveStatus.query = await getQueryFull(host, port, { timeoutMs });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        liveStatus.queryError = message;
        debugLogger.warn(
          `Minecraft query.full unavailable for ${host}:${port}: ${message}`,
        );
      }
    }

    return {
      llmContent: safeJsonStringify(liveStatus),
      returnDisplay: this.formatLiveStatusDisplay(liveStatus),
    };
  }

  private fromModernStatus(
    host: string,
    port: number,
    result: ModernStatusResponse,
  ): LiveServerStatus {
    return {
      host,
      port,
      protocol: "modern",
      version: result.version.name.clean || null,
      protocolVersion: result.version.protocol,
      motd: result.motd.clean || null,
      players: {
        online: result.players.online,
        max: result.players.max,
        sample: result.players.sample
          .map((player) => player.name.clean)
          .filter((name) => name.length > 0),
      },
      latencyMs: result.latency_ms,
      srvRecord: result.srv_record,
      mods: result.mods,
      query: null,
      queryError: null,
    };
  }

  private fromLegacyStatus(
    host: string,
    port: number,
    result: LegacyStatusResponse,
  ): LiveServerStatus {
    return {
      host,
      port,
      protocol: "legacy",
      version: result.version?.name.clean || null,
      protocolVersion: result.version?.protocol ?? null,
      motd: result.motd.clean || null,
      players: {
        online: result.players.online,
        max: result.players.max,
        sample: [],
      },
      latencyMs: null,
      srvRecord: result.srv_record,
      mods: null,
      query: null,
      queryError: null,
    };
  }

  private fromBedrockStatus(
    host: string,
    port: number,
    result: BedrockStatusResponse,
  ): LiveServerStatus {
    return {
      host,
      port,
      protocol: "bedrock",
      version: result.version,
      protocolVersion: result.protocol_version,
      motd: result.motd?.clean || null,
      players: {
        online: result.online_players,
        max: result.max_players,
        sample: [],
      },
      latencyMs: null,
      srvRecord: null,
      mods: null,
      query: null,
      queryError: null,
    };
  }

  private formatLiveStatusDisplay(result: LiveServerStatus): string {
    const lines = [
      `Minecraft Live Status (${result.host}:${result.port})`,
      `Protocol: ${result.protocol}`,
      result.version ? `Version: ${result.version}` : undefined,
      result.protocolVersion != null
        ? `Protocol Version: ${result.protocolVersion}`
        : undefined,
      result.players.online != null || result.players.max != null
        ? `Players: ${result.players.online ?? "?"}/${result.players.max ?? "?"}`
        : undefined,
      result.motd ? `MOTD: ${result.motd}` : undefined,
      result.latencyMs != null ? `Latency: ${result.latencyMs} ms` : undefined,
      result.players.sample.length > 0
        ? `Sample Players: ${result.players.sample.join(", ")}`
        : undefined,
      result.query?.data["map"] ? `Map: ${result.query.data["map"]}` : undefined,
      result.query?.players.length
        ? `Query Players: ${result.query.players.join(", ")}`
        : undefined,
      result.query?.data["plugins"]
        ? `Plugins: ${result.query.data["plugins"]}`
        : undefined,
      result.queryError ? `Query Data Unavailable: ${result.queryError}` : undefined,
    ].filter((line): line is string => Boolean(line));

    return lines.join("\n");
  }
}

export class MinecraftServerInfoTool extends BaseDeclarativeTool<
  MinecraftServerInfoParams,
  ToolResult
> {
  static readonly Name: string = ToolNames.MINECRAFT_SERVER_INFO;

  constructor() {
    super(
      MinecraftServerInfoTool.Name,
      "MinecraftServerInfo",
      description,
      Kind.Fetch,
      paramSchema,
      true,
      false,
      true,
    );
  }

  protected createInvocation(
    params: MinecraftServerInfoParams,
  ): BaseToolInvocation<MinecraftServerInfoParams, ToolResult> {
    return new MinecraftServerInfoInvocation(params);
  }
}
