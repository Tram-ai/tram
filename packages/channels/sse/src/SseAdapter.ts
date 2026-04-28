import * as http from "http";
import { randomUUID } from "crypto";
import { ChannelBase } from "@tram-ai/channel-base";
import type {
  ChannelConfig,
  ChannelBaseOptions,
  Envelope,
  AcpBridge,
} from "@tram-ai/channel-base";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: number;
  senderName?: string;
}

export class SseChannel extends ChannelBase {
  private server: http.Server | null = null;
  private clients: Map<string, http.ServerResponse> = new Map();
  // 内存化存储持久对话列表与历史
  private histories: Map<string, ChatMessage[]> = new Map();

  constructor(
    name: string,
    config: ChannelConfig,
    bridge: AcpBridge,
    options?: ChannelBaseOptions,
  ) {
    super(name, config, bridge, options);

    const sseConfig = config as Record<string, any>;
    if (!sseConfig["port"]) {
      throw new Error(`Channel "${name}" requires 'port' for the SSE server.`);
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const sseConfig = this.config as Record<string, any>;
        const port = Number(sseConfig["port"]);

        this.server = http.createServer((req, res) => {
          this.handleRequest(req, res);
        });

        this.server.listen(port, () => {
          process.stderr.write(
            `[SSE:${this.name}] Server listening on port ${port}.\n`,
          );
          resolve();
        });

        this.server.on("error", (err) => {
          process.stderr.write(
            `[SSE:${this.name}] Server error: ${err.message}\n`,
          );
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // Add basic CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-client-id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    
    // 1. Establish SSE Connection
    if (req.method === "GET" && url.pathname === "/events") {
      const clientId =
        req.headers["x-client-id"]?.toString() ||
        url.searchParams.get("clientId") ||
        req.socket.remoteAddress ||
        "unknown";

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Send initial heartbeat to establish immediate connection
      res.write(":\n\n");

      this.clients.set(clientId, res);

      req.on("close", () => {
        this.clients.delete(clientId);
      });
      return;
    }

    // 2. Query Capabilities (GET /chats, GET /history)
    if (req.method === "GET" && url.pathname === "/chats") {
      const chats = Array.from(this.histories.keys());
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ type: "chatList", data: chats }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/history") {
      const targetChatId = url.searchParams.get("chatId") || "";
      const history = this.histories.get(targetChatId) || [];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ type: "history", chatId: targetChatId, data: history }));
      return;
    }

    // 3. Receive User Message (POST)
    if (req.method === "POST" && url.pathname === "/message") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        try {
          const clientId =
            req.headers["x-client-id"]?.toString() ||
            url.searchParams.get("clientId") ||
            req.socket.remoteAddress ||
            "unknown";

          let parsedMessage: any;
          try {
            parsedMessage = JSON.parse(body);
          } catch {
            parsedMessage = { text: body };
          }

          const envelope: Envelope = {
            channelName: this.name,
            senderId: clientId, // use clientId as senderId
            senderName: parsedMessage.senderName || clientId,
            chatId: parsedMessage.chatId || clientId,
            text: parsedMessage.text || "",
            isGroup: Boolean(parsedMessage.isGroup),
            isMentioned: Boolean(parsedMessage.isMentioned),
            isReplyToBot: Boolean(parsedMessage.isReplyToBot),
            referencedText: parsedMessage.referencedText,
          };

          // 将用户的提问内容追加到本对话的历史中
          if (!this.histories.has(envelope.chatId)) {
            this.histories.set(envelope.chatId, []);
          }
          this.histories.get(envelope.chatId)!.push({
            id: envelope.messageId || randomUUID(),
            role: "user",
            text: envelope.text,
            timestamp: Date.now(),
            senderName: envelope.senderName
          });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "success" }));

          // Process the inbound message
          this.handleInbound(envelope).catch((err) => {
            process.stderr.write(
              `[SSE:${this.name}] Error handling message: ${err}\n`,
            );
            this.sendMessage(
              envelope.chatId,
              "Sorry, something went wrong processing your message.",
            ).catch(() => {});
          });
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "error", message: String(err) }));
        }
      });
      return;
    }

    // 404 for other routes
    res.writeHead(404);
    res.end("Not Found");
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    // 机器人返回全量结果时存入聊天历史表
    if (!this.histories.has(chatId)) {
      this.histories.set(chatId, []);
    }
    this.histories.get(chatId)!.push({
      id: randomUUID(),
      role: "bot",
      text,
      timestamp: Date.now(),
      senderName: this.name
    });

    const res = this.clients.get(chatId);
    if (!res) {
      process.stderr.write(
        `[SSE:${this.name}] No SSE connection for chatId ${chatId}, cannot send.\n`,
      );
      return;
    }

    try {
      const dataStr = JSON.stringify({ text, isFinal: true });
      res.write(`data: ${dataStr}\n\n`);
    } catch (err) {
      process.stderr.write(
        `[SSE:${this.name}] Failed to write final SSE chunk for ${chatId}: ${err}\n`,
      );
    }
  }

  protected override onResponseChunk(
    chatId: string,
    chunk: string,
    _sessionId: string,
  ): void {
    const res = this.clients.get(chatId);
    if (!res) return;

    try {
      const dataStr = JSON.stringify({ chunk, isFinal: false });
      res.write(`data: ${dataStr}\n\n`);
    } catch (err) {
      // 忽略分段期间的网络写入异常
    }
  }

  disconnect(): void {
    // Close all connected clients
    for (const res of this.clients.values()) {
      try {
        res.end();
      } catch (e) {}
    }
    this.clients.clear();

    if (this.server) {
      this.server.close((err) => {
        if (err) {
          process.stderr.write(
            `[SSE:${this.name}] Error closing server: ${err.message}\n`,
          );
        } else {
          process.stderr.write(`[SSE:${this.name}] Disconnected.\n`);
        }
      });
      this.server = null;
    }
  }
}
