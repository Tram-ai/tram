/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FormattingNode {
  text: string;
  color: string | null;
  decorators: string[];
}

export interface FormattingResult {
  tree: FormattingNode[];
  raw: string;
  clean: string;
  html: string;
}

export interface StatusOptions {
  enableSRV?: boolean;
  timeoutMs?: number;
}

export interface ModernStatusPlayer {
  id: string | null;
  name: FormattingResult;
}

export interface ModernStatusResponse {
  version: {
    name: FormattingResult;
    protocol: number;
  };
  players: {
    max: number | null;
    online: number | null;
    sample: ModernStatusPlayer[];
  };
  motd: FormattingResult;
  favicon: string | null;
  srv_record: unknown;
  mods:
    | {
        type: string;
        list: Array<{ id: string; version: string }>;
      }
    | null;
  latency_ms: number | null;
}

export interface LegacyStatusResponse {
  version: {
    name: FormattingResult;
    protocol: number;
  } | null;
  players: {
    online: number;
    max: number;
  };
  motd: FormattingResult;
  srv_record: unknown;
}

export interface BedrockStatusResponse {
  server_guid: number;
  edition: string | null;
  motd: FormattingResult | null;
  protocol_version: number | null;
  version: string | null;
  online_players: number | null;
  max_players: number | null;
  server_id: string | null;
  gamemode: string | null;
  gamemode_id: number | null;
  port_ipv4: number | null;
  port_ipv6: number | null;
}

export interface QueryFullResponse {
  data: Record<string, string>;
  players: string[];
}

interface McqueryModule {
  status: {
    modern(
      hostname: string,
      port?: number,
      options?: StatusOptions,
    ): Promise<ModernStatusResponse>;
    legacy(
      hostname: string,
      port?: number,
      options?: StatusOptions,
    ): Promise<LegacyStatusResponse>;
    bedrock(
      hostname: string,
      port?: number,
      options?: StatusOptions,
    ): Promise<BedrockStatusResponse>;
  };
  query: {
    full(
      hostname: string,
      port?: number,
      options?: { timeoutMs?: number },
    ): Promise<QueryFullResponse>;
  };
}

async function loadMcquery(): Promise<McqueryModule> {
  const moduleName = "@tram-ai/mcquery";
  return (await import(moduleName)) as McqueryModule;
}

export async function getModernStatus(
  hostname: string,
  port?: number,
  options?: StatusOptions,
): Promise<ModernStatusResponse> {
  const mcquery = await loadMcquery();
  return mcquery.status.modern(hostname, port, options);
}

export async function getLegacyStatus(
  hostname: string,
  port?: number,
  options?: StatusOptions,
): Promise<LegacyStatusResponse> {
  const mcquery = await loadMcquery();
  return mcquery.status.legacy(hostname, port, options);
}

export async function getBedrockStatus(
  hostname: string,
  port?: number,
  options?: StatusOptions,
): Promise<BedrockStatusResponse> {
  const mcquery = await loadMcquery();
  return mcquery.status.bedrock(hostname, port, options);
}

export async function getQueryFull(
  hostname: string,
  port?: number,
  options?: { timeoutMs?: number },
): Promise<QueryFullResponse> {
  const mcquery = await loadMcquery();
  return mcquery.query.full(hostname, port, options);
}
