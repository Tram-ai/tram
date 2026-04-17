/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Embedded dialog for the /auth (initialize) flow.
 *
 * Unlike WebInitApp (which uses Ink's useInput and is designed for standalone
 * rendering via --initialize), this component uses the project's useKeypress
 * system to avoid conflicting with the main app's input handling.
 *
 * It starts a local HTTP server, opens tram.ai/configuration in the browser,
 * and waits for the web page to POST configuration back.
 */

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import open from 'open';
import type { LoadedSettings } from '../../config/settings.js';
import { loadSettings } from '../../config/settings.js';
import { t } from '../../i18n/index.js';
import { theme } from '../semantic-colors.js';
import { useKeypress } from '../hooks/useKeypress.js';
import { useConfig } from '../contexts/ConfigContext.js';
import {
  applyWebSettings,
  getLocalIPs,
  parseJsonBody,
  type WebSettingsPayload,
} from '../../initialization/init-server.js';
import type { ModelProvidersConfig } from '@tram-ai/tram-core';
import { AuthType } from '@tram-ai/tram-core';

type InitStatus = 'waiting' | 'saving' | 'success' | 'error';

interface InitializeDialogProps {
  settings: LoadedSettings;
  onClose: () => void;
}

export function InitializeDialog({ settings, onClose }: InitializeDialogProps): React.JSX.Element {
  const config = useConfig();
  const [status, setStatus] = useState<InitStatus>('waiting');
  const [serverPort, setServerPort] = useState<number | null>(null);
  const [serverHosts, setServerHosts] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [browserOpened, setBrowserOpened] = useState(false);

  const mountedRef = useRef(true);
  const serverRef = useRef<http.Server | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Apply config from web callback
  const applyConfig = useCallback(
    (payload: WebSettingsPayload) => {
      if (!mountedRef.current) return;
      setStatus('saving');
      setErrorMessage('');
      try {
        applyWebSettings(settings, payload);

        // Re-read the updated settings and reload config
        const reloaded = loadSettings();
        const modelProviders = reloaded.merged.modelProviders as ModelProvidersConfig | undefined;
        if (modelProviders) {
          config.reloadModelProvidersConfig(modelProviders);
        }
        const authType = reloaded.merged.security?.auth?.selectedType as AuthType | undefined;
        if (authType) {
          void config.refreshAuth(authType);
        }

        setStatus('success');
        setTimeout(() => {
          if (mountedRef.current) onCloseRef.current();
        }, 1000);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : t('Unknown error'));
      }
    },
    [settings, config],
  );

  // Stable ref so the server closure always calls the latest applyConfig
  const applyConfigRef = useRef(applyConfig);
  applyConfigRef.current = applyConfig;

  // Start HTTP API server on a random port
  useEffect(() => {
    const server = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      if (req.method === 'POST' && url.pathname === '/api/config') {
        try {
          const body = (await parseJsonBody(req)) as WebSettingsPayload;

          if (!body.settings && !body.rawSettings) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing settings or rawSettings' }));
            return;
          }

          applyConfigRef.current(body);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: err instanceof Error ? err.message : 'Internal error',
          }));
        }
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    serverRef.current = server;

    server.listen(0, () => {
      if (!mountedRef.current) return;
      const addr = server.address() as AddressInfo;
      setServerPort(addr.port);
      setServerHosts(getLocalIPs());
    });

    server.on('error', () => {
      if (mountedRef.current) {
        setStatus('error');
        setErrorMessage(t('Failed to start configuration server'));
      }
    });

    return () => {
      mountedRef.current = false;
      server.close();
      serverRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open browser once the port is known
  useEffect(() => {
    if (serverPort && !browserOpened) {
      setBrowserOpened(true);
      const url = `https://tram-ai.github.io/configuration/?port=${serverPort}`;
      void open(url);
    }
  }, [serverPort, browserOpened, serverHosts]);

  // Keyboard handling via the project's useKeypress (not Ink's useInput)
  useKeypress(
    useCallback(
      (key) => {
        if (status === 'success' || status === 'saving') return;
        if (key.name === 'escape') {
          serverRef.current?.close();
          onCloseRef.current();
        }
      },
      [status],
    ),
    { isActive: true },
  );

  const configUrl = serverPort
    ? `https://tram-ai.github.io/configuration/?port=${serverPort}&hosts=${encodeURIComponent(serverHosts.join(','))}`
    : '';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
    >
      <Text bold>{t('TRAM Configuration')}</Text>
      <Text color={theme.text.secondary}>{t('Esc to cancel')}</Text>

      {/* Web config URL section */}
      <Box marginTop={1} flexDirection="column">
        {serverPort ? (
          <>
            <Text>{t('Configuration page')}:</Text>
            <Text color="cyan">{configUrl}</Text>
            <Box marginTop={1}>
              <Text color={theme.text.secondary}>
                <Spinner type="dots" />{' '}
                {t('Browser opened. Waiting for configuration...')}
              </Text>
            </Box>
          </>
        ) : (
          <Text color={theme.text.secondary}>
            <Spinner type="dots" /> {t('Starting server...')}
          </Text>
        )}
      </Box>

      {/* Status / error */}
      {status === 'saving' && (
        <Box marginTop={1}>
          <Text>
            <Spinner type="dots" /> {t('Saving configuration...')}
          </Text>
        </Box>
      )}
      {status === 'success' && (
        <Box marginTop={1}>
          <Text color={theme.status.success} bold>
            {t('Configuration saved successfully!')}
          </Text>
        </Box>
      )}
      {(status === 'error' || errorMessage) && (
        <Box marginTop={1}>
          <Text color={theme.status.error}>{errorMessage}</Text>
        </Box>
      )}
    </Box>
  );
}
