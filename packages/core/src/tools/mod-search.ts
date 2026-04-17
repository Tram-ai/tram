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

const debugLogger = createDebugLogger('MOD_SEARCH');

/**
 * Generate fuzzy search variants by removing one character at a time,
 * trimming trailing characters, and generating substring variants.
 * This helps find mods when the exact name is slightly misspelled
 * (e.g., "Essx" should find "Essentials" by trying "Ess", "Esx", etc.)
 */
function generateFuzzyVariants(query: string): string[] {
  const variants: Set<string> = new Set();
  const q = query.trim();
  if (q.length < 3) return [];

  // 1. Trim last 1-2 characters (common typo pattern: extra chars at end)
  if (q.length > 3) {
    variants.add(q.slice(0, -1));
  }
  if (q.length > 4) {
    variants.add(q.slice(0, -2));
  }

  // 2. Remove one character at each position (skip first char)
  for (let i = 1; i < q.length; i++) {
    const variant = q.slice(0, i) + q.slice(i + 1);
    if (variant.length >= 3) {
      variants.add(variant);
    }
  }

  // 3. Use only the first N chars as prefix search
  if (q.length > 4) {
    variants.add(q.slice(0, Math.ceil(q.length * 0.7)));
  }

  // Remove the original query from variants
  variants.delete(q);

  return Array.from(variants);
}

export interface ModSearchParams {
  query: string;
  source?: 'curseforge' | 'modrinth' | 'hangar' | 'spiget' | 'both' | 'all';
  loaders?: string[];
  gameVersion?: string;
  limit?: number;
  includePreRelease?: boolean;
}

interface ModResult {
  name: string;
  slug: string;
  projectId: string;
  description: string;
  source: 'curseforge' | 'modrinth' | 'hangar' | 'spiget';
  latestVersion?: string;
  versionId?: string;
  downloadUrl?: string;
  compatibleLoaders: string[];
  compatibleVersions: string[];
  projectUrl: string;
  downloads?: number;
  datePublished?: string;
  releaseChannel?: 'release' | 'beta' | 'alpha';
}

const description =
  'Search for Minecraft mods and plugins from CurseForge, Modrinth, Hangar (Paper plugins), and SpiGet (Spigot plugins). Supports filtering by loader and Minecraft version. Returns names, descriptions, project IDs, compatible loaders/versions, and URLs.';

const schema: FunctionDeclaration = {
  name: ToolNames.MOD_SEARCH,
  description,
  parametersJsonSchema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search keyword or mod name',
      },
      source: {
        type: 'string',
        enum: ['curseforge', 'modrinth', 'hangar', 'spiget', 'both', 'all'],
        description: 'Which platform to search. "both" = Modrinth+CurseForge, "all" = all 4 platforms. Default is "both". Use "hangar" for Paper plugins, "spiget" for Spigot plugins.',
      },
      loaders: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Filter by loader types, e.g. ["fabric", "forge"]. Supported: fabric, forge, neoforge, quilt, paper, spigot, bukkit, waterfall, velocity, folia, bungeecord, sponge.',
      },
      gameVersion: {
        type: 'string',
        description: 'Minecraft version to filter by, e.g. "1.20.1"',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return. Default is 10.',
      },
      includePreRelease: {
        type: 'boolean',
        description: 'Include beta/alpha pre-release versions. Default is false (release only).',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};

class ModSearchInvocation extends BaseToolInvocation<
  ModSearchParams,
  ToolResult
> {
  getDescription(): string {
    return `Search mods: "${this.params.query}" (source: ${this.params.source || 'both'})`;
  }

  private async searchModrinth(): Promise<ModResult[]> {
    const loaders = this.params.loaders?.join(',') || '';
    const limit = this.params.limit || 10;

    const url = new URL('https://api.modrinth.com/v2/search');
    url.searchParams.set('query', this.params.query);
    url.searchParams.set('limit', String(limit));
    // Use 'updated' index to prioritize recently-updated projects
    url.searchParams.set('index', 'updated');

    // Modrinth v2 search uses facets for filtering
    const facets: string[][] = [];
    if (loaders) {
      for (const loader of loaders.split(',')) {
        facets.push([`categories:${loader.trim()}`]);
      }
    }
    if (this.params.gameVersion) {
      facets.push([`versions:${this.params.gameVersion}`]);
    }
    if (facets.length > 0) {
      url.searchParams.set('facets', JSON.stringify(facets));
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Modrinth API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      hits?: Array<{
        project_id: string;
        slug: string;
        title: string;
        description: string;
        categories?: string[];
        versions?: string[];
        downloads?: number;
        latest_version?: string;
        date_modified?: string;
      }>;
    };

    const hits = data.hits || [];

    // Fetch the latest version for each project to get accurate release date and version info
    const enriched = await Promise.all(
      hits.map(async (hit) => {
        const base: ModResult = {
          name: hit.title,
          slug: hit.slug,
          projectId: hit.project_id,
          description: hit.description || 'No description',
          source: 'modrinth' as const,
          latestVersion: hit.latest_version,
          compatibleLoaders: hit.categories || [],
          compatibleVersions: hit.versions || [],
          projectUrl: `https://modrinth.com/mod/${hit.slug}`,
          downloads: hit.downloads,
          datePublished: hit.date_modified,
        };

        try {
          const versionInfo = await this.fetchModrinthLatestVersion(
            hit.project_id,
            this.params.loaders,
            this.params.gameVersion,
            this.params.includePreRelease,
          );
          if (versionInfo) {
            base.latestVersion = versionInfo.versionNumber;
            base.versionId = versionInfo.versionId;
            base.downloadUrl = versionInfo.downloadUrl;
            base.datePublished = versionInfo.datePublished;
            base.releaseChannel = versionInfo.releaseChannel;
          }
        } catch {
          // Keep search-level data if version fetch fails
        }

        return base;
      }),
    );

    return enriched;
  }

  /**
   * Fetch the latest version of a Modrinth project, optionally filtered by loaders/game version.
   */
  private async fetchModrinthLatestVersion(
    projectId: string,
    loaders?: string[],
    gameVersion?: string,
    includePreRelease?: boolean,
  ): Promise<{ versionNumber: string; versionId: string; datePublished: string; downloadUrl: string; releaseChannel: 'release' | 'beta' | 'alpha' } | null> {
    const url = new URL(`https://api.modrinth.com/v2/project/${projectId}/version`);
    if (loaders && loaders.length > 0) {
      url.searchParams.set('loaders', JSON.stringify(loaders));
    }
    if (gameVersion) {
      url.searchParams.set('game_versions', JSON.stringify([gameVersion]));
    }

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'TRAM-AI/1.0' },
    });
    if (!response.ok) return null;

    const versions = (await response.json()) as Array<{
      id: string;
      version_number: string;
      date_published: string;
      version_type: 'release' | 'beta' | 'alpha';
      files?: Array<{ url: string; primary: boolean; filename: string }>;
    }>;

    if (!versions || versions.length === 0) return null;

    // Filter by release channel unless includePreRelease is set
    let candidates = versions;
    if (!includePreRelease) {
      const releaseOnly = versions.filter(v => v.version_type === 'release');
      if (releaseOnly.length > 0) {
        candidates = releaseOnly;
      }
      // If no release versions, fall back to all (beta/alpha)
    }

    const latest = candidates[0]!;
    const primaryFile = latest.files?.find(f => f.primary) || latest.files?.[0];
    return {
      versionNumber: latest.version_number,
      versionId: latest.id,
      datePublished: latest.date_published,
      downloadUrl: primaryFile?.url || '',
      releaseChannel: latest.version_type || 'release',
    };
  }

  private async searchCurseForge(): Promise<ModResult[]> {
    const limit = this.params.limit || 10;

    // Use proxy domain to avoid API key requirement
    const url = new URL(
      'https://curseforgeapi.912778.xyz/v1/mods/search',
    );
    url.searchParams.set('gameId', '432'); // 432 = Minecraft
    url.searchParams.set('searchFilter', this.params.query);
    url.searchParams.set('pageSize', String(limit));
    url.searchParams.set('sortField', '6'); // 6 = TotalDownloads
    url.searchParams.set('sortOrder', 'desc');

    if (this.params.gameVersion) {
      url.searchParams.set('gameVersion', this.params.gameVersion);
    }

    if (this.params.loaders && this.params.loaders.length > 0) {
      // CurseForge modLoaderType: 1=Forge, 4=Fabric, 5=Quilt, 6=NeoForge
      const loaderMap: Record<string, number> = {
        forge: 1,
        fabric: 4,
        quilt: 5,
        neoforge: 6,
      };
      const modLoaderTypes = this.params.loaders
        .map((loader) => loaderMap[loader.toLowerCase()])
        .filter(Boolean) as number[];
      if (modLoaderTypes.length > 0) {
        // CurseForge API only accepts a single modLoaderType
        url.searchParams.set('modLoaderType', String(modLoaderTypes[0]));
      }
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`CurseForge API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      data?: Array<{
        id: number;
        name: string;
        slug: string;
        summary: string;
        websiteUrl?: string;
        links?: {
          websiteUrl?: string;
        };
        downloadCount?: number;
        dateModified?: string;
        modLoaders?: string[];
        gameVersionLatestFiles?: Array<{ gameVersion: string }>;
        latestFilesIndexes?: Array<{
          gameVersion: string;
          fileId: number;
          filename: string;
          modLoader?: number;
        }>;
        mainFileId?: number;
        latestFiles?: Array<{
          id: number;
          displayName: string;
          fileName: string;
          downloadUrl: string;
          releaseType: number; // 1=Release, 2=Beta, 3=Alpha
          gameVersions?: string[];
        }>;
      }>;
    };

    // CurseForge modLoader number -> name mapping
    const cfLoaderMap: Record<number, string> = {
      0: 'any',
      1: 'forge',
      2: 'cauldron',
      3: 'liteloader',
      4: 'fabric',
      5: 'quilt',
      6: 'neoforge',
    };

    return (data.data || []).map((mod) => {
      let latestVersion: string | undefined;
      let downloadUrl: string | undefined;
      let versionId: string | undefined;
      let releaseChannel: 'release' | 'beta' | 'alpha' | undefined;

      if (mod.latestFiles && mod.latestFiles.length > 0) {
        // Filter by release type unless includePreRelease
        let candidates = mod.latestFiles;
        if (!this.params.includePreRelease) {
          const releaseOnly = candidates.filter(f => f.releaseType === 1);
          if (releaseOnly.length > 0) {
            candidates = releaseOnly;
          }
        }
        const latest = candidates[0]!;
        // Extract real version from displayName (e.g. "[Fabric] Sodium 0.5.8" -> use full displayName)
        latestVersion = latest.displayName || latest.fileName;
        downloadUrl = latest.downloadUrl || `https://www.curseforge.com/api/v1/mods/${mod.id}/files/${latest.id}/download`;
        versionId = String(latest.id);
        releaseChannel = latest.releaseType === 1 ? 'release' : latest.releaseType === 2 ? 'beta' : 'alpha';
      }

      // Extract loaders and versions from latestFilesIndexes (more reliable than modLoaders field)
      let compatibleLoaders: string[] = mod.modLoaders || [];
      let compatibleVersions: string[] = [];

      if (mod.latestFilesIndexes && mod.latestFilesIndexes.length > 0) {
        // Extract loaders from modLoader numbers
        const loaderNames = mod.latestFilesIndexes
          .map(idx => idx.modLoader != null ? cfLoaderMap[idx.modLoader] : undefined)
          .filter((name): name is string => !!name && name !== 'any');
        if (loaderNames.length > 0) {
          compatibleLoaders = [...new Set(loaderNames)];
        }

        // Extract game versions from latestFilesIndexes
        const fileVersions = mod.latestFilesIndexes
          .map(idx => idx.gameVersion)
          .filter(Boolean);
        if (fileVersions.length > 0) {
          compatibleVersions = [...new Set(fileVersions)];
        }
      }

      // Fallback: extract loaders and versions from latestFiles[].gameVersions
      // gameVersions contains both loader names (e.g. "Fabric", "NeoForge") and version numbers (e.g. "1.21.8")
      if ((compatibleLoaders.length === 0 || compatibleVersions.length === 0) && mod.latestFiles && mod.latestFiles.length > 0) {
        const knownLoaderNames = new Set(['forge', 'fabric', 'neoforge', 'quilt', 'liteloader', 'cauldron', 'rift', 'bukkit']);
        const versionPattern = /^\d+\.\d+/;
        const allGameVersions = mod.latestFiles.flatMap(f => f.gameVersions || []);

        if (compatibleLoaders.length === 0) {
          const loaders = allGameVersions
            .filter(v => knownLoaderNames.has(v.toLowerCase()))
            .map(v => v.toLowerCase());
          if (loaders.length > 0) {
            compatibleLoaders = [...new Set(loaders)];
          }
        }

        if (compatibleVersions.length === 0) {
          const versions = allGameVersions.filter(v => versionPattern.test(v));
          if (versions.length > 0) {
            compatibleVersions = [...new Set(versions)];
          }
        }
      }

      // Fallback to gameVersionLatestFiles if still no versions
      if (compatibleVersions.length === 0 && mod.gameVersionLatestFiles) {
        compatibleVersions = [
          ...new Set(
            mod.gameVersionLatestFiles.map((f) => f.gameVersion).filter(Boolean),
          ),
        ];
      }

      return {
        name: mod.name,
        slug: mod.slug,
        projectId: String(mod.id),
        description: mod.summary || 'No description',
        source: 'curseforge' as const,
        latestVersion,
        versionId,
        downloadUrl,
        releaseChannel,
        compatibleLoaders,
        compatibleVersions,
        projectUrl: mod.links?.websiteUrl || mod.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${mod.slug}`,
        downloads: mod.downloadCount,
        datePublished: mod.dateModified,
      };
    });
  }

  private async searchHangar(): Promise<ModResult[]> {
    const limit = this.params.limit || 10;

    const url = new URL('https://hangar.papermc.io/api/v1/projects');
    url.searchParams.set('q', this.params.query);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('sort', '-downloads');

    if (this.params.gameVersion) {
      url.searchParams.set('version', this.params.gameVersion);
    }

    // Hangar uses platform filter: PAPER, WATERFALL, VELOCITY
    if (this.params.loaders && this.params.loaders.length > 0) {
      const platformMap: Record<string, string> = {
        paper: 'PAPER',
        waterfall: 'WATERFALL',
        velocity: 'VELOCITY',
        folia: 'PAPER',
      };
      const platforms = this.params.loaders
        .map((l) => platformMap[l.toLowerCase()])
        .filter(Boolean);
      if (platforms.length > 0) {
        url.searchParams.set('platform', platforms[0]!);
      }
    }

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json', 'User-Agent': 'TRAM-AI/1.0' },
    });
    if (!response.ok) {
      throw new Error(`Hangar API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      result?: Array<{
        name: string;
        namespace: { owner: string; slug: string };
        description: string;
        stats: { downloads: number };
        lastUpdated?: string;
      }>;
    };

    // Fetch latest version for each project
    const enriched = await Promise.all(
      (data.result || []).map(async (project) => {
        const base: ModResult = {
          name: project.name,
          slug: project.namespace.slug,
          projectId: `${project.namespace.owner}/${project.namespace.slug}`,
          description: project.description || 'No description',
          source: 'hangar' as const,
          compatibleLoaders: ['paper'],
          compatibleVersions: [],
          projectUrl: `https://hangar.papermc.io/${project.namespace.owner}/${project.namespace.slug}`,
          downloads: project.stats.downloads,
          datePublished: project.lastUpdated,
        };

        try {
          const versionInfo = await this.fetchHangarLatestVersion(
            project.namespace.slug,
          );
          if (versionInfo) {
            base.latestVersion = versionInfo.versionName;
            base.versionId = versionInfo.versionName;
            base.downloadUrl = versionInfo.downloadUrl;
            base.releaseChannel = versionInfo.channel;
            base.compatibleVersions = versionInfo.platformVersions;
          }
        } catch {
          // Keep search-level data
        }

        return base;
      }),
    );

    return enriched;
  }

  /**
   * Fetch the latest version of a Hangar project.
   */
  private async fetchHangarLatestVersion(
    slug: string,
  ): Promise<{ versionName: string; downloadUrl: string; channel: 'release' | 'beta' | 'alpha'; platformVersions: string[] } | null> {
    const url = new URL(`https://hangar.papermc.io/api/v1/projects/${slug}/versions`);
    url.searchParams.set('limit', '5');
    url.searchParams.set('offset', '0');

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json', 'User-Agent': 'TRAM-AI/1.0' },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      result?: Array<{
        name: string;
        channel: { name: string };
        downloads: Record<string, number>;
        platformDependencies: Record<string, string[]>;
      }>;
    };

    if (!data.result || data.result.length === 0) return null;

    // Pick first release channel version, or first if includePreRelease
    let candidates = data.result;
    if (!this.params.includePreRelease) {
      const releaseOnly = candidates.filter(v =>
        v.channel.name.toLowerCase() === 'release',
      );
      if (releaseOnly.length > 0) {
        candidates = releaseOnly;
      }
    }

    const latest = candidates[0]!;
    const channelName = latest.channel.name.toLowerCase();
    const channel: 'release' | 'beta' | 'alpha' =
      channelName === 'release' ? 'release' :
      channelName === 'beta' || channelName === 'snapshot' ? 'beta' : 'alpha';

    // Collect platform versions
    const platformVersions = Object.values(latest.platformDependencies).flat();

    return {
      versionName: latest.name,
      downloadUrl: `https://hangar.papermc.io/api/v1/projects/${slug}/versions/${latest.name}/PAPER/download`,
      channel,
      platformVersions: [...new Set(platformVersions)],
    };
  }

  private async searchSpiGet(): Promise<ModResult[]> {
    const limit = this.params.limit || 10;

    const url = new URL(
      `https://api.spiget.org/v2/search/resources/${encodeURIComponent(this.params.query)}`,
    );
    url.searchParams.set('size', String(limit));
    url.searchParams.set('sort', '-downloads');

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'TRAM-AI/1.0' },
    });
    if (!response.ok) {
      throw new Error(`SpiGet API error: ${response.statusText}`);
    }

    const data = (await response.json()) as Array<{
      id: number;
      name: string;
      tag: string;
      downloads: number;
      updateDate?: number;
      testedVersions?: string[];
    }>;

    return (data || []).map((resource) => ({
      name: resource.name,
      slug: String(resource.id),
      projectId: String(resource.id),
      description: resource.tag || 'No description',
      source: 'spiget' as const,
      compatibleLoaders: ['spigot'],
      compatibleVersions: resource.testedVersions || [],
      projectUrl: `https://www.spigotmc.org/resources/${resource.id}`,
      downloads: resource.downloads,
      datePublished: resource.updateDate ? new Date(resource.updateDate * 1000).toISOString() : undefined,
    }));
  }

  /**
   * Execute search across selected platforms and return merged results.
   */
  private async executeSearch(source: string): Promise<ModResult[]> {
    const results: ModResult[] = [];

    const searchModrinth = source === 'modrinth' || source === 'both' || source === 'all';
    const searchCurseForge = source === 'curseforge' || source === 'both' || source === 'all';
    const searchHangar = source === 'hangar' || source === 'all';
    const searchSpiGet = source === 'spiget' || source === 'all';

    if (searchModrinth) {
      try {
        const modrinthResults = await this.searchModrinth();
        results.push(...modrinthResults);
      } catch (err) {
        debugLogger.warn('Modrinth search failed:', err);
      }
    }

    if (searchCurseForge) {
      try {
        const curseforgeResults = await this.searchCurseForge();
        results.push(...curseforgeResults);
      } catch (err) {
        debugLogger.warn('CurseForge search failed:', err);
      }
    }

    if (searchHangar) {
      try {
        const hangarResults = await this.searchHangar();
        results.push(...hangarResults);
      } catch (err) {
        debugLogger.warn('Hangar search failed:', err);
      }
    }

    if (searchSpiGet) {
      try {
        const spigetResults = await this.searchSpiGet();
        results.push(...spigetResults);
      } catch (err) {
        debugLogger.warn('SpiGet search failed:', err);
      }
    }

    return results;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const source = this.params.source || 'both';
      let results: ModResult[] = [];

      results = await this.executeSearch(source);

      // Fuzzy search fallback: if no results found, try with fuzzy query variants
      if (results.length === 0 && this.params.query.length >= 3) {
        const fuzzyVariants = generateFuzzyVariants(this.params.query);
        for (const variant of fuzzyVariants) {
          if (results.length > 0) break;
          debugLogger.debug(`Fuzzy retry with variant: "${variant}"`);
          const originalQuery = this.params.query;
          this.params.query = variant;
          try {
            results = await this.executeSearch(source);
          } finally {
            this.params.query = originalQuery;
          }
        }
      }

      if (results.length === 0) {
        return {
          llmContent: `No mods found matching "${this.params.query}"`,
          returnDisplay: `No mods found matching "${this.params.query}"`,
        };
      }

      // Deduplicate within same platform, keep all cross-platform results separate
      // Use source+slug composite key to avoid merging different platform results
      const limit = this.params.limit || 10;
      const uniqueResults = Array.from(
        new Map(results.map((r) => [`${r.source}:${r.slug.toLowerCase()}`, r])).values(),
      );

      // Sort: prefer results with a published date, then newer first, then downloads as tiebreaker
      uniqueResults.sort((a, b) => {
        const aDate = a.datePublished ? new Date(a.datePublished).getTime() : 0;
        const bDate = b.datePublished ? new Date(b.datePublished).getTime() : 0;
        const aHasDate = a.datePublished ? 1 : 0;
        const bHasDate = b.datePublished ? 1 : 0;
        // Results with dates come first
        if (aHasDate !== bHasDate) return bHasDate - aHasDate;
        // Among results with dates, newer first
        if (aDate !== bDate) return bDate - aDate;
        // Tiebreaker: downloads
        return (b.downloads ?? 0) - (a.downloads ?? 0);
      });
      const limitedResults = uniqueResults.slice(0, limit);

      const displayLines = limitedResults.map((mod, idx) => {
        const loaders = mod.compatibleLoaders.join(', ') || 'N/A';
        const versions = mod.compatibleVersions.slice(0, 5).join(', ') || 'N/A';
        const downloads = mod.downloads != null ? ` | Downloads: ${mod.downloads.toLocaleString()}` : '';
        const published = mod.datePublished ? ` | Updated: ${mod.datePublished}` : '';
        const version = mod.latestVersion ? ` (v${mod.latestVersion})` : '';
        const channel = mod.releaseChannel && mod.releaseChannel !== 'release' ? ` [${mod.releaseChannel}]` : '';
        const dlUrl = mod.downloadUrl ? `\n   Download: ${mod.downloadUrl}` : '';
        return `${idx + 1}. **${mod.name}**${version}${channel} [${mod.source}] (ID: ${mod.projectId})\n   Description: ${mod.description}\n   Loaders: ${loaders}\n   Versions: ${versions}${downloads}${published}\n   URL: ${mod.projectUrl}${dlUrl}`;
      });

      return {
        llmContent: safeJsonStringify({
          query: this.params.query,
          count: limitedResults.length,
          results: limitedResults,
        }),
        returnDisplay: `Found ${limitedResults.length} mod(s):\n\n${displayLines.join('\n\n')}`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Search error: ${errorMessage}`,
        returnDisplay: `Search error: ${errorMessage}`,
      };
    }
  }
}

export class ModSearchTool extends BaseDeclarativeTool<
  ModSearchParams,
  ToolResult
> {
  static readonly Name = ToolNames.MOD_SEARCH;

  constructor() {
    super(
      ToolNames.MOD_SEARCH,
      ToolDisplayNames.MOD_SEARCH,
      description,
      Kind.Search,
      schema.parametersJsonSchema as Record<string, unknown>,
      true,
      false,
      true,
    );
  }

  override validateToolParamValues(params: ModSearchParams): string | null {
    if (!params.query || params.query.trim().length === 0) {
      return 'query parameter is required and cannot be empty.';
    }

    if (params.limit !== undefined) {
      if (!Number.isInteger(params.limit) || params.limit <= 0) {
        return 'limit must be a positive integer when provided.';
      }
      if (params.limit > 50) {
        return 'limit cannot exceed 50.';
      }
    }

    const validLoaders = ['fabric', 'forge', 'neoforge', 'quilt', 'paper', 'spigot', 'bukkit', 'waterfall', 'velocity', 'folia', 'bungeecord', 'sponge'];
    if (params.loaders) {
      for (const loader of params.loaders) {
        if (!validLoaders.includes(loader.toLowerCase())) {
          return `invalid loader "${loader}". Valid options: ${validLoaders.join(', ')}`;
        }
      }
    }

    return null;
  }

  override createInvocation(params: ModSearchParams) {
    return new ModSearchInvocation(params);
  }
}
