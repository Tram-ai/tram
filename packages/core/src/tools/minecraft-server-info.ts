/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolNames } from './tool-names.js';
import type { ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { safeJsonStringify } from '../utils/safeJsonStringify.js';
import { createDebugLogger } from '../utils/debugLogger.js';

const debugLogger = createDebugLogger('MINECRAFT_SERVER_INFO');

export interface MinecraftServerInfoParams {
  action: 'list-versions' | 'get-server-info' | 'get-java-requirements' | 'get-by-hash';
  gameVersion?: string;
  serverType?: string;
  hash?: string;
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

const description =
  'Query MCJars API to retrieve Minecraft server information including latest game versions, server downloads, and Java version requirements for deployment.';

const paramSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['list-versions', 'get-server-info', 'get-java-requirements', 'get-by-hash'],
      description:
        'Action to perform: list-versions (get latest versions), get-server-info (get server download details), get-java-requirements (get Java version support), get-by-hash (find server by SHA256 hash).',
    },
    gameVersion: {
      type: 'string',
      description: 'Minecraft game version (e.g., "1.20.1"). Required for get-server-info and get-java-requirements.',
    },
    serverType: {
      type: 'string',
      enum: ['vanilla', 'paper', 'pufferfish', 'spigot', 'folia', 'purpur', 'waterfall', 'velocity', 'fabric', 'bungeecord', 'quilt', 'forge', 'neoforge', 'mohist', 'arclight', 'sponge'],
      description:
        'Server software type. Defaults to "paper" if not specified. Only for get-server-info and list-versions.',
    },
    hash: {
      type: 'string',
      description: 'SHA256 hash of the server JAR file. Required for get-by-hash action.',
    },
  },
  required: ['action'],
  additionalProperties: false,
};

class MinecraftServerInfoInvocation extends BaseToolInvocation<
  MinecraftServerInfoParams,
  ToolResult
> {
  getDescription(): string {
    return `Get Minecraft server info (${this.params.action})${
      this.params.gameVersion ? ` for version ${this.params.gameVersion}` : ''
    }`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const action = this.params.action;

      switch (action) {
        case 'list-versions':
          return await this.listVersions();
        case 'get-server-info':
          return await this.getServerInfo();
        case 'get-java-requirements':
          return await this.getJavaRequirements();
        case 'get-by-hash':
          return await this.getByHash();
        default:
          return {
            llmContent: JSON.stringify({ error: `Unknown action: ${action}` }),
            returnDisplay: `Error: Unknown action "${action}"`,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      debugLogger.error('minecraft-server-info execution error:', error);
      return {
        llmContent: JSON.stringify({ error: errorMessage }),
        returnDisplay: `Error fetching Minecraft server info: ${errorMessage}`,
      };
    }
  }

  private async listVersions(): Promise<ToolResult> {
    const serverType = (this.params.serverType || 'vanilla').toUpperCase();
    debugLogger.debug(`Fetching Minecraft version list from MCJars for type ${serverType}`);

    try {
      const response = await fetch(`https://mcjars.app/api/v2/builds/${serverType}`);
      if (!response.ok) {
        throw new Error(`MCJars API error: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      
      const versions: VersionInfo[] = [];
      
      if (data['builds'] && typeof data['builds'] === 'object') {
        for (const [version, info] of Object.entries(data['builds'] as Record<string, unknown>)) {
          if (typeof info === 'object' && info !== null) {
            const versionInfo = info as Record<string, unknown>;
            versions.push({
              version,
              release: versionInfo['type'] === 'RELEASE',
              releaseTime: versionInfo['created'] as string | undefined,
            });
          }
        }
      }

      // Sort by creation time (newest first)
      versions.sort((a, b) => {
        const timeA = a.releaseTime ? new Date(a.releaseTime).getTime() : 0;
        const timeB = b.releaseTime ? new Date(b.releaseTime).getTime() : 0;
        return timeB - timeA;
      });

      // Limit to 20 most recent versions
      const recentVersions = versions.slice(0, 20);

      const structured = {
        count: recentVersions.length,
        versions: recentVersions,
      };

      const displayLines = recentVersions
        .map((v) => `${v.version} [${v.release ? 'Release' : 'Snapshot'}]${v.releaseTime ? ` - ${v.releaseTime}` : ''}`)
        .join('\n');

      return {
        llmContent: safeJsonStringify(structured),
        returnDisplay: `Latest Minecraft Versions:\n\n${displayLines}`,
      };
    } catch (error) {
      throw new Error(`Failed to list versions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getServerInfo(): Promise<ToolResult> {
    const gameVersion = this.params.gameVersion;
    const serverType = (this.params.serverType || 'paper').toUpperCase();

    if (!gameVersion) {
      return {
        llmContent: JSON.stringify({ error: 'gameVersion is required for get-server-info' }),
        returnDisplay: 'Error: gameVersion parameter is required',
      };
    }

    debugLogger.debug(`Fetching ${serverType} server info for version ${gameVersion}`);

    try {
      // Fetch build info from v1 endpoint
      const buildResponse = await fetch(`https://mcjars.app/api/v1/builds/${serverType}/${gameVersion}/latest`);

      if (!buildResponse.ok) {
        if (buildResponse.status === 404) {
          return {
            llmContent: JSON.stringify({ error: `Version ${gameVersion} not found for ${serverType}` }),
            returnDisplay: `No ${serverType} server available for version ${gameVersion}`,
          };
        }
        throw new Error(`MCJars API error: ${buildResponse.statusText}`);
      }

      const buildResult = (await buildResponse.json()) as Record<string, unknown>;

      if (!buildResult['success'] || !buildResult['build']) {
        throw new Error('MCJars API returned invalid format or unsuccessful status');
      }

      const buildData = buildResult['build'] as Record<string, unknown>;

      // Fetch Java version from v2 endpoint (v1 /latest does not include Java info)
      let javaVersion = 'Unknown';
      try {
        const v2Response = await fetch(`https://mcjars.app/api/v2/builds/${serverType}`);
        if (v2Response.ok) {
          const v2Data = (await v2Response.json()) as Record<string, unknown>;
          const builds = v2Data['builds'] as Record<string, Record<string, unknown>> | undefined;
          if (builds && builds[gameVersion] && builds[gameVersion]['java'] != null) {
            javaVersion = `Java ${builds[gameVersion]['java']}`;
          }
        }
      } catch (v2Error) {
        debugLogger.warn('Failed to fetch Java version from v2 API, falling back to Unknown:', v2Error);
      }

      const serverInfo: ServerInfo = {
        name: (buildData['name'] as string) || `${serverType} ${gameVersion}`,
        version: gameVersion,
        downloadUrl: (buildData['jarUrl'] as string) || '',
        sha256: '', // Not provided directly in this endpoint
        javaVersion,
        minRam: 2048,           // Default assumptions
        recommendedRam: 4096,   // Default assumptions
      };

      const displayText = `${serverType} ${serverInfo.version} (Build ${buildData['buildNumber']})
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
      throw new Error(`Failed to get server info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getJavaRequirements(): Promise<ToolResult> {
    const gameVersion = this.params.gameVersion;

    if (!gameVersion) {
      return {
        llmContent: JSON.stringify({ error: 'gameVersion is required for get-java-requirements' }),
        returnDisplay: 'Error: gameVersion parameter is required',
      };
    }

    debugLogger.debug(`Fetching Java requirements for version ${gameVersion}`);

    try {
      // Query MCJars v2 API to get Java version for this game version
      // Use VANILLA as the canonical source for Java requirements (game-level, not server-specific)
      const response = await fetch('https://mcjars.app/api/v2/builds/VANILLA');
      if (!response.ok) {
        throw new Error(`MCJars API error: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      const builds = data['builds'] as Record<string, Record<string, unknown>> | undefined;

      let versionEntry = builds?.[gameVersion];

      // If exact version not found, try major.minor match
      if (!versionEntry && builds) {
        const majorMinor = gameVersion.split('.').slice(0, 2).join('.');
        versionEntry = builds[majorMinor];
      }

      if (!versionEntry || versionEntry['java'] == null) {
        return {
          llmContent: JSON.stringify({ error: `Java requirements not found for version ${gameVersion}` }),
          returnDisplay: `No Java requirement data found for Minecraft ${gameVersion}`,
        };
      }

      const javaVersion = versionEntry['java'] as number;
      const supported = versionEntry['supported'] as boolean | undefined;

      const requirement: JavaRequirement = {
        version: gameVersion,
        minJava: `Java ${javaVersion}`,
        recommendedJava: `Java ${javaVersion}`,
        eol: supported === false,
      };

      const displayText = `Minecraft ${requirement.version} Java Requirements:
Minimum: ${requirement.minJava}
Recommended: ${requirement.recommendedJava}
Status: ${requirement.eol ? 'End of Life / Unsupported' : 'Active / Supported'}`;

      return {
        llmContent: safeJsonStringify(requirement),
        returnDisplay: displayText,
      };
    } catch (error) {
      throw new Error(`Failed to get Java requirements: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getByHash(): Promise<ToolResult> {
    const hash = this.params.hash;

    if (!hash) {
      return {
        llmContent: JSON.stringify({ error: 'hash is required for get-by-hash' }),
        returnDisplay: 'Error: hash parameter is required',
      };
    }

    const cleanHash = hash.trim().toLowerCase();

    debugLogger.debug(`Fetching server info by hash: ${cleanHash}`);

    try {
      const response = await fetch(`https://mcjars.app/api/v1/build/${cleanHash}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            llmContent: JSON.stringify({ error: `No server found for hash ${cleanHash}` }),
            returnDisplay: `No Minecraft server JAR found for hash: ${cleanHash}`,
          };
        }
        throw new Error(`MCJars API error: ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      
      if (!data['success'] || !data['build']) {
        throw new Error('MCJars API returned invalid format or unsuccessful status');
      }

      const buildData = data['build'] as Record<string, unknown>;

      const serverInfo = {
        hash: cleanHash,
        name: (buildData['name'] as string) || 'Unknown Server',
        type: (buildData['type'] as string) || 'Unknown',
        versionId: (buildData['versionId'] as string) || 'Unknown',
        buildNumber: (buildData['buildNumber'] as number) || 0,
        downloadUrl: (buildData['jarUrl'] as string) || '',
        releaseTime: (buildData['created'] as string) || 'Unknown',
      };

      const displayText = `Server JAR Information:
Hash: ${serverInfo.hash}
Name: ${serverInfo.name}
Type: ${serverInfo.type}
Version: ${serverInfo.versionId}
Build: ${serverInfo.buildNumber}
Release Time: ${serverInfo.releaseTime}${serverInfo.downloadUrl ? `\nDownload: ${serverInfo.downloadUrl}` : ''}`;

      return {
        llmContent: safeJsonStringify(data),
        returnDisplay: displayText,
      };
    } catch (error) {
      throw new Error(`Failed to get server info by hash: ${error instanceof Error ? error.message : String(error)}`);
    }
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
      'MinecraftServerInfo',
      description,
      Kind.Fetch,
      paramSchema,
      true, // isOutputMarkdown
      false, // canUpdateOutput
      true, // isLmOnly
    );
  }

  protected createInvocation(params: MinecraftServerInfoParams): BaseToolInvocation<MinecraftServerInfoParams, ToolResult> {
    return new MinecraftServerInfoInvocation(params);
  }
}
