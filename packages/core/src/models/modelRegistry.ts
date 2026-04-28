/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from "../core/contentGenerator.js";
import { defaultModalities } from "../core/modalityDefaults.js";
import { tokenLimit } from "../core/tokenLimits.js";
import { DEFAULT_OPENAI_BASE_URL } from "../core/openaiContentGenerator/constants.js";
import {
  type ModelConfig,
  type ModelProvidersConfig,
  type ResolvedModelConfig,
  type AvailableModel,
} from "./types.js";
import { DEFAULT_TRAM_MODEL } from "../config/models.js";
import { TRAM_OAUTH_MODELS } from "./constants.js";
import { createDebugLogger } from "../utils/debugLogger.js";

const debugLogger = createDebugLogger("MODEL_REGISTRY");

export { TRAM_OAUTH_MODELS } from "./constants.js";

/**
 * Validates if a string key is a valid AuthType enum value.
 * @param key - The key to validate
 * @returns The validated AuthType or undefined if invalid
 */
function validateAuthTypeKey(key: string): AuthType | undefined {
  // Check if the key is a valid AuthType enum value
  if (Object.values(AuthType).includes(key as AuthType)) {
    return key as AuthType;
  }

  // Invalid key
  return undefined;
}

/**
 * Central registry for managing model configurations.
 * Models are organized by authType.
 */
export class ModelRegistry {
  private modelsByAuthType: Map<AuthType, Map<string, ResolvedModelConfig>>;

  private getDefaultBaseUrl(authType: AuthType): string {
    switch (authType) {
      case AuthType.TRAM_OAUTH:
        return "DYNAMIC_TRAM_OAUTH_BASE_URL";
      case AuthType.USE_OPENAI:
        return DEFAULT_OPENAI_BASE_URL;
      default:
        return "";
    }
  }

  constructor(modelProvidersConfig?: ModelProvidersConfig) {
    this.modelsByAuthType = new Map();

    // Always register tram-oauth models (hard-coded, cannot be overridden)
    this.registerAuthTypeModels(AuthType.TRAM_OAUTH, TRAM_OAUTH_MODELS);

    // Register user-configured models for other authTypes
    if (modelProvidersConfig) {
      for (const [rawKey, models] of Object.entries(modelProvidersConfig)) {
        const authType = validateAuthTypeKey(rawKey);

        if (!authType) {
          debugLogger.warn(
            `Invalid authType key "${rawKey}" in modelProviders config. Expected one of: ${Object.values(AuthType).join(", ")}. Skipping.`,
          );
          continue;
        }

        // Skip tram-oauth as it uses hard-coded models
        if (authType === AuthType.TRAM_OAUTH) {
          continue;
        }

        this.registerAuthTypeModels(authType, models);
      }
    }
  }

  /**
   * Register models for an authType.
   * If multiple models have the same id, they will be auto-disambiguated
   * to avoid conflicts, preserving their upstream API identity.
   */
  private registerAuthTypeModels(
    authType: AuthType,
    models: ModelConfig[],
  ): void {
    const modelMap = new Map<string, ResolvedModelConfig>();

    for (const config of models) {
      let uniqueId = config.id;
      let counter = 1;
      
      // Auto-disambiguate duplicated IDs to avoid conflict
      while (modelMap.has(uniqueId)) {
        uniqueId = `${config.id}-${counter}`;
        counter++;
      }

      if (uniqueId !== config.id) {
        debugLogger.warn(
          `Duplicate model id "${config.id}" for authType "${authType}". Assigned auto-generated id "${uniqueId}".`,
        );
      }

      const resolved = this.resolveModelConfig(config, authType);
      
      // Assure the resolved config uses our unique ID
      resolved.id = uniqueId;
      
      // If we auto-generated an ID and the name wasn't explicitly provided,
      // suffix the name to differentiate it in the UI
      if (uniqueId !== config.id && !config.name) {
        resolved.name = uniqueId;
      }
      
      // If no upstreamModelId is provided, we must fallback to the original model id,
      // so we don't accidentally send the generated id (like "z-ai/glm-5-1") to the provider API.
      if (!resolved.upstreamModelId) {
        resolved.upstreamModelId = config.id;
      }

      modelMap.set(uniqueId, resolved);
    }

    this.modelsByAuthType.set(authType, modelMap);
  }

  /**
   * Get all models for a specific authType.
   * This is used by /model command to show only relevant models.
   */
  getModelsForAuthType(authType: AuthType): AvailableModel[] {
    const models = this.modelsByAuthType.get(authType);
    if (!models) return [];

    return Array.from(models.values()).map((model) => ({
      id: model.id,
      label: model.name,
      description: model.description,
      capabilities: model.capabilities,
      authType: model.authType,
      isVision: model.capabilities?.vision ?? false,
      contextWindowSize:
        model.generationConfig.contextWindowSize ?? tokenLimit(model.id),
      modalities:
        model.generationConfig.modalities ?? defaultModalities(model.id),
      baseUrl: model.baseUrl,
      envKey: model.envKey,
    }));
  }

  /**
   * Get model configuration by authType and modelId
   */
  getModel(
    authType: AuthType,
    modelId: string,
  ): ResolvedModelConfig | undefined {
    const models = this.modelsByAuthType.get(authType);
    return models?.get(modelId);
  }

  /**
   * Check if model exists for given authType
   */
  hasModel(authType: AuthType, modelId: string): boolean {
    const models = this.modelsByAuthType.get(authType);
    return models?.has(modelId) ?? false;
  }

  /**
   * Get default model for an authType.
   * For tram-oauth, returns the coder model.
   * For others, returns the first configured model.
   */
  getDefaultModelForAuthType(
    authType: AuthType,
  ): ResolvedModelConfig | undefined {
    if (authType === AuthType.TRAM_OAUTH) {
      return this.getModel(authType, DEFAULT_TRAM_MODEL);
    }
    const models = this.modelsByAuthType.get(authType);
    if (!models || models.size === 0) return undefined;
    return Array.from(models.values())[0];
  }

  /**
   * Resolve model config by applying defaults
   */
  private resolveModelConfig(
    config: ModelConfig,
    authType: AuthType,
  ): ResolvedModelConfig {
    this.validateModelConfig(config, authType);

    return {
      ...config,
      authType,
      name: config.name || config.id,
      baseUrl: config.baseUrl || this.getDefaultBaseUrl(authType),
      generationConfig: config.generationConfig ?? {},
      capabilities: config.capabilities || {},
    };
  }

  /**
   * Validate model configuration
   */
  private validateModelConfig(config: ModelConfig, authType: AuthType): void {
    if (!config.id) {
      throw new Error(
        `Model config in authType '${authType}' missing required field: id`,
      );
    }
  }

  /**
   * Reload models from updated configuration.
   * Clears existing user-configured models and re-registers from new config.
   * Preserves hard-coded tram-oauth models.
   */
  reloadModels(modelProvidersConfig?: ModelProvidersConfig): void {
    // Clear existing user-configured models (preserve tram-oauth)
    for (const authType of this.modelsByAuthType.keys()) {
      if (authType !== AuthType.TRAM_OAUTH) {
        this.modelsByAuthType.delete(authType);
      }
    }

    // Re-register user-configured models for other authTypes
    if (modelProvidersConfig) {
      for (const [rawKey, models] of Object.entries(modelProvidersConfig)) {
        const authType = validateAuthTypeKey(rawKey);

        if (!authType) {
          debugLogger.warn(
            `Invalid authType key "${rawKey}" in modelProviders config. Expected one of: ${Object.values(AuthType).join(", ")}. Skipping.`,
          );
          continue;
        }

        // Skip tram-oauth as it uses hard-coded models
        if (authType === AuthType.TRAM_OAUTH) {
          continue;
        }

        this.registerAuthTypeModels(authType, models);
      }
    }
  }

  /**
   * Resolve a model identifier (id, upstreamModelId, or API-returned model name)
   * to the user-configured display name.
   *
   * Returns the original identifier if no match is found.
   */
  resolveDisplayName(identifier: string): string {
    for (const [, modelMap] of this.modelsByAuthType) {
      for (const [, model] of modelMap) {
        if (
          model.id === identifier ||
          model.upstreamModelId === identifier
        ) {
          return model.name;
        }
      }
    }
    return identifier;
  }

  /**
   * Resolve an internal model ID to its upstream model ID (the real API model name).
   * This is useful when the internal ID was auto-disambiguated (e.g. `glm-4-1`)
   * but we need to send the correct API name (`glm-4`).
   *
   * When authType is provided, resolution is scoped to that authType first.
   * This avoids accidental cross-authType collisions for shared local ids.
   *
   * Returns the original identifier if no match is found.
   */
  resolveUpstreamModelId(identifier: string, authType?: AuthType): string {
    if (authType) {
      const scopedMap = this.modelsByAuthType.get(authType);
      if (scopedMap) {
        for (const [, model] of scopedMap) {
          if (model.id === identifier) {
            return model.upstreamModelId || identifier;
          }
        }
      }
    }

    for (const [, modelMap] of this.modelsByAuthType) {
      for (const [, model] of modelMap) {
        if (model.id === identifier) {
          return model.upstreamModelId || identifier;
        }
      }
    }
    return identifier;
  }
}
