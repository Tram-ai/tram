/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getModernStatus,
  getQueryFull,
} from "./mcquery.js";
import { MinecraftServerInfoTool } from "./minecraft-server-info.js";

vi.mock("./mcquery.js", () => ({
  getModernStatus: vi.fn(),
  getLegacyStatus: vi.fn(),
  getBedrockStatus: vi.fn(),
  getQueryFull: vi.fn(),
}));

describe("MinecraftServerInfoTool", () => {
  let tool: MinecraftServerInfoTool;

  beforeEach(() => {
    tool = new MinecraftServerInfoTool();
    vi.clearAllMocks();

    vi.mocked(getModernStatus).mockResolvedValue({
      version: {
        name: {
          tree: [],
          raw: "Paper 1.21.4",
          clean: "Paper 1.21.4",
          html: "",
        },
        protocol: 767,
      },
      players: {
        max: 20,
        online: 1,
        sample: [
          {
            id: "player-1",
            name: {
              tree: [],
              raw: "Steve",
              clean: "Steve",
              html: "",
            },
          },
        ],
      },
      motd: {
        tree: [],
        raw: "Hello",
        clean: "Hello",
        html: "",
      },
      favicon: null,
      srv_record: null,
      mods: null,
      latency_ms: 25,
    });
    vi.mocked(getQueryFull).mockResolvedValue({
      data: {
        map: "world",
        plugins: "Paper on 1.21.4: EssentialsX",
      },
      players: ["Steve"],
    });
  });

  it("should have correct name and properties", () => {
    expect(tool.name).toBe("minecraft_server_info");
    expect(tool.displayName).toBe("MinecraftServerInfo");
    expect(tool.isLmOnly).toBe(true);
    expect(tool.kind).toBe("fetch");
  });

  it("should accept list-versions action", () => {
    const invocation = tool.build({ action: "list-versions" });
    expect(invocation).toBeDefined();
  });

  it("should accept get-server-info action with gameVersion", () => {
    const invocation = tool.build({
      action: "get-server-info",
      gameVersion: "1.20.1",
    });
    expect(invocation).toBeDefined();
  });

  it("should accept get-java-requirements action with gameVersion", () => {
    const invocation = tool.build({
      action: "get-java-requirements",
      gameVersion: "1.20.1",
    });
    expect(invocation).toBeDefined();
  });

  it("should accept get-by-hash action with hash parameter", () => {
    const validHash = "a".repeat(64);
    const invocation = tool.build({ action: "get-by-hash", hash: validHash });
    expect(invocation).toBeDefined();
  });

  it("should accept get-live-status action", () => {
    const invocation = tool.build({
      action: "get-live-status",
      host: "127.0.0.1",
      port: 25565,
    });
    expect(invocation).toBeDefined();
  });

  it("should have proper schema with required action parameter", () => {
    expect(tool.schema).toBeDefined();
    expect(tool.schema.name).toBe("minecraft_server_info");
    expect(tool.schema.parametersJsonSchema).toBeDefined();
    const schema = tool.schema.parametersJsonSchema as {
      required: string[];
    };
    expect(schema.required).toContain("action");
  });

  it("should validate action enum values", () => {
    const schema = tool.schema.parametersJsonSchema as {
      properties: {
        action: {
          enum: string[];
        };
      };
    };
    expect(schema.properties.action.enum).toContain("list-versions");
    expect(schema.properties.action.enum).toContain("get-server-info");
    expect(schema.properties.action.enum).toContain("get-java-requirements");
    expect(schema.properties.action.enum).toContain("get-by-hash");
    expect(schema.properties.action.enum).toContain("get-live-status");
  });

  it("returns live server status from mcquery", async () => {
    const invocation = tool.build({
      action: "get-live-status",
      host: "127.0.0.1",
      port: 25565,
    });
    const result = await invocation.execute(new AbortController().signal);

    expect(getModernStatus).toHaveBeenCalledWith("127.0.0.1", 25565, {
      timeoutMs: 5000,
      enableSRV: undefined,
    });
    expect(getQueryFull).toHaveBeenCalledWith("127.0.0.1", 25565, {
      timeoutMs: 5000,
    });
    expect(result.returnDisplay).toContain(
      "Minecraft Live Status (127.0.0.1:25565)",
    );
    expect(result.returnDisplay).toContain("Players: 1/20");
    expect(result.returnDisplay).toContain("Map: world");
  });
});
