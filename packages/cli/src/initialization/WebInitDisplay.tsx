/**
 * TSX TUI component for the --initialize flow.
 *
 * Shows a unified view with:
 * - The tram.ai configuration URL (web page calls back via POST /api/config)
 * - A paste input for entering JSON config directly in the terminal
 */

import http from "node:http";
import type { AddressInfo } from "node:net";
import { Box, render, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import React, { useCallback, useEffect, useRef, useState } from "react";
import open from "open";
import type { LoadedSettings } from "../config/settings.js";
import { t } from "../i18n/index.js";
import { theme } from "../ui/semantic-colors.js";
import {
  applyWebSettings,
  parseJsonBody,
  type WebSettingsPayload,
} from "./init-server.js";

type InitStatus = "waiting" | "saving" | "success" | "error";

interface WebInitAppProps {
  settings: LoadedSettings;
  onComplete: (success: boolean) => void;
}

function WebInitApp({
  settings,
  onComplete,
}: WebInitAppProps): React.JSX.Element {
  const [status, setStatus] = useState<InitStatus>("waiting");
  const [serverPort, setServerPort] = useState<number | null>(null);
  const [pasteBuffer, setPasteBuffer] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [browserOpened, setBrowserOpened] = useState(false);

  const mountedRef = useRef(true);
  const serverRef = useRef<http.Server | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [terminalWidth, setTerminalWidth] = useState(
    process.stdout.columns ?? 120,
  );

  useEffect(() => {
    const handleResize = () => setTerminalWidth(process.stdout.columns ?? 120);
    process.stdout.on("resize", handleResize);
    return () => {
      process.stdout.off("resize", handleResize);
    };
  }, []);

  // Apply config from either source (web callback or paste)
  const applyConfig = useCallback(
    (payload: WebSettingsPayload) => {
      if (!mountedRef.current) return;
      setStatus("saving");
      setErrorMessage("");
      try {
        applyWebSettings(settings, payload);
        setStatus("success");
        setTimeout(() => {
          if (mountedRef.current) onCompleteRef.current(true);
        }, 1000);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : t("Unknown error"),
        );
      }
    },
    [settings],
  );

  // Stable ref so the server closure always calls the latest applyConfig
  const applyConfigRef = useRef(applyConfig);
  applyConfigRef.current = applyConfig;

  // Start HTTP API server on a random port
  useEffect(() => {
    const server = http.createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      if (req.method === "POST" && url.pathname === "/api/config") {
        try {
          const body = (await parseJsonBody(req)) as WebSettingsPayload;

          if (!body.settings && !body.rawSettings) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ error: "Missing settings or rawSettings" }),
            );
            return;
          }

          applyConfigRef.current(body);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Internal error",
            }),
          );
        }
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    serverRef.current = server;

    server.listen(0, () => {
      if (!mountedRef.current) return;
      const addr = server.address() as AddressInfo;
      setServerPort(addr.port);
    });

    server.on("error", () => {
      if (mountedRef.current) {
        setStatus("error");
        setErrorMessage(t("Failed to start configuration server"));
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
  }, [serverPort, browserOpened]);

  // Keyboard handling
  useInput((input, key) => {
    if (status === "success" || status === "saving") return;

    // Esc: clear paste buffer if non-empty, otherwise cancel
    if (key.escape) {
      if (pasteBuffer.length > 0) {
        setPasteBuffer("");
        setErrorMessage("");
        return;
      }
      serverRef.current?.close();
      onComplete(false);
      return;
    }

    // Enter: submit paste buffer as JSON config
    if (key.return) {
      if (pasteBuffer.trim().length === 0) return;
      try {
        JSON.parse(pasteBuffer.trim());
      } catch (err) {
        setErrorMessage(
          t("Invalid JSON") +
            ": " +
            (err instanceof Error ? err.message : String(err)),
        );
        return;
      }
      applyConfig({ rawSettings: pasteBuffer.trim() });
      return;
    }

    // Backspace/Delete
    if (key.backspace || key.delete) {
      setPasteBuffer((v) => v.slice(0, -1));
      if (errorMessage) setErrorMessage("");
      return;
    }

    // Regular character input
    if (!key.ctrl && !key.meta && input) {
      setPasteBuffer((v) => v + input);
      if (errorMessage) setErrorMessage("");
    }
  });

  const configUrl = serverPort
    ? `https://tram-ai.github.io/configuration/?port=${serverPort}`
    : "";

  const boxWidth = Math.max(80, Math.min(terminalWidth - 2, 120));

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      width={boxWidth}
    >
      <Text bold>{t("TRAM Configuration")}</Text>
      <Text color={theme.text.secondary}>{t("Esc to cancel")}</Text>

      {/* Web config URL section */}
      <Box marginTop={1} flexDirection="column">
        {serverPort ? (
          <>
            <Text>{t("Configuration page")}:</Text>
            <Text color="cyan">{configUrl}</Text>
            <Box marginTop={1}>
              <Text color={theme.text.secondary}>
                <Spinner type="dots" />{" "}
                {t("Browser opened. Waiting for configuration...")}
              </Text>
            </Box>
          </>
        ) : (
          <Text color={theme.text.secondary}>
            <Spinner type="dots" /> {t("Starting server...")}
          </Text>
        )}
      </Box>

      {/* Paste JSON section */}
      <Box marginTop={1} flexDirection="column">
        <Text>{t("Or paste JSON configuration and press Enter to save")}:</Text>
        <Text color={theme.text.secondary}>{t("Esc to clear input")}</Text>
        <Box marginTop={1}>
          <Text color={theme.text.accent}>{"> "}</Text>
          <Text>
            {pasteBuffer}
            <Text color="cyan">{"|"}</Text>
          </Text>
        </Box>
      </Box>

      {/* Status / error */}
      {status === "saving" && (
        <Box marginTop={1}>
          <Text>
            <Spinner type="dots" /> {t("Saving configuration...")}
          </Text>
        </Box>
      )}
      {status === "success" && (
        <Box marginTop={1}>
          <Text color={theme.status.success} bold>
            {t("Configuration saved successfully!")}
          </Text>
        </Box>
      )}
      {(status === "error" || errorMessage) && (
        <Box marginTop={1}>
          <Text color={theme.status.error}>{errorMessage}</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Start the TSX TUI-based initialization flow.
 *
 * Renders an Ink component that starts a local API server and opens
 * the browser to tram.ai/configuration. Config can also be pasted
 * directly as JSON.
 *
 * @returns true if config was saved, false if cancelled
 */
export async function runWebInitialization(
  settings: LoadedSettings,
): Promise<boolean> {
  return new Promise((resolve) => {
    const instance = render(
      <WebInitApp
        settings={settings}
        onComplete={(success) => {
          instance.unmount();
          resolve(success);
        }}
      />,
    );
  });
}
