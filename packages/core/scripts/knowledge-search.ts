import { createInterface } from "node:readline/promises";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import process from "node:process";
import type { Config } from "../src/config/config.js";
import {
  KnowledgeSearchTool,
  type KnowledgeSearchParams,
} from "../src/tools/knowledge-search.js";

type SearchMode = "auto" | "full-text" | "rag";

interface RunOptions {
  searchMode: SearchMode;
  showStatus: boolean;
}

type ParsedArgs =
  | { mode: "interactive"; options: RunOptions }
  | { mode: "help" }
  | { mode: "run"; params: KnowledgeSearchParams; options: RunOptions };

const defaultOptions: RunOptions = {
  searchMode: "auto",
  showStatus: false,
};

const KNOWLEDGE_CACHE_KEY = "Tram-ai__tram";

const usage = [
  "Knowledge search CLI",
  "",
  "Usage:",
  "  npm run knowledge-search -- \"your query\"",
  "  npm run knowledge-search -- --mode full-text --status \"your query\"",
  "  npm run knowledge-search -- --search \"your query\"",
  "  npm run knowledge-search -- --browse [page]",
  "  npm run knowledge-search -- --read <docId>",
  "  npm run knowledge-search:full-text -- \"your query\"",
  "  npm run knowledge-search:rag -- \"your query\"",
  "",
  "Options:",
  "  --mode <auto|full-text|rag>  choose how search mode is selected",
  "  --status                     print cache/api-key diagnostics before searching",
  "",
  "Interactive commands:",
  "  any text          search with that text",
  "  :search <query>   search explicitly",
  "  :browse [page]    browse catalog entries",
  "  :read <docId>     read one document",
  "  :help             show this help",
  "  :quit             exit",
].join("\n");

function parseSearchMode(rawValue: string | undefined): SearchMode {
  if (
    rawValue === "auto" ||
    rawValue === "full-text" ||
    rawValue === "rag"
  ) {
    return rawValue;
  }

  throw new Error('Expected --mode to be one of: auto, full-text, rag');
}

function createTool(searchMode: SearchMode): KnowledgeSearchTool {
  return new KnowledgeSearchTool({
    getSiliconFlowApiKey: () => {
      if (searchMode === "full-text") {
        return undefined;
      }

      return process.env["SILICONFLOW_API_KEY"];
    },
  } as Config);
}

function getKnowledgeCacheStatus() {
  const homeDir = os.homedir();
  const cacheDir = path.join(homeDir, ".tram", "knowledge-cache", KNOWLEDGE_CACHE_KEY);

  return {
    homeDir,
    cacheDir,
    hasCatalog: fs.existsSync(path.join(cacheDir, "catalog.json")),
    hasDocsDb: fs.existsSync(path.join(cacheDir, "docs-db.json")),
    hasVectorsDb: fs.existsSync(path.join(cacheDir, "vectors-db.json")),
    hasSiliconFlowApiKey: Boolean(process.env["SILICONFLOW_API_KEY"]),
  };
}

function describeExpectedMode(options: RunOptions): string {
  const status = getKnowledgeCacheStatus();

  if (options.searchMode === "full-text") {
    return "full-text (forced by script)";
  }

  if (options.searchMode === "rag") {
    if (!status.hasSiliconFlowApiKey) {
      return "rag requested, but SILICONFLOW_API_KEY is missing";
    }
    if (!status.hasVectorsDb) {
      return "rag requested, but vectors-db.json is missing";
    }
    return "rag, if the API key is valid and reachable";
  }

  if (status.hasSiliconFlowApiKey && status.hasVectorsDb) {
    return "rag, if the API key is valid and reachable";
  }

  return "full-text (auto fallback)";
}

function printStatus(options: RunOptions): void {
  const status = getKnowledgeCacheStatus();

  console.log("[knowledge-search status]");
  console.log(`requested mode: ${options.searchMode}`);
  console.log(`expected behavior: ${describeExpectedMode(options)}`);
  console.log(`home: ${status.homeDir}`);
  console.log(`cache: ${status.cacheDir}`);
  console.log(`catalog.json: ${status.hasCatalog ? "yes" : "no"}`);
  console.log(`docs-db.json: ${status.hasDocsDb ? "yes" : "no"}`);
  console.log(`vectors-db.json: ${status.hasVectorsDb ? "yes" : "no"}`);
  console.log(`SILICONFLOW_API_KEY: ${status.hasSiliconFlowApiKey ? "set" : "unset"}`);
  console.log("");
}

function validateRequestedMode(options: RunOptions): void {
  if (options.searchMode !== "rag") {
    return;
  }

  const status = getKnowledgeCacheStatus();
  if (!status.hasSiliconFlowApiKey) {
    throw new Error(
      "Forced RAG mode requires SILICONFLOW_API_KEY in the current shell environment",
    );
  }
  if (!status.hasVectorsDb) {
    throw new Error(
      `Forced RAG mode requires vectors-db.json in ${status.cacheDir}`,
    );
  }
}

function detectActualSearchMode(returnDisplay: string): SearchMode | null {
  if (returnDisplay.startsWith("RAG search:")) {
    return "rag";
  }
  if (returnDisplay.startsWith("Knowledge search:")) {
    return "full-text";
  }

  return null;
}

function parsePositiveInt(
  rawValue: string | undefined,
  flagName: string,
): number | undefined {
  if (!rawValue) {
    return undefined;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${flagName} must be a positive integer`);
  }

  return parsed;
}

function parseCliArgs(argv: string[]): ParsedArgs {
  const options: RunOptions = { ...defaultOptions };
  const remainingArgs: string[] = [];

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      return { mode: "help" };
    }

    if (arg === "--status") {
      options.showStatus = true;
      continue;
    }

    if (arg === "--mode") {
      options.searchMode = parseSearchMode(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--mode=")) {
      options.searchMode = parseSearchMode(arg.slice("--mode=".length));
      continue;
    }

    remainingArgs.push(arg);
  }

  if (remainingArgs.length === 0) {
    return { mode: "interactive", options };
  }

  const [firstArg, ...restArgs] = remainingArgs;

  if (firstArg === "--browse") {
    return {
      mode: "run",
      options,
      params: {
        action: "browse",
        page: parsePositiveInt(restArgs[0], "--browse"),
      },
    };
  }

  if (firstArg === "--read") {
    const docId = restArgs.join(" ").trim();
    if (!docId) {
      throw new Error("--read requires a document id");
    }

    return {
      mode: "run",
      options,
      params: {
        action: "read",
        docId,
      },
    };
  }

  if (firstArg === "--search") {
    const query = restArgs.join(" ").trim();
    if (!query) {
      throw new Error("--search requires a query");
    }

    return {
      mode: "run",
      options,
      params: {
        action: "search",
        query,
      },
    };
  }

  return {
    mode: "run",
    options,
    params: {
      action: "search",
      query: remainingArgs.join(" ").trim(),
    },
  };
}

function parseInteractiveInput(input: string): KnowledgeSearchParams | "help" | "quit" {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Enter a query or use :help");
  }

  if (trimmed === ":help") {
    return "help";
  }

  if (trimmed === ":quit" || trimmed === ":exit") {
    return "quit";
  }

  if (trimmed === ":browse") {
    return { action: "browse" };
  }

  if (trimmed.startsWith(":browse ")) {
    return {
      action: "browse",
      page: parsePositiveInt(trimmed.slice(8).trim(), ":browse"),
    };
  }

  if (trimmed.startsWith(":read ")) {
    const docId = trimmed.slice(6).trim();
    if (!docId) {
      throw new Error(":read requires a document id");
    }
    return { action: "read", docId };
  }

  if (trimmed.startsWith(":search ")) {
    const query = trimmed.slice(8).trim();
    if (!query) {
      throw new Error(":search requires a query");
    }
    return { action: "search", query };
  }

  return { action: "search", query: trimmed };
}

async function runSearch(
  params: KnowledgeSearchParams,
  options: RunOptions,
): Promise<void> {
  validateRequestedMode(options);

  if (options.showStatus) {
    printStatus(options);
  }

  const tool = createTool(options.searchMode);
  const result = await tool.build(params).execute(new AbortController().signal);
  const actualMode =
    params.action === "search"
      ? detectActualSearchMode(result.returnDisplay)
      : null;

  console.log("");
  if (actualMode) {
    console.log(
      `[knowledge-search mode] requested=${options.searchMode} actual=${actualMode}`,
    );
  }
  console.log(result.returnDisplay);
  console.log("");
  console.log(result.llmContent);
  console.log("");

  if (options.searchMode === "rag" && actualMode !== null && actualMode !== "rag") {
    console.log(
      "[knowledge-search warning] RAG was requested but the runtime fell back to full-text search.",
    );
    console.log("");
  }
}

async function runInteractive(options: RunOptions): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(usage);
  console.log("");
  printStatus(options);

  try {
    while (true) {
      const input = await rl.question("knowledge-search> ");

      try {
        const parsed = parseInteractiveInput(input);
        if (parsed === "help") {
          console.log(usage);
          console.log("");
          continue;
        }
        if (parsed === "quit") {
          break;
        }

        await runSearch(parsed, options);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        console.log("");
      }
    }
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const parsedArgs = parseCliArgs(process.argv.slice(2));

  if (parsedArgs.mode === "help") {
    console.log(usage);
    return;
  }

  if (parsedArgs.mode === "interactive") {
    await runInteractive(parsedArgs.options);
    return;
  }

  await runSearch(parsedArgs.params, parsedArgs.options);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});