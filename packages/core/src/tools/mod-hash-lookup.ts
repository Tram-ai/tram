/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { inflateRawSync } from "node:zlib";
import type { FunctionDeclaration } from "@google/genai";
import toml from "@iarna/toml";
import { ToolDisplayNames, ToolNames } from "./tool-names.js";
import type { ToolResult } from "./tools.js";
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import { safeJsonStringify } from "../utils/safeJsonStringify.js";
import { createDebugLogger } from "../utils/debugLogger.js";
import { parse as parseYaml } from "../utils/yaml-parser.js";

const debugLogger = createDebugLogger("MOD_HASH_LOOKUP");

export interface ModHashLookupParams {
  filePath: string;
  hashType?: "md5" | "sha1" | "sha256";
}

interface ModHashResult {
  fileName: string;
  filePath: string;
  hash: string;
  hashType: string;
  curseForgeFingerprint?: number;
  modInfo?: {
    name: string;
    version: string;
    loader: string;
  };
  modrinthMatch?: {
    name: string;
    slug: string;
    projectId: string;
    projectUrl: string;
    versionNumber: string;
    fileName: string;
    downloadUrl: string;
    compatible_loaders: string[];
    compatible_versions: string[];
  };
  curseForgeMatch?: {
    name: string;
    projectId: number;
    fileId: number;
    fileName: string;
    projectUrl: string;
    downloadUrl: string;
  };
  hangarMatch?: {
    name: string;
    projectUrl: string;
    versionName: string;
    versionVerified: boolean;
    channel?: string;
    platform: string;
  };
}

const description =
  "Calculate hash of a mod JAR file and look up matching mods on Modrinth and CurseForge. Supports MD5, SHA1, and SHA256 hashes. For JAR files, also attempts to extract mod metadata from the filename.";

const schema: FunctionDeclaration = {
  name: ToolNames.MOD_HASH_LOOKUP,
  description,
  parametersJsonSchema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Path to the mod JAR file",
      },
      hashType: {
        type: "string",
        enum: ["md5", "sha1", "sha256"],
        description:
          "Hash algorithm to use. Default is sha1 (Modrinth standard).",
      },
    },
    required: ["filePath"],
    additionalProperties: false,
  },
};

class ModHashLookupInvocation extends BaseToolInvocation<
  ModHashLookupParams,
  ToolResult
> {
  getDescription(): string {
    return `Look up mod by hash: ${this.params.filePath}`;
  }

  private async extractModMetadata(
    filePath: string,
    fileBuffer?: Buffer,
  ): Promise<{ name: string; version: string; loader: string } | null> {
    const fileName = filePath.split(/[\\/]/).pop() || "";

    // Phase 1: Try archive metadata if we have the buffer and it's a JAR/ZIP
    if (fileBuffer && /\.(jar|zip)$/i.test(fileName)) {
      const archiveResult = await this.extractMetadataFromArchive(fileBuffer);
      if (
        archiveResult &&
        (archiveResult.version !== "unknown" ||
          archiveResult.loader !== "unknown")
      ) {
        return archiveResult;
      }
    }

    // Phase 2: Filename heuristics
    try {
      const match = fileName.match(/^(.+?)-([0-9.]+(?:-\w+)?)\.(jar|zip)$/i);
      if (match) {
        const [, name, version] = match;
        let loader = "unknown";
        if (name.toLowerCase().includes("fabric")) loader = "fabric";
        else if (name.toLowerCase().includes("forge")) loader = "forge";
        else if (name.toLowerCase().includes("neoforge")) loader = "neoforge";
        else if (name.toLowerCase().includes("quilt")) loader = "quilt";

        return { name, version, loader };
      }

      const nameOnly = fileName.replace(/\.[^.]+$/, "");
      return {
        name: nameOnly,
        version: "unknown",
        loader: "unknown",
      };
    } catch (err) {
      debugLogger.warn("Failed to extract mod metadata:", err);
      return null;
    }
  }

  /**
   * Read specific entries from a ZIP/JAR buffer.
   * Parses the Central Directory to find entries by name, then decompresses them.
   */
  private readZipEntries(
    zipBuffer: Buffer,
    targetNames: string[],
  ): Map<string, Buffer> {
    const results = new Map<string, Buffer>();
    const targetSet = new Set(targetNames.map((n) => n.toLowerCase()));

    try {
      // Find End of Central Directory record (EOCD)
      // EOCD signature: 0x06054b50
      let eocdOffset = -1;
      for (
        let i = zipBuffer.length - 22;
        i >= Math.max(0, zipBuffer.length - 65557);
        i--
      ) {
        if (
          zipBuffer[i] === 0x50 &&
          zipBuffer[i + 1] === 0x4b &&
          zipBuffer[i + 2] === 0x05 &&
          zipBuffer[i + 3] === 0x06
        ) {
          eocdOffset = i;
          break;
        }
      }
      if (eocdOffset === -1) return results;

      const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
      const cdSize = zipBuffer.readUInt32LE(eocdOffset + 12);
      if (cdOffset + cdSize > zipBuffer.length) return results;

      // Parse Central Directory entries
      let pos = cdOffset;
      while (pos < cdOffset + cdSize && pos + 46 <= zipBuffer.length) {
        // Central Directory file header signature: 0x02014b50
        if (
          zipBuffer[pos] !== 0x50 ||
          zipBuffer[pos + 1] !== 0x4b ||
          zipBuffer[pos + 2] !== 0x01 ||
          zipBuffer[pos + 3] !== 0x02
        ) {
          break;
        }

        const compressionMethod = zipBuffer.readUInt16LE(pos + 10);
        const compressedSize = zipBuffer.readUInt32LE(pos + 20);
        const fileNameLen = zipBuffer.readUInt16LE(pos + 28);
        const extraLen = zipBuffer.readUInt16LE(pos + 30);
        const commentLen = zipBuffer.readUInt16LE(pos + 32);
        const localHeaderOffset = zipBuffer.readUInt32LE(pos + 42);

        const entryName = zipBuffer
          .subarray(pos + 46, pos + 46 + fileNameLen)
          .toString("utf-8");

        if (targetSet.has(entryName.toLowerCase())) {
          // Read from local file header
          if (localHeaderOffset + 30 <= zipBuffer.length) {
            const localFileNameLen = zipBuffer.readUInt16LE(
              localHeaderOffset + 26,
            );
            const localExtraLen = zipBuffer.readUInt16LE(
              localHeaderOffset + 28,
            );
            const dataStart =
              localHeaderOffset + 30 + localFileNameLen + localExtraLen;

            if (dataStart + compressedSize <= zipBuffer.length) {
              const compressedData = zipBuffer.subarray(
                dataStart,
                dataStart + compressedSize,
              );

              try {
                let data: Buffer;
                if (compressionMethod === 0) {
                  // Stored (no compression)
                  data = Buffer.from(compressedData);
                } else if (compressionMethod === 8) {
                  // Deflated
                  data = inflateRawSync(compressedData);
                } else {
                  pos += 46 + fileNameLen + extraLen + commentLen;
                  continue;
                }
                results.set(entryName.toLowerCase(), data);
              } catch {
                // Decompression failed, skip
              }
            }
          }
        }

        pos += 46 + fileNameLen + extraLen + commentLen;
      }
    } catch {
      // ZIP parsing failed
    }

    return results;
  }

  /**
   * Extract mod/plugin metadata from archive internal files.
   */
  private async extractMetadataFromArchive(
    fileBuffer: Buffer,
  ): Promise<{ name: string; version: string; loader: string } | null> {
    const targetFiles = [
      "fabric.mod.json",
      "quilt.mod.json",
      "meta-inf/mods.toml",
      "mcmod.info",
      "plugin.yml",
      "paper-plugin.yml",
      "velocity-plugin.json",
      "bungee.yml",
      "sponge_plugins.json",
      "meta-inf/manifest.mf",
    ];

    const entries = this.readZipEntries(fileBuffer, targetFiles);
    if (entries.size === 0) return null;

    // Priority order: specific mod loaders first, then generic plugin formats
    // 1. fabric.mod.json
    const fabricMod = entries.get("fabric.mod.json");
    if (fabricMod) {
      try {
        const data = JSON.parse(fabricMod.toString("utf-8"));
        return {
          name: data.name || data.id || "unknown",
          version: data.version || "unknown",
          loader: "fabric",
        };
      } catch {
        /* ignore parse errors */
      }
    }

    // 2. quilt.mod.json
    const quiltMod = entries.get("quilt.mod.json");
    if (quiltMod) {
      try {
        const data = JSON.parse(quiltMod.toString("utf-8"));
        const ql = data.quilt_loader;
        return {
          name: ql?.metadata?.name || ql?.id || "unknown",
          version: ql?.version || "unknown",
          loader: "quilt",
        };
      } catch {
        /* ignore parse errors */
      }
    }

    // 3. META-INF/mods.toml (Forge / NeoForge)
    const modToml = entries.get("meta-inf/mods.toml");
    if (modToml) {
      try {
        const data = toml.parse(modToml.toString("utf-8"));
        const mods = data["mods"] as Array<Record<string, unknown>> | undefined;
        const modLoader = (data["modLoader"] as string) || "";
        let loader = "forge";
        if (
          modLoader.toLowerCase().includes("neoforge") ||
          modLoader.toLowerCase().includes("lowcodefml")
        ) {
          loader = "neoforge";
        }
        if (mods && mods.length > 0) {
          const mod = mods[0]!;
          return {
            name:
              (mod["displayName"] as string) ||
              (mod["modId"] as string) ||
              "unknown",
            version: (mod["version"] as string) || "unknown",
            loader,
          };
        }
      } catch {
        /* ignore parse errors */
      }
    }

    // 4. mcmod.info (legacy Forge)
    const mcmodInfo = entries.get("mcmod.info");
    if (mcmodInfo) {
      try {
        const raw = mcmodInfo.toString("utf-8").trim();
        const data = JSON.parse(raw);
        const mod = Array.isArray(data) ? data[0] : data.modList?.[0] || data;
        if (mod) {
          return {
            name: mod.name || mod.modid || "unknown",
            version: mod.version || "unknown",
            loader: "forge",
          };
        }
      } catch {
        /* ignore parse errors */
      }
    }

    // 5. paper-plugin.yml (Paper-specific, check before generic plugin.yml)
    const paperPlugin = entries.get("paper-plugin.yml");
    if (paperPlugin) {
      try {
        const data = parseYaml(paperPlugin.toString("utf-8"));
        return {
          name: (data["name"] as string) || "unknown",
          version: (data["version"] as string)?.toString() || "unknown",
          loader: "paper",
        };
      } catch {
        /* ignore parse errors */
      }
    }

    // 6. plugin.yml (Bukkit/Spigot/Paper)
    const pluginYml = entries.get("plugin.yml");
    if (pluginYml) {
      try {
        const data = parseYaml(pluginYml.toString("utf-8"));
        return {
          name: (data["name"] as string) || "unknown",
          version: (data["version"] as string)?.toString() || "unknown",
          loader: "bukkit",
        };
      } catch {
        /* ignore parse errors */
      }
    }

    // 7. velocity-plugin.json
    const velocityPlugin = entries.get("velocity-plugin.json");
    if (velocityPlugin) {
      try {
        const data = JSON.parse(velocityPlugin.toString("utf-8"));
        return {
          name: data.name || data.id || "unknown",
          version: data.version || "unknown",
          loader: "velocity",
        };
      } catch {
        /* ignore parse errors */
      }
    }

    // 8. bungee.yml
    const bungeeYml = entries.get("bungee.yml");
    if (bungeeYml) {
      try {
        const data = parseYaml(bungeeYml.toString("utf-8"));
        return {
          name: (data["name"] as string) || "unknown",
          version: (data["version"] as string)?.toString() || "unknown",
          loader: "bungeecord",
        };
      } catch {
        /* ignore parse errors */
      }
    }

    // 9. sponge_plugins.json (Sponge plugins)
    const spongePlugins = entries.get("sponge_plugins.json");
    if (spongePlugins) {
      try {
        const data = JSON.parse(spongePlugins.toString("utf-8"));
        const plugins = data.plugins as
          | Array<Record<string, unknown>>
          | undefined;
        if (plugins && plugins.length > 0) {
          const plugin = plugins[0]!;
          return {
            name:
              (plugin["name"] as string) ||
              (plugin["id"] as string) ||
              "unknown",
            version: (plugin["version"] as string) || "unknown",
            loader: "sponge",
          };
        }
      } catch {
        /* ignore parse errors */
      }
    }

    // 10. META-INF/MANIFEST.MF (generic Java JAR — fallback)
    const manifest = entries.get("meta-inf/manifest.mf");
    if (manifest) {
      try {
        const text = manifest.toString("utf-8");
        const getAttr = (key: string): string | undefined => {
          const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "mi"));
          return match?.[1]?.trim();
        };
        const name =
          getAttr("Implementation-Title") ||
          getAttr("Bundle-Name") ||
          getAttr("Specification-Title");
        const version =
          getAttr("Implementation-Version") ||
          getAttr("Bundle-Version") ||
          getAttr("Specification-Version");
        if (name || version) {
          return {
            name: name || "unknown",
            version: version || "unknown",
            loader: "unknown",
          };
        }
      } catch {
        /* ignore parse errors */
      }
    }

    return null;
  }

  private async lookupModrinthByHash(
    hash: string,
    algorithm: string = "sha1",
  ): Promise<Record<string, unknown> | null> {
    try {
      // Modrinth API: GET /v2/version_file/{hash}?algorithm=sha1
      const url = new URL(`https://api.modrinth.com/v2/version_file/${hash}`);
      url.searchParams.set("algorithm", algorithm);

      const response = await fetch(url.toString(), {
        headers: { "User-Agent": "TRAM-AI/1.0" },
      });

      if (response.status === 404) {
        debugLogger.debug("Modrinth hash lookup: not found");
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `Modrinth API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      return data;
    } catch (err) {
      debugLogger.warn("Modrinth hash lookup failed:", err);
      return null;
    }
  }

  /**
   * Compute CurseForge fingerprint using MurmurHash2.
   * CurseForge strips whitespace bytes (0x09, 0x0A, 0x0D, 0x20) before hashing.
   */
  private computeCurseForgeFingerprint(fileBuffer: Buffer): number {
    // Filter out tab, newline, carriage return, space
    const filtered: number[] = [];
    for (const b of fileBuffer) {
      if (b !== 9 && b !== 10 && b !== 13 && b !== 32) {
        filtered.push(b);
      }
    }
    const data = new Uint8Array(filtered);
    return this.murmur2(data, 1);
  }

  private murmur2(data: Uint8Array, seed: number = 1): number {
    const m = 0x5bd1e995;
    const r = 24;
    let len = data.length >>> 0;
    let h = (seed ^ len) >>> 0;
    let i = 0;

    while (len >= 4) {
      let k =
        (data[i]! |
          (data[i + 1]! << 8) |
          (data[i + 2]! << 16) |
          (data[i + 3]! << 24)) >>>
        0;
      k = Math.imul(k, m) >>> 0;
      k ^= k >>> r;
      k = Math.imul(k, m) >>> 0;
      h = Math.imul(h, m) >>> 0;
      h ^= k;
      i += 4;
      len -= 4;
    }

    switch (len) {
      case 3:
        h ^= (data[i + 2]! << 16) >>> 0; // falls through
      case 2:
        h ^= (data[i + 1]! << 8) >>> 0; // falls through
      case 1:
        h ^= data[i]! >>> 0;
        h = Math.imul(h, m) >>> 0;
    }

    h ^= h >>> 13;
    h = Math.imul(h, m) >>> 0;
    h ^= h >>> 15;
    return h >>> 0;
  }

  private async lookupCurseForgeByFingerprint(
    fingerprint: number,
  ): Promise<{
    name: string;
    projectId: number;
    fileId: number;
    fileName: string;
    projectUrl: string;
    downloadUrl: string;
  } | null> {
    try {
      const response = await fetch(
        "https://curseforgeapi.912778.xyz/v1/fingerprints",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "TRAM-AI/1.0",
          },
          body: JSON.stringify({ fingerprints: [fingerprint] }),
        },
      );

      if (!response.ok) {
        debugLogger.warn(
          `CurseForge fingerprint API error: ${response.status}`,
        );
        return null;
      }

      const data = (await response.json()) as {
        data?: {
          exactMatches?: Array<{
            id: number;
            file: {
              id: number;
              modId: number;
              displayName: string;
              fileName: string;
              downloadUrl: string;
            };
          }>;
        };
      };

      const matches = data?.data?.exactMatches;
      if (!matches || matches.length === 0) {
        debugLogger.debug("CurseForge fingerprint lookup: no match");
        return null;
      }

      const match = matches[0]!;
      const modId = match.file.modId;
      return {
        name: match.file.displayName || match.file.fileName,
        projectId: modId,
        fileId: match.file.id,
        fileName: match.file.fileName,
        projectUrl: `https://www.curseforge.com/minecraft/mc-mods/${modId}`,
        downloadUrl: match.file.downloadUrl || "",
      };
    } catch (err) {
      debugLogger.warn("CurseForge fingerprint lookup failed:", err);
      return null;
    }
  }

  private async lookupHangarByHash(
    sha256Hash: string,
  ): Promise<{
    name: string;
    projectUrl: string;
    versionName: string;
    versionVerified: boolean;
    channel?: string;
    platform: string;
  } | null> {
    try {
      const url = `https://hangar.papermc.io/api/v1/versions/hash/${sha256Hash}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "TRAM-AI/1.0" },
      });

      if (response.status === 404) return null;
      if (!response.ok) {
        debugLogger.warn(`Hangar hash lookup error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as {
        name?: string;
        namespace?: { owner: string; slug: string };
        platformDependencies?: Record<string, string[]>;
        channel?: { name?: string; color?: string };
      };

      if (!data.namespace) return null;

      const platform = data.platformDependencies
        ? Object.keys(data.platformDependencies)[0] || "unknown"
        : "unknown";

      const channelName = data.channel?.name || undefined;
      const rawVersionName = data.name || "unknown";

      // Verify version: a semver-like pattern (with optional pre-release) is trustworthy.
      // Arbitrary display names like "Build 55" or "Release Candidate" are flagged.
      const semverLike = /^\d+\.\d+(\.\d+)?(-[\w.]+)?(\+[\w.]+)?$/.test(
        rawVersionName,
      );
      const versionVerified =
        semverLike && channelName?.toLowerCase() === "release";

      let versionName = rawVersionName;

      if (!semverLike) {
        // Version name is not a real semver — try to resolve from project versions list
        const resolvedVersion = await this.resolveHangarRealVersion(
          data.namespace.owner,
          data.namespace.slug,
          rawVersionName,
        );
        if (resolvedVersion) {
          versionName = resolvedVersion;
        } else {
          // Cannot determine real version; show raw name with unverified flag only
          versionName = rawVersionName;
        }
      }

      return {
        name: `${data.namespace.owner}/${data.namespace.slug}`,
        projectUrl: `https://hangar.papermc.io/${data.namespace.owner}/${data.namespace.slug}`,
        versionName,
        versionVerified,
        channel: channelName,
        platform,
      };
    } catch (err) {
      debugLogger.warn("Hangar hash lookup failed:", err);
      return null;
    }
  }

  /**
   * Try to resolve a real semver version from the Hangar project versions list.
   * When the hash lookup returns a display name like "Build 553", we look up the
   * project's release versions to find one that matches, or return the latest release version.
   */
  private async resolveHangarRealVersion(
    owner: string,
    slug: string,
    displayName: string,
  ): Promise<string | null> {
    try {
      const url = new URL(
        `https://hangar.papermc.io/api/v1/projects/${owner}/${slug}/versions`,
      );
      url.searchParams.set("limit", "5");
      url.searchParams.set("offset", "0");

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json", "User-Agent": "TRAM-AI/1.0" },
      });
      if (!response.ok) return null;

      const data = (await response.json()) as {
        result?: Array<{
          name: string;
          channel?: { name?: string };
        }>;
      };

      if (!data.result || data.result.length === 0) return null;

      const semverPattern = /^\d+\.\d+(\.\d+)?(-[\w.]+)?(\+[\w.]+)?$/;

      // Check if the displayName matches any version entry
      const exactMatch = data.result.find(
        (v) => v.name === displayName && semverPattern.test(v.name),
      );
      if (exactMatch) return exactMatch.name;

      // Return the latest version that looks like a real semver
      const releaseVersion = data.result.find(
        (v) =>
          semverPattern.test(v.name) &&
          v.channel?.name?.toLowerCase() === "release",
      );
      if (releaseVersion) return releaseVersion.name;

      const anySemver = data.result.find((v) => semverPattern.test(v.name));
      if (anySemver) return anySemver.name;

      return null;
    } catch {
      return null;
    }
  }

  private formatModrinthResult(modData: Record<string, unknown>): {
    name: string;
    slug: string;
    projectId: string;
    projectUrl: string;
    versionNumber: string;
    fileName: string;
    downloadUrl: string;
    compatible_loaders: string[];
    compatible_versions: string[];
  } {
    // version_file endpoint returns version data with: loaders, game_versions,
    // project_id, name (version name), version_number, files[]
    const loaders = (modData["loaders"] as string[] | null | undefined) || [];
    const versions =
      (modData["game_versions"] as string[] | null | undefined) || [];
    const projectId = (modData["project_id"] as string) || "";
    const versionNumber = (modData["version_number"] as string) || "";
    const versionName = (modData["name"] as string) || "";

    // Extract primary file info
    const files = (modData["files"] as Array<Record<string, unknown>>) || [];
    const primaryFile = files.find((f) => f["primary"] === true) || files[0];
    const downloadUrl = primaryFile ? (primaryFile["url"] as string) || "" : "";
    const matchedFileName = primaryFile
      ? (primaryFile["filename"] as string) || ""
      : "";

    return {
      name: versionName || matchedFileName,
      slug: projectId,
      projectId,
      projectUrl: `https://modrinth.com/mod/${projectId}`,
      versionNumber,
      fileName: matchedFileName,
      downloadUrl,
      compatible_loaders: loaders,
      compatible_versions: versions,
    };
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      const filePath = this.params.filePath;
      const hashType = this.params.hashType || "sha1";

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          llmContent: `File not found: ${filePath}`,
          returnDisplay: `File not found: ${filePath}`,
        };
      }

      // Read file once, compute all hashes
      const fileBuffer = await fs.readFile(filePath);
      const sha1Hash = createHash("sha1").update(fileBuffer).digest("hex");
      const sha256Hash = createHash("sha256").update(fileBuffer).digest("hex");
      const requestedHash =
        hashType === "sha1"
          ? sha1Hash
          : createHash(hashType).update(fileBuffer).digest("hex");
      const fileName = filePath.split(/[\\/]/).pop() || "unknown";

      // Compute CurseForge fingerprint (MurmurHash2)
      const curseForgeFingerprint =
        this.computeCurseForgeFingerprint(fileBuffer);

      // Extract mod metadata from archive then filename
      const modMetadata = await this.extractModMetadata(filePath, fileBuffer);

      // Look up on all platforms in parallel
      const [modrinthMatchData, curseForgeMatch, hangarMatch] =
        await Promise.all([
          this.lookupModrinthByHash(sha1Hash, "sha1"),
          this.lookupCurseForgeByFingerprint(curseForgeFingerprint),
          this.lookupHangarByHash(sha256Hash),
        ]);

      // If sha1 failed on Modrinth, try sha512
      let finalModrinthData = modrinthMatchData;
      if (!finalModrinthData) {
        const sha512Hash = createHash("sha512")
          .update(fileBuffer)
          .digest("hex");
        finalModrinthData = await this.lookupModrinthByHash(
          sha512Hash,
          "sha512",
        );
      }

      const modrinthMatch = finalModrinthData
        ? this.formatModrinthResult(finalModrinthData)
        : null;

      // Backfill modInfo from online lookups when local metadata has unknowns
      const enrichedModInfo = modMetadata ? { ...modMetadata } : undefined;
      if (enrichedModInfo) {
        if (modrinthMatch) {
          if (enrichedModInfo.name === "unknown" && modrinthMatch.name) {
            enrichedModInfo.name = modrinthMatch.name;
          }
          if (
            enrichedModInfo.version === "unknown" &&
            modrinthMatch.versionNumber
          ) {
            enrichedModInfo.version = modrinthMatch.versionNumber;
          }
          if (
            enrichedModInfo.loader === "unknown" &&
            modrinthMatch.compatible_loaders.length > 0
          ) {
            enrichedModInfo.loader = modrinthMatch.compatible_loaders[0]!;
          }
        }
        if (curseForgeMatch) {
          if (enrichedModInfo.name === "unknown" && curseForgeMatch.name) {
            enrichedModInfo.name = curseForgeMatch.name;
          }
        }
      }

      const result: ModHashResult = {
        fileName,
        filePath,
        hash: requestedHash,
        hashType,
        curseForgeFingerprint,
        modInfo: enrichedModInfo,
        modrinthMatch: modrinthMatch || undefined,
        curseForgeMatch: curseForgeMatch || undefined,
        hangarMatch: hangarMatch || undefined,
      };

      const displayLines: string[] = [
        `File: ${fileName}`,
        `Hash (${hashType}): ${requestedHash}`,
      ];

      if (hashType !== "sha1") {
        displayLines.push(`Hash (sha1): ${sha1Hash}`);
      }
      displayLines.push(`CurseForge Fingerprint: ${curseForgeFingerprint}`);

      if (enrichedModInfo) {
        displayLines.push(`Detected Name: ${enrichedModInfo.name}`);
        displayLines.push(`Detected Version: ${enrichedModInfo.version}`);
        displayLines.push(`Detected Loader: ${enrichedModInfo.loader}`);
      }

      let foundAny = false;

      if (modrinthMatch) {
        foundAny = true;
        displayLines.push("");
        displayLines.push("✓ Found on Modrinth:");
        displayLines.push(`  Name: ${modrinthMatch.name}`);
        displayLines.push(`  Version: ${modrinthMatch.versionNumber}`);
        displayLines.push(`  Project: ${modrinthMatch.projectUrl}`);
        displayLines.push(`  File: ${modrinthMatch.fileName}`);
        if (modrinthMatch.downloadUrl) {
          displayLines.push(`  Download: ${modrinthMatch.downloadUrl}`);
        }
        if (modrinthMatch.compatible_loaders.length > 0) {
          displayLines.push(
            `  Loaders: ${modrinthMatch.compatible_loaders.join(", ")}`,
          );
        }
        if (modrinthMatch.compatible_versions.length > 0) {
          const versions = modrinthMatch.compatible_versions
            .slice(0, 5)
            .join(", ");
          const moreVersions =
            modrinthMatch.compatible_versions.length > 5 ? "..." : "";
          displayLines.push(`  Versions: ${versions}${moreVersions}`);
        }
      }

      if (curseForgeMatch) {
        foundAny = true;
        displayLines.push("");
        displayLines.push("✓ Found on CurseForge:");
        displayLines.push(`  Name: ${curseForgeMatch.name}`);
        displayLines.push(`  Project ID: ${curseForgeMatch.projectId}`);
        displayLines.push(`  File: ${curseForgeMatch.fileName}`);
        displayLines.push(`  URL: ${curseForgeMatch.projectUrl}`);
        if (curseForgeMatch.downloadUrl) {
          displayLines.push(`  Download: ${curseForgeMatch.downloadUrl}`);
        }
      }

      if (hangarMatch) {
        foundAny = true;
        displayLines.push("");
        displayLines.push("✓ Found on Hangar:");
        displayLines.push(`  Name: ${hangarMatch.name}`);
        if (hangarMatch.versionVerified) {
          displayLines.push(`  Version: ${hangarMatch.versionName}`);
        } else {
          displayLines.push(
            `  Version: ${hangarMatch.versionName} (unverified)`,
          );
        }
        if (hangarMatch.channel) {
          displayLines.push(`  Channel: ${hangarMatch.channel}`);
        }
        displayLines.push(`  Platform: ${hangarMatch.platform}`);
        displayLines.push(`  URL: ${hangarMatch.projectUrl}`);
      }

      if (!foundAny) {
        displayLines.push("");
        displayLines.push(
          "⚠ Not found on Modrinth, CurseForge, or Hangar. This might be a custom/private mod.",
        );
        if (enrichedModInfo) {
          displayLines.push(
            `Try searching for "${enrichedModInfo.name}" manually.`,
          );
        }
      }

      return {
        llmContent: safeJsonStringify(result),
        returnDisplay: displayLines.join("\n"),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debugLogger.error("mod_hash_lookup execution error:", error);
      return {
        llmContent: `Error: ${errorMessage}`,
        returnDisplay: `Error: ${errorMessage}`,
      };
    }
  }
}

export class ModHashLookupTool extends BaseDeclarativeTool<
  ModHashLookupParams,
  ToolResult
> {
  static readonly Name = ToolNames.MOD_HASH_LOOKUP;

  constructor() {
    super(
      ToolNames.MOD_HASH_LOOKUP,
      ToolDisplayNames.MOD_HASH_LOOKUP,
      description,
      Kind.Fetch,
      schema.parametersJsonSchema as Record<string, unknown>,
      true,
      false,
      true,
    );
  }

  override validateToolParamValues(params: ModHashLookupParams): string | null {
    if (!params.filePath || params.filePath.trim().length === 0) {
      return "filePath parameter is required and cannot be empty.";
    }

    return null;
  }

  override createInvocation(params: ModHashLookupParams) {
    return new ModHashLookupInvocation(params);
  }
}
