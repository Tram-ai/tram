/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MinecraftServerInfoTool } from './minecraft-server-info.js';

describe('MinecraftServerInfoTool', () => {
  let tool: MinecraftServerInfoTool;

  beforeEach(() => {
    tool = new MinecraftServerInfoTool();
  });

  it('should have correct name and properties', () => {
    expect(tool.name).toBe('minecraft_server_info');
    expect(tool.displayName).toBe('MinecraftServerInfo');
    expect(tool.isLmOnly).toBe(true);
    expect(tool.kind).toBe('fetch');
  });

  it('should accept list-versions action', () => {
    const invocation = tool.build({ action: 'list-versions' });
    expect(invocation).toBeDefined();
  });

  it('should accept get-server-info action with gameVersion', () => {
    const invocation = tool.build({ action: 'get-server-info', gameVersion: '1.20.1' });
    expect(invocation).toBeDefined();
  });

  it('should accept get-java-requirements action with gameVersion', () => {
    const invocation = tool.build({ action: 'get-java-requirements', gameVersion: '1.20.1' });
    expect(invocation).toBeDefined();
  });

  it('should accept get-by-hash action with hash parameter', () => {
    const validHash = 'a'.repeat(64); // Valid SHA256 hash format
    const invocation = tool.build({ action: 'get-by-hash', hash: validHash });
    expect(invocation).toBeDefined();
  });

  it('should have proper schema with required action parameter', () => {
    expect(tool.schema).toBeDefined();
    expect(tool.schema.name).toBe('minecraft_server_info');
    expect(tool.schema.parametersJsonSchema).toBeDefined();
    const schema = tool.schema.parametersJsonSchema as any;
    expect(schema.required).toContain('action');
  });

  it('should validate action enum values', () => {
    const schema = tool.schema.parametersJsonSchema as any;
    expect(schema.properties.action.enum).toContain('list-versions');
    expect(schema.properties.action.enum).toContain('get-server-info');
    expect(schema.properties.action.enum).toContain('get-java-requirements');
    expect(schema.properties.action.enum).toContain('get-by-hash');
  });
});

