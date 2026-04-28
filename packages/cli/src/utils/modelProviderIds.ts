/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthType,
  type ModelProvidersConfig,
  type ProviderModelConfig,
} from "@tram-ai/tram-core";

function normalizeString(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function toAuthType(raw: string): AuthType | undefined {
  return Object.values(AuthType).includes(raw as AuthType)
    ? (raw as AuthType)
    : undefined;
}

export function getNextAvailableModelId(
  baseId: string,
  usedIds: ReadonlySet<string>,
): string {
  const normalizedBase = normalizeString(baseId) || "model";
  if (!usedIds.has(normalizedBase)) {
    return normalizedBase;
  }

  let counter = 1;
  let candidate = `${normalizedBase}-${counter}`;
  while (usedIds.has(candidate)) {
    counter++;
    candidate = `${normalizedBase}-${counter}`;
  }
  return candidate;
}

export function normalizeModelsForAuthType(
  authType: AuthType,
  models: ProviderModelConfig[],
): ProviderModelConfig[] {
  const usedIds = new Set<string>();

  return models.map((model) => {
    const normalizedId = normalizeString(model.id);
    const normalizedUpstream = normalizeString(model.upstreamModelId);

    // For OpenAI-compatible providers, upstreamModelId is the real provider model id
    // and should always be present for stable request routing.
    const upstreamModelId =
      authType === AuthType.USE_OPENAI
        ? normalizedUpstream || normalizedId
        : normalizedUpstream;

    const preferredId =
      normalizedId ||
      (authType === AuthType.USE_OPENAI
        ? upstreamModelId
        : normalizedUpstream) ||
      "model";

    const conflictBase =
      authType === AuthType.USE_OPENAI
        ? upstreamModelId || preferredId
        : preferredId;

    const resolvedId = usedIds.has(preferredId)
      ? getNextAvailableModelId(conflictBase, usedIds)
      : preferredId;

    usedIds.add(resolvedId);

    if (authType === AuthType.USE_OPENAI) {
      return {
        ...model,
        id: resolvedId,
        upstreamModelId: upstreamModelId || resolvedId,
      };
    }

    return {
      ...model,
      id: resolvedId,
    };
  });
}

export function normalizeModelProvidersConfig(
  modelProviders: ModelProvidersConfig,
): ModelProvidersConfig {
  const normalized: ModelProvidersConfig = {};

  for (const [rawAuthType, models] of Object.entries(modelProviders)) {
    if (!Array.isArray(models)) {
      continue;
    }

    const authType = toAuthType(rawAuthType);
    if (!authType) {
      normalized[rawAuthType] = [...models];
      continue;
    }

    normalized[rawAuthType] = normalizeModelsForAuthType(authType, models);
  }

  return normalized;
}
