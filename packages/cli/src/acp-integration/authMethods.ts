/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@tram-ai/tram-core';
import type { AuthMethod } from '@agentclientprotocol/sdk';

export function buildAuthMethods(): AuthMethod[] {
  return [
    {
      id: AuthType.USE_OPENAI,
      name: 'Use OpenAI API key',
      description: 'Requires setting the `OPENAI_API_KEY` environment variable',
      _meta: {
        type: 'terminal',
        args: ['--auth-type=openai'],
      },
    },
    {
      id: AuthType.TRAM_OAUTH,
      name: 'TRAM OAuth',
      description:
        'OAuth authentication for TRAM with free daily requests',
      _meta: {
        type: 'terminal',
        args: ['--auth-type=tram-oauth'],
      },
    },
  ];
}

export function filterAuthMethodsById(
  authMethods: AuthMethod[],
  authMethodId: string,
): AuthMethod[] {
  return authMethods.filter((method) => method.id === authMethodId);
}

export function pickAuthMethodsForDetails(details?: string): AuthMethod[] {
  const authMethods = buildAuthMethods();
  if (!details) {
    return authMethods;
  }
  if (details.includes('tram-oauth') || details.includes('TRAM OAuth')) {
    const narrowed = filterAuthMethodsById(authMethods, AuthType.TRAM_OAUTH);
    return narrowed.length ? narrowed : authMethods;
  }
  return authMethods;
}
