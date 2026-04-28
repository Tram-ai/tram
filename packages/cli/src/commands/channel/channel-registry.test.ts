import { beforeEach, describe, expect, it, vi } from "vitest";

function createPlugin(channelType: string, displayName: string) {
  return {
    plugin: {
      channelType,
      displayName,
      createChannel: vi.fn(),
    },
  };
}

vi.mock(
  "@tram-ai/channel-telegram",
  () => createPlugin("telegram", "Telegram"));
vi.mock(
  "@tram-ai/channel-weixin",
  () => createPlugin("weixin", "WeChat")
);
vi.mock(
  "@tram-ai/channel-dingtalk",
  () => createPlugin("dingtalk", "DingTalk")
);
vi.mock(
  "@tram-ai/channel-plugin-example",
  () => createPlugin("plugin-example", "Plugin Example"),
);

vi.mock("../extensions/utils.js", () => ({
  getExtensionManager: async () => ({
    getLoadedExtensions: () => [],
  }),
}));

vi.mock("../../utils/stdioHelpers.js", () => ({
  writeStderrLine: vi.fn(),
}));

describe("channel-registry", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("loads all built-in channel plugins for channel initialize", async () => {
    const { getPlugin, supportedTypes } = await import("./channel-registry.js");

    await expect(supportedTypes()).resolves.toEqual(
      expect.arrayContaining([
        "telegram",
        "weixin",
        "dingtalk",
        "plugin-example",
      ]),
    );

    await expect(getPlugin("plugin-example")).resolves.toEqual(
      expect.objectContaining({
        channelType: "plugin-example",
        displayName: "Plugin Example",
      }),
    );
  });
});