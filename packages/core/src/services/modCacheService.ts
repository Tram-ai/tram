/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { createDebugLogger } from "../utils/debugLogger.js";

const debugLogger = createDebugLogger("MOD_CACHE_SERVICE");

export interface ModCacheEntry {
  hash: string;
  fileName: string;
  modInfo: {
    name: string;
    slug: string;
    version?: string;
    projectUrl: string;
    source: "modrinth" | "curseforge";
    loaders?: string[];
    gameVersions?: string[];
  };
  cachedAt: string;
}

export interface ModCacheIndex {
  entries: Map<string, ModCacheEntry>;
  lastUpdated: string;
}

/**
 * Manages Mod information across three memory layers:
 * - Session: Current task temporary cache
 * - Project: Project-specific Mod list
 * - Global: Machine-wide Mod library
 */
export class ModCacheService {
  private sessionCache: ModCacheIndex = {
    entries: new Map(),
    lastUpdated: new Date().toISOString(),
  };

  private projectCachePath = "";
  private globalCachePath = "";

  constructor(projectRoot?: string) {
    // Initialize paths
    if (projectRoot) {
      this.projectCachePath = path.join(projectRoot, ".tram", "mod-cache.json");
    }

    // Global cache in user home
    const homeDir = process.env["HOME"] || process.env["USERPROFILE"] || "";
    if (homeDir) {
      this.globalCachePath = path.join(
        homeDir,
        ".tram",
        "global-mod-cache.json",
      );
    }
  }

  /**
   * Retrieve mod information from the three-layer cache
   * Priority: Session > Project > Global
   */
  async getModInfo(hash: string): Promise<ModCacheEntry | null> {
    // 1. Check session cache (in-memory, fastest)
    if (this.sessionCache.entries.has(hash)) {
      debugLogger.debug(`Cache hit (session): ${hash}`);
      return this.sessionCache.entries.get(hash) || null;
    }

    // 2. Check project cache (if available)
    if (this.projectCachePath) {
      const projectEntry = await this.readFromProjectCache(hash);
      if (projectEntry) {
        debugLogger.debug(`Cache hit (project): ${hash}`);
        // Promote to session cache
        this.sessionCache.entries.set(hash, projectEntry);
        return projectEntry;
      }
    }

    // 3. Check global cache
    if (this.globalCachePath) {
      const globalEntry = await this.readFromGlobalCache(hash);
      if (globalEntry) {
        debugLogger.debug(`Cache hit (global): ${hash}`);
        // Promote to session and project cache
        this.sessionCache.entries.set(hash, globalEntry);
        if (this.projectCachePath) {
          await this.addToProjectCache(globalEntry);
        }
        return globalEntry;
      }
    }

    debugLogger.debug(`Cache miss: ${hash}`);
    return null;
  }

  /**
   * Store mod information in appropriate memory layer
   */
  async storeModInfo(
    entry: ModCacheEntry,
    scope: "session" | "project" | "global" = "global",
  ): Promise<void> {
    const entryWithTime = {
      ...entry,
      cachedAt: new Date().toISOString(),
    };

    switch (scope) {
      case "session":
        this.sessionCache.entries.set(entry.hash, entryWithTime);
        debugLogger.debug(`Stored to session cache: ${entry.hash}`);
        break;

      case "project":
        if (this.projectCachePath) {
          await this.addToProjectCache(entryWithTime);
          // Also promote to session
          this.sessionCache.entries.set(entry.hash, entryWithTime);
          debugLogger.debug(`Stored to project cache: ${entry.hash}`);
        }
        break;

      case "global":
        if (this.globalCachePath) {
          await this.addToGlobalCache(entryWithTime);
          // Also store in lower tiers
          if (this.projectCachePath) {
            await this.addToProjectCache(entryWithTime);
          }
          this.sessionCache.entries.set(entry.hash, entryWithTime);
          debugLogger.debug(`Stored to global cache: ${entry.hash}`);
        }
        break;
    }
  }

  /**
   * Get all cached mods in a scope
   */
  async getAllMods(
    scope: "session" | "project" | "global",
  ): Promise<ModCacheEntry[]> {
    switch (scope) {
      case "session":
        return Array.from(this.sessionCache.entries.values());

      case "project":
        if (this.projectCachePath) {
          return await this.readProjectCacheFile();
        }
        return [];

      case "global":
        if (this.globalCachePath) {
          return await this.readGlobalCacheFile();
        }
        return [];
    }
  }

  /**
   * Clear cache at specified scope
   */
  async clearCache(
    scope: "session" | "project" | "global" | "all",
  ): Promise<void> {
    switch (scope) {
      case "session":
        this.sessionCache.entries.clear();
        debugLogger.debug("Cleared session cache");
        break;

      case "project":
        if (this.projectCachePath) {
          try {
            await fs.unlink(this.projectCachePath);
            debugLogger.debug("Cleared project cache");
          } catch (err) {
            debugLogger.warn("Failed to clear project cache:", err);
          }
        }
        break;

      case "global":
        if (this.globalCachePath) {
          try {
            await fs.unlink(this.globalCachePath);
            debugLogger.debug("Cleared global cache");
          } catch (err) {
            debugLogger.warn("Failed to clear global cache:", err);
          }
        }
        break;

      case "all":
        this.sessionCache.entries.clear();
        if (this.projectCachePath) {
          try {
            await fs.unlink(this.projectCachePath);
          } catch (err) {
            // Ignore
          }
        }
        if (this.globalCachePath) {
          try {
            await fs.unlink(this.globalCachePath);
          } catch (err) {
            // Ignore
          }
        }
        debugLogger.debug("Cleared all caches");
        break;
    }
  }

  // ============== Private Methods ==============

  private async readFromProjectCache(
    hash: string,
  ): Promise<ModCacheEntry | null> {
    try {
      const entries = await this.readProjectCacheFile();
      return entries.find((e) => e.hash === hash) || null;
    } catch (err) {
      debugLogger.warn("Failed to read project cache:", err);
      return null;
    }
  }

  private async readFromGlobalCache(
    hash: string,
  ): Promise<ModCacheEntry | null> {
    try {
      const entries = await this.readGlobalCacheFile();
      return entries.find((e) => e.hash === hash) || null;
    } catch (err) {
      debugLogger.warn("Failed to read global cache:", err);
      return null;
    }
  }

  private async readProjectCacheFile(): Promise<ModCacheEntry[]> {
    if (!this.projectCachePath) return [];

    try {
      const content = await fs.readFile(this.projectCachePath, "utf-8");
      const data = JSON.parse(content);
      return data.entries || [];
    } catch (err) {
      return [];
    }
  }

  private async readGlobalCacheFile(): Promise<ModCacheEntry[]> {
    if (!this.globalCachePath) return [];

    try {
      const content = await fs.readFile(this.globalCachePath, "utf-8");
      const data = JSON.parse(content);
      return data.entries || [];
    } catch (err) {
      return [];
    }
  }

  private async addToProjectCache(entry: ModCacheEntry): Promise<void> {
    if (!this.projectCachePath) return;

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.projectCachePath), { recursive: true });

      // Read existing entries
      let entries: ModCacheEntry[] = [];
      try {
        const content = await fs.readFile(this.projectCachePath, "utf-8");
        const data = JSON.parse(content);
        entries = data.entries || [];
      } catch {
        // File doesn't exist yet
      }

      // Update or add entry
      const existingIndex = entries.findIndex((e) => e.hash === entry.hash);
      if (existingIndex >= 0) {
        entries[existingIndex] = entry;
      } else {
        entries.push(entry);
      }

      // Write back
      await fs.writeFile(
        this.projectCachePath,
        JSON.stringify(
          { entries, lastUpdated: new Date().toISOString() },
          null,
          2,
        ),
      );
    } catch (err) {
      debugLogger.warn("Failed to write project cache:", err);
    }
  }

  private async addToGlobalCache(entry: ModCacheEntry): Promise<void> {
    if (!this.globalCachePath) return;

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.globalCachePath), { recursive: true });

      // Read existing entries
      let entries: ModCacheEntry[] = [];
      try {
        const content = await fs.readFile(this.globalCachePath, "utf-8");
        const data = JSON.parse(content);
        entries = data.entries || [];
      } catch {
        // File doesn't exist yet
      }

      // Update or add entry (keep only recent few versions per mod)
      const modsGrouped = new Map<string, ModCacheEntry[]>();
      entries.forEach((e) => {
        const key = e.modInfo.slug;
        if (!modsGrouped.has(key)) {
          modsGrouped.set(key, []);
        }
        modsGrouped.get(key)!.push(e);
      });

      // Add new entry
      const key = entry.modInfo.slug;
      if (!modsGrouped.has(key)) {
        modsGrouped.set(key, []);
      }
      const modsOfType = modsGrouped.get(key)!;
      const existingIndex = modsOfType.findIndex((e) => e.hash === entry.hash);
      if (existingIndex >= 0) {
        modsOfType[existingIndex] = entry;
      } else {
        modsOfType.push(entry);
      }

      // Keep only latest 5 versions per mod
      if (modsOfType.length > 5) {
        modsOfType.sort(
          (a, b) =>
            new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime(),
        );
        modsGrouped.set(key, modsOfType.slice(0, 5));
      }

      // Flatten back to array
      const allEntries: ModCacheEntry[] = [];
      modsGrouped.forEach((mods) => allEntries.push(...mods));

      // Write back
      await fs.writeFile(
        this.globalCachePath,
        JSON.stringify(
          { entries: allEntries, lastUpdated: new Date().toISOString() },
          null,
          2,
        ),
      );
    } catch (err) {
      debugLogger.warn("Failed to write global cache:", err);
    }
  }
}

// Singleton instance
let globalCacheService: ModCacheService | null = null;

export function getGlobalModCacheService(
  projectRoot?: string,
): ModCacheService {
  if (!globalCacheService) {
    globalCacheService = new ModCacheService(projectRoot);
  }
  return globalCacheService;
}
