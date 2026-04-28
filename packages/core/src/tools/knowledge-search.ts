/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FunctionDeclaration } from "@google/genai";
import { ToolDisplayNames, ToolNames } from "./tool-names.js";
import type { ToolResult, ToolResultDisplay } from "./tools.js";
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from "./tools.js";
import type { Config } from "../config/config.js";
import { createDebugLogger, type DebugLogger } from "../utils/debugLogger.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import extractZip from "extract-zip";
import {
  create,
  load,
  search,
  searchVector,
  count,
  type RawData,
} from "@orama/orama";

const KNOWLEDGE_REPO = "Tram-ai/tram";
const KNOWLEDGE_BRANCH = "main";
const KNOWLEDGE_WORKFLOW = "build-knowledge-base.yml";
const KNOWLEDGE_ARTIFACT_NAME = "knowledge-base-artifacts";
const KNOWLEDGE_CACHE_KEY = KNOWLEDGE_REPO.replace(/\//g, "__");
const SILICONFLOW_BASE = "https://api.siliconflow.cn/v1";
const EMBEDDING_MODEL = "BAAI/bge-m3";
const EMBEDDING_DIM = 1024;
const RERANKER_MODEL = "BAAI/bge-reranker-v2-m3";
const CATALOG_PAGE_SIZE = 20;
const DEFAULT_TOP_K = 8;
const VECTOR_SEARCH_MIN_SIMILARITY = 0.5;
const QUERY_API_MAX_RETRIES = 4;
const QUERY_API_RETRY_BASE_DELAY_MS = 1000;
const QUERY_API_RETRY_MAX_DELAY_MS = 10_000;
const CJK_QUERY_NGRAM_SIZES = [4, 3, 2] as const;
const MAX_FALLBACK_QUERY_FRAGMENTS = 24;

// Orama DB schemas (must match what the build script produces)
const DOCS_SCHEMA = {
  title: "string" as const,
  description: "string" as const,
  path: "string" as const,
  content: "string" as const,
};

const CHUNKS_SCHEMA = {
  docId: "string" as const,
  title: "string" as const,
  heading: "string" as const,
  path: "string" as const,
  text: "string" as const,
  embedding: `vector[${EMBEDDING_DIM}]` as const,
};

// Cache directory under ~/.tram/knowledge-cache/
function getCacheDir(): string {
  return path.join(os.homedir(), ".tram", "knowledge-cache");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number.parseInt(value, 10);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) {
    return null;
  }

  return Math.max(0, retryAt - Date.now());
}

function isRetryableSiliconFlowError(status: number, errText: string): boolean {
  if (status === 408 || status === 409 || status === 429 || status >= 500) {
    return true;
  }

  if (status !== 403) {
    return false;
  }

  return /(rate|rpm|too many requests|limit exceeded|quota)/i.test(errText);
}

function getRetryDelayMs(
  attempt: number,
  retryAfterMs: number | null = null,
): number {
  if (retryAfterMs != null) {
    return Math.max(retryAfterMs, QUERY_API_RETRY_BASE_DELAY_MS);
  }

  const exponentialDelay = Math.min(
    QUERY_API_RETRY_MAX_DELAY_MS,
    QUERY_API_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
  );
  const jitterMs = Math.floor(Math.random() * 250);
  return exponentialDelay + jitterMs;
}

function normalizeEmbeddingVector(
  vector: ArrayLike<number> | null | undefined,
  context: string,
): number[] {
  const normalized = Array.isArray(vector) ? vector : Array.from(vector ?? []);

  if (normalized.length !== EMBEDDING_DIM) {
    throw new Error(
      `${context} embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${normalized.length}`,
    );
  }

  return normalized;
}

async function fetchSiliconFlowJson<T>(
  endpoint: string,
  apiKey: string,
  body: Record<string, unknown>,
  errorLabel: string,
  debugLogger: DebugLogger,
): Promise<T> {
  const totalAttempts = QUERY_API_MAX_RETRIES + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    let resp: Response;

    try {
      resp = await fetch(`${SILICONFLOW_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (attempt === totalAttempts) {
        throw err;
      }

      const delayMs = getRetryDelayMs(attempt);
      debugLogger.warn(
        `[KnowledgeSearch] ${errorLabel} request failed on attempt ${attempt}/${totalAttempts}. Retrying in ${delayMs}ms...`,
        err,
      );
      await sleep(delayMs);
      continue;
    }

    if (resp.ok) {
      return (await resp.json()) as T;
    }

    const errText = await resp.text();
    const retryable = isRetryableSiliconFlowError(resp.status, errText);
    if (!retryable || attempt === totalAttempts) {
      throw new Error(`${errorLabel} API error: ${resp.status} ${errText}`);
    }

    const retryAfterMs = parseRetryAfterMs(resp.headers.get("retry-after"));
    const delayMs = getRetryDelayMs(attempt, retryAfterMs);
    debugLogger.warn(
      `[KnowledgeSearch] ${errorLabel} API ${resp.status} on attempt ${attempt}/${totalAttempts}. Retrying in ${delayMs}ms...`,
    );
    await sleep(delayMs);
  }

  throw new Error(`${errorLabel} request exhausted retries unexpectedly`);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogDoc {
  id: string;
  title: string;
  description: string;
  path: string;
}

interface CatalogData {
  version: number;
  buildTime: string;
  totalDocuments: number;
  documents: CatalogDoc[];
}

interface KnowledgeDocument {
  id: string;
  title: string;
  description: string;
  path: string;
  content: string;
}

interface SearchHit {
  id: string;
  score: number;
  document: Record<string, unknown>;
}

/** Cached Orama database instances */
interface OramaCache {
  catalog: CatalogData | null;
  docsDb: ReturnType<typeof create> | null;
  vectorsDb: ReturnType<typeof create> | null;
  documents: KnowledgeDocument[];
  loadedAt: number;
}

// Module-level cache – single fixed knowledge base source
let oramaCache: OramaCache | null = null;
const CACHE_TTL_MS = 3600_000; // 1 hour

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractSerializedDocuments(rawData: RawData): KnowledgeDocument[] {
  const docsStore = (rawData as {
    docs?: { docs?: Record<string, unknown> };
  }).docs?.docs;

  if (!isRecord(docsStore)) {
    return [];
  }

  return Object.values(docsStore).flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const { id, title, description, path, content } = entry;
    if (
      typeof id !== "string" ||
      typeof title !== "string" ||
      typeof description !== "string" ||
      typeof path !== "string" ||
      typeof content !== "string"
    ) {
      return [];
    }

    return [{ id, title, description, path, content }];
  });
}

function normalizeSearchString(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

function buildFallbackQueryFragments(query: string): string[] {
  const normalized = normalizeSearchString(query.trim());
  if (!normalized) {
    return [];
  }

  const fragments = new Set<string>([normalized]);
  for (const fragment of normalized.split(/[^\p{L}\p{N}]+/u)) {
    if (fragment.length >= 2) {
      fragments.add(fragment);
    }
  }

  const cjkSequences = normalized.replace(/\s+/g, "").match(/[\p{Script=Han}]+/gu) ?? [];
  for (const sequence of cjkSequences) {
    if (sequence.length <= 1) {
      continue;
    }

    for (const size of CJK_QUERY_NGRAM_SIZES) {
      if (sequence.length < size) {
        continue;
      }

      for (let index = 0; index <= sequence.length - size; index++) {
        fragments.add(sequence.slice(index, index + size));
        if (fragments.size >= MAX_FALLBACK_QUERY_FRAGMENTS) {
          return Array.from(fragments);
        }
      }
    }
  }

  return Array.from(fragments).slice(0, MAX_FALLBACK_QUERY_FRAGMENTS);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) {
    return 0;
  }

  let count = 0;
  let fromIndex = 0;
  while (fromIndex < haystack.length) {
    const foundIndex = haystack.indexOf(needle, fromIndex);
    if (foundIndex === -1) {
      break;
    }

    count += 1;
    fromIndex = foundIndex + needle.length;
  }

  return count;
}

function fallbackSubstringSearch(
  documents: KnowledgeDocument[],
  query: string,
): SearchHit[] {
  const normalizedQuery = normalizeSearchString(query.trim());
  const fragments = buildFallbackQueryFragments(query);
  if (!normalizedQuery || fragments.length === 0) {
    return [];
  }

  return documents
    .map((document) => {
      const title = normalizeSearchString(document.title);
      const description = normalizeSearchString(document.description);
      const content = normalizeSearchString(document.content);

      let score = 0;
      if (title.includes(normalizedQuery)) {
        score += 50;
      }
      if (description.includes(normalizedQuery)) {
        score += 25;
      }
      if (content.includes(normalizedQuery)) {
        score += 10;
      }

      for (const fragment of fragments) {
        score += countOccurrences(title, fragment) * 12;
        score += countOccurrences(description, fragment) * 6;
        score += countOccurrences(content, fragment) * 2;
      }

      return {
        id: document.id,
        score,
        document: {
          title: document.title,
          description: document.description,
          path: document.path,
          content: document.content,
        },
      } satisfies SearchHit;
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, DEFAULT_TOP_K);
}

function getDocumentField(
  document: Record<string, unknown>,
  field: keyof Pick<KnowledgeDocument, "title" | "description" | "path" | "content">,
): string {
  const value = document[field];
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------------------
// Tool Parameters
// ---------------------------------------------------------------------------

export interface KnowledgeSearchParams {
  action: "search" | "browse" | "read";
  query?: string;
  page?: number;
  docId?: string;
}

// ---------------------------------------------------------------------------
// Data helpers – download / cache
// ---------------------------------------------------------------------------

/**
 * Download artifacts from nightly.link (GitHub Actions artifact proxy).
 */
async function downloadArtifactZip(
  debugLogger: DebugLogger,
): Promise<Buffer> {
  const url = `https://nightly.link/${KNOWLEDGE_REPO}/workflows/${KNOWLEDGE_WORKFLOW}/${KNOWLEDGE_BRANCH}/${KNOWLEDGE_ARTIFACT_NAME}.zip`;
  debugLogger.debug(`[KnowledgeSearch] Downloading artifact from: ${url}`);

  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok) {
    throw new Error(
      `Failed to download knowledge base artifact: ${resp.status} ${resp.statusText} from ${url}`,
    );
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function hasRequiredKnowledgeFiles(cacheSubDir: string): boolean {
  return (
    fs.existsSync(path.join(cacheSubDir, "catalog.json")) &&
    fs.existsSync(path.join(cacheSubDir, "docs-db.json"))
  );
}

/**
 * Download, extract, and write files to disk cache.
 */
async function downloadAndExtract(
  cacheSubDir: string,
  debugLogger: DebugLogger,
): Promise<void> {
  debugLogger.debug("[KnowledgeSearch] Downloading fresh knowledge base...");
  const zipBuffer = await downloadArtifactZip(debugLogger);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tram-knowledge-"));
  const zipPath = path.join(tempDir, `${KNOWLEDGE_ARTIFACT_NAME}.zip`);

  fs.rmSync(cacheSubDir, { recursive: true, force: true });
  fs.mkdirSync(cacheSubDir, { recursive: true });
  fs.writeFileSync(zipPath, zipBuffer);

  try {
    await extractZip(zipPath, { dir: cacheSubDir });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const extractedFiles = fs
    .readdirSync(cacheSubDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  // Write timestamp
  fs.writeFileSync(
    path.join(cacheSubDir, ".stamp"),
    new Date().toISOString(),
    "utf8",
  );
  debugLogger.debug(
    `[KnowledgeSearch] Cached ${extractedFiles.length} files to ${cacheSubDir}: ${extractedFiles.join(", ")}`,
  );
}

/**
 * Ensure local cache is fresh and return loaded Orama instances.
 * Re-downloads if cache is older than 1 hour.
 */
async function ensureOramaCache(
  debugLogger: DebugLogger,
): Promise<OramaCache> {
  // Check in-memory cache first
  const existing = oramaCache;
  if (existing && Date.now() - existing.loadedAt < CACHE_TTL_MS) {
    debugLogger.debug("[KnowledgeSearch] Using in-memory Orama cache");
    return existing;
  }

  // Check disk cache freshness
  const cacheDir = getCacheDir();
  const cacheSubDir = path.join(cacheDir, KNOWLEDGE_CACHE_KEY);
  const stampFile = path.join(cacheSubDir, ".stamp");

  let needDownload = true;
  if (fs.existsSync(stampFile)) {
    const stat = fs.statSync(stampFile);
    const age = Date.now() - stat.mtimeMs;
    if (age < CACHE_TTL_MS && hasRequiredKnowledgeFiles(cacheSubDir)) {
      needDownload = false;
      debugLogger.debug("[KnowledgeSearch] Using disk-cached knowledge base");
    } else if (age < CACHE_TTL_MS) {
      debugLogger.warn(
        "[KnowledgeSearch] Disk cache stamp exists but required files are missing; re-downloading knowledge base",
      );
    }
  }

  if (needDownload) {
    await downloadAndExtract(cacheSubDir, debugLogger);
  }

  // Load Orama databases from disk into memory
  let cache = loadOramaDatabases(cacheSubDir, debugLogger);
  if (!cache.catalog || !cache.docsDb) {
    debugLogger.warn(
      "[KnowledgeSearch] Cache load incomplete after disk check; forcing knowledge base re-download",
    );
    await downloadAndExtract(cacheSubDir, debugLogger);
    cache = loadOramaDatabases(cacheSubDir, debugLogger);
  }
  oramaCache = cache;

  return cache;
}

/**
 * Load Orama databases from disk-cached JSON files.
 */
function loadOramaDatabases(
  cacheSubDir: string,
  debugLogger: DebugLogger,
): OramaCache {
  let catalog: CatalogData | null = null;
  let docsDb: ReturnType<typeof create> | null = null;
  let vectorsDb: ReturnType<typeof create> | null = null;
  let documents: KnowledgeDocument[] = [];

  // Load catalog
  const catalogPath = path.join(cacheSubDir, "catalog.json");
  if (fs.existsSync(catalogPath)) {
    catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as CatalogData;
  }

  // Restore docs Orama DB
  const docsDbPath = path.join(cacheSubDir, "docs-db.json");
  if (fs.existsSync(docsDbPath)) {
    try {
      const rawData = JSON.parse(
        fs.readFileSync(docsDbPath, "utf8"),
      ) as RawData;
      documents = extractSerializedDocuments(rawData);
      docsDb = create({ schema: DOCS_SCHEMA });
      load(docsDb, rawData);
      debugLogger.debug(
        `[KnowledgeSearch] Loaded docs DB (${count(docsDb)} documents)`,
      );
      if (documents.length > 0) {
        debugLogger.debug(
          `[KnowledgeSearch] Loaded ${documents.length} raw documents for fallback search`,
        );
      }
    } catch (err) {
      debugLogger.warn("[KnowledgeSearch] Failed to load docs DB", err);
    }
  }

  // Restore vectors Orama DB
  const vectorsDbPath = path.join(cacheSubDir, "vectors-db.json");
  if (fs.existsSync(vectorsDbPath)) {
    try {
      const rawData = JSON.parse(
        fs.readFileSync(vectorsDbPath, "utf8"),
      ) as RawData;
      vectorsDb = create({ schema: CHUNKS_SCHEMA });
      load(vectorsDb, rawData);
      debugLogger.debug(
        `[KnowledgeSearch] Loaded vectors DB (${count(vectorsDb)} chunks)`,
      );
    } catch (err) {
      debugLogger.warn("[KnowledgeSearch] Failed to load vectors DB", err);
    }
  }

  return { catalog, docsDb, vectorsDb, documents, loadedAt: Date.now() };
}

// ---------------------------------------------------------------------------
// SiliconFlow API helpers
// ---------------------------------------------------------------------------

/**
 * Get embeddings from SiliconFlow API.
 */
async function getEmbedding(
  text: string,
  apiKey: string,
  debugLogger: DebugLogger,
): Promise<number[]> {
  const json = await fetchSiliconFlowJson<{
    data?: Array<{ embedding?: ArrayLike<number> | null }>;
  }>(
    "/embeddings",
    apiKey,
    {
      model: EMBEDDING_MODEL,
      input: [text],
      encoding_format: "float",
    },
    "Embedding",
    debugLogger,
  );

  const embedding = json.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("Embedding API returned no embedding data");
  }

  return normalizeEmbeddingVector(embedding, "Search query");
}

/**
 * Rerank results using SiliconFlow reranker API.
 */
async function rerankResults(
  query: string,
  documents: string[],
  apiKey: string,
  topN: number,
  debugLogger: DebugLogger,
): Promise<Array<{ index: number; relevance_score: number }>> {
  const json = await fetchSiliconFlowJson<{
    results?: Array<{ index: number; relevance_score: number }>;
  }>(
    "/reranker",
    apiKey,
    {
      model: RERANKER_MODEL,
      query,
      documents,
      top_n: topN,
      return_documents: false,
    },
    "Reranker",
    debugLogger,
  );

  if (!Array.isArray(json.results)) {
    throw new Error("Reranker API returned no results");
  }

  return json.results;
}

/**
 * Check if SiliconFlow API key is valid.
 */
async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const resp = await fetch(`${SILICONFLOW_BASE}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Tool schema
// ---------------------------------------------------------------------------

const description =
  "Search the TRAM knowledge base for documentation, guides, and reference. " +
  'Supports three actions: "search" to find relevant documents by keyword or semantic query, ' +
  '"browse" to list all available documents with pagination (page starts at 1), ' +
  'and "read" to read a specific document by its ID. ' +
  "Uses RAG (vector search + reranking) when SiliconFlow API key is configured, " +
  "otherwise falls back to BM25 full-text search via Orama.";

const schema: FunctionDeclaration = {
  name: ToolNames.KNOWLEDGE_SEARCH,
  description,
  parametersJsonSchema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["search", "browse", "read"],
        description:
          'Action to perform: "search" to search documents, "browse" to list catalog with pagination, "read" to read a full document by ID.',
      },
      query: {
        type: "string",
        description:
          'Search query (required for "search" action). Can be keywords or a natural language question.',
      },
      page: {
        type: "number",
        description:
          'Page number for "browse" action (1-based). Default is 1. Each page shows up to 20 entries.',
      },
      docId: {
        type: "string",
        description:
          'Document ID for "read" action. Get IDs from "browse" or "search" results.',
      },
    },
    required: ["action"],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// Tool Invocation
// ---------------------------------------------------------------------------

class KnowledgeSearchInvocation extends BaseToolInvocation<
  KnowledgeSearchParams,
  ToolResult
> {
  private readonly debugLogger: DebugLogger;

  constructor(
    private readonly config: Config,
    params: KnowledgeSearchParams,
  ) {
    super(params);
    this.debugLogger = createDebugLogger("KNOWLEDGE_SEARCH");
  }

  getDescription(): string {
    const p = this.params;
    switch (p.action) {
      case "search":
        return `Knowledge search: "${p.query}"`;
      case "browse":
        return `Knowledge browse: page ${p.page ?? 1}`;
      case "read":
        return `Knowledge read: ${p.docId}`;
      default:
        return "Knowledge search";
    }
  }

  async execute(
    signal: AbortSignal,
    updateOutput?: (output: ToolResultDisplay) => void,
  ): Promise<ToolResult> {
    // Ensure cached Orama databases
    let cache: OramaCache;
    try {
      cache = await ensureOramaCache(this.debugLogger);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unknown error downloading knowledge base";
      return {
        llmContent: `Error downloading knowledge base: ${msg}.\n\nThe knowledge base artifacts may not exist yet. Ensure the GitHub Actions workflow "${KNOWLEDGE_WORKFLOW}" has run successfully in the repository "${KNOWLEDGE_REPO}" on branch "${KNOWLEDGE_BRANCH}".`,
        returnDisplay: `Error: ${msg}`,
      };
    }

    switch (this.params.action) {
      case "browse":
        return this.handleBrowse(cache);
      case "read":
        return this.handleRead(cache);
      case "search":
        return this.handleSearch(cache);
      default:
        return {
          llmContent: `Unknown action "${this.params.action}". Use "search", "browse", or "read".`,
          returnDisplay: `Unknown action: ${this.params.action}`,
        };
    }
  }

  private handleBrowse(cache: OramaCache): ToolResult {
    const catalog = cache.catalog;
    if (!catalog) {
      return {
        llmContent: "Knowledge base catalog not found in cache.",
        returnDisplay: "Catalog not found",
      };
    }

    const page = Math.max(1, this.params.page ?? 1);
    const totalPages = Math.ceil(catalog.documents.length / CATALOG_PAGE_SIZE);
    const start = (page - 1) * CATALOG_PAGE_SIZE;
    const pageItems = catalog.documents.slice(start, start + CATALOG_PAGE_SIZE);

    if (pageItems.length === 0) {
      return {
        llmContent: `Page ${page} is empty. Total pages: ${totalPages}, total documents: ${catalog.totalDocuments}.`,
        returnDisplay: `Page ${page} empty (${totalPages} pages total)`,
      };
    }

    const lines = [
      `📚 Knowledge Base Catalog — Page ${page}/${totalPages} (${catalog.totalDocuments} documents)`,
      `Build time: ${catalog.buildTime}`,
      "",
    ];

    for (const doc of pageItems) {
      lines.push(`**${doc.title}** (id: \`${doc.id}\`)`);
      lines.push(`  ${doc.description}`);
      lines.push("");
    }

    if (page < totalPages) {
      lines.push(`_Use page=${page + 1} to see more._`);
    }

    const content = lines.join("\n");
    return {
      llmContent: content,
      returnDisplay: `Showing ${pageItems.length} documents (page ${page}/${totalPages})`,
    };
  }

  private handleRead(cache: OramaCache): ToolResult {
    if (!this.params.docId) {
      return {
        llmContent:
          'Missing "docId" parameter. Use "browse" or "search" first to find a document ID.',
        returnDisplay: "Missing docId",
      };
    }

    const doc = cache.documents.find((entry) => entry.id === this.params.docId);
    if (!doc && !cache.docsDb) {
      return {
        llmContent: "Docs database not found in cache.",
        returnDisplay: "Docs DB not found",
      };
    }

    if (!doc) {
      return {
        llmContent: `Document "${this.params.docId}" not found. Use "browse" to see available documents.`,
        returnDisplay: `Document not found: ${this.params.docId}`,
      };
    }

    const content = [
      `# ${doc.title}`,
      `_ID: ${this.params.docId} | Path: ${doc.path}_`,
      "",
      doc.content,
    ].join("\n");

    return {
      llmContent: content,
      returnDisplay: `Read document: ${doc.title}`,
    };
  }

  private async handleSearch(cache: OramaCache): Promise<ToolResult> {
    if (!this.params.query) {
      return {
        llmContent:
          'Missing "query" parameter for search action. Provide a search query.',
        returnDisplay: "Missing query",
      };
    }

    const apiKey = this.config.getSiliconFlowApiKey();

    // Determine mode: RAG if apiKey + vectors DB available, else full-text
    let useRag = false;
    if (apiKey && cache.vectorsDb) {
      const valid = await testApiKey(apiKey);
      if (valid) {
        useRag = true;
      } else {
        this.debugLogger.warn(
          "[KnowledgeSearch] SiliconFlow API key invalid or unreachable, falling back to full-text search",
        );
      }
    }

    if (useRag && cache.vectorsDb) {
      return this.handleRagSearch(cache);
    }

    return this.handleFullTextSearch(cache);
  }

  private async handleRagSearch(cache: OramaCache): Promise<ToolResult> {
    const apiKey = this.config.getSiliconFlowApiKey()!;
    const query = this.params.query!;
    const vectorsDb = cache.vectorsDb!;

    try {
      // 1. Embed the query
      this.debugLogger.debug("[KnowledgeSearch] RAG mode: embedding query...");
      const queryVec = await getEmbedding(query, apiKey, this.debugLogger);

      // 2. Vector search via Orama (retrieve 2×topK candidates)
      const vectorResults = searchVector(vectorsDb, {
        mode: "vector",
        vector: {
          value: queryVec,
          property: "embedding",
        },
        similarity: VECTOR_SEARCH_MIN_SIMILARITY,
        limit: DEFAULT_TOP_K * 2,
        includeVectors: false,
      } as any) as {
        count: number;
        hits: Array<{
          id: string;
          score: number;
          document: Record<string, unknown>;
        }>;
      };

      if (vectorResults.count === 0) {
        this.debugLogger.warn(
          "[KnowledgeSearch] RAG returned no vector hits, falling back to full-text search",
        );
        return this.handleFullTextSearch(cache);
      }

      // 3. Rerank with SiliconFlow
      this.debugLogger.debug(
        `[KnowledgeSearch] Reranking ${vectorResults.hits.length} candidates...`,
      );

      let finalHits = vectorResults.hits;

      try {
        const documents = vectorResults.hits.map(
          (h) =>
            ((h.document["heading"] as string)
              ? `${h.document["heading"]}\n`
              : "") + (h.document["text"] as string),
        );
        const reranked = await rerankResults(
          query,
          documents,
          apiKey,
          DEFAULT_TOP_K,
          this.debugLogger,
        );
        finalHits = reranked.map((r) => ({
          ...vectorResults.hits[r.index],
          score: r.relevance_score,
        }));
      } catch (err) {
        this.debugLogger.warn(
          "[KnowledgeSearch] Reranker failed, using vector scores",
          err,
        );
        finalHits = vectorResults.hits.slice(0, DEFAULT_TOP_K);
      }

      // 4. Deduplicate by docId and format
      const docChunks = new Map<
        string,
        {
          title: string;
          path: string;
          chunks: Array<{ heading: string; text: string; score: number }>;
        }
      >();

      for (const hit of finalHits) {
        const docId = hit.document["docId"] as string;
        const existing = docChunks.get(docId);
        const chunkInfo = {
          heading: hit.document["heading"] as string,
          text: hit.document["text"] as string,
          score: hit.score,
        };

        if (existing) {
          existing.chunks.push(chunkInfo);
        } else {
          docChunks.set(docId, {
            title: hit.document["title"] as string,
            path: hit.document["path"] as string,
            chunks: [chunkInfo],
          });
        }
      }

      const lines = [
        `🔍 RAG Search Results for "${query}" (${finalHits.length} chunks from ${docChunks.size} documents)`,
        `_Mode: Vector search (${EMBEDDING_MODEL}) + Reranking (${RERANKER_MODEL})_`,
        "",
      ];

      for (const [docId, info] of docChunks) {
        lines.push(`## ${info.title} (id: \`${docId}\`)`);
        lines.push(`_Path: ${info.path}_`);
        for (const chunk of info.chunks) {
          if (chunk.heading) {
            lines.push(`### ${chunk.heading}`);
          }
          lines.push(chunk.text);
          lines.push(`_Score: ${chunk.score.toFixed(4)}_`);
          lines.push("");
        }
        lines.push("---");
      }

      lines.push(
        '\n_Use `action: "read"` with a document ID to read the full document._',
      );

      const content = lines.join("\n");
      return {
        llmContent: content,
        returnDisplay: `RAG search: ${finalHits.length} results for "${query}"`,
      };
    } catch (err) {
      this.debugLogger.warn(
        "[KnowledgeSearch] RAG search failed, falling back to full-text",
        err,
      );
      return this.handleFullTextSearch(cache);
    }
  }

  private handleFullTextSearch(cache: OramaCache): ToolResult {
    const query = this.params.query!;
    const docsDb = cache.docsDb;
    let hits: SearchHit[] = [];
    let modeLabel = "_Mode: Orama BM25 full-text search_";

    if (docsDb) {
      const results = search(docsDb, {
        term: query,
        properties: ["title", "description", "content"] as any,
        limit: DEFAULT_TOP_K,
      } as any) as {
        count: number;
        hits: SearchHit[];
      };
      hits = results.hits;
    }

    if (hits.length === 0) {
      const fallbackHits = fallbackSubstringSearch(cache.documents, query);
      if (fallbackHits.length > 0) {
        hits = fallbackHits;
        modeLabel =
          "_Mode: substring fallback search (better for CJK and natural-language queries)_";
      }
    }

    if (hits.length === 0) {
      return {
        llmContent: `No results found for "${query}" using knowledge base search.`,
        returnDisplay: `Knowledge search: 0 results for "${query}"`,
      };
    }

    const lines = [
      `🔍 Full-Text Search Results for "${query}" (${hits.length} documents)`,
      modeLabel,
      "",
    ];

    for (const hit of hits) {
      const doc = hit.document;
      const title = getDocumentField(doc, "title");
      const description = getDocumentField(doc, "description");
      const docPath = getDocumentField(doc, "path");
      const content = getDocumentField(doc, "content");

      lines.push(`## ${title} (id: \`${hit.id}\`)`);
      lines.push(`_Score: ${hit.score.toFixed(4)} | Path: ${docPath}_`);
      lines.push(description);

      // Show a relevant snippet (first 500 chars of content)
      const snippet = content.substring(0, 500).trim();
      if (snippet) {
        lines.push("");
        lines.push(`> ${snippet.replace(/\n/g, "\n> ")}...`);
      }
      lines.push("");
      lines.push("---");
    }

    lines.push(
      '\n_Use `action: "read"` with a document ID to read the full document._',
    );

    const content = lines.join("\n");
    return {
      llmContent: content,
      returnDisplay: `Knowledge search: ${hits.length} results for "${query}"`,
    };
  }
}

export const __testing__ = {
  buildFallbackQueryFragments,
  fallbackSubstringSearch,
  extractSerializedDocuments,
  resetOramaCache: (): void => {
    oramaCache = null;
  },
};

// ---------------------------------------------------------------------------
// Tool class
// ---------------------------------------------------------------------------

export class KnowledgeSearchTool extends BaseDeclarativeTool<
  KnowledgeSearchParams,
  ToolResult
> {
  static readonly Name: string = ToolNames.KNOWLEDGE_SEARCH;

  constructor(private readonly config: Config) {
    super(
      ToolNames.KNOWLEDGE_SEARCH,
      ToolDisplayNames.KNOWLEDGE_SEARCH,
      description,
      Kind.Read,
      schema.parametersJsonSchema!,
    );
  }

  protected override createInvocation(
    params: KnowledgeSearchParams,
  ): KnowledgeSearchInvocation {
    return new KnowledgeSearchInvocation(this.config, params);
  }
}
