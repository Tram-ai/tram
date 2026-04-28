/**
 * @license
 * Copyright 2026 Tram
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubLmTool } from "./sublm.js";
import type { Config } from "../config/config.js";
import { readFile } from "node:fs/promises";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

const mockGenerateContent = vi.fn();
const mockReadFile = vi.mocked(readFile);

describe("SubLmTool", () => {
  let mockConfig: Config;

  beforeEach(() => {
    vi.resetAllMocks();
    mockConfig = {
      getModel: vi.fn(() => "tram-plus"),
      getSessionId: vi.fn(() => "session-id"),
      getTargetDir: vi.fn(() => "/workspace"),
      getWorkspaceContext: vi.fn(() => ({
        isPathWithinWorkspace: vi.fn(() => true),
        getDirectories: vi.fn(() => ["/workspace"]),
      })),
      getFileService: vi.fn(() => ({
        shouldTramIgnoreFile: vi.fn(() => false),
      })),
      getContentGenerator: vi.fn(() => ({
        generateContent: mockGenerateContent,
      })),
      storage: {
        getProjectTempDir: vi.fn(() => "/tmp/tram-project"),
      },
    } as unknown as Config;
  });

  it("validates required fields", () => {
    const tool = new SubLmTool(mockConfig);

    expect(() => tool.build({ userPrompt: "", inlineContent: "x" })).toThrow(
      "The 'userPrompt' parameter cannot be empty.",
    );
    expect(() => tool.build({ userPrompt: "sum" })).toThrow(
      "At least one of 'inlineContent' or 'filePaths' must be provided.",
    );
  });

  it("calls content generator and returns summary with inline content", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ text: "summary output" }],
          },
        },
      ],
    });

    const tool = new SubLmTool(mockConfig);
    const invocation = tool.build({
      userPrompt: "Summarize in one line",
      inlineContent: "alpha beta gamma",
    });
    const result = await invocation.execute(new AbortController().signal);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(result.llmContent).toBe("summary output");
    expect(result.returnDisplay).toContain("summary output");
  });

  it("reads file paths internally and sends content to sub-model", async () => {
    mockReadFile.mockResolvedValue("error log line 1\nerror log line 2");
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ text: "log summary" }],
          },
        },
      ],
    });

    const tool = new SubLmTool(mockConfig);
    const invocation = tool.build({
      userPrompt: "Summarize key failures",
      filePaths: ["logs/app.log"],
    });
    const result = await invocation.execute(new AbortController().signal);

    expect(mockReadFile).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(result.llmContent).toBe("log summary");
  });

  it("resolves $LOG_xxx variable paths and reads from temp directory", async () => {
    const mockWorkspaceContext = {
      isPathWithinWorkspace: vi.fn(() => false),
      getDirectories: vi.fn(() => ["/workspace"]),
    };
    mockConfig.getWorkspaceContext = vi.fn(() => mockWorkspaceContext) as any;
    mockReadFile.mockResolvedValue("crash log line 1\ncrash log line 2");
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ text: "crash analysis" }],
          },
        },
      ],
    });

    const tool = new SubLmTool(mockConfig);
    const invocation = tool.build({
      userPrompt: "Analyze crash logs",
      filePaths: ["$LOG_MC-SERVER_1775257752973"],
    });
    const result = await invocation.execute(new AbortController().signal);

    expect(mockReadFile).toHaveBeenCalledTimes(1);
    const readPath = mockReadFile.mock.calls[0][0] as string;
    expect(readPath).toContain("log-variables");
    expect(readPath).toContain("LOG_MC-SERVER_1775257752973.log");
    expect(result.llmContent).toBe("crash analysis");
  });

  it("returns error result when generation fails", async () => {
    mockReadFile.mockResolvedValue("some content");
    mockGenerateContent.mockRejectedValue(new Error("network failure"));

    const tool = new SubLmTool(mockConfig);
    const invocation = tool.build({
      userPrompt: "Summarize",
      filePaths: ["logs/app.log"],
    });
    const result = await invocation.execute(new AbortController().signal);

    expect(result.error?.message).toContain("SubLM generation failed");
  });
});
