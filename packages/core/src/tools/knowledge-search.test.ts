import { create, insert, save, type RawData } from "@orama/orama";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Config } from "../config/config.js";
import { KnowledgeSearchTool, __testing__ } from "./knowledge-search.js";

const testDocuments = [
  {
    id: "message-config",
    title: "消息配置",
    description: "配置通知消息与模板",
    path: "message.md",
    content: "这里介绍如何配置消息通知、模板和推送渠道。",
  },
  {
    id: "agent-overview",
    title: "代理概览",
    description: "说明代理能力",
    path: "agent.md",
    content: "这里介绍代理模式与基本工作流。",
  },
];

const ragFallbackDocuments = [
  {
    id: "mc-reference",
    title: "Minecraft Server Information Tools",
    description: "Tools for querying Minecraft server information",
    path: "mc-reference.md",
    content:
      "This document explains Minecraft server deployment details and Java requirements.",
  },
];

function createVector(...values: number[]): number[] {
  const vector = new Array(1024).fill(0);
  for (let index = 0; index < values.length; index++) {
    vector[index] = values[index] ?? 0;
  }
  return vector;
}

function writeKnowledgeCache(
  homeDir: string,
  documents: Array<{
    id: string;
    title: string;
    description: string;
    path: string;
    content: string;
  }> = testDocuments,
  options: {
    includeEmptyVectorsDb?: boolean;
    vectorDocuments?: Array<{
      id: string;
      docId: string;
      title: string;
      heading: string;
      path: string;
      text: string;
      embedding: number[];
    }>;
  } = {},
): void {
  const cacheDir = path.join(
    homeDir,
    ".tram",
    "knowledge-cache",
    "Tram-ai__tram",
  );
  fs.mkdirSync(cacheDir, { recursive: true });

  const catalog = {
    version: 1,
    buildTime: new Date().toISOString(),
    totalDocuments: documents.length,
    documents: documents.map(({ id, title, description, path: docPath }) => ({
      id,
      title,
      description,
      path: docPath,
    })),
  };

  const docsDb = create({
    schema: {
      title: "string",
      description: "string",
      path: "string",
      content: "string",
    },
  });

  for (const document of documents) {
    insert(docsDb, document);
  }

  fs.writeFileSync(
    path.join(cacheDir, "catalog.json"),
    JSON.stringify(catalog),
    "utf8",
  );
  fs.writeFileSync(
    path.join(cacheDir, "docs-db.json"),
    JSON.stringify(save(docsDb)),
    "utf8",
  );
  if (options.vectorDocuments || options.includeEmptyVectorsDb) {
    const vectorsDb = create({
      schema: {
        docId: "string",
        title: "string",
        heading: "string",
        path: "string",
        text: "string",
        embedding: "vector[1024]",
      },
    });
    for (const vectorDocument of options.vectorDocuments ?? []) {
      insert(vectorsDb, vectorDocument);
    }
    fs.writeFileSync(
      path.join(cacheDir, "vectors-db.json"),
      JSON.stringify(save(vectorsDb)),
      "utf8",
    );
  }
  fs.writeFileSync(
    path.join(cacheDir, ".stamp"),
    new Date().toISOString(),
    "utf8",
  );
}

describe("knowledge-search helpers", () => {
  it("extracts useful CJK fragments from natural-language queries", () => {
    const fragments = __testing__.buildFallbackQueryFragments("如何配置消息");

    expect(fragments).toContain("消息");
    expect(fragments).toContain("配置");
  });

  it("matches Chinese content via substring fallback search", () => {
    const results = __testing__.fallbackSubstringSearch(
      [
        {
          id: "doc-message",
          title: "消息配置",
          description: "配置通知消息",
          path: "message.md",
          content: "这里介绍如何配置消息通知与消息模板。",
        },
        {
          id: "doc-other",
          title: "其他文档",
          description: "与消息无关",
          path: "other.md",
          content: "这里没有相关配置。",
        },
      ],
      "如何配置消息",
    );

    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe("doc-message");
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it("extracts raw documents from serialized Orama data", () => {
    const rawData = {
      docs: {
        docs: {
          "1": {
            id: "doc-1",
            title: "消息文档",
            description: "消息说明",
            path: "message.md",
            content: "消息内容",
          },
          "2": {
            id: "broken",
            title: "missing-content",
          },
        },
      },
    } as unknown as RawData;

    expect(__testing__.extractSerializedDocuments(rawData)).toEqual([
      {
        id: "doc-1",
        title: "消息文档",
        description: "消息说明",
        path: "message.md",
        content: "消息内容",
      },
    ]);
  });

  it("rejects removed custom repo parameters", () => {
    const tool = new KnowledgeSearchTool({} as Config);

    expect(() =>
      tool.build({
        action: "search",
        query: "消息",
        repo: "owner/repo",
      } as never),
    ).toThrow();
  });
});

describe("knowledge-search RAG fallback", () => {
  const tempHomeDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "tram-knowledge-search-rag-fallback-"),
  );
  const originalHome = process.env["HOME"];
  const originalUserProfile = process.env["USERPROFILE"];
  const tool = new KnowledgeSearchTool({
    getSiliconFlowApiKey: () => "test-siliconflow-key",
  } as Config);

  beforeAll(() => {
    writeKnowledgeCache(tempHomeDir, ragFallbackDocuments, {
      includeEmptyVectorsDb: true,
    });
    process.env["HOME"] = tempHomeDir;
    process.env["USERPROFILE"] = tempHomeDir;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.endsWith("/models")) {
          return new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        if (url.endsWith("/embeddings")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  index: 0,
                  embedding: new Array(1024).fill(0),
                },
              ],
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        throw new Error(`Unexpected fetch during RAG fallback test: ${url}`);
      }),
    );
    __testing__.resetOramaCache();
  });

  afterAll(() => {
    __testing__.resetOramaCache();
    process.env["HOME"] = originalHome;
    process.env["USERPROFILE"] = originalUserProfile;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(tempHomeDir, { recursive: true, force: true });
  });

  it("falls back to full-text search when RAG returns no vector hits", async () => {
    const result = await tool
      .build({ action: "search", query: "minecraft" })
      .execute(new AbortController().signal);

    expect(result.returnDisplay).toContain(
      'Knowledge search: 1 results for "minecraft"',
    );
    expect(result.returnDisplay).not.toContain("RAG search:");
    expect(result.llmContent).toContain(
      'Full-Text Search Results for "minecraft"',
    );
    expect(result.llmContent).toContain("Minecraft Server Information Tools");
  });
});

describe("knowledge-search RAG similarity threshold", () => {
  const tempHomeDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "tram-knowledge-search-rag-threshold-"),
  );
  const originalHome = process.env["HOME"];
  const originalUserProfile = process.env["USERPROFILE"];
  const tool = new KnowledgeSearchTool({
    getSiliconFlowApiKey: () => "test-siliconflow-key",
  } as Config);

  beforeAll(() => {
    writeKnowledgeCache(tempHomeDir, ragFallbackDocuments, {
      vectorDocuments: [
        {
          id: "mc-reference#0",
          docId: "mc-reference",
          title: "Minecraft Server Information Tools",
          heading: "",
          path: "mc-reference.md",
          text: "This document explains Minecraft server deployment details and Java requirements.",
          embedding: createVector(1, 0),
        },
      ],
    });
    process.env["HOME"] = tempHomeDir;
    process.env["USERPROFILE"] = tempHomeDir;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.endsWith("/models")) {
          return new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        if (url.endsWith("/embeddings")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  index: 0,
                  embedding: createVector(0.52, Math.sqrt(1 - 0.52 ** 2)),
                },
              ],
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        if (url.endsWith("/reranker")) {
          return new Response(
            JSON.stringify({
              results: [{ index: 0, relevance_score: 0.52 }],
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        throw new Error(`Unexpected fetch during RAG threshold test: ${url}`);
      }),
    );
    __testing__.resetOramaCache();
  });

  afterAll(() => {
    __testing__.resetOramaCache();
    process.env["HOME"] = originalHome;
    process.env["USERPROFILE"] = originalUserProfile;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(tempHomeDir, { recursive: true, force: true });
  });

  it("returns RAG hits for moderately similar keyword queries", async () => {
    const result = await tool
      .build({ action: "search", query: "minecraft" })
      .execute(new AbortController().signal);

    expect(result.returnDisplay).toContain('RAG search: 1 results for "minecraft"');
    expect(result.llmContent).toContain('RAG Search Results for "minecraft"');
    expect(result.llmContent).toContain("Minecraft Server Information Tools");
  });
});

describe("knowledge-search smoke", () => {
  const tempHomeDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "tram-knowledge-search-"),
  );
  const originalHome = process.env["HOME"];
  const originalUserProfile = process.env["USERPROFILE"];
  const tool = new KnowledgeSearchTool({
    getSiliconFlowApiKey: () => undefined,
  } as Config);

  beforeAll(() => {
    writeKnowledgeCache(tempHomeDir);
    process.env["HOME"] = tempHomeDir;
    process.env["USERPROFILE"] = tempHomeDir;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("knowledge-search smoke tests should not use network");
      }),
    );
    __testing__.resetOramaCache();
  });

  afterAll(() => {
    __testing__.resetOramaCache();
    process.env["HOME"] = originalHome;
    process.env["USERPROFILE"] = originalUserProfile;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(tempHomeDir, { recursive: true, force: true });
  });

  it("browses cached knowledge docs", async () => {
    const result = await tool
      .build({ action: "browse" })
      .execute(new AbortController().signal);

    expect(result.returnDisplay).toContain("Showing 2 documents");
    expect(result.llmContent).toContain("消息配置");
    expect(result.llmContent).toContain("代理概览");
  });

  it("searches cached knowledge docs without network access", async () => {
    const result = await tool
      .build({ action: "search", query: "如何配置消息" })
      .execute(new AbortController().signal);

    expect(result.returnDisplay).toContain("Knowledge search: 1 results");
    expect(result.llmContent).toContain(
      'Full-Text Search Results for "如何配置消息"',
    );
    expect(result.llmContent).toContain("substring fallback search");
    expect(result.llmContent).toContain("消息配置");
  });

  it("reads a cached knowledge doc by id", async () => {
    const result = await tool
      .build({ action: "read", docId: "message-config" })
      .execute(new AbortController().signal);

    expect(result.returnDisplay).toBe("Read document: 消息配置");
    expect(result.llmContent).toContain("# 消息配置");
    expect(result.llmContent).toContain("如何配置消息通知");
  });
});