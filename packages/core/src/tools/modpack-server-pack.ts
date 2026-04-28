/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import extractZip from "extract-zip";
import { ToolNames } from "./tool-names.js";
import type { ToolResult } from "./tools.js";
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import { safeJsonStringify } from "../utils/safeJsonStringify.js";
import { createDebugLogger } from "../utils/debugLogger.js";

const debugLogger = createDebugLogger("MODPACK_SERVER_PACK");

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ModpackServerPackParams {
  action: "curseforge-server-pack" | "modrinth-server-pack";

  // CurseForge fields
  projectId?: number;
  fileId?: number;

  // Modrinth fields
  mrpackPath?: string;
  outputDir?: string;
}

interface CurseForgeFileInfo {
  id: number;
  displayName: string;
  fileName: string;
  downloadUrl: string | null;
  serverPackFileId: number | null;
}

interface CurseForgeServerPackResult {
  projectName: string;
  projectId: number;
  originalFileId: number;
  hasServerPack: boolean;
  serverPackFileId?: number;
  serverPackFileName?: string;
  serverPackDownloadUrl?: string;
  message: string;
}

interface ModrinthIndexFile {
  path: string;
  hashes: Record<string, string>;
  downloads: string[];
  fileSize?: number;
  env?: { client?: string; server?: string };
}

interface ModrinthIndex {
  formatVersion: number;
  game: string;
  versionId: string;
  name: string;
  dependencies: Record<string, string>;
  files: ModrinthIndexFile[];
}

interface ModrinthServerPackResult {
  modpackName: string;
  gameVersion: string;
  loader: string;
  loaderVersion: string;
  serverMods: Array<{
    path: string;
    url: string;
    hashes: Record<string, string>;
  }>;
  clientOnlyMods: Array<{ path: string; reason: string }>;
  configs: Array<{ path: string; url: string }>;
  overrides: string[];
  serverInstallerInfo: ServerInstallerInfo | null;
  outputDir: string | null;
  totalServerFiles: number;
  message: string;
}

interface ServerInstallerInfo {
  loader: string;
  loaderVersion: string;
  gameVersion: string;
  installerUrl: string;
  installerFileName: string;
}

// ─── CurseForge API Constants ────────────────────────────────────────────────

const CF_API_BASE = "https://curseforgeapi.912778.xyz/v1";

// ─── Invocation ──────────────────────────────────────────────────────────────

class ModpackServerPackInvocation extends BaseToolInvocation<
  ModpackServerPackParams,
  ToolResult
> {
  getDescription(): string {
    return `Modpack server pack (${this.params.action})`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    try {
      switch (this.params.action) {
        case "curseforge-server-pack":
          return await this.curseforgeServerPack();
        case "modrinth-server-pack":
          return await this.modrinthServerPack();
        default:
          return {
            llmContent: JSON.stringify({
              error: `Unknown action: ${this.params.action}`,
            }),
            returnDisplay: `Error: Unknown action "${this.params.action}"`,
          };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debugLogger.error("modpack-server-pack execution error:", error);
      return {
        llmContent: JSON.stringify({ error: errorMessage }),
        returnDisplay: `Error: ${errorMessage}`,
      };
    }
  }

  // ─── CurseForge: resolve serverPackFileId ────────────────────────────────

  private async curseforgeServerPack(): Promise<ToolResult> {
    const { projectId, fileId } = this.params;

    if (!projectId) {
      return {
        llmContent: JSON.stringify({
          error: "projectId is required for curseforge-server-pack",
        }),
        returnDisplay: "Error: projectId is required",
      };
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "TRAM-AI/1.0",
    };

    // Step 1: Get project info
    const projectRes = await fetch(`${CF_API_BASE}/mods/${projectId}`, {
      headers,
    });
    if (!projectRes.ok) {
      throw new Error(
        `CurseForge API error ${projectRes.status}: ${await projectRes.text()}`,
      );
    }
    const projectData = (await projectRes.json()) as {
      data: Record<string, unknown>;
    };
    const projectName =
      (projectData.data["name"] as string) || `Project ${projectId}`;

    // Step 2: Resolve the file
    let targetFileId = fileId;
    if (!targetFileId) {
      // Use the latest file
      const filesRes = await fetch(
        `${CF_API_BASE}/mods/${projectId}/files?pageSize=1&sortOrder=desc`,
        { headers },
      );
      if (!filesRes.ok) {
        throw new Error(
          `CurseForge files API error ${filesRes.status}: ${await filesRes.text()}`,
        );
      }
      const filesData = (await filesRes.json()) as {
        data: CurseForgeFileInfo[];
      };
      if (!filesData.data || filesData.data.length === 0) {
        throw new Error("No files found for this CurseForge project");
      }
      targetFileId = filesData.data[0]!.id;
    }

    // Step 3: Get file details
    const fileRes = await fetch(
      `${CF_API_BASE}/mods/${projectId}/files/${targetFileId}`,
      {
        headers,
      },
    );
    if (!fileRes.ok) {
      throw new Error(
        `CurseForge file API error ${fileRes.status}: ${await fileRes.text()}`,
      );
    }
    const fileData = (await fileRes.json()) as { data: CurseForgeFileInfo };
    const fileInfo = fileData.data;

    const serverPackFileId = fileInfo.serverPackFileId;

    if (!serverPackFileId) {
      // No server pack available
      const result: CurseForgeServerPackResult = {
        projectName,
        projectId,
        originalFileId: targetFileId,
        hasServerPack: false,
        message:
          `该 CurseForge 整合包 "${projectName}" (文件 ID: ${targetFileId}) 未提供服务端包。` +
          `\n需要手动组装服务端：下载整合包 → 移除客户端专用模组 → 安装服务端软件。`,
      };

      return {
        llmContent: safeJsonStringify(result),
        returnDisplay:
          `CurseForge 整合包 "${projectName}" — 未提供服务端包\n\n` +
          `原始文件 ID: ${targetFileId}\n` +
          `serverPackFileId: 无\n\n` +
          `需要手动组装服务端。`,
      };
    }

    // Step 4: Get server pack file details
    const spFileRes = await fetch(
      `${CF_API_BASE}/mods/${projectId}/files/${serverPackFileId}`,
      { headers },
    );
    if (!spFileRes.ok) {
      throw new Error(
        `CurseForge server pack file API error ${spFileRes.status}: ${await spFileRes.text()}`,
      );
    }
    const spFileData = (await spFileRes.json()) as { data: CurseForgeFileInfo };
    const spFileInfo = spFileData.data;

    const downloadUrl =
      spFileInfo.downloadUrl ||
      `https://www.curseforge.com/api/v1/mods/${projectId}/files/${serverPackFileId}/download`;

    const result: CurseForgeServerPackResult = {
      projectName,
      projectId,
      originalFileId: targetFileId,
      hasServerPack: true,
      serverPackFileId,
      serverPackFileName: spFileInfo.fileName,
      serverPackDownloadUrl: downloadUrl,
      message: `找到服务端包 "${spFileInfo.fileName}"，可直接下载使用。`,
    };

    return {
      llmContent: safeJsonStringify(result),
      returnDisplay:
        `CurseForge 整合包 "${projectName}" — 找到服务端包\n\n` +
        `原始文件 ID: ${targetFileId}\n` +
        `服务端包文件 ID: ${serverPackFileId}\n` +
        `服务端包文件名: ${spFileInfo.fileName}\n` +
        `下载地址: ${downloadUrl}`,
    };
  }

  // ─── Modrinth: parse .mrpack and produce server assembly plan ────────────

  private async modrinthServerPack(): Promise<ToolResult> {
    const { mrpackPath, outputDir } = this.params;

    if (!mrpackPath) {
      return {
        llmContent: JSON.stringify({
          error: "mrpackPath is required for modrinth-server-pack",
        }),
        returnDisplay: "Error: mrpackPath is required",
      };
    }

    const resolvedPath = path.resolve(mrpackPath);
    if (!fs.existsSync(resolvedPath)) {
      return {
        llmContent: JSON.stringify({
          error: `File not found: ${resolvedPath}`,
        }),
        returnDisplay: `Error: File not found: ${resolvedPath}`,
      };
    }

    // Read the .mrpack (ZIP) file — extract to temp directory
    const tmpDir = path.join(os.tmpdir(), `tram-mrpack-${Date.now()}`);
    try {
      await extractZip(resolvedPath, { dir: tmpDir });
    } catch (e) {
      return {
        llmContent: JSON.stringify({
          error: `Failed to extract .mrpack: ${e instanceof Error ? e.message : String(e)}`,
        }),
        returnDisplay: `Error: Failed to extract .mrpack file`,
      };
    }

    try {
      return await this.processMrpackDir(tmpDir, mrpackPath, outputDir);
    } finally {
      // Clean up temp directory
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private async processMrpackDir(
    extractDir: string,
    originalPath: string,
    outputDir?: string,
  ): Promise<ToolResult> {
    // Parse modrinth.index.json
    const indexPath = path.join(extractDir, "modrinth.index.json");
    if (!fs.existsSync(indexPath)) {
      return {
        llmContent: JSON.stringify({
          error: "modrinth.index.json not found in .mrpack file",
        }),
        returnDisplay:
          "Error: Invalid .mrpack file — missing modrinth.index.json",
      };
    }

    const modrinthIndex: ModrinthIndex = JSON.parse(
      fs.readFileSync(indexPath, "utf-8"),
    );

    // Identify loader
    const deps = modrinthIndex.dependencies;
    const gameVersion = deps["minecraft"] || "unknown";
    let loader = "unknown";
    let loaderVersion = "unknown";

    if (deps["forge"]) {
      loader = "forge";
      loaderVersion = deps["forge"];
    } else if (deps["fabric-loader"]) {
      loader = "fabric";
      loaderVersion = deps["fabric-loader"];
    } else if (deps["quilt-loader"]) {
      loader = "quilt";
      loaderVersion = deps["quilt-loader"];
    } else if (deps["neoforge"]) {
      loader = "neoforge";
      loaderVersion = deps["neoforge"];
    }

    // Classify files into server/client
    const serverMods: ModrinthServerPackResult["serverMods"] = [];
    const clientOnlyMods: ModrinthServerPackResult["clientOnlyMods"] = [];
    const configs: ModrinthServerPackResult["configs"] = [];

    // Patterns for client-only resources
    const clientOnlyPrefixes = ["resourcepacks/", "shaderpacks/"];
    const clientOnlyFiles = ["options.txt", "servers.dat", "servers.dat_old"];

    for (const file of modrinthIndex.files) {
      const filePath = file.path;

      // Skip client-only resources
      if (clientOnlyPrefixes.some((p) => filePath.startsWith(p))) {
        clientOnlyMods.push({
          path: filePath,
          reason: "client resource pack/shader",
        });
        continue;
      }
      if (
        clientOnlyFiles.includes(filePath) ||
        filePath.startsWith("essential/")
      ) {
        clientOnlyMods.push({ path: filePath, reason: "client-only file" });
        continue;
      }

      const url =
        Array.isArray(file.downloads) && file.downloads.length > 0
          ? file.downloads[0]!
          : "";

      // Check env hints from modrinth.index.json
      if (file.env && file.env.server === "unsupported") {
        clientOnlyMods.push({
          path: filePath,
          reason: `env: client=${file.env.client}, server=${file.env.server}`,
        });
        continue;
      }

      if (filePath.startsWith("mods/")) {
        serverMods.push({ path: filePath, url, hashes: file.hashes });
      } else {
        // Config / scripts / other
        configs.push({ path: filePath, url });
      }
    }

    // Collect overrides directories from the extracted directory
    const overrides: string[] = [];
    const collectOverrides = (dir: string, prefix: string) => {
      if (!fs.existsSync(dir)) return;
      const walk = (currentDir: string) => {
        for (const entry of fs.readdirSync(currentDir, {
          withFileTypes: true,
        })) {
          const fullPath = path.join(currentDir, entry.name);
          const relPath = path.relative(dir, fullPath).replace(/\\/g, "/");
          const entryPath = `${prefix}/${relPath}`;

          // Skip client-only directories within overrides
          if (
            relPath.startsWith("resourcepacks/") ||
            relPath.startsWith("resourcepacks") ||
            relPath.startsWith("shaderpacks/") ||
            relPath.startsWith("shaderpacks") ||
            relPath === "options.txt" ||
            relPath === "servers.dat" ||
            relPath.startsWith("essential/") ||
            relPath.startsWith("essential")
          ) {
            continue;
          }

          if (entry.isDirectory()) {
            walk(fullPath);
          } else {
            overrides.push(entryPath);
          }
        }
      };
      walk(dir);
    };
    collectOverrides(path.join(extractDir, "overrides"), "overrides");
    collectOverrides(
      path.join(extractDir, "server-overrides"),
      "server-overrides",
    );

    // Build server installer info
    const installerInfo = getServerInstallerInfo(
      loader,
      loaderVersion,
      gameVersion,
    );

    // If outputDir is specified, write server files
    let actualOutputDir: string | null = null;
    if (outputDir) {
      actualOutputDir = path.resolve(outputDir);
      this.writeServerFiles(actualOutputDir, extractDir, overrides);
    }

    const result: ModrinthServerPackResult = {
      modpackName: modrinthIndex.name || path.basename(originalPath, ".mrpack"),
      gameVersion,
      loader,
      loaderVersion,
      serverMods,
      clientOnlyMods,
      configs,
      overrides,
      serverInstallerInfo: installerInfo,
      outputDir: actualOutputDir,
      totalServerFiles: serverMods.length + configs.length + overrides.length,
      message: actualOutputDir
        ? `服务端组装计划已生成，配置和覆盖文件已写入 ${actualOutputDir}。` +
          `\n需要下载 ${serverMods.length} 个服务端模组和 ${configs.length} 个配置文件。`
        : `服务端组装计划已生成。共 ${serverMods.length} 个服务端模组，${clientOnlyMods.length} 个客户端专用模组已排除。` +
          `\n使用 outputDir 参数可将覆盖文件写入指定目录。`,
    };

    const displayLines = [
      `Modrinth 整合包 "${result.modpackName}"`,
      `Minecraft ${gameVersion} / ${loader} ${loaderVersion}`,
      "",
      `服务端模组: ${serverMods.length}`,
      `客户端专用模组 (已排除): ${clientOnlyMods.length}`,
      `配置文件: ${configs.length}`,
      `覆盖文件: ${overrides.length}`,
      "",
    ];

    if (installerInfo) {
      displayLines.push(
        `服务端安装器:`,
        `  ${installerInfo.loader} ${installerInfo.loaderVersion}`,
        `  下载: ${installerInfo.installerUrl}`,
        "",
      );
    }

    if (actualOutputDir) {
      displayLines.push(`覆盖文件已写入: ${actualOutputDir}`);
    }

    return {
      llmContent: safeJsonStringify(result),
      returnDisplay: displayLines.join("\n"),
    };
  }

  private writeServerFiles(
    outputDir: string,
    extractDir: string,
    overrides: string[],
  ): void {
    fs.mkdirSync(outputDir, { recursive: true });

    // Write override files
    for (const entryName of overrides) {
      // Strip the 'overrides/' or 'server-overrides/' prefix
      const relPath = entryName.replace(/^(overrides|server-overrides)\//, "");
      const srcPath = path.join(extractDir, entryName);
      const destPath = path.join(outputDir, relPath);

      if (!fs.existsSync(srcPath) || fs.statSync(srcPath).isDirectory())
        continue;

      const destDir = path.dirname(destPath);
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }

    debugLogger.debug(
      `Wrote ${overrides.length} override files to ${outputDir}`,
    );
  }
}

// ─── Helper: Server installer URLs ──────────────────────────────────────────

function getServerInstallerInfo(
  loader: string,
  loaderVersion: string,
  gameVersion: string,
): ServerInstallerInfo | null {
  switch (loader) {
    case "forge": {
      const fileName = `forge-${gameVersion}-${loaderVersion}-installer.jar`;
      return {
        loader,
        loaderVersion,
        gameVersion,
        installerUrl: `https://maven.minecraftforge.net/net/minecraftforge/forge/${gameVersion}-${loaderVersion}/${fileName}`,
        installerFileName: fileName,
      };
    }
    case "neoforge": {
      const fileName = `neoforge-${loaderVersion}-installer.jar`;
      return {
        loader,
        loaderVersion,
        gameVersion,
        installerUrl: `https://maven.neoforged.net/releases/net/neoforged/neoforge/${loaderVersion}/${fileName}`,
        installerFileName: fileName,
      };
    }
    case "fabric": {
      // Fabric server JAR URL uses meta API — provide the base; the actual
      // installer version is resolved at download time.
      return {
        loader,
        loaderVersion,
        gameVersion,
        installerUrl: `https://meta.fabricmc.net/v2/versions/loader/${gameVersion}/${loaderVersion}/server/jar`,
        installerFileName: `fabric-server-mc.${gameVersion}-loader.${loaderVersion}.jar`,
      };
    }
    case "quilt": {
      const fileName = `quilt-installer-${loaderVersion}.jar`;
      return {
        loader,
        loaderVersion,
        gameVersion,
        installerUrl: `https://maven.quiltmc.org/repository/release/org/quiltmc/quilt-installer/${loaderVersion}/${fileName}`,
        installerFileName: fileName,
      };
    }
    default:
      return null;
  }
}

// ─── Tool Definition ─────────────────────────────────────────────────────────

const description =
  "Process modpacks for server deployment: resolve CurseForge server packs via serverPackFileId, " +
  "or parse Modrinth .mrpack files to produce a server assembly plan (identifying server vs client-only mods, " +
  "configs, overrides, and loader installer info).";

const paramSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["curseforge-server-pack", "modrinth-server-pack"],
      description:
        "Action to perform: curseforge-server-pack (resolve server pack from CurseForge modpack), " +
        "modrinth-server-pack (parse .mrpack and produce server assembly plan).",
    },
    projectId: {
      type: "integer",
      description:
        "CurseForge project ID. Required for curseforge-server-pack.",
    },
    fileId: {
      type: "integer",
      description:
        "CurseForge file ID. If omitted, uses the latest file for curseforge-server-pack.",
    },
    mrpackPath: {
      type: "string",
      description: "Path to a .mrpack file. Required for modrinth-server-pack.",
    },
    outputDir: {
      type: "string",
      description:
        "Output directory for Modrinth server files. If provided, override files from the .mrpack " +
        "will be extracted to this directory. If omitted, only a server assembly plan is returned.",
    },
  },
  required: ["action"],
  additionalProperties: false,
};

export class ModpackServerPackTool extends BaseDeclarativeTool<
  ModpackServerPackParams,
  ToolResult
> {
  override readonly name = ToolNames.MODPACK_SERVER_PACK;
  override readonly kind = Kind.Fetch;
  static readonly Name = ToolNames.MODPACK_SERVER_PACK;
  override readonly displayName = "ModpackServerPack";

  constructor() {
    super(
      ToolNames.MODPACK_SERVER_PACK,
      "ModpackServerPack",
      description,
      Kind.Fetch,
      paramSchema,
    );
  }

  protected createInvocation(
    params: ModpackServerPackParams,
  ): ModpackServerPackInvocation {
    return new ModpackServerPackInvocation(params);
  }
}
