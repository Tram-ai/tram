/**
 * @license
 * Copyright 2025 TRAM Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGeminiContentGenerator } from './index.js';
import { GeminiContentGenerator } from './geminiContentGenerator.js';
import type { Config } from '../../config/config.js';
import { AuthType } from '../contentGenerator.js';

vi.mock('./geminiContentGenerator.js', () => ({
  GeminiContentGenerator: vi.fn().mockImplementation(() => ({})),
}));

describe('createGeminiContentGenerator', () => {
  let mockConfig: Config;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      getUsageStatisticsEnabled: vi.fn().mockReturnValue(false),
      getContentGeneratorConfig: vi.fn().mockReturnValue({}),
      getCliVersion: vi.fn().mockReturnValue('1.0.0'),
    } as unknown as Config;
  });

  it('should create a GeminiContentGenerator', () => {
    const config = {
      model: 'gemini-1.5-flash',
      apiKey: 'test-key',
      authType: AuthType.USE_GEMINI,
    };

    const generator = createGeminiContentGenerator(config, mockConfig);

    expect(GeminiContentGenerator).toHaveBeenCalled();
    expect(generator).toBeDefined();
  });

  it('should forward custom baseUrl to Gemini httpOptions', () => {
    const config = {
      model: 'gemini-1.5-flash',
      apiKey: 'test-key',
      baseUrl:
        'https://gateway.ai.cloudflare.com/v1/account-id/gateway-id/google-ai-studio',
      authType: AuthType.USE_GEMINI,
    };

    createGeminiContentGenerator(config, mockConfig);

    expect(GeminiContentGenerator).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-key',
        httpOptions: expect.objectContaining({
          baseUrl:
            'https://gateway.ai.cloudflare.com/v1/account-id/gateway-id/google-ai-studio',
        }),
      }),
      config,
    );
  });
});
