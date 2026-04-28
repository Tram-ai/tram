/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "vitest";
import {
  AuthType,
  type ModelProvidersConfig,
  type ProviderModelConfig,
} from "@tram-ai/tram-core";
import {
  getNextAvailableModelId,
  normalizeModelProvidersConfig,
  normalizeModelsForAuthType,
} from "./modelProviderIds.js";

describe("modelProviderIds", () => {
  describe("getNextAvailableModelId", () => {
    it("should append numeric suffix for occupied ids", () => {
      const usedIds = new Set(["qwen", "qwen-1", "qwen-2"]);
      expect(getNextAvailableModelId("qwen", usedIds)).toBe("qwen-3");
    });

    it("should return base id when available", () => {
      const usedIds = new Set(["qwen-1"]);
      expect(getNextAvailableModelId("qwen", usedIds)).toBe("qwen");
    });
  });

  describe("normalizeModelsForAuthType", () => {
    it("should disambiguate duplicate OpenAI ids and set upstreamModelId", () => {
      const models: ProviderModelConfig[] = [
        {
          id: "Qwen/Qwen3-8B",
          name: "[A]Qwen/Qwen3-8B",
          envKey: "KEY_A",
          baseUrl: "https://a.example.com/v1",
        },
        {
          id: "Qwen/Qwen3-8B",
          name: "[B]Qwen/Qwen3-8B",
          envKey: "KEY_B",
          baseUrl: "https://b.example.com/v1",
        },
      ];

      const normalized = normalizeModelsForAuthType(AuthType.USE_OPENAI, models);

      expect(normalized[0]?.id).toBe("Qwen/Qwen3-8B");
      expect(normalized[1]?.id).toBe("Qwen/Qwen3-8B-1");
      expect(normalized[0]?.upstreamModelId).toBe("Qwen/Qwen3-8B");
      expect(normalized[1]?.upstreamModelId).toBe("Qwen/Qwen3-8B");
    });

    it("should disambiguate duplicate ids for non-OpenAI auth types", () => {
      const models: ProviderModelConfig[] = [
        { id: "gemini-2.5-pro", name: "Gemini 1" },
        { id: "gemini-2.5-pro", name: "Gemini 2" },
      ];

      const normalized = normalizeModelsForAuthType(AuthType.USE_GEMINI, models);

      expect(normalized[0]?.id).toBe("gemini-2.5-pro");
      expect(normalized[1]?.id).toBe("gemini-2.5-pro-1");
      expect(normalized[0]?.upstreamModelId).toBeUndefined();
    });
  });

  describe("normalizeModelProvidersConfig", () => {
    it("should normalize each valid authType model list", () => {
      const config: ModelProvidersConfig = {
        openai: [
          { id: "gpt-4o", envKey: "KEY_A", baseUrl: "https://a.example.com" },
          { id: "gpt-4o", envKey: "KEY_B", baseUrl: "https://b.example.com" },
        ],
        gemini: [
          { id: "gemini-2.5-pro" },
          { id: "gemini-2.5-pro" },
        ],
      };

      const normalized = normalizeModelProvidersConfig(config);
      const openaiModels = normalized[AuthType.USE_OPENAI] || [];
      const geminiModels = normalized[AuthType.USE_GEMINI] || [];

      expect(openaiModels.map((m) => m.id)).toEqual(["gpt-4o", "gpt-4o-1"]);
      expect(openaiModels.map((m) => m.upstreamModelId)).toEqual([
        "gpt-4o",
        "gpt-4o",
      ]);
      expect(geminiModels.map((m) => m.id)).toEqual([
        "gemini-2.5-pro",
        "gemini-2.5-pro-1",
      ]);
    });
  });
});
