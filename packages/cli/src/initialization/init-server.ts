/**
 * Initialization utilities.
 *
 * Shared helpers for applying web/paste configuration payloads,
 * detecting local IPs, and parsing JSON request bodies.
 */

import http from 'node:http';
import os from 'node:os';
import {
  ApprovalMode,
} from '@tram-ai/tram-core';
import { SettingScope, type LoadedSettings } from '../config/settings.js';

// ============================================================
// Types
// ============================================================

/**
 * New multi-provider payload from the rewritten web UI.
 * `settings` is a fully-formed settings.json object built client-side.
 * `rawSettings` is a paste-in string when the user manually pastes JSON.
 */
export interface WebSettingsPayload {
  settings?: Record<string, unknown>;
  rawSettings?: string;
}

export const APPROVAL_MAP: Record<string, ApprovalMode> = {
  plan: ApprovalMode.PLAN,
  default: ApprovalMode.DEFAULT,
  'auto-edit': ApprovalMode.AUTO_EDIT,
  yolo: ApprovalMode.YOLO,
};

// ============================================================
// IP Detection
// ============================================================

export function getLocalIPs(): string[] {
  const ips: string[] = ['localhost'];
  const interfaces = os.networkInterfaces();

  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) {
        ips.push(info.address);
      }
    }
  }

  return ips;
}

// ============================================================
// Config Save Logic
// ============================================================

/**
 * Apply the settings object (already constructed by the web page) to the
 * LoadedSettings store.  Handles both ``{ settings }`` and ``{ rawSettings }``
 * payloads.
 */
export function applyWebSettings(
  store: LoadedSettings,
  payload: WebSettingsPayload,
): void {
  let obj: Record<string, unknown>;

  if (payload.rawSettings) {
    obj = JSON.parse(payload.rawSettings) as Record<string, unknown>;
  } else if (payload.settings) {
    obj = payload.settings;
  } else {
    throw new Error('Missing settings or rawSettings');
  }

  const scope = SettingScope.User;

  // modelProviders
  if (obj['modelProviders']) {
    store.setValue(scope, 'modelProviders', obj['modelProviders']);
  }

  // env (merge with existing)
  if (obj['env'] && typeof obj['env'] === 'object') {
    const merged: Record<string, string> = {
      ...((store.merged.env as Record<string, string>) || {}),
      ...(obj['env'] as Record<string, string>),
    };
    store.setValue(scope, 'env', merged);
  }

  // security.auth
  const sec = obj['security'];
  if (sec && typeof sec === 'object') {
    const secObj = sec as Record<string, unknown>;
    const auth = secObj['auth'];
    if (auth && typeof auth === 'object') {
      const authObj = auth as Record<string, unknown>;
      if (authObj['selectedType']) {
        store.setValue(scope, 'security.auth.selectedType', authObj['selectedType']);
      }
    }
  }

  // model.name
  const mdl = obj['model'];
  if (mdl && typeof mdl === 'object') {
    const mdlObj = mdl as Record<string, unknown>;
    if (mdlObj['name']) {
      store.setValue(scope, 'model.name', mdlObj['name']);
    }
  }

  // approval mode
  const tools = obj['tools'];
  if (tools && typeof tools === 'object') {
    const toolsObj = tools as Record<string, unknown>;
    if (toolsObj['approvalMode']) {
      const mode = toolsObj['approvalMode'] as string;
      store.setValue(scope, 'tools.approvalMode', APPROVAL_MAP[mode] || mode);
    }
  }

  // proxy
  if (typeof obj['proxy'] === 'string' && obj['proxy']) {
    store.setValue(scope, 'proxy', obj['proxy']);
  }

  // theme
  const ui = obj['ui'];
  if (ui && typeof ui === 'object') {
    const uiObj = ui as Record<string, unknown>;
    if (uiObj['theme']) {
      store.setValue(scope, 'ui.theme', uiObj['theme']);
    }
  }

  // Clear deprecated fields
  store.setValue(scope, 'security.auth.baseUrl', undefined);
  store.setValue(scope, 'security.auth.apiKey', undefined);
}

// ============================================================
// HTTP Server
// ============================================================

export function parseJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX_BODY = 1024 * 64; // 64KB limit

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        req.destroy();
        reject(new Error('Body too large'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });

    req.on('error', reject);
  });
}

