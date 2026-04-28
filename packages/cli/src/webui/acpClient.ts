/**
 * Minimal ACP (Agent Client Protocol) client over NDJSON/stdio.
 *
 * Communicates with a `tram --acp` child process using JSON-RPC 2.0
 * messages over stdin/stdout, newline-delimited.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

export type SessionUpdateHandler = (
  method: string,
  params: Record<string, unknown>,
) => void;

export type ServerRequestHandler = (
  params: Record<string, unknown>,
) => Promise<unknown>;

export class AcpClient {
  private child: ChildProcess;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private serverRequestHandlers = new Map<string, ServerRequestHandler>();
  private _sessionId: string | null = null;
  private _disposed = false;

  onNotification: SessionUpdateHandler = () => {};
  onExit: ((code: number | null) => void) | null = null;

  get sessionId(): string | null {
    return this._sessionId;
  }

  constructor(cliPath: string, cwd: string) {
    // Use the same node exe and flags as the current process
    const nodeArgs = process.execArgv.filter(
      (a) => !a.includes("--inspect") && !a.includes("--debug"),
    );
    this.child = spawn(process.execPath, [...nodeArgs, cliPath, "--acp"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd,
      env: { ...process.env },
    });

    const rl = createInterface({ input: this.child.stdout! });
    rl.on("line", (line: string) => {
      if (!line.trim()) return;
      try {
        this.handleMessage(JSON.parse(line));
      } catch {
        // Ignore non-JSON lines (debug output, etc.)
      }
    });

    this.child.on("exit", (code) => {
      this._disposed = true;
      // Reject all pending requests
      for (const [, { reject }] of this.pending) {
        reject(new Error(`ACP process exited with code ${code}`));
      }
      this.pending.clear();
      this.onExit?.(code);
    });

    // Forward stderr for debugging
    this.child.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });
  }

  private handleMessage(msg: Record<string, unknown>): void {
    // Response to a request we sent
    if ("id" in msg && ("result" in msg || "error" in msg)) {
      const id = msg["id"] as number;
      const pending = this.pending.get(id);
      if (pending) {
        this.pending.delete(id);
        if (msg["error"]) {
          const err = msg["error"] as { message?: string; code?: number };
          pending.reject(
            new Error(err.message || `ACP error code ${err.code}`),
          );
        } else {
          pending.resolve(msg["result"]);
        }
      }
      return;
    }

    // Request from server (needs response)
    if ("id" in msg && "method" in msg) {
      const method = msg["method"] as string;
      const params = (msg["params"] || {}) as Record<string, unknown>;
      const id = msg["id"] as number;

      const handler = this.serverRequestHandlers.get(method);
      if (handler) {
        handler(params).then(
          (result) =>
            this.sendRaw({ jsonrpc: "2.0", result, id }),
          (error: Error) =>
            this.sendRaw({
              jsonrpc: "2.0",
              error: { code: -1, message: error.message },
              id,
            }),
        );
      } else {
        // Unknown server request — respond with error
        this.sendRaw({
          jsonrpc: "2.0",
          error: { code: -32601, message: `Method not found: ${method}` },
          id,
        });
      }
      return;
    }

    // Notification from server (no id)
    if ("method" in msg) {
      const method = msg["method"] as string;
      const params = (msg["params"] || {}) as Record<string, unknown>;
      this.onNotification(method, params);
    }
  }

  private sendRaw(msg: Record<string, unknown>): void {
    if (this._disposed) return;
    try {
      this.child.stdin!.write(JSON.stringify(msg) + "\n");
    } catch {
      // Process might have exited
    }
  }

  request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (this._disposed) {
        reject(new Error("ACP client is disposed"));
        return;
      }
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.sendRaw({ jsonrpc: "2.0", method, params: params || {}, id });
    });
  }

  onServerRequest(method: string, handler: ServerRequestHandler): void {
    this.serverRequestHandlers.set(method, handler);
  }

  async initialize(): Promise<Record<string, unknown>> {
    return (await this.request("initialize", {
      protocolVersion: 1,
      clientInfo: { name: "tram-webui", version: "0.1.0" },
      clientCapabilities: {
        fs: {
          readTextFile: true,
          writeTextFile: true,
        },
      },
    })) as Record<string, unknown>;
  }

  async newSession(cwd: string): Promise<Record<string, unknown>> {
    const result = (await this.request("session/new", {
      cwd,
      mcpServers: [],
    })) as Record<string, unknown>;
    this._sessionId = result["sessionId"] as string;
    return result;
  }

  async sendPrompt(text: string): Promise<void> {
    if (!this._sessionId) throw new Error("No active session");
    await this.request("session/prompt", {
      sessionId: this._sessionId,
      prompt: [{ type: "text", text }],
    });
  }

  async cancel(): Promise<void> {
    if (!this._sessionId) return;
    await this.request("session/cancel", { sessionId: this._sessionId });
  }

  destroy(): void {
    this._disposed = true;
    try {
      this.child.kill();
    } catch {
      /* ignore */
    }
  }
}
