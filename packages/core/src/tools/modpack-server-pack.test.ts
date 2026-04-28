/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ModpackServerPackTool } from "./modpack-server-pack.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock extract-zip at module level for ESM compatibility
vi.mock("extract-zip", () => ({
  default: vi.fn(),
}));

// Helper to set up extract-zip mock for a given modrinth index
async function setupExtractMock(
  modrinthIndex: Record<string, unknown>,
  overrideFiles?: Record<string, string>,
) {
  const extractZipModule = await import("extract-zip");
  const mockFn = extractZipModule.default as ReturnType<typeof vi.fn>;
  mockFn.mockImplementation(async (_source: string, opts: { dir: string }) => {
    const targetDir = opts.dir;
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, "modrinth.index.json"),
      JSON.stringify(modrinthIndex),
    );
    if (overrideFiles) {
      for (const [relPath, content] of Object.entries(overrideFiles)) {
        const fullPath = path.join(targetDir, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }
  });
  return mockFn;
}

describe("ModpackServerPackTool", () => {
  let tool: ModpackServerPackTool;

  beforeEach(() => {
    tool = new ModpackServerPackTool();
    vi.clearAllMocks();
  });

  // ─── Basic Tool Properties ──────────────────────────────────────────────

  it("should have correct name and properties", () => {
    expect(tool.name).toBe("modpack_server_pack");
    expect(tool.displayName).toBe("ModpackServerPack");
    expect(tool.kind).toBe("fetch");
  });

  it("should have proper schema with required action parameter", () => {
    expect(tool.schema).toBeDefined();
    expect(tool.schema.name).toBe("modpack_server_pack");
    const schema = tool.schema.parametersJsonSchema as Record<string, unknown>;
    expect(schema["required"] as string[]).toContain("action");
  });

  it("should validate action enum values", () => {
    const schema = tool.schema.parametersJsonSchema as Record<string, unknown>;
    const properties = schema["properties"] as Record<
      string,
      Record<string, unknown>
    >;
    expect(properties["action"]["enum"] as string[]).toContain(
      "curseforge-server-pack",
    );
    expect(properties["action"]["enum"] as string[]).toContain(
      "modrinth-server-pack",
    );
  });

  it("should accept curseforge-server-pack action", () => {
    const invocation = tool.build({
      action: "curseforge-server-pack",
      projectId: 12345,
    });
    expect(invocation).toBeDefined();
  });

  it("should accept modrinth-server-pack action with mrpackPath", () => {
    const invocation = tool.build({
      action: "modrinth-server-pack",
      mrpackPath: "/tmp/test.mrpack",
    });
    expect(invocation).toBeDefined();
  });

  // ─── CurseForge Tests ──────────────────────────────────────────────────

  describe("curseforge-server-pack", () => {
    it("should return error when projectId is missing", async () => {
      const invocation = tool.build({ action: "curseforge-server-pack" });
      const result = await invocation.execute(new AbortController().signal);
      expect(result.llmContent).toContain("projectId is required");
    });

    it("should handle CurseForge API response with serverPackFileId", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { name: "Test Modpack", id: 12345 } }),
          { status: 200 },
        ),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 100,
                displayName: "TestFile",
                fileName: "test.zip",
                downloadUrl: null,
                serverPackFileId: 200,
              },
            ],
          }),
          { status: 200 },
        ),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: 100,
              displayName: "TestFile",
              fileName: "test.zip",
              downloadUrl: null,
              serverPackFileId: 200,
            },
          }),
          { status: 200 },
        ),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: 200,
              displayName: "ServerPack",
              fileName: "server.zip",
              downloadUrl: "https://example.com/server.zip",
              serverPackFileId: null,
            },
          }),
          { status: 200 },
        ),
      );

      try {
        const invocation = tool.build({
          action: "curseforge-server-pack",
          projectId: 12345,
        });
        const result = await invocation.execute(new AbortController().signal);
        const parsed = JSON.parse(result.llmContent as string);
        expect(parsed.hasServerPack).toBe(true);
        expect(parsed.serverPackFileId).toBe(200);
        expect(parsed.serverPackFileName).toBe("server.zip");
        expect(parsed.serverPackDownloadUrl).toBe(
          "https://example.com/server.zip",
        );
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it("should handle CurseForge modpack without serverPackFileId", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { name: "ClientOnly", id: 99999 } }),
          { status: 200 },
        ),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 300,
                displayName: "Client",
                fileName: "client.zip",
                downloadUrl: null,
                serverPackFileId: null,
              },
            ],
          }),
          { status: 200 },
        ),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: 300,
              displayName: "Client",
              fileName: "client.zip",
              downloadUrl: null,
              serverPackFileId: null,
            },
          }),
          { status: 200 },
        ),
      );

      try {
        const invocation = tool.build({
          action: "curseforge-server-pack",
          projectId: 99999,
        });
        const result = await invocation.execute(new AbortController().signal);
        const parsed = JSON.parse(result.llmContent as string);
        expect(parsed.hasServerPack).toBe(false);
        expect(parsed.serverPackFileId).toBeUndefined();
        expect(parsed.message).toContain("未提供服务端包");
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });

  // ─── Modrinth Tests ────────────────────────────────────────────────────

  describe("modrinth-server-pack", () => {
    it("should return error when mrpackPath is missing", async () => {
      const invocation = tool.build({ action: "modrinth-server-pack" });
      const result = await invocation.execute(new AbortController().signal);
      expect(result.llmContent).toContain("mrpackPath is required");
    });

    it("should return error for non-existent file", async () => {
      const invocation = tool.build({
        action: "modrinth-server-pack",
        mrpackPath: "/nonexistent/path.mrpack",
      });
      const result = await invocation.execute(new AbortController().signal);
      expect(result.llmContent).toContain("File not found");
    });

    it("should parse a valid .mrpack and produce server assembly plan", async () => {
      const tmpDir = path.join(os.tmpdir(), `tram-test-mrpack-${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });
      const mrpackPath = path.join(tmpDir, "test.mrpack");
      fs.writeFileSync(mrpackPath, "dummy");

      const modrinthIndex = {
        formatVersion: 1,
        game: "minecraft",
        versionId: "1.0.0",
        name: "Test Modpack",
        dependencies: { minecraft: "1.20.1", "fabric-loader": "0.14.22" },
        files: [
          {
            path: "mods/server-mod.jar",
            hashes: { sha1: "abc123" },
            downloads: [
              "https://cdn.modrinth.com/data/xxxx/versions/server-mod.jar",
            ],
            env: { client: "required", server: "required" },
          },
          {
            path: "mods/client-only-mod.jar",
            hashes: { sha1: "def456" },
            downloads: [
              "https://cdn.modrinth.com/data/xxxx/versions/client-only-mod.jar",
            ],
            env: { client: "required", server: "unsupported" },
          },
          {
            path: "mods/both-mod.jar",
            hashes: { sha1: "ghi789" },
            downloads: [
              "https://cdn.modrinth.com/data/xxxx/versions/both-mod.jar",
            ],
          },
          {
            path: "config/mod-config.toml",
            hashes: { sha1: "jkl012" },
            downloads: [
              "https://cdn.modrinth.com/data/xxxx/versions/mod-config.toml",
            ],
          },
          {
            path: "resourcepacks/textures.zip",
            hashes: { sha1: "mno345" },
            downloads: [
              "https://cdn.modrinth.com/data/xxxx/versions/textures.zip",
            ],
          },
        ],
      };

      await setupExtractMock(modrinthIndex, {
        "overrides/config/server.properties": "server-port=25565",
      });

      try {
        const invocation = tool.build({
          action: "modrinth-server-pack",
          mrpackPath,
        });
        const result = await invocation.execute(new AbortController().signal);
        const parsed = JSON.parse(result.llmContent as string);

        expect(parsed.modpackName).toBe("Test Modpack");
        expect(parsed.gameVersion).toBe("1.20.1");
        expect(parsed.loader).toBe("fabric");
        expect(parsed.loaderVersion).toBe("0.14.22");

        expect(parsed.serverMods.length).toBe(2);
        const serverModPaths = parsed.serverMods.map(
          (m: Record<string, string>) => m["path"],
        );
        expect(serverModPaths).toContain("mods/server-mod.jar");
        expect(serverModPaths).toContain("mods/both-mod.jar");

        expect(parsed.clientOnlyMods.length).toBe(2);
        const clientModPaths = parsed.clientOnlyMods.map(
          (m: Record<string, string>) => m["path"],
        );
        expect(clientModPaths).toContain("mods/client-only-mod.jar");
        expect(clientModPaths).toContain("resourcepacks/textures.zip");

        expect(parsed.configs.length).toBe(1);
        expect(parsed.configs[0].path).toBe("config/mod-config.toml");

        expect(parsed.overrides.length).toBe(1);
        expect(parsed.overrides[0]).toContain("server.properties");

        expect(parsed.serverInstallerInfo).toBeDefined();
        expect(parsed.serverInstallerInfo.loader).toBe("fabric");
        expect(parsed.serverInstallerInfo.installerUrl).toContain(
          "fabricmc.net",
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("should write override files when outputDir is specified", async () => {
      const tmpDir = path.join(os.tmpdir(), `tram-test-output-${Date.now()}`);
      const mrpackPath = path.join(tmpDir, "test.mrpack");
      const outputDir = path.join(tmpDir, "server-output");

      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(mrpackPath, "dummy");

      const modrinthIndex = {
        formatVersion: 1,
        game: "minecraft",
        versionId: "1.0.0",
        name: "Output Test Pack",
        dependencies: { minecraft: "1.20.1", forge: "47.2.0" },
        files: [],
      };

      await setupExtractMock(modrinthIndex, {
        "overrides/config/test.toml": 'key = "value"',
      });

      try {
        const invocation = tool.build({
          action: "modrinth-server-pack",
          mrpackPath,
          outputDir,
        });
        const result = await invocation.execute(new AbortController().signal);
        const parsed = JSON.parse(result.llmContent as string);

        expect(parsed.outputDir).toBe(outputDir);
        expect(parsed.loader).toBe("forge");
        expect(parsed.serverInstallerInfo).toBeDefined();
        expect(parsed.serverInstallerInfo.loader).toBe("forge");
        expect(parsed.serverInstallerInfo.installerUrl).toContain(
          "minecraftforge.net",
        );

        expect(fs.existsSync(path.join(outputDir, "config", "test.toml"))).toBe(
          true,
        );
        expect(
          fs.readFileSync(path.join(outputDir, "config", "test.toml"), "utf-8"),
        ).toBe('key = "value"');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("should handle all loader types for installer info", async () => {
      const loaderTests = [
        {
          deps: { minecraft: "1.20.1", forge: "47.2.0" },
          expectedLoader: "forge",
          urlContains: "minecraftforge.net",
        },
        {
          deps: { minecraft: "1.20.1", "fabric-loader": "0.14.22" },
          expectedLoader: "fabric",
          urlContains: "fabricmc.net",
        },
        {
          deps: { minecraft: "1.20.1", "quilt-loader": "0.20.0" },
          expectedLoader: "quilt",
          urlContains: "quiltmc.org",
        },
        {
          deps: { minecraft: "1.20.1", neoforge: "20.4.100" },
          expectedLoader: "neoforge",
          urlContains: "neoforged.net",
        },
      ];

      for (const loaderTest of loaderTests) {
        const tmpDir = path.join(
          os.tmpdir(),
          `tram-test-loader-${Date.now()}-${loaderTest.expectedLoader}`,
        );
        const mrpackPath = path.join(tmpDir, "test.mrpack");
        fs.mkdirSync(tmpDir, { recursive: true });
        fs.writeFileSync(mrpackPath, "dummy");

        const modrinthIndex = {
          formatVersion: 1,
          game: "minecraft",
          versionId: "1.0.0",
          name: `${loaderTest.expectedLoader} Test`,
          dependencies: loaderTest.deps,
          files: [],
        };

        await setupExtractMock(modrinthIndex);

        try {
          const invocation = tool.build({
            action: "modrinth-server-pack",
            mrpackPath,
          });
          const result = await invocation.execute(new AbortController().signal);
          const parsed = JSON.parse(result.llmContent as string);
          expect(parsed.loader).toBe(loaderTest.expectedLoader);
          expect(parsed.serverInstallerInfo).toBeDefined();
          expect(parsed.serverInstallerInfo.installerUrl).toContain(
            loaderTest.urlContains,
          );
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      }
    });
  });
});
