/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FunctionDeclaration } from '@google/genai';
import { ToolDisplayNames, ToolNames } from './tool-names.js';
import type { ToolResult, ToolResultDisplay } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { Config } from '../config/config.js';
import { createDebugLogger, type DebugLogger } from '../utils/debugLogger.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  create,
  load,
  search,
  searchVector,
  getByID,
  count,
  type RawData,
} from '@orama/orama';

const ARTIFACT_NAME = 'knowledge-base-artifacts';
const NIGHTLY_LINK_BASE = 'https://nightly.link';
const SILICONFLOW_BASE = 'https://api.siliconflow.cn/v1';
const EMBEDDING_MODEL = 'BAAI/bge-m3';
const EMBEDDING_DIM = 1024;
const RERANKER_MODEL = 'BAAI/bge-reranker-v2-m3';
const CATALOG_PAGE_SIZE = 20;
const DEFAULT_TOP_K = 8;

// Orama DB schemas (must match what the build script produces)
const DOCS_SCHEMA = {
  title: 'string' as const,
  description: 'string' as const,
  path: 'string' as const,
  content: 'string' as const,
};

const CHUNKS_SCHEMA = {
  docId: 'string' as const,
  title: 'string' as const,
  heading: 'string' as const,
  path: 'string' as const,
  text: 'string' as const,
  embedding: `vector[${EMBEDDING_DIM}]` as const,
};

// Cache directory under ~/.tram/knowledge-cache/
function getCacheDir(): string {
  return path.join(os.homedir(), '.tram', 'knowledge-cache');
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

/** Cached Orama database instances */
interface OramaCache {
  catalog: CatalogData | null;
  docsDb: ReturnType<typeof create> | null;
  vectorsDb: ReturnType<typeof create> | null;
  loadedAt: number;
}

// Module-level cache – one instance per repo key
const oramaCacheMap = new Map<string, OramaCache>();
const CACHE_TTL_MS = 3600_000; // 1 hour

// ---------------------------------------------------------------------------
// Tool Parameters
// ---------------------------------------------------------------------------

export interface KnowledgeSearchParams {
  action: 'search' | 'browse' | 'read';
  query?: string;
  page?: number;
  docId?: string;
  repo?: string;
  branch?: string;
  workflow?: string;
}

// ---------------------------------------------------------------------------
// Data helpers – download / cache
// ---------------------------------------------------------------------------

/**
 * Download artifacts from nightly.link (GitHub Actions artifact proxy).
 */
async function downloadArtifactZip(
  repo: string,
  branch: string,
  workflow: string,
  debugLogger: DebugLogger,
): Promise<Buffer> {
  const url = `${NIGHTLY_LINK_BASE}/${repo}/workflows/${workflow}/${branch}/${ARTIFACT_NAME}.zip`;
  debugLogger.debug(`[KnowledgeSearch] Downloading artifact from: ${url}`);

  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) {
    throw new Error(
      `Failed to download knowledge base artifact: ${resp.status} ${resp.statusText} from ${url}`,
    );
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Minimal ZIP parser using Node.js built-in zlib.
 */
function parseZipEntries(
  zipBuffer: Buffer,
): Array<{ name: string; data: Buffer }> {
  const entries: Array<{ name: string; data: Buffer }> = [];
  let offset = 0;
  const zlib = require('node:zlib') as typeof import('node:zlib');

  while (offset < zipBuffer.length - 4) {
    const sig = zipBuffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;

    const compressionMethod = zipBuffer.readUInt16LE(offset + 8);
    const compressedSize = zipBuffer.readUInt32LE(offset + 18);
    const nameLen = zipBuffer.readUInt16LE(offset + 26);
    const extraLen = zipBuffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = zipBuffer.toString('utf8', nameStart, nameStart + nameLen);
    const dataStart = nameStart + nameLen + extraLen;
    const rawData = zipBuffer.subarray(dataStart, dataStart + compressedSize);

    if (compressedSize > 0) {
      let data: Buffer;
      if (compressionMethod === 0) {
        data = Buffer.from(rawData);
      } else if (compressionMethod === 8) {
        data = zlib.inflateRawSync(rawData);
      } else {
        offset = dataStart + compressedSize;
        continue;
      }
      entries.push({ name, data });
    }

    offset = dataStart + compressedSize;
  }

  return entries;
}

/**
 * Download, extract, and write files to disk cache.
 */
async function downloadAndExtract(
  repo: string,
  branch: string,
  workflow: string,
  cacheSubDir: string,
  debugLogger: DebugLogger,
): Promise<void> {
  debugLogger.debug('[KnowledgeSearch] Downloading fresh knowledge base...');
  const zipBuffer = await downloadArtifactZip(repo, branch, workflow, debugLogger);

  fs.mkdirSync(cacheSubDir, { recursive: true });

  const entries = parseZipEntries(zipBuffer);
  for (const entry of entries) {
    if (entry.name.endsWith('/')) continue;
    const outPath = path.join(cacheSubDir, path.basename(entry.name));
    fs.writeFileSync(outPath, entry.data);
  }

  // Write timestamp
  fs.writeFileSync(path.join(cacheSubDir, '.stamp'), new Date().toISOString(), 'utf8');
  debugLogger.debug(
    `[KnowledgeSearch] Cached ${entries.length} files to ${cacheSubDir}`,
  );
}

/**
 * Ensure local cache is fresh and return loaded Orama instances.
 * Re-downloads if cache is older than 1 hour.
 */
async function ensureOramaCache(
  repo: string,
  branch: string,
  workflow: string,
  debugLogger: DebugLogger,
): Promise<OramaCache> {
  const repoKey = repo.replace(/\//g, '__');

  // Check in-memory cache first
  const existing = oramaCacheMap.get(repoKey);
  if (existing && Date.now() - existing.loadedAt < CACHE_TTL_MS) {
    debugLogger.debug('[KnowledgeSearch] Using in-memory Orama cache');
    return existing;
  }

  // Check disk cache freshness
  const cacheDir = getCacheDir();
  const cacheSubDir = path.join(cacheDir, repoKey);
  const stampFile = path.join(cacheSubDir, '.stamp');

  let needDownload = true;
  if (fs.existsSync(stampFile)) {
    const stat = fs.statSync(stampFile);
    const age = Date.now() - stat.mtimeMs;
    if (age < CACHE_TTL_MS) {
      needDownload = false;
      debugLogger.debug('[KnowledgeSearch] Using disk-cached knowledge base');
    }
  }

  if (needDownload) {
    await downloadAndExtract(repo, branch, workflow, cacheSubDir, debugLogger);
  }

  // Load Orama databases from disk into memory
  const cache = loadOramaDatabases(cacheSubDir, debugLogger);
  oramaCacheMap.set(repoKey, cache);

  return cache;
}

/**
 * Load Orama databases from disk-cached JSON files.
 */
function loadOramaDatabases(cacheSubDir: string, debugLogger: DebugLogger): OramaCache {
  let catalog: CatalogData | null = null;
  let docsDb: ReturnType<typeof create> | null = null;
  let vectorsDb: ReturnType<typeof create> | null = null;

  // Load catalog
  const catalogPath = path.join(cacheSubDir, 'catalog.json');
  if (fs.existsSync(catalogPath)) {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as CatalogData;
  }

  // Restore docs Orama DB
  const docsDbPath = path.join(cacheSubDir, 'docs-db.json');
  if (fs.existsSync(docsDbPath)) {
    try {
      const rawData = JSON.parse(fs.readFileSync(docsDbPath, 'utf8')) as RawData;
      docsDb = create({ schema: DOCS_SCHEMA });
      load(docsDb, rawData);
      debugLogger.debug(`[KnowledgeSearch] Loaded docs DB (${count(docsDb)} documents)`);
    } catch (err) {
      debugLogger.warn('[KnowledgeSearch] Failed to load docs DB', err);
    }
  }

  // Restore vectors Orama DB
  const vectorsDbPath = path.join(cacheSubDir, 'vectors-db.json');
  if (fs.existsSync(vectorsDbPath)) {
    try {
      const rawData = JSON.parse(fs.readFileSync(vectorsDbPath, 'utf8')) as RawData;
      vectorsDb = create({ schema: CHUNKS_SCHEMA });
      load(vectorsDb, rawData);
      debugLogger.debug(`[KnowledgeSearch] Loaded vectors DB (${count(vectorsDb)} chunks)`);
    } catch (err) {
      debugLogger.warn('[KnowledgeSearch] Failed to load vectors DB', err);
    }
  }

  return { catalog, docsDb, vectorsDb, loadedAt: Date.now() };
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
): Promise<number[]> {
  const resp = await fetch(`${SILICONFLOW_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [text],
      encoding_format: 'float',
    }),
  });

  if (!resp.ok) {
    throw new Error(`Embedding API error: ${resp.status}`);
  }

  const json = (await resp.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return json.data[0].embedding;
}

/**
 * Rerank results using SiliconFlow reranker API.
 */
async function rerankResults(
  query: string,
  documents: string[],
  apiKey: string,
  topN: number,
): Promise<Array<{ index: number; relevance_score: number }>> {
  const resp = await fetch(`${SILICONFLOW_BASE}/reranker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: RERANKER_MODEL,
      query,
      documents,
      top_n: topN,
      return_documents: false,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Reranker API error: ${resp.status}`);
  }

  const json = (await resp.json()) as {
    results: Array<{ index: number; relevance_score: number }>;
  };
  return json.results;
}

/**
 * Check if SiliconFlow API key is valid.
 */
async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const resp = await fetch(`${SILICONFLOW_BASE}/models`, {
      method: 'GET',
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
  'Search the TRAM knowledge base for documentation, guides, and reference. ' +
  'Supports three actions: "search" to find relevant documents by keyword or semantic query, ' +
  '"browse" to list all available documents with pagination (page starts at 1), ' +
  'and "read" to read a specific document by its ID. ' +
  'Uses RAG (vector search + reranking) when SiliconFlow API key is configured, ' +
  'otherwise falls back to BM25 full-text search via Orama.';

const schema: FunctionDeclaration = {
  name: ToolNames.KNOWLEDGE_SEARCH,
  description,
  parametersJsonSchema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['search', 'browse', 'read'],
        description:
          'Action to perform: "search" to search documents, "browse" to list catalog with pagination, "read" to read a full document by ID.',
      },
      query: {
        type: 'string',
        description:
          'Search query (required for "search" action). Can be keywords or a natural language question.',
      },
      page: {
        type: 'number',
        description:
          'Page number for "browse" action (1-based). Default is 1. Each page shows up to 20 entries.',
      },
      docId: {
        type: 'string',
        description:
          'Document ID for "read" action. Get IDs from "browse" or "search" results.',
      },
      repo: {
        type: 'string',
        description:
          'GitHub repository in "owner/repo" format. Defaults to "tram-ai/tram".',
      },
      branch: {
        type: 'string',
        description: 'Branch name to fetch artifacts from. Defaults to "main".',
      },
      workflow: {
        type: 'string',
        description:
          'Workflow file name. Defaults to "build-knowledge-base.yml".',
      },
    },
    required: ['action'],
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
    this.debugLogger = createDebugLogger('KNOWLEDGE_SEARCH');
  }

  getDescription(): string {
    const p = this.params;
    switch (p.action) {
      case 'search':
        return `Knowledge search: "${p.query}"`;
      case 'browse':
        return `Knowledge browse: page ${p.page ?? 1}`;
      case 'read':
        return `Knowledge read: ${p.docId}`;
      default:
        return 'Knowledge search';
    }
  }

  async execute(
    signal: AbortSignal,
    updateOutput?: (output: ToolResultDisplay) => void,
  ): Promise<ToolResult> {
    const repo = this.params.repo ?? 'tram-ai/tram';
    const branch = this.params.branch ?? 'main';
    const workflow = this.params.workflow ?? 'build-knowledge-base.yml';

    // Ensure cached Orama databases
    let cache: OramaCache;
    try {
      cache = await ensureOramaCache(repo, branch, workflow, this.debugLogger);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unknown error downloading knowledge base';
      return {
        llmContent: `Error downloading knowledge base: ${msg}.\n\nThe knowledge base artifacts may not exist yet. Ensure the GitHub Actions workflow "${workflow}" has run successfully in the repository "${repo}" on branch "${branch}".`,
        returnDisplay: `Error: ${msg}`,
      };
    }

    switch (this.params.action) {
      case 'browse':
        return this.handleBrowse(cache);
      case 'read':
        return this.handleRead(cache);
      case 'search':
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
        llmContent: 'Knowledge base catalog not found in cache.',
        returnDisplay: 'Catalog not found',
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
      '',
    ];

    for (const doc of pageItems) {
      lines.push(`**${doc.title}** (id: \`${doc.id}\`)`);
      lines.push(`  ${doc.description}`);
      lines.push('');
    }

    if (page < totalPages) {
      lines.push(`_Use page=${page + 1} to see more._`);
    }

    const content = lines.join('\n');
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
        returnDisplay: 'Missing docId',
      };
    }

    const docsDb = cache.docsDb;
    if (!docsDb) {
      return {
        llmContent: 'Docs database not found in cache.',
        returnDisplay: 'Docs DB not found',
      };
    }

    const doc = getByID(docsDb, this.params.docId) as {
      id: string;
      title: string;
      path: string;
      content: string;
    } | undefined;

    if (!doc) {
      return {
        llmContent: `Document "${this.params.docId}" not found. Use "browse" to see available documents.`,
        returnDisplay: `Document not found: ${this.params.docId}`,
      };
    }

    const content = [
      `# ${doc.title}`,
      `_ID: ${this.params.docId} | Path: ${doc.path}_`,
      '',
      doc.content,
    ].join('\n');

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
        returnDisplay: 'Missing query',
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
          '[KnowledgeSearch] SiliconFlow API key invalid or unreachable, falling back to full-text search',
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
      this.debugLogger.debug('[KnowledgeSearch] RAG mode: embedding query...');
      const queryVec = await getEmbedding(query, apiKey);

      // 2. Vector search via Orama (retrieve 2×topK candidates)
      const vectorResults = searchVector(vectorsDb, {
        mode: 'vector',
        vector: {
          value: new Float32Array(queryVec),
          property: 'embedding',
        },
        limit: DEFAULT_TOP_K * 2,
        includeVectors: false,
      } as any) as { count: number; hits: Array<{ id: string; score: number; document: Record<string, unknown> }> };

      if (vectorResults.count === 0) {
        return {
          llmContent: `No results found for "${query}" using RAG search.`,
          returnDisplay: `RAG search: 0 results for "${query}"`,
        };
      }

      // 3. Rerank with SiliconFlow
      this.debugLogger.debug(
        `[KnowledgeSearch] Reranking ${vectorResults.hits.length} candidates...`,
      );

      let finalHits = vectorResults.hits;

      try {
        const documents = vectorResults.hits.map(
          (h) =>
            ((h.document['heading'] as string) ? `${h.document['heading']}\n` : '') +
            (h.document['text'] as string),
        );
        const reranked = await rerankResults(query, documents, apiKey, DEFAULT_TOP_K);
        finalHits = reranked.map((r) => ({
          ...vectorResults.hits[r.index],
          score: r.relevance_score,
        }));
      } catch (err) {
        this.debugLogger.warn(
          '[KnowledgeSearch] Reranker failed, using vector scores',
          err,
        );
        finalHits = vectorResults.hits.slice(0, DEFAULT_TOP_K);
      }

      // 4. Deduplicate by docId and format
      const docChunks = new Map<
        string,
        { title: string; path: string; chunks: Array<{ heading: string; text: string; score: number }> }
      >();

      for (const hit of finalHits) {
        const docId = hit.document['docId'] as string;
        const existing = docChunks.get(docId);
        const chunkInfo = {
          heading: hit.document['heading'] as string,
          text: hit.document['text'] as string,
          score: hit.score,
        };

        if (existing) {
          existing.chunks.push(chunkInfo);
        } else {
          docChunks.set(docId, {
            title: hit.document['title'] as string,
            path: hit.document['path'] as string,
            chunks: [chunkInfo],
          });
        }
      }

      const lines = [
        `🔍 RAG Search Results for "${query}" (${finalHits.length} chunks from ${docChunks.size} documents)`,
        `_Mode: Vector search (${EMBEDDING_MODEL}) + Reranking (${RERANKER_MODEL})_`,
        '',
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
          lines.push('');
        }
        lines.push('---');
      }

      lines.push(
        '\n_Use `action: "read"` with a document ID to read the full document._',
      );

      const content = lines.join('\n');
      return {
        llmContent: content,
        returnDisplay: `RAG search: ${finalHits.length} results for "${query}"`,
      };
    } catch (err) {
      this.debugLogger.warn(
        '[KnowledgeSearch] RAG search failed, falling back to full-text',
        err,
      );
      return this.handleFullTextSearch(cache);
    }
  }

  private handleFullTextSearch(cache: OramaCache): ToolResult {
    const docsDb = cache.docsDb;
    if (!docsDb) {
      return {
        llmContent: 'Docs database not found in cache.',
        returnDisplay: 'Docs DB not found',
      };
    }

    const query = this.params.query!;

    // Orama full-text search (BM25)
    const results = search(docsDb, {
      term: query,
      properties: ['title', 'description', 'content'] as any,
      limit: DEFAULT_TOP_K,
    } as any) as { count: number; hits: Array<{ id: string; score: number; document: Record<string, unknown> }> };

    if (results.count === 0) {
      return {
        llmContent: `No results found for "${query}" using full-text search.`,
        returnDisplay: `Full-text search: 0 results for "${query}"`,
      };
    }

    const lines = [
      `🔍 Full-Text Search Results for "${query}" (${results.hits.length} documents)`,
      '_Mode: Orama BM25 full-text search_',
      '',
    ];

    for (const hit of results.hits) {
      const doc = hit.document;
      lines.push(`## ${doc['title']} (id: \`${hit.id}\`)`);
      lines.push(`_Score: ${hit.score.toFixed(4)} | Path: ${doc['path']}_`);
      lines.push(doc['description'] as string);

      // Show a relevant snippet (first 500 chars of content)
      const snippet = (doc['content'] as string).substring(0, 500).trim();
      if (snippet) {
        lines.push('');
        lines.push(`> ${snippet.replace(/\n/g, '\n> ')}...`);
      }
      lines.push('');
      lines.push('---');
    }

    lines.push(
      '\n_Use `action: "read"` with a document ID to read the full document._',
    );

    const content = lines.join('\n');
    return {
      llmContent: content,
      returnDisplay: `Full-text search: ${results.hits.length} results for "${query}"`,
    };
  }
}

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

  protected override createInvocation(params: KnowledgeSearchParams): KnowledgeSearchInvocation {
    return new KnowledgeSearchInvocation(this.config, params);
  }
}
