/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { modelCommand } from './modelCommand.js';
import { type CommandContext } from './types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import {
  AuthType,
  type ContentGeneratorConfig,
  type AvailableModel,
  type Config,
} from '@tram-ai/tram-core';

// Helper function to create a mock config
function createMockConfig(
  contentGeneratorConfig: ContentGeneratorConfig | null,
  configuredModels: AvailableModel[] = [],
): Partial<Config> {
  return {
    getContentGeneratorConfig: vi.fn().mockReturnValue(contentGeneratorConfig),
    getAllConfiguredModels: vi.fn().mockReturnValue(configuredModels),
  };
}

describe('modelCommand', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    mockContext = createMockCommandContext();
    vi.clearAllMocks();
  });

  it('should have the correct name and description', () => {
    expect(modelCommand.name).toBe('model');
    expect(modelCommand.description).toBe('Switch the model for this session');
  });

  it('should return error when config is not available', async () => {
    mockContext.services.config = null;

    const result = await modelCommand.action!(mockContext, '');

    expect(result).toEqual({
      type: 'message',
      messageType: 'error',
      content: 'Configuration not available.',
    });
  });

  it('should return initialize hint when no model is configured', async () => {
    const mockConfig = createMockConfig(null);
    mockContext.services.config = mockConfig as Config;

    const result = await modelCommand.action!(mockContext, '');

    expect(result).toEqual({
      type: 'message',
      messageType: 'error',
      content:
        'Please run tram --initialize to configure providers and authentication.',
    });
  });

  it('should open dialog when models exist even if content generator config is not ready', async () => {
    const models = [
      {
        id: 'test-model',
        label: 'test-model',
        authType: AuthType.USE_OPENAI,
      },
    ] as AvailableModel[];
    const mockConfig = createMockConfig({
      model: 'test-model',
      authType: undefined,
    }, models);
    mockContext.services.config = mockConfig as Config;

    const result = await modelCommand.action!(mockContext, '');

    expect(result).toEqual({
      type: 'dialog',
      dialog: 'model',
    });
  });

  it('should return dialog action for TRAM_OAUTH auth type', async () => {
    const mockConfig = createMockConfig({
      model: 'test-model',
      authType: AuthType.TRAM_OAUTH,
    }, [
      {
        id: 'test-model',
        label: 'test-model',
        authType: AuthType.TRAM_OAUTH,
      },
    ] as AvailableModel[]);
    mockContext.services.config = mockConfig as Config;

    const result = await modelCommand.action!(mockContext, '');

    expect(result).toEqual({
      type: 'dialog',
      dialog: 'model',
    });
  });

  it('should return dialog action for USE_OPENAI auth type', async () => {
    const mockConfig = createMockConfig({
      model: 'test-model',
      authType: AuthType.USE_OPENAI,
    }, [
      {
        id: 'test-model',
        label: 'test-model',
        authType: AuthType.USE_OPENAI,
      },
    ] as AvailableModel[]);
    mockContext.services.config = mockConfig as Config;

    const result = await modelCommand.action!(mockContext, '');

    expect(result).toEqual({
      type: 'dialog',
      dialog: 'model',
    });
  });

  it('should return dialog action for unsupported auth types', async () => {
    const mockConfig = createMockConfig({
      model: 'test-model',
      authType: 'UNSUPPORTED_AUTH_TYPE' as AuthType,
    }, [
      {
        id: 'test-model',
        label: 'test-model',
        authType: AuthType.USE_OPENAI,
      },
    ] as AvailableModel[]);
    mockContext.services.config = mockConfig as Config;

    const result = await modelCommand.action!(mockContext, '');

    expect(result).toEqual({
      type: 'dialog',
      dialog: 'model',
    });
  });

  it('should handle undefined auth type when models exist', async () => {
    const models = [
      {
        id: 'test-model',
        label: 'test-model',
        authType: AuthType.USE_OPENAI,
      },
    ] as AvailableModel[];
    const mockConfig = createMockConfig({
      model: 'test-model',
      authType: undefined,
    }, models);
    mockContext.services.config = mockConfig as Config;

    const result = await modelCommand.action!(mockContext, '');

    expect(result).toEqual({
      type: 'dialog',
      dialog: 'model',
    });
  });
});
