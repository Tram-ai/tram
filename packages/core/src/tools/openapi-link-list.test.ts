/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from "vitest";
import { OpenApiLinkListTool } from "./openapi-link-list.js";

describe("OpenApiLinkListTool", () => {
  it("returns all entries by default", async () => {
    const tool = new OpenApiLinkListTool();
    const invocation = tool.build({});
    const result = await invocation.execute(new AbortController().signal);

    expect(result.returnDisplay).toContain("Modrinth API");
    expect(result.returnDisplay).toContain("CurseForge API");
    expect(result.returnDisplay).toContain("SpiGet API");
    expect(result.returnDisplay).toContain("Hangar API");
    expect(String(result.llmContent)).toContain("Modrinth API");
  });

  it("filters entries by keyword", async () => {
    const tool = new OpenApiLinkListTool();
    const invocation = tool.build({ keyword: "spigot" });
    const result = await invocation.execute(new AbortController().signal);

    expect(result.returnDisplay).toContain("SpiGet API");
    expect(result.returnDisplay).not.toContain("MCJars API");
  });

  it("validates maxResults as positive integer", () => {
    const tool = new OpenApiLinkListTool();

    expect(() => tool.build({ maxResults: 0 })).toThrow(
      "The 'maxResults' parameter must be a positive integer when provided.",
    );
  });
});
