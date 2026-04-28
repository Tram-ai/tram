/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import type { ModSearchParams } from "./mod-search.js";
import { ModSearchTool } from "./mod-search.js";
import { ToolNames } from "./tool-names.js";

describe("ModSearchTool", () => {
  const tool = new ModSearchTool();

  it("should have correct name and display name", () => {
    expect(tool.name).toBe(ToolNames.MOD_SEARCH);
    expect(tool.displayName).toBe("ModSearch");
  });

  it("should validate required query parameter", () => {
    const params: ModSearchParams = {
      query: "",
    };

    const error = tool["validateToolParamValues"](params);
    expect(error).not.toBeNull();
    expect(error).toContain("query");
  });

  it("should accept valid parameters with query only", () => {
    const params: ModSearchParams = {
      query: "fabric",
    };

    const error = tool["validateToolParamValues"](params);
    expect(error).toBeNull();
  });

  it("should validate limit parameter", () => {
    const params1: ModSearchParams = {
      query: "test",
      limit: 0,
    };

    const error1 = tool["validateToolParamValues"](params1);
    expect(error1).not.toBeNull();
    expect(error1).toContain("limit");

    const params2: ModSearchParams = {
      query: "test",
      limit: 51,
    };

    const error2 = tool["validateToolParamValues"](params2);
    expect(error2).not.toBeNull();
    expect(error2).toContain("limit");

    const params3: ModSearchParams = {
      query: "test",
      limit: 10,
    };

    const error3 = tool["validateToolParamValues"](params3);
    expect(error3).toBeNull();
  });

  it("should validate loader parameter", () => {
    const params1: ModSearchParams = {
      query: "test",
      loaders: ["fabric", "forge"],
    };

    const error1 = tool["validateToolParamValues"](params1);
    expect(error1).toBeNull();

    const params2: ModSearchParams = {
      query: "test",
      loaders: ["invalid-loader"],
    };

    const error2 = tool["validateToolParamValues"](params2);
    expect(error2).not.toBeNull();
    expect(error2).toContain("invalid");
  });

  it("should create invocation with valid params", () => {
    const params: ModSearchParams = {
      query: "minecraft",
      source: "modrinth",
      loaders: ["fabric"],
      gameVersion: "1.20.1",
      limit: 5,
    };

    const invocation = tool.build(params);
    expect(invocation).toBeDefined();
    expect(invocation.params).toEqual(params);
  });

  it("should have description that mentions search and API", () => {
    expect(tool.description.toLowerCase()).toContain("search");
    expect(tool.description.toLowerCase()).toContain("minecraft");
  });

  describe("sorting and cross-platform behavior", () => {
    let fetchSpy: MockInstance;

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch");
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    function mockFetchResponses(
      modrinthHits: unknown[],
      curseforgeData: unknown[],
    ) {
      fetchSpy.mockImplementation((input: string | URL | Request) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        if (url.includes("modrinth") && url.includes("/version")) {
          // Modrinth version fetch — return empty array (no enrichment in tests)
          return Promise.resolve(
            new Response(JSON.stringify([]), { status: 200 }),
          );
        }
        if (url.includes("modrinth")) {
          return Promise.resolve(
            new Response(JSON.stringify({ hits: modrinthHits }), {
              status: 200,
            }),
          );
        }
        if (url.includes("curseforge")) {
          return Promise.resolve(
            new Response(JSON.stringify({ data: curseforgeData }), {
              status: 200,
            }),
          );
        }
        return Promise.resolve(new Response("{}", { status: 200 }));
      });
    }

    it("should keep cross-platform same-name results separate", async () => {
      mockFetchResponses(
        [
          {
            project_id: "mr-1",
            slug: "jei",
            title: "JEI",
            description: "JEI on Modrinth",
            categories: [],
            versions: [],
            downloads: 5000,
            date_modified: "2026-01-01T00:00:00Z",
          },
        ],
        [
          {
            id: 100,
            name: "JEI",
            slug: "jei",
            summary: "JEI on CurseForge",
            websiteUrl: "https://curseforge.com/mc-mods/jei",
            downloadCount: 90000000,
            dateModified: "2025-06-01T00:00:00Z",
          },
        ],
      );

      const invocation = tool.build({ query: "jei", source: "both" });
      const result = await invocation.execute(new AbortController().signal);

      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.count).toBe(2);
      // Both platforms represented
      const sources = parsed.results.map((r: { source: string }) => r.source);
      expect(sources).toContain("modrinth");
      expect(sources).toContain("curseforge");
    });

    it("should sort newer results before older high-download results", async () => {
      mockFetchResponses(
        [
          {
            project_id: "mr-old",
            slug: "old-mod",
            title: "OldMod",
            description: "Old popular mod",
            categories: [],
            versions: [],
            downloads: 10000000,
            date_modified: "2024-01-01T00:00:00Z",
          },
          {
            project_id: "mr-new",
            slug: "new-mod",
            title: "NewMod",
            description: "New mod fewer downloads",
            categories: [],
            versions: [],
            downloads: 500,
            date_modified: "2026-03-15T00:00:00Z",
          },
        ],
        [],
      );

      const invocation = tool.build({ query: "mod", source: "both" });
      const result = await invocation.execute(new AbortController().signal);

      const parsed = JSON.parse(result.llmContent as string);
      expect(parsed.results[0].slug).toBe("new-mod");
      expect(parsed.results[1].slug).toBe("old-mod");
    });

    it("should sort results with dates before results without dates", async () => {
      mockFetchResponses(
        [
          {
            project_id: "mr-nodate",
            slug: "nodate-mod",
            title: "NoDateMod",
            description: "No date",
            categories: [],
            versions: [],
            downloads: 9999999,
          },
          {
            project_id: "mr-dated",
            slug: "dated-mod",
            title: "DatedMod",
            description: "Has date",
            categories: [],
            versions: [],
            downloads: 100,
            date_modified: "2025-06-01T00:00:00Z",
          },
        ],
        [],
      );

      const invocation = tool.build({ query: "mod", source: "both" });
      const result = await invocation.execute(new AbortController().signal);

      const parsed = JSON.parse(result.llmContent as string);
      // Dated result first despite fewer downloads
      expect(parsed.results[0].slug).toBe("dated-mod");
      expect(parsed.results[1].slug).toBe("nodate-mod");
    });

    it("should use downloads as tiebreaker when dates are equal", async () => {
      mockFetchResponses(
        [
          {
            project_id: "mr-a",
            slug: "mod-a",
            title: "ModA",
            description: "A",
            categories: [],
            versions: [],
            downloads: 100,
            date_modified: "2026-01-01T00:00:00Z",
          },
          {
            project_id: "mr-b",
            slug: "mod-b",
            title: "ModB",
            description: "B",
            categories: [],
            versions: [],
            downloads: 5000,
            date_modified: "2026-01-01T00:00:00Z",
          },
        ],
        [],
      );

      const invocation = tool.build({ query: "mod", source: "both" });
      const result = await invocation.execute(new AbortController().signal);

      const parsed = JSON.parse(result.llmContent as string);
      // Same date → higher downloads first
      expect(parsed.results[0].slug).toBe("mod-b");
      expect(parsed.results[1].slug).toBe("mod-a");
    });
  });

  describe("direct Hangar lookup", () => {
    let fetchSpy: MockInstance;

    beforeEach(() => {
      fetchSpy = vi.spyOn(globalThis, "fetch");
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it("should resolve a Hangar project from the public project URL", async () => {
      fetchSpy.mockImplementation((input: string | URL | Request) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.includes("hangar.papermc.io/api/v1/projects/CoreProtect/versions")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                result: [
                  {
                    id: 20834,
                    name: "23.1",
                    channel: { name: "Release" },
                    downloads: {
                      PAPER: {
                        externalUrl: "https://example.com/coreprotect.jar",
                        downloadUrl: null,
                      },
                    },
                    platformDependencies: {
                      PAPER: ["1.20.6", "1.21.8"],
                    },
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.includes("hangar.papermc.io/api/v1/projects/CoreProtect")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 10,
                name: "CoreProtect",
                namespace: { owner: "CORE", slug: "CoreProtect" },
                description: "CoreProtect description",
                stats: { downloads: 33054 },
                lastUpdated: "2025-12-14T21:43:27.901839Z",
                supportedPlatforms: {
                  PAPER: ["1.20.6", "1.21.8"],
                },
              }),
              { status: 200 },
            ),
          );
        }

        return Promise.resolve(new Response("{}", { status: 404 }));
      });

      const invocation = tool.build({
        query: "https://hangar.papermc.io/CORE/CoreProtect",
      });
      const result = await invocation.execute(new AbortController().signal);
      const parsed = JSON.parse(result.llmContent as string);

      expect(parsed.count).toBe(1);
      expect(parsed.results[0].source).toBe("hangar");
      expect(parsed.results[0].slug).toBe("CoreProtect");
      expect(parsed.results[0].projectUrl).toBe(
        "https://hangar.papermc.io/CORE/CoreProtect",
      );
      expect(parsed.results[0].downloadUrl).toBe(
        "https://example.com/coreprotect.jar",
      );
    });

    it("should resolve a Hangar slug directly when Hangar is the selected source", async () => {
      fetchSpy.mockImplementation((input: string | URL | Request) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.includes("hangar.papermc.io/api/v1/projects/CoreProtect/versions")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                result: [
                  {
                    id: 20834,
                    name: "23.1",
                    channel: { name: "Release" },
                    downloads: {
                      PAPER: {
                        downloadUrl: "https://hangar.papermc.io/download/coreprotect.jar",
                        externalUrl: null,
                      },
                    },
                    platformDependencies: {
                      PAPER: ["1.21.8"],
                    },
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.includes("hangar.papermc.io/api/v1/projects/CoreProtect")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 10,
                name: "CoreProtect",
                namespace: { owner: "CORE", slug: "CoreProtect" },
                description: "CoreProtect description",
                stats: { downloads: 33054 },
                lastUpdated: "2025-12-14T21:43:27.901839Z",
                supportedPlatforms: {
                  PAPER: ["1.21.8"],
                },
              }),
              { status: 200 },
            ),
          );
        }

        if (url.includes("/api/v1/projects?") || url.includes("/api/v1/projects&")) {
          return Promise.resolve(new Response(JSON.stringify({ result: [] }), { status: 200 }));
        }

        return Promise.resolve(new Response("{}", { status: 404 }));
      });

      const invocation = tool.build({ query: "CoreProtect", source: "hangar" });
      const result = await invocation.execute(new AbortController().signal);
      const parsed = JSON.parse(result.llmContent as string);

      expect(parsed.count).toBe(1);
      expect(parsed.results[0].source).toBe("hangar");
      expect(parsed.results[0].projectId).toBe("CORE/CoreProtect");
      expect(fetchSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/projects?"),
        expect.anything(),
      );
    });

    it("should resolve a SpigotMC resource URL through the spigot source", async () => {
      fetchSpy.mockImplementation((input: string | URL | Request) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.includes("api.spiget.org/v2/resources/574")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 574,
                name: "AuthMeBridge for Bungeecord",
                tag: "Bridge plugin",
                downloads: 12345,
                updateDate: 1733011200,
                testedVersions: ["1.20.6", "1.21.1"],
              }),
              { status: 200 },
            ),
          );
        }

        return Promise.resolve(new Response("{}", { status: 404 }));
      });

      const invocation = tool.build({
        query: "https://www.spigotmc.org/resources/authmebridge-for-bungeecord.574/",
      });
      const result = await invocation.execute(new AbortController().signal);
      const parsed = JSON.parse(result.llmContent as string);

      expect(parsed.count).toBe(1);
      expect(parsed.results[0].source).toBe("spigot");
      expect(parsed.results[0].projectId).toBe("574");
      expect(parsed.results[0].projectUrl).toBe(
        "https://www.spigotmc.org/resources/574",
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("api.spiget.org/v2/resources/574"),
        expect.any(Object),
      );
    });
  });
});
