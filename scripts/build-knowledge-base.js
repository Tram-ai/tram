#!/usr/bin/env node

/**
 * Knowledge Base Builder (Orama)
 *
 * Reads markdown documents from a directory and builds an offline Orama vector
 * database. Output files (in OUTPUT_DIR):
 *   1. catalog.json      — titles + short descriptions for browsing
 *   2. docs-db.json      — Orama serialised DB for full-text search + reading
 *   3. vectors-db.json   — Orama serialised DB with embeddings for vector search
 *                           (only generated when SILICONFLOW_API_KEY is set)
 *
 * Environment variables:
 *   DOCS_DIR             — source directory (default: "knowledge")
 *   SILICONFLOW_API_KEY  — if set, embeddings are generated
 *   OUTPUT_DIR           — output directory (default: "knowledge-base-output")
 *   EMBED_MIN_INTERVAL_MS      — minimum spacing between embedding requests
 *                                (default: 5000)
 *   EMBED_MAX_RETRIES          — retries for rate limit / transient errors
 *                                (default: 8)
 *   EMBED_RETRY_BASE_DELAY_MS  — initial retry backoff delay (default: 5000)
 *   EMBED_RETRY_MAX_DELAY_MS   — maximum retry backoff delay (default: 60000)
 */

const fs = require("fs");
const path = require("path");

function readPositiveIntEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DOCS_DIR = process.env.DOCS_DIR || "knowledge";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "knowledge-base-output";
const API_KEY = process.env.SILICONFLOW_API_KEY || "sk-ycwqerwvhazoynbtbnslaijicnrndseggticxcfskimkaway";
const EMBEDDING_MODEL = "BAAI/bge-m3";
const EMBEDDING_DIM = 1024;
const SILICONFLOW_BASE = "https://api.siliconflow.cn/v1";
const CHUNK_SIZE = 500; // characters per chunk
const CHUNK_OVERLAP = 100;
const EMBED_BATCH_SIZE = 16; // batch size for embedding API calls
const EMBED_MIN_INTERVAL_MS = readPositiveIntEnv("EMBED_MIN_INTERVAL_MS", 5000);
const EMBED_MAX_RETRIES = readPositiveIntEnv("EMBED_MAX_RETRIES", 8);
const EMBED_RETRY_BASE_DELAY_MS = readPositiveIntEnv(
  "EMBED_RETRY_BASE_DELAY_MS",
  5000,
);
const EMBED_RETRY_MAX_DELAY_MS = readPositiveIntEnv(
  "EMBED_RETRY_MAX_DELAY_MS",
  60000,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line
        .slice(idx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      meta[key] = val;
    }
  }
  return { meta, body: match[2] };
}

function extractTitle(meta, body, filePath) {
  if (meta.title) return meta.title;
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return path.basename(filePath, ".md");
}

function extractDescription(meta, body) {
  if (meta.description) return meta.description;
  // Take first non-empty, non-heading paragraph
  const lines = body.split("\n");
  let buf = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (buf) return buf.slice(0, 200);
      continue;
    }
    if (trimmed.startsWith("#")) {
      if (buf) return buf.slice(0, 200);
      continue;
    }
    buf += (buf ? " " : "") + trimmed;
    if (buf.length >= 200) return buf.slice(0, 200);
  }
  return buf.slice(0, 200) || "(no description)";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(value) {
  if (!value) return null;

  const seconds = Number.parseInt(value, 10);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) return null;
  return Math.max(0, retryAt - Date.now());
}

function isRetryableEmbeddingError(status, errText) {
  if (status === 408 || status === 409 || status === 429 || status >= 500) {
    return true;
  }

  if (status !== 403) return false;

  const normalized = String(errText).toLowerCase();
  return /(rate|rpm|too many requests|limit exceeded|quota)/.test(normalized);
}

function getRetryDelayMs(attempt, retryAfterMs) {
  if (retryAfterMs != null) {
    return Math.max(retryAfterMs, EMBED_RETRY_BASE_DELAY_MS);
  }

  const exponentialDelay = Math.min(
    EMBED_RETRY_MAX_DELAY_MS,
    EMBED_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
  );
  const jitterMs = Math.floor(Math.random() * 1000);
  return exponentialDelay + jitterMs;
}

let lastEmbeddingRequestAt = 0;

async function waitForEmbeddingSlot() {
  if (EMBED_MIN_INTERVAL_MS <= 0) return;

  const waitMs = lastEmbeddingRequestAt + EMBED_MIN_INTERVAL_MS - Date.now();
  if (waitMs > 0) {
    console.log(
      `  Waiting ${waitMs}ms before next embedding request to respect rate limits...`,
    );
    await sleep(waitMs);
  }

  lastEmbeddingRequestAt = Date.now();
}

function normalizeEmbeddingVector(vector, chunkId) {
  const normalized = Array.isArray(vector) ? vector : Array.from(vector || []);

  if (normalized.length !== EMBEDDING_DIM) {
    throw new Error(
      `Embedding dimension mismatch for chunk ${chunkId}: expected ${EMBEDDING_DIM}, got ${normalized.length}`,
    );
  }

  return normalized;
}

/**
 * Chunk a document body by headings first, then by character length.
 * Each chunk carries context about which heading it belongs to.
 */
function chunkDocument(body, docId) {
  const sections = [];
  let currentHeading = "";
  let currentText = "";

  for (const line of body.split("\n")) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      if (currentText.trim()) {
        sections.push({ heading: currentHeading, text: currentText.trim() });
      }
      currentHeading = headingMatch[2].trim();
      currentText = "";
    } else {
      currentText += line + "\n";
    }
  }
  if (currentText.trim()) {
    sections.push({ heading: currentHeading, text: currentText.trim() });
  }

  const chunks = [];
  let chunkIdx = 0;

  for (const section of sections) {
    const text = section.text;
    if (text.length <= CHUNK_SIZE) {
      chunks.push({
        id: `${docId}#${chunkIdx}`,
        heading: section.heading,
        text,
      });
      chunkIdx++;
    } else {
      // Split long sections into overlapping chunks
      for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        const slice = text.slice(i, i + CHUNK_SIZE);
        if (slice.trim()) {
          chunks.push({
            id: `${docId}#${chunkIdx}`,
            heading: section.heading,
            text: slice.trim(),
          });
          chunkIdx++;
        }
      }
    }
  }

  // If document had no headings, treat entire body as chunks
  if (chunks.length === 0 && body.trim()) {
    const text = body.trim();
    for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      const slice = text.slice(i, i + CHUNK_SIZE);
      if (slice.trim()) {
        chunks.push({
          id: `${docId}#${chunkIdx}`,
          heading: "",
          text: slice.trim(),
        });
        chunkIdx++;
      }
    }
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// SiliconFlow Embedding API
// ---------------------------------------------------------------------------

async function embedBatch(texts) {
  const totalAttempts = EMBED_MAX_RETRIES + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    await waitForEmbeddingSlot();

    let resp;
    try {
      resp = await fetch(`${SILICONFLOW_BASE}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: texts,
          encoding_format: "float",
        }),
      });
    } catch (err) {
      if (attempt === totalAttempts) {
        throw err;
      }

      const delayMs = getRetryDelayMs(attempt);
      console.warn(
        `  Embedding request failed (${err.message}). Retrying in ${delayMs}ms...`,
      );
      await sleep(delayMs);
      continue;
    }

    if (resp.ok) {
      const json = await resp.json();
      // Sort by index to keep order
      const sorted = json.data.sort((a, b) => a.index - b.index);
      return sorted.map((d) => d.embedding);
    }

    const errText = await resp.text();
    const retryable = isRetryableEmbeddingError(resp.status, errText);
    if (!retryable || attempt === totalAttempts) {
      throw new Error(`Embedding API ${resp.status}: ${errText}`);
    }

    const retryAfterMs = parseRetryAfterMs(resp.headers.get("retry-after"));
    const delayMs = getRetryDelayMs(attempt, retryAfterMs);
    console.warn(
      `  Embedding API ${resp.status} on attempt ${attempt}/${totalAttempts}. Retrying in ${delayMs}ms...`,
    );
    await sleep(delayMs);
  }

  throw new Error("Embedding request exhausted retries unexpectedly");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Dynamic ESM import for Orama (pure JS vector database)
  const { create, insert, save } = await import("@orama/orama");

  console.log(`📂 Reading docs from: ${DOCS_DIR}`);

  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Error: directory "${DOCS_DIR}" does not exist`);
    process.exit(1);
  }

  // Recursively find all .md files
  function walk(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...walk(full));
      } else if (entry.name.endsWith(".md")) {
        results.push(full);
      }
    }
    return results;
  }

  const mdFiles = walk(DOCS_DIR);
  console.log(`📄 Found ${mdFiles.length} markdown files`);

  if (mdFiles.length === 0) {
    console.warn("No markdown files found. Exiting.");
    process.exit(0);
  }

  const documents = [];
  const allChunks = [];

  for (const filePath of mdFiles) {
    const raw = fs.readFileSync(filePath, "utf8");
    const { meta, body } = extractFrontmatter(raw);
    const relPath = path.relative(DOCS_DIR, filePath).replace(/\\/g, "/");
    const docId = relPath.replace(/\.md$/, "").replace(/\//g, "-");
    const title = extractTitle(meta, body, filePath);
    const description = extractDescription(meta, body);

    documents.push({
      id: docId,
      title,
      description,
      path: relPath,
      content: body,
    });

    const chunks = chunkDocument(body, docId);
    for (const chunk of chunks) {
      allChunks.push({
        ...chunk,
        docId,
        title,
        path: relPath,
      });
    }
  }

  console.log(
    `🧩 Generated ${allChunks.length} chunks from ${documents.length} documents`,
  );

  // Ensure output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // --- Build catalog.json ---
  const catalog = {
    version: 1,
    buildTime: new Date().toISOString(),
    totalDocuments: documents.length,
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      path: d.path,
    })),
  };
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "catalog.json"),
    JSON.stringify(catalog, null, 2),
    "utf8",
  );
  console.log("✅ catalog.json written");

  // --- Build Orama docs DB (full-text search + document reading) ---
  const docsDb = create({
    schema: {
      title: "string",
      description: "string",
      path: "string",
      content: "string",
    },
  });

  for (const doc of documents) {
    insert(docsDb, {
      id: doc.id,
      title: doc.title,
      description: doc.description,
      path: doc.path,
      content: doc.content,
    });
  }

  const docsRawData = save(docsDb);
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "docs-db.json"),
    JSON.stringify(docsRawData),
    "utf8",
  );
  console.log(`✅ docs-db.json written (${documents.length} documents)`);

  // --- Build Orama vectors DB (if API key available) ---
  if (API_KEY) {
    console.log("🔑 SiliconFlow API key found, generating embeddings...");
    console.log(
      `⏱️  Embedding rate-limit guard: min interval ${EMBED_MIN_INTERVAL_MS}ms, max retries ${EMBED_MAX_RETRIES}`,
    );

    const chunkTexts = allChunks.map(
      (c) => (c.heading ? `${c.heading}\n` : "") + c.text,
    );

    const allVectors = [];
    for (let i = 0; i < chunkTexts.length; i += EMBED_BATCH_SIZE) {
      const batch = chunkTexts.slice(i, i + EMBED_BATCH_SIZE);
      console.log(
        `  Embedding batch ${Math.floor(i / EMBED_BATCH_SIZE) + 1}/${Math.ceil(chunkTexts.length / EMBED_BATCH_SIZE)} (${batch.length} chunks)`,
      );
      const vectors = await embedBatch(batch);
      allVectors.push(...vectors);
    }

    const vectorsDb = create({
      schema: {
        docId: "string",
        title: "string",
        heading: "string",
        path: "string",
        text: "string",
        embedding: `vector[${EMBEDDING_DIM}]`,
      },
    });

    for (let i = 0; i < allChunks.length; i++) {
      const chunk = allChunks[i];
      const embedding = normalizeEmbeddingVector(allVectors[i], chunk.id);
      insert(vectorsDb, {
        id: chunk.id,
        docId: chunk.docId,
        title: chunk.title,
        heading: chunk.heading,
        path: chunk.path,
        text: chunk.text,
        embedding,
      });
    }

    const vectorsRawData = save(vectorsDb);
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "vectors-db.json"),
      JSON.stringify(vectorsRawData),
      "utf8",
    );
    console.log(
      `✅ vectors-db.json written (${allVectors.length} vectors, ${EMBEDDING_DIM}d)`,
    );
  } else {
    console.log("⚠️  No SILICONFLOW_API_KEY set, skipping vector generation");
  }

  console.log("🎉 Knowledge base build complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
