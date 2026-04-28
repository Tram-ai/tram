import { beforeEach, describe, expect, it, vi } from "vitest";
import yargs from "yargs";
import type { ArgumentsCamelCase } from "yargs";

const mockInitializeI18n = vi.hoisted(() => vi.fn());
const mockLoadSettings = vi.hoisted(() => vi.fn());
const mockRunChannelWebConfig = vi.hoisted(() => vi.fn());
const mockWriteStderrLine = vi.hoisted(() => vi.fn());

vi.mock("../../config/settings.js", () => ({
  loadSettings: mockLoadSettings,
}));

vi.mock("../../i18n/index.js", () => ({
  initializeI18n: mockInitializeI18n,
  t: vi.fn((value: string) => value),
}));

vi.mock("../../utils/stdioHelpers.js", () => ({
  writeStderrLine: mockWriteStderrLine,
}));

vi.mock("./web-config-display.js", () => ({
  runChannelWebConfig: mockRunChannelWebConfig,
}));

describe("channel initialize command", () => {
  const processExitSpy = vi
    .spyOn(process, "exit")
    .mockImplementation(() => undefined as never);

  function createArgv(args: { name?: string; type?: string } = {}) {
    return {
      _: ["channel", "initialize"],
      $0: "tram",
      ...args,
    } as ArgumentsCamelCase<{ name?: string; type?: string }>;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadSettings.mockReturnValue({
      merged: {},
    });
    mockInitializeI18n.mockResolvedValue(undefined);
    mockRunChannelWebConfig.mockResolvedValue(true);
  });

  it("accepts initialize without a positional name", async () => {
    const { initializeCommand } = await import("./initialize.js");
    const parser = yargs([]).command(initializeCommand).fail(false).locale("en");

    expect(() => parser.parse("initialize")).not.toThrow();
  });

  it("passes a trimmed channel name and preferred type to the web flow", async () => {
    const { initializeCommand } = await import("./initialize.js");
    await initializeCommand.handler?.(
      createArgv({ name: "  haha  ", type: "telegram" }),
    );

    expect(mockRunChannelWebConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        channelName: "haha",
        channelType: "telegram",
      }),
    );
  });

  it("allows initialize without a channel name", async () => {
    const { initializeCommand } = await import("./initialize.js");
    await initializeCommand.handler?.(createArgv());

    expect(mockRunChannelWebConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        channelName: undefined,
      }),
    );
    expect(mockWriteStderrLine).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });
});
