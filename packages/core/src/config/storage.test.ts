/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import { Storage } from "./storage.js";

describe("Storage – getGlobalSettingsPath", () => {
  it("returns path to ~/.tram/settings.json", () => {
    const expected = path.join(os.homedir(), ".tram", "settings.json");
    expect(Storage.getGlobalSettingsPath()).toBe(expected);
  });
});

describe("Storage – additional helpers", () => {
  const projectRoot = "/tmp/project";
  const storage = new Storage(projectRoot);

  it("getWorkspaceSettingsPath returns project/.tram/settings.json", () => {
    const expected = path.join(projectRoot, ".tram", "settings.json");
    expect(storage.getWorkspaceSettingsPath()).toBe(expected);
  });

  it("getUserCommandsDir returns ~/.tram/commands", () => {
    const expected = path.join(os.homedir(), ".tram", "commands");
    expect(Storage.getUserCommandsDir()).toBe(expected);
  });

  it("getProjectCommandsDir returns project/.tram/commands", () => {
    const expected = path.join(projectRoot, ".tram", "commands");
    expect(storage.getProjectCommandsDir()).toBe(expected);
  });

  it("getMcpOAuthTokensPath returns ~/.tram/mcp-oauth-tokens.json", () => {
    const expected = path.join(os.homedir(), ".tram", "mcp-oauth-tokens.json");
    expect(Storage.getMcpOAuthTokensPath()).toBe(expected);
  });
});

describe("Storage – getRuntimeBaseDir / setRuntimeBaseDir", () => {
  const originalEnv = process.env["QWEN_RUNTIME_DIR"];

  beforeEach(() => {
    // Reset state before each test
    Storage.setRuntimeBaseDir(null);
    delete process.env["QWEN_RUNTIME_DIR"];
  });

  afterEach(() => {
    // Restore original env
    Storage.setRuntimeBaseDir(null);
    if (originalEnv !== undefined) {
      process.env["QWEN_RUNTIME_DIR"] = originalEnv;
    } else {
      delete process.env["QWEN_RUNTIME_DIR"];
    }
  });

  it("defaults to getGlobalQwenDir() when nothing is configured", () => {
    expect(Storage.getRuntimeBaseDir()).toBe(Storage.getGlobalQwenDir());
  });

  it("uses setRuntimeBaseDir value when set with absolute path", () => {
    const runtimeDir = path.resolve("custom", "runtime");
    Storage.setRuntimeBaseDir(runtimeDir);
    expect(Storage.getRuntimeBaseDir()).toBe(runtimeDir);
  });

  it("env var QWEN_RUNTIME_DIR takes priority over setRuntimeBaseDir", () => {
    const settingsDir = path.resolve("from-settings");
    const envDir = path.resolve("from-env");
    Storage.setRuntimeBaseDir(settingsDir);
    process.env["QWEN_RUNTIME_DIR"] = envDir;
    expect(Storage.getRuntimeBaseDir()).toBe(envDir);
  });

  it("expands tilde (~) in setRuntimeBaseDir", () => {
    Storage.setRuntimeBaseDir("~/custom-runtime");
    const expected = path.join(os.homedir(), "custom-runtime");
    expect(Storage.getRuntimeBaseDir()).toBe(expected);
  });

  it("expands Windows-style tilde paths in setRuntimeBaseDir", () => {
    Storage.setRuntimeBaseDir("~\\custom-runtime");
    const expected = path.join(os.homedir(), "custom-runtime");
    expect(Storage.getRuntimeBaseDir()).toBe(expected);
  });

  it("expands tilde (~) in QWEN_RUNTIME_DIR env var", () => {
    process.env["QWEN_RUNTIME_DIR"] = "~/env-runtime";
    const expected = path.join(os.homedir(), "env-runtime");
    expect(Storage.getRuntimeBaseDir()).toBe(expected);
  });

  it("resolves relative paths in setRuntimeBaseDir using process.cwd by default", () => {
    Storage.setRuntimeBaseDir("relative/path");
    const expected = path.resolve("relative/path");
    expect(Storage.getRuntimeBaseDir()).toBe(expected);
  });

  it("resolves relative paths in setRuntimeBaseDir using explicit cwd", () => {
    const cwd = path.resolve("workspace", "projectA");
    Storage.setRuntimeBaseDir(".tram", cwd);
    expect(Storage.getRuntimeBaseDir()).toBe(path.join(cwd, ".tram"));
  });

  it("ignores cwd when path is absolute", () => {
    const absolutePath = path.resolve("absolute", "path");
    const cwd = path.resolve("workspace", "projectA");
    Storage.setRuntimeBaseDir(absolutePath, cwd);
    expect(Storage.getRuntimeBaseDir()).toBe(absolutePath);
  });

  it("ignores cwd when path starts with tilde", () => {
    Storage.setRuntimeBaseDir(
      "~/runtime",
      path.resolve("workspace", "projectA"),
    );
    const expected = path.join(os.homedir(), "runtime");
    expect(Storage.getRuntimeBaseDir()).toBe(expected);
  });

  it("resolves relative paths in QWEN_RUNTIME_DIR env var", () => {
    process.env["QWEN_RUNTIME_DIR"] = "relative/env-path";
    const expected = path.resolve("relative/env-path");
    expect(Storage.getRuntimeBaseDir()).toBe(expected);
  });

  it("resets to default when setRuntimeBaseDir is called with null", () => {
    const customDir = path.resolve("custom");
    Storage.setRuntimeBaseDir(customDir);
    expect(Storage.getRuntimeBaseDir()).toBe(customDir);

    Storage.setRuntimeBaseDir(null);
    expect(Storage.getRuntimeBaseDir()).toBe(Storage.getGlobalQwenDir());
  });

  it("resets to default when setRuntimeBaseDir is called with undefined", () => {
    Storage.setRuntimeBaseDir(path.resolve("custom"));
    Storage.setRuntimeBaseDir(undefined);
    expect(Storage.getRuntimeBaseDir()).toBe(Storage.getGlobalQwenDir());
  });

  it("resets to default when setRuntimeBaseDir is called with empty string", () => {
    Storage.setRuntimeBaseDir(path.resolve("custom"));
    Storage.setRuntimeBaseDir("");
    expect(Storage.getRuntimeBaseDir()).toBe(Storage.getGlobalQwenDir());
  });

  it("handles bare tilde (~) as home directory", () => {
    Storage.setRuntimeBaseDir("~");
    expect(Storage.getRuntimeBaseDir()).toBe(os.homedir());
  });
});

describe("Storage – runtime path methods use getRuntimeBaseDir", () => {
  const originalEnv = process.env["QWEN_RUNTIME_DIR"];

  beforeEach(() => {
    Storage.setRuntimeBaseDir(null);
    delete process.env["QWEN_RUNTIME_DIR"];
  });

  afterEach(() => {
    Storage.setRuntimeBaseDir(null);
    if (originalEnv !== undefined) {
      process.env["QWEN_RUNTIME_DIR"] = originalEnv;
    } else {
      delete process.env["QWEN_RUNTIME_DIR"];
    }
  });

  it("getGlobalTempDir uses custom runtime base dir", () => {
    const customDir = path.resolve("custom");
    Storage.setRuntimeBaseDir(customDir);
    expect(Storage.getGlobalTempDir()).toBe(path.join(customDir, "tmp"));
  });

  it("getGlobalDebugDir uses custom runtime base dir", () => {
    const customDir = path.resolve("custom");
    Storage.setRuntimeBaseDir(customDir);
    expect(Storage.getGlobalDebugDir()).toBe(path.join(customDir, "debug"));
  });

  it("getDebugLogPath uses custom runtime base dir", () => {
    const customDir = path.resolve("custom");
    Storage.setRuntimeBaseDir(customDir);
    expect(Storage.getDebugLogPath("session-123")).toBe(
      path.join(customDir, "debug", "session-123.txt"),
    );
  });

  it("getGlobalIdeDir is anchored to the global Tram dir, not runtime base dir", () => {
    const customDir = path.resolve("custom");
    Storage.setRuntimeBaseDir(customDir);
    // IDE lock files are discovery anchors shared with the VS Code companion,
    // which can only see env vars (not settings-based runtimeOutputDir), so
    // getGlobalIdeDir must follow getGlobalTramDir to keep both sides aligned.
    expect(Storage.getGlobalIdeDir()).toBe(
      path.join(Storage.getGlobalTramDir(), "ide"),
    );
  });

  it("getProjectDir uses custom runtime base dir", () => {
    const customDir = path.resolve("custom");
    Storage.setRuntimeBaseDir(customDir);
    const storage = new Storage("/tmp/project");
    expect(storage.getProjectDir()).toContain(path.join(customDir, "projects"));
  });

  it("getHistoryDir uses custom runtime base dir", () => {
    const customDir = path.resolve("custom");
    Storage.setRuntimeBaseDir(customDir);
    const storage = new Storage("/tmp/project");
    expect(storage.getHistoryDir()).toContain(path.join(customDir, "history"));
  });

  it("getProjectTempDir uses custom runtime base dir", () => {
    const customDir = path.resolve("custom");
    Storage.setRuntimeBaseDir(customDir);
    const storage = new Storage("/tmp/project");
    expect(storage.getProjectTempDir()).toContain(path.join(customDir, "tmp"));
  });

  it("getProjectTempCheckpointsDir uses custom runtime base dir", () => {
    const customDir = path.resolve("custom");
    Storage.setRuntimeBaseDir(customDir);
    const storage = new Storage("/tmp/project");
    expect(storage.getProjectTempCheckpointsDir()).toContain(
      path.join(customDir, "tmp"),
    );
    expect(storage.getProjectTempCheckpointsDir()).toMatch(/checkpoints$/);
  });

  it("getHistoryFilePath uses custom runtime base dir", () => {
    const customDir = path.resolve("custom");
    Storage.setRuntimeBaseDir(customDir);
    const storage = new Storage("/tmp/project");
    expect(storage.getHistoryFilePath()).toContain(path.join(customDir, "tmp"));
    expect(storage.getHistoryFilePath()).toMatch(/shell_history$/);
  });
});

describe("Storage – config paths remain at ~/.tram regardless of runtime dir", () => {
  const originalEnv = process.env["QWEN_RUNTIME_DIR"];
  const globalQwenDir = Storage.getGlobalQwenDir();

  beforeEach(() => {
    Storage.setRuntimeBaseDir(path.resolve("custom-runtime"));
    process.env["QWEN_RUNTIME_DIR"] = path.resolve("env-runtime");
  });

  afterEach(() => {
    Storage.setRuntimeBaseDir(null);
    if (originalEnv !== undefined) {
      process.env["QWEN_RUNTIME_DIR"] = originalEnv;
    } else {
      delete process.env["QWEN_RUNTIME_DIR"];
    }
  });

  it("getGlobalSettingsPath still uses ~/.tram", () => {
    expect(Storage.getGlobalSettingsPath()).toBe(
      path.join(globalQwenDir, "settings.json"),
    );
  });

  it("getInstallationIdPath still uses ~/.tram", () => {
    expect(Storage.getInstallationIdPath()).toBe(
      path.join(globalQwenDir, "installation_id"),
    );
  });

  it("getGoogleAccountsPath still uses ~/.tram", () => {
    expect(Storage.getGoogleAccountsPath()).toBe(
      path.join(globalQwenDir, "google_accounts.json"),
    );
  });

  it("getMcpOAuthTokensPath still uses ~/.tram", () => {
    expect(Storage.getMcpOAuthTokensPath()).toBe(
      path.join(globalQwenDir, "mcp-oauth-tokens.json"),
    );
  });

  it("getOAuthCredsPath still uses ~/.tram", () => {
    expect(Storage.getOAuthCredsPath()).toBe(
      path.join(globalQwenDir, "oauth_creds.json"),
    );
  });

  it("getUserCommandsDir still uses ~/.tram", () => {
    expect(Storage.getUserCommandsDir()).toBe(
      path.join(globalQwenDir, "commands"),
    );
  });

  it("getGlobalMemoryFilePath still uses ~/.tram", () => {
    expect(Storage.getGlobalMemoryFilePath()).toBe(
      path.join(globalQwenDir, "memory.md"),
    );
  });

  it("getGlobalBinDir still uses ~/.tram", () => {
    expect(Storage.getGlobalBinDir()).toBe(path.join(globalQwenDir, "bin"));
  });

  it("getUserSkillsDirs still includes ~/.tram/skills", () => {
    const storage = new Storage("/tmp/project");
    const skillsDirs = storage.getUserSkillsDirs();
    expect(
      skillsDirs.some((dir) => dir === path.join(globalQwenDir, "skills")),
    ).toBe(true);
  });
});

describe("Storage – QWEN_HOME env var", () => {
  const originalEnv = process.env["QWEN_HOME"];

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env["QWEN_HOME"] = originalEnv;
    } else {
      delete process.env["QWEN_HOME"];
    }
  });

  it("defaults to ~/.tram when QWEN_HOME is not set", () => {
    delete process.env["QWEN_HOME"];
    const expected = path.join(os.homedir(), ".tram");
    expect(Storage.getGlobalQwenDir()).toBe(expected);
  });

  it("uses QWEN_HOME when set to absolute path", () => {
    const configDir = path.resolve("/tmp/custom-tram");
    process.env["QWEN_HOME"] = configDir;
    expect(Storage.getGlobalQwenDir()).toBe(configDir);
  });

  it("resolves relative QWEN_HOME to absolute path", () => {
    process.env["QWEN_HOME"] = "relative/config";
    const expected = path.resolve("relative/config");
    expect(Storage.getGlobalQwenDir()).toBe(expected);
  });

  it("config paths follow QWEN_HOME", () => {
    const configDir = path.resolve("/tmp/custom-tram");
    process.env["QWEN_HOME"] = configDir;
    expect(Storage.getGlobalSettingsPath()).toBe(
      path.join(configDir, "settings.json"),
    );
    expect(Storage.getInstallationIdPath()).toBe(
      path.join(configDir, "installation_id"),
    );
    expect(Storage.getUserCommandsDir()).toBe(path.join(configDir, "commands"));
    expect(Storage.getMcpOAuthTokensPath()).toBe(
      path.join(configDir, "mcp-oauth-tokens.json"),
    );
    expect(Storage.getOAuthCredsPath()).toBe(
      path.join(configDir, "oauth_creds.json"),
    );
    expect(Storage.getGlobalBinDir()).toBe(path.join(configDir, "bin"));
    expect(Storage.getGlobalMemoryFilePath()).toBe(
      path.join(configDir, "memory.md"),
    );
  });

  it("project-level paths are NOT affected by QWEN_HOME", () => {
    const configDir = path.resolve("/tmp/custom-tram");
    const projectDir = path.resolve("/tmp/project");
    process.env["QWEN_HOME"] = configDir;
    const storage = new Storage(projectDir);
    expect(storage.getWorkspaceSettingsPath()).toBe(
      path.join(projectDir, ".tram", "settings.json"),
    );
    expect(storage.getProjectCommandsDir()).toBe(
      path.join(projectDir, ".tram", "commands"),
    );
  });

  it("expands tilde (~) in QWEN_HOME", () => {
    process.env["QWEN_HOME"] = "~/custom-tram";
    const expected = path.join(os.homedir(), "custom-tram");
    expect(Storage.getGlobalQwenDir()).toBe(expected);
  });

  it("expands Windows-style tilde in QWEN_HOME", () => {
    process.env["QWEN_HOME"] = "~\\custom-tram";
    const expected = path.join(os.homedir(), "custom-tram");
    expect(Storage.getGlobalQwenDir()).toBe(expected);
  });

  it("handles bare tilde (~) as home directory in QWEN_HOME", () => {
    process.env["QWEN_HOME"] = "~";
    expect(Storage.getGlobalQwenDir()).toBe(os.homedir());
  });

  it("QWEN_HOME and QWEN_RUNTIME_DIR are independent", () => {
    const configDir = path.resolve("/tmp/config");
    const runtimeDir = path.resolve("/tmp/runtime");
    process.env["QWEN_HOME"] = configDir;
    process.env["QWEN_RUNTIME_DIR"] = runtimeDir;
    expect(Storage.getGlobalQwenDir()).toBe(configDir);
    expect(Storage.getRuntimeBaseDir()).toBe(runtimeDir);
    expect(Storage.getGlobalSettingsPath()).toBe(
      path.join(configDir, "settings.json"),
    );
    expect(Storage.getGlobalTempDir()).toBe(path.join(runtimeDir, "tmp"));
    expect(Storage.getGlobalDebugDir()).toBe(path.join(runtimeDir, "debug"));
    delete process.env["QWEN_RUNTIME_DIR"];
  });
});

describe("Storage – runtime base dir async context isolation", () => {
  const originalEnv = process.env["QWEN_RUNTIME_DIR"];

  beforeEach(() => {
    Storage.setRuntimeBaseDir(null);
    delete process.env["QWEN_RUNTIME_DIR"];
  });

  afterEach(() => {
    Storage.setRuntimeBaseDir(null);
    if (originalEnv !== undefined) {
      process.env["QWEN_RUNTIME_DIR"] = originalEnv;
    } else {
      delete process.env["QWEN_RUNTIME_DIR"];
    }
  });

  it("uses contextual runtime dir inside runWithRuntimeBaseDir", async () => {
    Storage.setRuntimeBaseDir(path.resolve("global-runtime"));
    const cwd = path.resolve("workspace", "project-a");

    await Storage.runWithRuntimeBaseDir(".tram", cwd, async () => {
      expect(Storage.getRuntimeBaseDir()).toBe(path.join(cwd, ".tram"));
    });
  });

  it("keeps concurrent contexts isolated", async () => {
    const cwdA = path.resolve("workspace", "a");
    const cwdB = path.resolve("workspace", "b");

    const runA = Storage.runWithRuntimeBaseDir(".tram-a", cwdA, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Storage.getRuntimeBaseDir();
    });

    const runB = Storage.runWithRuntimeBaseDir(".tram-b", cwdB, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return Storage.getRuntimeBaseDir();
    });

    const [a, b] = await Promise.all([runA, runB]);
    expect(a).toBe(path.join(cwdA, ".tram-a"));
    expect(b).toBe(path.join(cwdB, ".tram-b"));
  });
});
