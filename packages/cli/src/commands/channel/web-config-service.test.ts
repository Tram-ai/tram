import { afterEach, describe, expect, it, vi } from "vitest";
import { ChannelWebConfigService } from "./web-config-service.js";

vi.mock("./channel-registry.js", () => ({
  getPlugin: async (type: string) => {
    const plugins: Record<
      string,
      {
        channelType: string;
        displayName: string;
        requiredConfigFields?: string[];
      }
    > = {
      telegram: {
        channelType: "telegram",
        displayName: "Telegram",
        requiredConfigFields: ["token"],
      },
      dingtalk: {
        channelType: "dingtalk",
        displayName: "DingTalk",
        requiredConfigFields: ["clientId", "clientSecret"],
      },
      weixin: {
        channelType: "weixin",
        displayName: "WeChat",
      },
      websocket: {
        channelType: "websocket",
        displayName: "WebSocket",
        requiredConfigFields: ["port"],
      },
      sse: {
        channelType: "sse",
        displayName: "SSE",
        requiredConfigFields: ["port"],
      },
      "plugin-example": {
        channelType: "plugin-example",
        displayName: "Plugin Example",
        requiredConfigFields: ["serverWsUrl"],
      },
    };
    return plugins[type];
  },
  supportedTypes: async () => [
    "telegram",
    "dingtalk",
    "weixin",
    "websocket",
    "sse",
    "plugin-example",
  ],
}));

function createMockSettings(
  channels: Record<string, Record<string, unknown>> = {},
): {
  merged: { channels: Record<string, Record<string, unknown>> };
  forScope(scope: string): { settings: Record<string, unknown> };
  setValue(scope: string, key: string, value: unknown): void;
} {
  const userFile = {
    path: "/home/test/.tram/settings.json",
    settings: { channels: structuredClone(channels) },
    originalSettings: { channels: structuredClone(channels) },
    rawJson: "{}",
  };

  const settings = {
    merged: {
      channels: userFile.settings.channels as Record<
        string,
        Record<string, unknown>
      >,
    },
    forScope: (scope: string) => {
      if (scope !== "User") {
        throw new Error(`Unexpected scope: ${scope}`);
      }
      return userFile;
    },
    setValue: (scope: string, key: string, value: unknown) => {
      if (scope !== "User") {
        throw new Error(`Unexpected scope: ${scope}`);
      }
      const [, channelName] = key.split(".");
      if (!channelName) {
        throw new Error(`Unexpected settings key: ${key}`);
      }

      const nextChannels: Record<string, Record<string, unknown>> = {
        ...((userFile.settings.channels as Record<
          string,
          Record<string, unknown>
        >) || {}),
      };

      if (value === undefined) {
        delete nextChannels[channelName];
      } else {
        nextChannels[channelName] = value as Record<string, unknown>;
      }

      userFile.settings.channels = nextChannels;
      userFile.originalSettings.channels = structuredClone(nextChannels);
      settings.merged.channels = nextChannels;
    },
  };

  return settings;
}

describe("ChannelWebConfigService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns metadata with common fields, supported channel types, and current config", async () => {
    const settings = createMockSettings({
      bot: {
        type: "telegram",
        token: "abc123",
      },
    });

    const service = new ChannelWebConfigService({
      deps: {
        loadSettings: () => settings,
        loadWeixinAccount: () => null,
      },
    });

    const metadata = await service.getMetadata("bot");

    expect(metadata.channelName).toBe("bot");
    expect(metadata.selectedType).toBe("telegram");
    expect(metadata.current.exists).toBe(true);
    expect(metadata.current.validationErrors).toEqual([]);
    expect(metadata.commonFields.find((field) => field.key === "type")?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: "telegram", label: "Telegram" }),
        expect.objectContaining({ value: "weixin", label: "WeChat" }),
      ]),
    );
    expect(metadata.channelTypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "telegram",
          displayName: "Telegram",
          fields: [
            expect.objectContaining({ key: "token", required: true }),
          ],
        }),
        expect.objectContaining({
          type: "weixin",
          supportsQrBinding: true,
          fields: [expect.objectContaining({ key: "baseUrl" })],
        }),
        expect.objectContaining({
          type: "plugin-example",
          fields: [expect.objectContaining({ key: "serverWsUrl" })],
        }),
      ]),
    );
    expect(metadata.channelTypes.map((item) => item.type)).not.toContain(
      "websocket",
    );
    expect(metadata.channelTypes.map((item) => item.type)).not.toContain("sse");
    expect(metadata.weixinAccount).toEqual({
      configured: false,
      baseUrl: "https://ilinkai.weixin.qq.com",
    });
  });

  it("treats missing channels as editable new configs and picks the first supported type", async () => {
    const settings = createMockSettings();
    const service = new ChannelWebConfigService({
      deps: {
        loadSettings: () => settings,
        loadWeixinAccount: () => null,
      },
    });

    const metadata = await service.getMetadata("fresh-channel");

    expect(metadata.current).toEqual({
      name: "fresh-channel",
      exists: false,
      config: null,
      normalizedConfig: null,
      validationErrors: [],
    });
    expect(metadata.selectedType).toBe(metadata.channelTypes[0]?.type);
  });

  it("allows metadata bootstrap without a preselected channel name", async () => {
    const settings = createMockSettings();
    const service = new ChannelWebConfigService({
      deps: {
        loadSettings: () => settings,
        loadWeixinAccount: () => null,
      },
    });

    const metadata = await service.getMetadata("");

    expect(metadata.channelName).toBe("");
    expect(metadata.current).toEqual({
      name: "",
      exists: false,
      config: null,
      normalizedConfig: null,
      validationErrors: [],
    });
    expect(metadata.selectedType).toBe(metadata.channelTypes[0]?.type);
  });

  it("rejects websocket and sse in the web config flow", async () => {
    const settings = createMockSettings();
    const service = new ChannelWebConfigService({
      deps: {
        loadSettings: () => settings,
        loadWeixinAccount: () => null,
      },
    });

    await expect(service.getMetadata("ws-bot", "websocket")).rejects.toThrow(
      'Channel type "websocket" is not supported by channel initialize. Use settings.json or another CLI flow instead.',
    );

    await expect(
      service.putChannel("ws-bot", {
        type: "sse",
        port: 3000,
      }),
    ).rejects.toThrow(
      'Channel type "sse" is not supported by channel initialize. Use settings.json or another CLI flow instead.',
    );
  });

  it("saves a channel config and returns normalized defaults", async () => {
    const settings = createMockSettings();
    const service = new ChannelWebConfigService({
      deps: {
        loadSettings: () => settings,
        loadWeixinAccount: () => null,
      },
    });

    const record = await service.putChannel("bot", {
      type: "telegram",
      token: "abc123",
      senderPolicy: "open",
      allowedUsers: ["alice", "", "bob"],
      cwd: "  /workspace/project  ",
      instructions: "  be concise  ",
    });

    expect(record.exists).toBe(true);
    expect(record.validationErrors).toEqual([]);
    expect(record.config).toEqual({
      type: "telegram",
      token: "abc123",
      senderPolicy: "open",
      allowedUsers: ["alice", "bob"],
      cwd: "/workspace/project",
      instructions: "be concise",
    });
    expect(record.normalizedConfig).toEqual(
      expect.objectContaining({
        type: "telegram",
        token: "abc123",
        senderPolicy: "open",
        allowedUsers: ["alice", "bob"],
        sessionScope: "user",
        groupPolicy: "disabled",
        groups: {},
      }),
    );
  });

  it("rejects invalid channel config before writing it", async () => {
    const settings = createMockSettings();
    const service = new ChannelWebConfigService({
      deps: {
        loadSettings: () => settings,
        loadWeixinAccount: () => null,
      },
    });

    await expect(
      service.putChannel("bot", {
        type: "telegram",
      }),
    ).rejects.toThrow('requires "token"');

    expect(await service.getChannel("bot")).toEqual({
      name: "bot",
      exists: false,
      config: null,
      normalizedConfig: null,
      validationErrors: [],
    });
  });

  it("deletes an existing channel config from user settings", async () => {
    const settings = createMockSettings({
      bot: { type: "telegram", token: "abc123" },
    });
    const service = new ChannelWebConfigService({
      deps: {
        loadSettings: () => settings,
        loadWeixinAccount: () => null,
      },
    });

    expect(service.deleteChannel("bot")).toEqual({
      name: "bot",
      deleted: true,
    });
    expect(await service.getChannel("bot")).toEqual({
      name: "bot",
      exists: false,
      config: null,
      normalizedConfig: null,
      validationErrors: [],
    });
  });

  it("tracks WeChat QR binding and saves the resulting account", async () => {
    const settings = createMockSettings();
    const saveWeixinAccount = vi.fn();
    const now = new Date("2026-01-02T03:04:05.000Z");

    const service = new ChannelWebConfigService({
      deps: {
        loadSettings: () => settings,
        loadWeixinAccount: () => null,
        saveWeixinAccount,
        randomUUID: () => "binding-1",
        now: () => now,
        requestWeixinQrCode: async () => ({
          qrcodeId: "qr-1",
          qrCodeUrl: "https://example.com/qr.png",
        }),
        waitForWeixinLogin: async () => ({
          connected: true,
          token: "token-1",
          baseUrl: "https://weixin.example.com",
          userId: "user-1",
          message: "Connected to WeChat successfully!",
        }),
      },
    });

    const initial = await service.startWeixinBinding();

    expect(initial).toEqual({
      bindingId: "binding-1",
      status: "pending",
      startedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      baseUrl: "https://ilinkai.weixin.qq.com",
      qrcodeId: "qr-1",
      qrCodeUrl: "https://example.com/qr.png",
      message: "Waiting for WeChat QR code confirmation.",
    });

    await vi.waitFor(() => {
      expect(service.getWeixinBinding("binding-1")).toEqual({
        bindingId: "binding-1",
        status: "connected",
        startedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        baseUrl: "https://weixin.example.com",
        qrcodeId: "qr-1",
        qrCodeUrl: "https://example.com/qr.png",
        userId: "user-1",
        savedAt: now.toISOString(),
        message: "Connected to WeChat successfully!",
      });
    });

    expect(saveWeixinAccount).toHaveBeenCalledWith({
      token: "token-1",
      baseUrl: "https://weixin.example.com",
      userId: "user-1",
      savedAt: now.toISOString(),
    });
  });

  it("surfaces WeChat binding failures without saving credentials", async () => {
    const settings = createMockSettings();
    const saveWeixinAccount = vi.fn();

    const service = new ChannelWebConfigService({
      deps: {
        loadSettings: () => settings,
        loadWeixinAccount: () => null,
        saveWeixinAccount,
        randomUUID: () => "binding-2",
        now: () => new Date("2026-01-02T03:04:05.000Z"),
        requestWeixinQrCode: async () => ({ qrcodeId: "qr-2" }),
        waitForWeixinLogin: async () => ({
          connected: false,
          message: "Login timed out.",
        }),
      },
    });

    await service.startWeixinBinding();

    await vi.waitFor(() => {
      expect(service.getWeixinBinding("binding-2")).toEqual(
        expect.objectContaining({
          bindingId: "binding-2",
          status: "failed",
          error: "Login timed out.",
          message: "Login timed out.",
        }),
      );
    });

    expect(saveWeixinAccount).not.toHaveBeenCalled();
  });
});
