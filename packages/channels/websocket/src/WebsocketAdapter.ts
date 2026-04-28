import { WebSocketServer, WebSocket } from "ws";
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

export class WebsocketChannel extends ChannelBase {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  // 在内存中持久化存储各聊天的历史记录
  private histories: Map<string, ChatMessage[]> = new Map();

  constructor(
    name: string,
    config: ChannelConfig,
    bridge: AcpBridge,
    options?: ChannelBaseOptions,
  ) {
    super(name, config, bridge, options);

    const wsConfig = config as Record<string, any>;
    if (!wsConfig["port"]) {
      throw new Error(
        `Channel "${name}" requires 'port' for the WebSocket server.`,
      );
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsConfig = this.config as Record<string, any>;
        const port = Number(wsConfig["port"]);
        this.wss = new WebSocketServer({ port });

        this.wss.on("listening", () => {
          process.stderr.write(`[WebSocket:${this.name}] Server listening on port ${port}.\n`);
          resolve();
        });

        this.wss.on("error", (err) => {
          process.stderr.write(`[WebSocket:${this.name}] Server error: ${err.message}\n`);
          reject(err);
        });

        this.wss.on("connection", (ws, request) => {
          const clientId = request.headers["x-client-id"]?.toString() || request.socket.remoteAddress || "unknown";
          this.clients.set(clientId, ws);

          ws.on("message", (data) => {
            this.handleMessage(clientId, data);
          });

          ws.on("close", () => {
            this.clients.delete(clientId);
          });

          ws.on("error", (err) => {
            process.stderr.write(`[WebSocket:${this.name}] Client error from ${clientId}: ${err.message}\n`);
            this.clients.delete(clientId);
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleMessage(clientId: string, data: any) {
    try {
      const messageStr = data.toString();
      let parsedMessage: any;
      
      try {
        parsedMessage = JSON.parse(messageStr);
      } catch {
        // Assume plain text if JSON parsing fails
        parsedMessage = { text: messageStr };
      }

      const chatId = parsedMessage.chatId || clientId;

      // === 新增：支持查询聊天列表与历史记录的系统指令 ===
      if (parsedMessage.action === "getChats") {
        const chats = Array.from(this.histories.keys());
        const ws = this.clients.get(clientId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "chatList", data: chats }));
        }
        return;
      }
      
      if (parsedMessage.action === "getHistory") {
        const targetChatId = parsedMessage.targetChatId || chatId;
        const history = this.histories.get(targetChatId) || [];
        const ws = this.clients.get(clientId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "history", chatId: targetChatId, data: history }));
        }
        return;
      }
      // ============================================

      const envelope: Envelope = {
        channelName: this.name,
        senderId: clientId, // we use clientId as senderId
        senderName: parsedMessage.senderName || clientId,
        chatId: chatId,
        text: parsedMessage.text || "",
        isGroup: Boolean(parsedMessage.isGroup),
        isMentioned: Boolean(parsedMessage.isMentioned),
        isReplyToBot: Boolean(parsedMessage.isReplyToBot),
        referencedText: parsedMessage.referencedText,
      };

      // 1. 记录用户的提问到内存中
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

      this.handleInbound(envelope).catch((err) => {
        process.stderr.write(
          `[WebSocket:${this.name}] Error handling message: ${err}\n`,
        );
        this.sendMessage(
          envelope.chatId,
          "Sorry, something went wrong processing your message.",
        ).catch(() => {});
      });
    } catch (err) {
      process.stderr.write(
        `[WebSocket:${this.name}] Failed to process message: ${err}\n`,
      );
    }
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    // 2. 收到模型的最终完整回复，也存入历史表
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

    // We assume chatId maps to our clientId
    const ws = this.clients.get(chatId);
    if (!ws) {
      process.stderr.write(
        `[WebSocket:${this.name}] No connection for chatId ${chatId}, cannot send.\n`,
      );
      return;
    }

    if (ws.readyState === WebSocket.OPEN) {
      // 发送完整文本，并标记完毕
      ws.send(JSON.stringify({ text, isFinal: true }));
    } else {
      process.stderr.write(
        `[WebSocket:${this.name}] Connection for chatId ${chatId} is not open.\n`,
      );
    }
  }

  protected override onResponseChunk(
    chatId: string,
    chunk: string,
    _sessionId: string,
  ): void {
    const ws = this.clients.get(chatId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      // 推送单个经过思考的模型输出分块
      ws.send(JSON.stringify({ chunk, isFinal: false }));
    }
  }

  disconnect(): void {
    if (this.wss) {
      this.wss.close((err) => {
        if (err) {
          process.stderr.write(
            `[WebSocket:${this.name}] Error closing server: ${err.message}\n`,
          );
        } else {
          process.stderr.write(`[WebSocket:${this.name}] Disconnected.\n`);
        }
      });
      this.wss = null;
    }
  }
}
