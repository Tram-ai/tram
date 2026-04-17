/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ApprovalMode,
  AuthType,
  type ModelProvidersConfig,
} from '@tram-ai/tram-core';
import { Box, render, Text, useInput } from 'ink';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { SettingScope, type LoadedSettings } from '../config/settings.js';
import { t } from '../i18n/index.js';
import { themeManager } from '../ui/themes/theme-manager.js';
import { writeStderrLine } from '../utils/stdioHelpers.js';
import open from 'open';
import express from 'express';
import type { Server } from 'http';

type WizardStep =
  | 'providers'
  | 'providerConfig'
  | 'modelSelect'
  | 'providerContinue'
  | 'modelCustomInput'
  | 'approval'
  | 'proxyMode'
  | 'proxyCustom'
  | 'theme'
  | 'summary'
  | 'pollinationsAuth'
  | 'done';

type ProxyMode = 'system' | 'none' | 'custom';

type EditableProviderField =
  | 'baseUrl'
  | 'apiKey'
  | 'localModelsInput';

interface ProviderPreset {
  id: string;
  labelKey: string;
  authType: AuthType;
  defaultBaseUrl: string;
  defaultEnvKey: string;
  defaultModel: string;
}

interface ProviderConfig {
  providerId: string;
  providerLabelKey: string;
  authType: AuthType;
  baseUrl: string;
  envKey: string;
  apiKey: string;
  modelIds: string[];
  localModelsInput: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai-custom',
    labelKey: 'OpenAI (Custom)',
    authType: AuthType.USE_OPENAI,
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultEnvKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
  },
  {
    id: 'anthropic',
    labelKey: 'Anthropic Claude',
    authType: AuthType.USE_ANTHROPIC,
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultEnvKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  {
    id: 'gemini',
    labelKey: 'Google Gemini',
    authType: AuthType.USE_GEMINI,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultEnvKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'vertex-ai',
    labelKey: 'Google Vertex AI',
    authType: AuthType.USE_VERTEX_AI,
    defaultBaseUrl: 'https://aiplatform.googleapis.com',
    defaultEnvKey: 'GOOGLE_API_KEY',
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'siliconflow',
    labelKey: 'SiliconFlow',
    authType: AuthType.USE_OPENAI,
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    defaultEnvKey: 'SILICONFLOW_API_KEY',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
  },
  {
    id: 'cerebras',
    labelKey: 'Cerebras',
    authType: AuthType.USE_OPENAI,
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    defaultEnvKey: 'CEREBRAS_API_KEY',
    defaultModel: 'llama-3.3-70b',
  },
  {
    id: 'groq',
    labelKey: 'Groq',
    authType: AuthType.USE_OPENAI,
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultEnvKey: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    id: 'pollinations',
    labelKey: 'Pollinations',
    authType: AuthType.USE_OPENAI,
    defaultBaseUrl: 'https://gen.pollinations.ai/v1',
    defaultEnvKey: 'POLLINATIONS_API_KEY',
    defaultModel: 'openai',
  },
];

const APPROVAL_OPTIONS: Array<{ value: ApprovalMode; title: string; desc: string }> = [
  {
    value: ApprovalMode.PLAN,
    title: t('Plan only'),
    desc: t('Only generate plans, no execution. Best safety, lowest automation.'),
  },
  {
    value: ApprovalMode.DEFAULT,
    title: t('Ask every time'),
    desc: t('Every action requires confirmation. Safe but slower.'),
  },
  {
    value: ApprovalMode.AUTO_EDIT,
    title: t('Auto-approve edits'),
    desc: t('Edit/write tools are auto-approved, others still ask.'),
  },
  {
    value: ApprovalMode.YOLO,
    title: t('YOLO (recommended)'),
    desc: t('Fastest workflow. Fully automated execution with higher risk.'),
  },
];

function getFallbackModels(authType: AuthType): string[] {
  switch (authType) {
    case AuthType.USE_OPENAI:
      return ['gpt-4o', 'gpt-4.1', 'gpt-4-turbo', 'o3-mini'];
    case AuthType.USE_ANTHROPIC:
      return [
        'claude-3-7-sonnet-latest',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
      ];
    case AuthType.USE_GEMINI:
    case AuthType.USE_VERTEX_AI:
      return ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
    default:
      return [];
  }
}

function parseLocalModelsInput(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is string => item.length > 0);
}

async function fetchOpenAICompatibleModels(
  baseUrl: string,
  apiKey: string,
): Promise<string[]> {
  if (!baseUrl || !apiKey) {
    return [];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetch(`${normalized}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const json = (await response.json()) as {
      data?: Array<{ id?: string }>;
    };

    return [...new Set((json.data || [])
      .map((m) => m.id?.trim())
      .filter((id): id is string => !!id))];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function moveCursor(current: number, delta: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return (current + delta + max) % max;
}

function sanitizeInput(input: string): string {
  return input.replace(/[\r\n]/g, '');
}

function generateEnvKey(baseKey: string): string {
  const normalized = baseKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${normalized}_${suffix}`;
}

function generateModelAlias(modelId: string, providerId: string): string {
  const modelPart = modelId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const providerPart = providerId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);
  const suffix = Math.random().toString(36).slice(2, 9).toLowerCase();
  const base = modelPart || 'model';
  return `${base}-${providerPart}${suffix}`;
}

function appendProviderModels(
  existing: ModelProvidersConfig,
  authType: AuthType,
  config: ProviderConfig,
): string[] {
  const models = [...(existing[authType] || [])];
  const savedModelIds: string[] = [];

  for (const upstreamModelId of config.modelIds) {
    const localModelId =
      authType === AuthType.USE_OPENAI
        ? generateModelAlias(upstreamModelId, config.providerId)
        : upstreamModelId;
    const index = models.findIndex((m) => m.id === localModelId);

    const modelName =
      authType === AuthType.USE_OPENAI && config.providerLabelKey
        ? `[${config.providerLabelKey}]${upstreamModelId}`
        : upstreamModelId;

    const model = {
      id: localModelId,
      name: modelName,
      upstreamModelId:
        authType === AuthType.USE_OPENAI ? upstreamModelId : undefined,
      envKey: config.envKey || undefined,
      baseUrl: config.baseUrl || undefined,
    };

    if (index >= 0) {
      models[index] = model;
    } else {
      models.push(model);
    }
    savedModelIds.push(localModelId);
  }

  existing[authType] = models;
  return savedModelIds;
}

function WizardApp({
  settings,
  enableLocalModelList,
  onComplete,
}: {
  settings: LoadedSettings;
  enableLocalModelList: boolean;
  onComplete: (success: boolean) => void;
}): React.JSX.Element {
  const [terminalDimensions, setTerminalDimensions] = useState({
    columns: process.stdout.columns ?? 120,
    rows: process.stdout.rows ?? 24,
  });

  useEffect(() => {
    const handleResize = () => {
      setTerminalDimensions({
        columns: process.stdout.columns ?? 120,
        rows: process.stdout.rows ?? 24,
      });
    };
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  const terminalWidth = terminalDimensions.columns;
  const terminalHeight = terminalDimensions.rows;
  const [step, setStep] = useState<WizardStep>('providers');
  const [providerCursor, setProviderCursor] = useState(0);
  const [selectedProviderIds, setSelectedProviderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [configIndex, setConfigIndex] = useState(0);
  const [pollinationsAuthStatus, setPollinationsAuthStatus] = useState<'waiting' | 'authenticating' | 'success' | 'error'>('waiting');
  const serverIdRef = useRef<Server | null>(null);
  const [providerFieldCursor, setProviderFieldCursor] = useState(0);
  const [editingField, setEditingField] = useState<EditableProviderField | null>(
    null,
  );
  const [editingValue, setEditingValue] = useState('');
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [modelCursor, setModelCursor] = useState(0);

  const COLUMN_WIDTH = 40;
  const columns = Math.max(1, Math.floor(terminalWidth / COLUMN_WIDTH));
  const PAGE_SIZE_ROWS = Math.max(5, terminalHeight - 10);
  const PAGE_SIZE = PAGE_SIZE_ROWS * columns;

  const visibleModelStart =
    Math.floor(modelCursor / columns) >= PAGE_SIZE_ROWS
      ? Math.floor((modelCursor - (PAGE_SIZE_ROWS / 2) * columns) / columns) *
        columns
      : 0;
  const clampedStart = Math.max(
    0,
    Math.min(
      Math.floor((modelOptions.length + 1 - PAGE_SIZE + columns - 1) / columns) *
        columns,
      visibleModelStart,
    ),
  );

  const visibleModelEnd = Math.min(modelOptions.length + 1, clampedStart + PAGE_SIZE);

  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(
    new Set(),
  );
  const [providerContinueCursor, setProviderContinueCursor] = useState(1);
  const [customModelInput, setCustomModelInput] = useState('');
  const [approvalCursor, setApprovalCursor] = useState(
    APPROVAL_OPTIONS.findIndex((o) => o.value === ApprovalMode.YOLO),
  );
  const [proxyModeCursor, setProxyModeCursor] = useState(0);
  const [customProxy, setCustomProxy] = useState('');
  const [themeCursor, setThemeCursor] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(false);

  const selectedProviders = useMemo(
    () =>
      PROVIDER_PRESETS.filter((provider) => selectedProviderIds.has(provider.id)),
    [selectedProviderIds],
  );

  const currentConfig = providerConfigs[configIndex];

  const themeOptions = useMemo(
    () =>
      themeManager
        .getAvailableThemes()
        .filter((themeItem) => themeItem.type !== 'custom')
        .map((themeItem) => themeItem.name),
    [],
  );

  useEffect(() => {
    if (step !== 'modelSelect' || !currentConfig) {
      return;
    }

    let disposed = false;

    const loadModels = async () => {
      setIsModelLoading(true);
      let models = getFallbackModels(currentConfig.authType);

      const fetched = await fetchOpenAICompatibleModels(
        currentConfig.baseUrl,
        currentConfig.apiKey,
      );
      if (fetched.length > 0) {
        models = fetched;
      }

      if (enableLocalModelList) {
        const localModels = parseLocalModelsInput(currentConfig.localModelsInput);
        if (localModels.length > 0) {
          models = [...new Set([...models, ...localModels])];
        }
      }

      if (!disposed) {
        models = [...new Set([...models, ...currentConfig.modelIds])];
        setModelOptions(models);
        const initial = models.findIndex((m) => currentConfig.modelIds.includes(m));
        setModelCursor(initial >= 0 ? initial : 0);
        setSelectedModelIds(new Set(currentConfig.modelIds));
        setIsModelLoading(false);
        setErrorMessage('');
      }
    };

    void loadModels();
    return () => {
      disposed = true;
    };
  }, [step, currentConfig, enableLocalModelList]);

  const queueSelectedProvidersForConfig = () => {
    const existingProviderIds = new Set(providerConfigs.map((cfg) => cfg.providerId));
    const providersToAdd = selectedProviders.filter(
      (provider) => !existingProviderIds.has(provider.id),
    );

    if (providersToAdd.length === 0) {
      setErrorMessage(
        t('No new provider selected. Please select at least one unconfigured provider.'),
      );
      return;
    }

    const configs = providersToAdd.map((provider) => ({
      providerId: provider.id,
      providerLabelKey: provider.labelKey,
      authType: provider.authType,
      baseUrl: provider.defaultBaseUrl,
      envKey: generateEnvKey(provider.defaultEnvKey),
      apiKey: '',
      modelIds: [],
      localModelsInput: '',
    }));

    const startIndex = providerConfigs.length;
    setProviderConfigs((prev) => [...prev, ...configs]);

    // Check if Pollinations is among selected and not yet configured
    const hasPollinations = configs.some((c) => c.providerId === 'pollinations');
    if (hasPollinations) {
      setStep('pollinationsAuth');
      startPollinationsAuth(startIndex + configs.findIndex((c) => c.providerId === 'pollinations'));
      return;
    }

    setConfigIndex(startIndex);
    setProviderFieldCursor(0);
    setErrorMessage('');
    setStep('providerConfig');
  };

  const startPollinationsAuth = (configIdx: number) => {
    setPollinationsAuthStatus('authenticating');
    const port = 9991;
    const app = express();
    const relayUrl = 'https://enter.pollinations.ai/authorize?app_key=pk_Bl8CdIWBVPsm4IPa&redirect_url=http%3A%2F%2Flocalhost%3A9991%2Fcallback&expiry=360';

    app.get('/callback', (req, res) => {
      res.send(`
        <html>
          <body>
            <script>
              const hash = window.location.hash;
              if (hash) {
                fetch('/token_relay?' + hash.substring(1), { method: 'POST' })
                  .then(() => {
                    document.body.innerHTML = '<h1>授权成功！正在关闭窗口...</h1>';
                    window.close();
                  });
              } else {
                document.body.innerHTML = '<h1>授权失败：未找到 Token</h1>';
              }
            </script>
          </body>
        </html>
      `);
    });

    app.post('/token_relay', express.json(), (req, res) => {
      const apiKey = req.query['api_key'] as string;
      if (apiKey) {
        setProviderConfigs((prev) =>
          prev.map((cfg, idx) => (idx === configIdx ? { ...cfg, apiKey } : cfg)),
        );
        setPollinationsAuthStatus('success');
        setTimeout(() => {
          setStep('providerConfig');
          setConfigIndex(configIdx);
          if (serverIdRef.current) {
            serverIdRef.current.close();
            serverIdRef.current = null;
          }
        }, 1500);
      }
      res.sendStatus(200);
    });

    const server = app.listen(port, () => {
      serverIdRef.current = server;
      void open(relayUrl);
    });
  };

  const updateCurrentConfig = (
    updater: (config: ProviderConfig) => ProviderConfig,
  ) => {
    setProviderConfigs((prev) =>
      prev.map((config, idx) => (idx === configIndex ? updater(config) : config)),
    );
  };

  const proxyModes: ProxyMode[] = ['system', 'none', 'custom'];

  const saveSettings = () => {
    if (providerConfigs.length === 0) {
      setErrorMessage(t('At least one provider must be configured.'));
      return;
    }

    const scope = SettingScope.User;
    const nextProviders: ModelProvidersConfig = {};
    const nextEnv = {
      ...(settings.merged.env || {}),
    } as Record<string, string>;
    let defaultProviderModelId: string | undefined;

    for (const providerConfig of providerConfigs) {
      const savedIds = appendProviderModels(
        nextProviders,
        providerConfig.authType,
        providerConfig,
      );
      if (providerConfig.envKey && providerConfig.apiKey) {
        nextEnv[providerConfig.envKey] = providerConfig.apiKey;
      }
      if (!defaultProviderModelId && savedIds.length > 0) {
        defaultProviderModelId = savedIds[0];
      }
    }

    const defaultProvider = providerConfigs[0];

    settings.setValue(scope, 'modelProviders', nextProviders);
    settings.setValue(scope, 'env', nextEnv);
    settings.setValue(scope, 'security.auth.selectedType', defaultProvider.authType);
    settings.setValue(scope, 'model.name', defaultProviderModelId);
    settings.setValue(
      scope,
      'tools.approvalMode',
      APPROVAL_OPTIONS[approvalCursor].value,
    );
    settings.setValue(scope, 'approvalMode', undefined);

    const proxyMode = proxyModes[proxyModeCursor];
    if (proxyMode === 'none') {
      settings.setValue(scope, 'proxy', '');
    } else if (proxyMode === 'custom') {
      settings.setValue(scope, 'proxy', customProxy.trim());
    }

    if (themeOptions.length > 0) {
      settings.setValue(scope, 'ui.theme', themeOptions[themeCursor] || themeOptions[0]);
    }

    // Deprecated direct credential fields are intentionally no longer used.
    settings.setValue(scope, 'security.auth.baseUrl', undefined);
    settings.setValue(scope, 'security.auth.apiKey', undefined);
    writeStderrLine(
      t(
        'Warning: security.auth.apiKey and security.auth.baseUrl are deprecated. Please migrate credentials to modelProviders with envKey.',
      ),
    );

    setStep('done');
  };

  useInput((input, key) => {
    if (key.escape) {
      if (editingField) {
        setEditingField(null);
        setEditingValue('');
        return;
      }

      if (step === 'providers') {
        onComplete(false);
        return;
      }

      if (step === 'providerConfig') {
        setStep('providers');
        return;
      }

      if (step === 'modelSelect') {
        setStep('providerConfig');
        return;
      }

      if (step === 'modelCustomInput') {
        setStep('modelSelect');
        return;
      }

      if (step === 'providerContinue') {
        setStep('modelSelect');
        return;
      }

      if (step === 'approval') {
        setStep('providerContinue');
        return;
      }

      if (step === 'proxyMode') {
        setStep('approval');
        return;
      }

      if (step === 'proxyCustom') {
        setStep('proxyMode');
        return;
      }

      if (step === 'theme') {
        setStep(proxyModes[proxyModeCursor] === 'custom' ? 'proxyCustom' : 'proxyMode');
        return;
      }

      if (step === 'summary') {
        setStep('theme');
        return;
      }

      if (step === 'done') {
        onComplete(true);
      }
      return;
    }

    if (editingField) {
      if (key.return) {
        updateCurrentConfig((config) => ({
          ...config,
          [editingField]: sanitizeInput(editingValue),
        }));
        setEditingField(null);
        setEditingValue('');
        return;
      }
      if (key.backspace || key.delete) {
        setEditingValue((value) => value.slice(0, -1));
        return;
      }
      if (!key.ctrl && !key.meta && input) {
        setEditingValue((value) => value + input);
      }
      return;
    }

    if (step === 'providers') {
      if (key.upArrow || key.leftArrow) {
        setProviderCursor((cursor) => moveCursor(cursor, -1, PROVIDER_PRESETS.length));
        return;
      }
      if (key.downArrow || key.rightArrow) {
        setProviderCursor((cursor) => moveCursor(cursor, 1, PROVIDER_PRESETS.length));
        return;
      }
      if (input === ' ') {
        const provider = PROVIDER_PRESETS[providerCursor];
        setSelectedProviderIds((prev) => {
          const next = new Set(prev);
          if (next.has(provider.id)) {
            next.delete(provider.id);
          } else {
            next.add(provider.id);
          }
          return next;
        });
        return;
      }
      if (key.return) {
        if (selectedProviderIds.size === 0) {
          setErrorMessage(t('Select at least one provider.'));
          return;
        }
        queueSelectedProvidersForConfig();
      }
      return;
    }

    if (step === 'providerConfig' && currentConfig) {
      const fieldCount = enableLocalModelList ? 3 : 2;
      if (key.upArrow || key.leftArrow) {
        setProviderFieldCursor((cursor) => moveCursor(cursor, -1, fieldCount));
        return;
      }
      if (key.downArrow || key.rightArrow) {
        setProviderFieldCursor((cursor) => moveCursor(cursor, 1, fieldCount));
        return;
      }
      if (key.return) {
        const field: EditableProviderField =
          providerFieldCursor === 0
            ? 'baseUrl'
            : providerFieldCursor === 1
                ? 'apiKey'
                : 'localModelsInput';
        setEditingField(field);
        setEditingValue(currentConfig[field]);
        return;
      }
      if (input.toLowerCase() === 'n') {
        setStep('modelSelect');
      }
      return;
    }

    if (step === 'modelSelect') {
      if (isModelLoading) {
        return;
      }
      const max = modelOptions.length + 1;
      if (key.upArrow || key.leftArrow) {
        setModelCursor((cursor) => moveCursor(cursor, -1, max));
        return;
      }
      if (key.downArrow || key.rightArrow) {
        setModelCursor((cursor) => moveCursor(cursor, 1, max));
        return;
      }
      if (input === ' ') {
        if (modelCursor < modelOptions.length) {
          const modelId = modelOptions[modelCursor];
          setSelectedModelIds((prev) => {
            const next = new Set(prev);
            if (next.has(modelId)) {
              next.delete(modelId);
            } else {
              next.add(modelId);
            }
            // Clear error message if at least one model is selected
            if (next.size > 0) {
              setErrorMessage('');
            }
            return next;
          });
        }
        return;
      }
      if (key.return) {
        if (modelCursor === modelOptions.length) {
          setCustomModelInput('');
          setStep('modelCustomInput');
          return;
        }

        if (selectedModelIds.size === 0) {
          setErrorMessage(t('Select at least one model.'));
          return;
        }

        updateCurrentConfig((config) => ({
          ...config,
          modelIds: Array.from(selectedModelIds),
        }));
        setErrorMessage('');
        if (configIndex < providerConfigs.length - 1) {
          setConfigIndex(configIndex + 1);
          setProviderFieldCursor(0);
          setStep('providerConfig');
        } else {
          setProviderContinueCursor(1);
          setStep('providerContinue');
        }
      }
      return;
    }

    if (step === 'providerContinue') {
      if (key.upArrow || key.leftArrow) {
        setProviderContinueCursor((cursor) => moveCursor(cursor, -1, 2));
        return;
      }
      if (key.downArrow || key.rightArrow) {
        setProviderContinueCursor((cursor) => moveCursor(cursor, 1, 2));
        return;
      }
      if (key.return) {
        if (providerContinueCursor === 0) {
          setErrorMessage('');
          setStep('providers');
        } else {
          setStep('approval');
        }
      }
      return;
    }

    if (step === 'modelCustomInput') {
      if (key.return) {
        const custom = customModelInput.trim();
        if (!custom) {
          setErrorMessage(t('Model name cannot be empty.'));
          return;
        }

        const nextModelIds = Array.from(new Set([...selectedModelIds, custom]));
        updateCurrentConfig((config) => ({
          ...config,
          modelIds: nextModelIds,
        }));
        setModelOptions((prev) => (prev.includes(custom) ? prev : [...prev, custom]));
        setSelectedModelIds(new Set(nextModelIds));
        setErrorMessage('');
        setStep('modelSelect');
        return;
      }
      if (key.backspace || key.delete) {
        setCustomModelInput((value) => value.slice(0, -1));
        return;
      }
      if (!key.ctrl && !key.meta && input) {
        setCustomModelInput((value) => value + input);
      }
      return;
    }

    if (step === 'approval') {
      if (key.upArrow || key.leftArrow) {
        setApprovalCursor((cursor) => moveCursor(cursor, -1, APPROVAL_OPTIONS.length));
        return;
      }
      if (key.downArrow || key.rightArrow) {
        setApprovalCursor((cursor) => moveCursor(cursor, 1, APPROVAL_OPTIONS.length));
        return;
      }
      if (key.return) {
        setStep('proxyMode');
      }
      return;
    }

    if (step === 'proxyMode') {
      if (key.upArrow || key.leftArrow) {
        setProxyModeCursor((cursor) => moveCursor(cursor, -1, proxyModes.length));
        return;
      }
      if (key.downArrow || key.rightArrow) {
        setProxyModeCursor((cursor) => moveCursor(cursor, 1, proxyModes.length));
        return;
      }
      if (key.return) {
        if (proxyModes[proxyModeCursor] === 'custom') {
          setStep('proxyCustom');
        } else {
          setStep('theme');
        }
      }
      return;
    }

    if (step === 'proxyCustom') {
      if (key.return) {
        setStep('theme');
        return;
      }
      if (key.backspace || key.delete) {
        setCustomProxy((value) => value.slice(0, -1));
        return;
      }
      if (!key.ctrl && !key.meta && input) {
        setCustomProxy((value) => value + input);
      }
      return;
    }

    if (step === 'theme') {
      if (themeOptions.length === 0) {
        setStep('summary');
        return;
      }
      if (key.upArrow || key.leftArrow) {
        setThemeCursor((cursor) => moveCursor(cursor, -1, themeOptions.length));
        return;
      }
      if (key.downArrow || key.rightArrow) {
        setThemeCursor((cursor) => moveCursor(cursor, 1, themeOptions.length));
        return;
      }
      if (key.return) {
        setStep('summary');
      }
      return;
    }

    if (step === 'summary' && key.return) {
      saveSettings();
      return;
    }

    if (step === 'done' && key.return) {
      onComplete(true);
    }
  });

  const renderProvidersStep = () => (
    <Box flexDirection="column" gap={1}>
      <Text bold>{t('Initialization: Select providers')}</Text>
      <Text color="gray">
        {t(
          'Use ↑↓←→ to move, Space to toggle, Enter to continue. You can configure multiple providers in one run.',
        )}
      </Text>
      <Text color="gray">
        {t('Tip: after finishing one provider, you can return here to add more providers.')}
      </Text>
      {PROVIDER_PRESETS.map((provider, index) => {
        const focused = index === providerCursor;
        const selected = selectedProviderIds.has(provider.id);
        return (
          <Text key={provider.id} color={focused ? 'cyan' : undefined}>
            {focused ? '❯' : ' '} {selected ? '[x]' : '[ ]'} {t(provider.labelKey)}
          </Text>
        );
      })}
    </Box>
  );

  const renderProviderConfigStep = () => {
    if (!currentConfig) {
      return <Text>{t('No provider selected.')}</Text>;
    }

    const fields = [
      { label: t('Base URL'), value: currentConfig.baseUrl || '-', key: 'baseUrl' as const },
      {
        label: t('API key'),
        value: currentConfig.apiKey
          ? '*'.repeat(Math.min(currentConfig.apiKey.length, 16))
          : '-',
        key: 'apiKey' as const,
      },
      ...(enableLocalModelList
        ? [
            {
              label: t('Local model list (comma separated)'),
              value: currentConfig.localModelsInput || '-',
              key: 'localModelsInput' as const,
            },
          ]
        : []),
    ];

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>
          {t('Configure provider {{current}}/{{total}}: {{name}}', {
            current: String(configIndex + 1),
            total: String(providerConfigs.length),
            name: t(currentConfig.providerLabelKey),
          })}
        </Text>
        <Text color="gray">
          {t('Use ↑↓←→ to choose a field. Enter to edit inline. Press N to continue to model selection.')}
        </Text>
        <Text>{t('API key env var') + ': ' + (currentConfig.envKey || '-')}</Text>
        {fields.map((field, index) => {
          const isEditingThisRow = editingField === field.key;
          const editingDisplay =
            field.key === 'apiKey' ? '*'.repeat(editingValue.length) : editingValue;
          const cursor = isEditingThisRow ? '|' : '';
          return (
            <Text key={field.label} color={index === providerFieldCursor ? 'cyan' : undefined}>
              {index === providerFieldCursor ? '❯' : ' '} {field.label}:{' '}
              {isEditingThisRow ? `${editingDisplay}${cursor}` : field.value}
            </Text>
          );
        })}
      </Box>
    );
  };

  const renderModelSelectStep = () => (
    <Box flexDirection="column" gap={1}>
      <Text bold>
        {t('Model selection: {{name}}', {
          name: currentConfig ? t(currentConfig.providerLabelKey) : '-',
        })}
      </Text>
      <Text color="gray">
        {t(
          'Use ↑↓←→ to move, Space to toggle model, Enter to continue. Try OpenAI-compatible /models first; use custom if needed.',
        )}
      </Text>
      {isModelLoading ? (
        <Text>{t('Loading models...')}</Text>
      ) : (
        <>
          <Box flexDirection="row" flexWrap="wrap">
            {modelOptions.slice(clampedStart, visibleModelEnd).map((model, index) => {
              const actualIndex = clampedStart + index;
              if (actualIndex >= modelOptions.length) return null;
              return (
                <Box key={model} width={COLUMN_WIDTH}>
                  <Text color={actualIndex === modelCursor ? 'cyan' : undefined}>
                    {actualIndex === modelCursor ? '❯' : ' '} {selectedModelIds.has(model) ? '[x]' : '[ ]'} {model}
                  </Text>
                </Box>
              );
            })}
            {clampedStart + PAGE_SIZE > modelOptions.length && (
              <Box width={COLUMN_WIDTH}>
                <Text color={modelCursor === modelOptions.length ? 'cyan' : undefined}>
                  {modelCursor === modelOptions.length ? '❯' : ' '} {t('Custom model...')}
                </Text>
              </Box>
            )}
          </Box>
          <Text color="gray">
            {t('Showing {{start}}-{{end}} of {{total}}', {
              start: String(Math.min(modelOptions.length + 1, clampedStart + 1)),
              end: String(Math.min(modelOptions.length + 1, clampedStart + PAGE_SIZE)),
              total: String(modelOptions.length + 1),
            })}
          </Text>
        </>
      )}
    </Box>
  );

  const renderCustomModelInputStep = () => (
    <Box flexDirection="column" gap={1}>
      <Text bold>{t('Enter custom model name')}</Text>
      <Text color="gray">{t('Press Enter to confirm and keep selecting models.')}</Text>
      <Text>{'> ' + customModelInput}</Text>
    </Box>
  );

  const renderProviderContinueStep = () => {
    const options = [
      t('Yes, add another provider'),
      t('No, continue setup'),
    ];

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{t('Continue adding providers?')}</Text>
        <Text color="gray">
          {t('You can return to provider list and add additional providers now.')}
        </Text>
        {options.map((option, index) => (
          <Text key={option} color={index === providerContinueCursor ? 'cyan' : undefined}>
            {index === providerContinueCursor ? '❯' : ' '} {option}
          </Text>
        ))}
      </Box>
    );
  };

  const renderApprovalStep = () => (
    <Box flexDirection="column" gap={1}>
      <Text bold>{t('Select approval mode')}</Text>
      <Text color="gray">{t('Recommended: YOLO')}</Text>
      {APPROVAL_OPTIONS.map((option, index) => (
        <Box key={option.value} flexDirection="column">
          <Text color={index === approvalCursor ? 'cyan' : undefined}>
            {index === approvalCursor ? '❯' : ' '} {option.title}
          </Text>
          <Text color="gray">  {option.desc}</Text>
        </Box>
      ))}
    </Box>
  );

  const renderProxyModeStep = () => {
    const labels = [t('Follow system proxy'), t('No proxy'), t('Custom proxy')];
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{t('Proxy configuration')}</Text>
        <Text color="gray">{t('Use ↑↓←→ to choose.')}</Text>
        {labels.map((label, index) => (
          <Text key={label} color={index === proxyModeCursor ? 'cyan' : undefined}>
            {index === proxyModeCursor ? '❯' : ' '} {label}
          </Text>
        ))}
      </Box>
    );
  };

  const renderProxyCustomStep = () => (
    <Box flexDirection="column" gap={1}>
      <Text bold>{t('Enter custom proxy')}</Text>
      <Text color="gray">{t('Example: http://127.0.0.1:7890')}</Text>
      <Text>{'> ' + customProxy}</Text>
    </Box>
  );

  const renderThemeStep = () => {
    const previewTheme =
      themeOptions.length > 0 ? themeManager.getTheme(themeOptions[themeCursor]) : undefined;
    const useTwoColumnLayout = terminalWidth >= 120;

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{t('Select theme')}</Text>
        <Text color="gray">{t('This list follows built-in /theme options.')}</Text>
        <Box flexDirection={useTwoColumnLayout ? 'row' : 'column'} gap={2}>
          <Box flexDirection="column" width={useTwoColumnLayout ? 44 : undefined}>
            {themeOptions.map((name, index) => (
              <Text key={name} color={index === themeCursor ? 'cyan' : undefined}>
                {index === themeCursor ? '❯' : ' '} {name}
              </Text>
            ))}
          </Box>
          {previewTheme && (
            <Box flexDirection="column" marginTop={useTwoColumnLayout ? 0 : 1}>
              <Text color="gray">{t('Theme preview')}</Text>
              <Text color={previewTheme.colors.AccentBlue}>{t('Preview: info text')}</Text>
              <Text color={previewTheme.colors.AccentGreen}>{t('Preview: success text')}</Text>
              <Text color={previewTheme.colors.AccentRed}>{t('Preview: error text')}</Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const renderSummaryStep = () => {
    const proxyMode = proxyModes[proxyModeCursor];
    const proxyLabel =
      proxyMode === 'system'
        ? t('Follow system proxy')
        : proxyMode === 'none'
          ? t('No proxy')
          : customProxy || '-';

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{t('Review configuration')}</Text>
        <Text>
          {t('Providers') + ': ' + providerConfigs.map((p) => t(p.providerLabelKey)).join(', ')}
        </Text>
        <Text>
          {t('Default provider') + ': ' + (providerConfigs[0] ? t(providerConfigs[0].providerLabelKey) : '-')}
        </Text>
        <Text>{t('Default model') + ': ' + (providerConfigs[0]?.modelIds[0] || '-')}</Text>
        <Text>
          {t('Selected models') + ': ' + providerConfigs.map((p) => `${t(p.providerLabelKey)}(${p.modelIds.join(', ')})`).join('; ')}
        </Text>
        <Text>{t('Approval mode') + ': ' + APPROVAL_OPTIONS[approvalCursor].title}</Text>
        <Text>{t('Proxy') + ': ' + proxyLabel}</Text>
        <Text>{t('Theme') + ': ' + (themeOptions[themeCursor] || '-')}</Text>
        <Text color="gray">{t('Press Enter to save, Esc to cancel.')}</Text>
      </Box>
    );
  };

  const renderPollinationsAuthStep = () => {
    const relayUrl = 'https://enter.pollinations.ai/authorize?app_key=pk_Bl8CdIWBVPsm4IPa&redirect_url=http%3A%2F%2Flocalhost%3A9991%2Fcallback&expiry=360';
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{t('Initialization: Pollinations Authorization')}</Text>
        <Text>{t('Waiting for browser authorization...')}</Text>
        <Text color="gray">
          {t('If the browser does not open automatically, please click [here]({{url}}).', {
            url: relayUrl,
          })}
        </Text>
        {pollinationsAuthStatus === 'success' && (
          <Text color="green">{t('Authorization successful! Returning to wizard...')}</Text>
        )}
        {pollinationsAuthStatus === 'error' && (
          <Text color="red">{t('Authorization failed or timed out.')}</Text>
        )}
      </Box>
    );
  };

  const renderDoneStep = () => (
    <Box flexDirection="column" gap={1}>
      <Text color="green" bold>
        {t('Initialization complete.')}
      </Text>
      <Text>{t('Settings were saved. Press Enter to continue.')}</Text>
    </Box>
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      width={Math.max(90, Math.min(terminalWidth - 2, 140))}
    >
      {step !== 'done' && (
        <>
          <Text bold>{t('TRAM Initialization Wizard')}</Text>
          <Text color="gray">{t('Esc to go back, Esc again at provider list to cancel.')}</Text>
        </>
      )}
      <Box marginTop={step !== 'done' ? 1 : 0} flexDirection="column">
        {step === 'providers' && renderProvidersStep()}
        {step === 'providerConfig' && renderProviderConfigStep()}
        {step === 'modelSelect' && renderModelSelectStep()}
        {step === 'providerContinue' && renderProviderContinueStep()}
        {step === 'modelCustomInput' && renderCustomModelInputStep()}
        {step === 'approval' && renderApprovalStep()}
        {step === 'proxyMode' && renderProxyModeStep()}
        {step === 'proxyCustom' && renderProxyCustomStep()}
        {step === 'theme' && renderThemeStep()}
        {step === 'summary' && renderSummaryStep()}
        {step === 'pollinationsAuth' && renderPollinationsAuthStep()}
        {step === 'done' && renderDoneStep()}
      </Box>
      {errorMessage && (
        <Box marginTop={1}>
          <Text color="red">{errorMessage}</Text>
        </Box>
      )}
    </Box>
  );
}

export async function runInitializationWizard(
  settings: LoadedSettings,
  options?: {
    enableLocalModelList?: boolean;
  },
): Promise<boolean> {
  return new Promise((resolve) => {
    const instance = render(
      <WizardApp
        settings={settings}
        enableLocalModelList={options?.enableLocalModelList ?? false}
        onComplete={(success) => {
          instance.unmount();
          resolve(success);
        }}
      />,
    );
  });
}
