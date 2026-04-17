/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModCacheService } from './modCacheService.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('ModCacheService Integration', () => {
  let tempDir: string;
  let service: ModCacheService;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `mod-cache-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    service = new ModCacheService(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it('should store and retrieve mod info from session cache', async () => {
    const entry = {
      hash: 'abc123',
      fileName: 'testmod.jar',
      modInfo: {
        name: 'Test Mod',
        slug: 'test-mod',
        version: '1.0.0',
        projectUrl: 'https://modrinth.com/mod/test-mod',
        source: 'modrinth' as const,
        loaders: ['fabric'],
        gameVersions: ['1.20'],
      },
      cachedAt: new Date().toISOString(),
    };

    await service.storeModInfo(entry, 'session');
    const retrieved = await service.getModInfo('abc123');

    expect(retrieved).toBeDefined();
    expect(retrieved?.hash).toBe('abc123');
    expect(retrieved?.modInfo.name).toBe('Test Mod');
  });

  it('should promote from global to session cache', async () => {
    const entry = {
      hash: 'xyz789',
      fileName: 'anothermod.jar',
      modInfo: {
        name: 'Another Mod',
        slug: 'another-mod',
        version: '2.0.0',
        projectUrl: 'https://curseforge.com/minecraft/mods/another-mod',
        source: 'curseforge' as const,
        loaders: ['forge'],
        gameVersions: ['1.19'],
      },
      cachedAt: new Date().toISOString(),
    };

    // Store to global
    await service.storeModInfo(entry, 'global');

    // Create new service instance (simulating new request)
    const service2 = new ModCacheService(tempDir);

    // Should find in global cache and promote to session
    const retrieved = await service2.getModInfo('xyz789');

    expect(retrieved).toBeDefined();
    expect(retrieved?.hash).toBe('xyz789');
  });

  it('should persist to disk and survive service restart', async () => {
    const entry = {
      hash: 'persist123',
      fileName: 'persistmod.jar',
      modInfo: {
        name: 'Persist Mod',
        slug: 'persist-mod',
        version: '1.5.0',
        projectUrl: 'https://modrinth.com/mod/persist-mod',
        source: 'modrinth' as const,
        loaders: ['quilt'],
        gameVersions: ['1.21'],
      },
      cachedAt: new Date().toISOString(),
    };

    // Store to global (persists to disk)
    await service.storeModInfo(entry, 'global');

    // Create new service (fresh instance)
    const service2 = new ModCacheService(tempDir);

    // Should retrieve from persisted global cache
    const retrieved = await service2.getModInfo('persist123');

    expect(retrieved).toBeDefined();
    expect(retrieved?.modInfo.name).toBe('Persist Mod');
  });

  it('should handle cache misses gracefully', async () => {
    const result = await service.getModInfo('nonexistent');
    expect(result).toBeNull();
  });
});
