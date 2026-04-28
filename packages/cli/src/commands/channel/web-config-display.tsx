import http, { type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { Box, render, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import open from "open";
import { useEffect, useRef, useState, type JSX } from "react";
import { loadSettings } from "../../config/settings.js";
import { t } from "../../i18n/index.js";
import { parseJsonBody } from "../../initialization/init-server.js";
import { theme } from "../../ui/semantic-colors.js";
import { ChannelWebConfigService } from "./web-config-service.js";

type InitStatus = "waiting" | "success" | "error";

interface ChannelWebConfigAppProps {
  channelName?: string;
  channelType?: string;
  workspaceDir?: string;
  onComplete: (success: boolean) => void;
}

interface RunChannelWebConfigOptions {
  channelName?: string;
  channelType?: string;
  workspaceDir?: string;
}

type ChannelRequestBody = Record<string, unknown>;

function writeJson(
  res: http.ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function normalizeChannelName(name?: string | null): string | undefined {
  const trimmedName = name?.trim();
  return trimmedName ? trimmedName : undefined;
}

function buildChannelConfigPageUrl(
  serverPort: number,
  channelName?: string,
  channelType?: string,
): string {
  const searchParams = new URLSearchParams({
    port: String(serverPort),
  });

  const normalizedChannelName = normalizeChannelName(channelName);
  if (normalizedChannelName) {
    searchParams.set("channelName", normalizedChannelName);
  }

  const normalizedChannelType = channelType?.trim();
  if (normalizedChannelType) {
    searchParams.set("type", normalizedChannelType);
  }

  return `https://tram-ai.github.io/configuration/channel?${searchParams.toString()}`;
}

async function readOptionalJsonBody(
  req: IncomingMessage,
): Promise<ChannelRequestBody | undefined> {
  const contentLength = req.headers["content-length"];
  const hasContentLength =
    typeof contentLength === "string" && contentLength !== "0";
  const hasChunkedTransfer = String(
    req.headers["transfer-encoding"] ?? "",
  )
    .toLowerCase()
    .includes("chunked");

  if (!hasContentLength && !hasChunkedTransfer) {
    return undefined;
  }

  const body = await parseJsonBody(req);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return undefined;
  }

  return body as ChannelRequestBody;
}

function resolveRequestChannelName(params: {
  fallbackChannelName?: string;
  url?: URL;
  body?: ChannelRequestBody;
}): string | undefined {
  const bodyChannelName =
    typeof params.body?.["channelName"] === "string"
      ? params.body["channelName"]
      : undefined;

  return (
    normalizeChannelName(bodyChannelName) ??
    normalizeChannelName(params.url?.searchParams.get("channelName")) ??
    normalizeChannelName(params.fallbackChannelName)
  );
}

function ChannelWebConfigApp({
  channelName,
  channelType,
  workspaceDir,
  onComplete,
}: ChannelWebConfigAppProps): JSX.Element {
  const [status, setStatus] = useState<InitStatus>("waiting");
  const [serverPort, setServerPort] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [browserOpened, setBrowserOpened] = useState(false);
  const mountedRef = useRef(true);
  const serverRef = useRef<http.Server | null>(null);
  const onCompleteRef = useRef(onComplete);
  const serviceRef = useRef<ChannelWebConfigService | null>(null);

  if (!serviceRef.current) {
    serviceRef.current = new ChannelWebConfigService({
      workspaceDir,
      deps: {
        loadSettings,
      },
    });
  }

  onCompleteRef.current = onComplete;

  useEffect(() => {
    const service = serviceRef.current!;
    const server = http.createServer(async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(
        req.url || "/",
        `http://${req.headers.host || "127.0.0.1"}`,
      );

      if (req.method === "GET" && url.pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }

      try {
        if (req.method === "GET" && url.pathname === "/api/metadata") {
          const requestedChannelName = resolveRequestChannelName({
            fallbackChannelName: channelName,
            url,
          });
          writeJson(
            res,
            200,
            await service.getMetadata(requestedChannelName ?? "", channelType),
          );
          return;
        }

        if (req.method === "PUT" && url.pathname === "/api/channel") {
          const body = await readOptionalJsonBody(req);
          const config =
            body?.["config"] &&
            typeof body["config"] === "object" &&
            !Array.isArray(body["config"])
              ? (body["config"] as Record<string, unknown>)
              : (() => {
                  throw new Error(
                    t('Request body must contain a "config" object.'),
                  );
                })();

          const requestedChannelName = resolveRequestChannelName({
            fallbackChannelName: channelName,
            url,
            body,
          });
          const result = await service.putChannel(requestedChannelName ?? "", config);
          writeJson(res, 200, result);

          if (mountedRef.current) {
            setStatus("success");
            setTimeout(() => {
              if (mountedRef.current) {
                onCompleteRef.current(true);
              }
            }, 600);
          }
          return;
        }

        if (req.method === "DELETE" && url.pathname === "/api/channel") {
          const body = await readOptionalJsonBody(req);
          const requestedChannelName = resolveRequestChannelName({
            fallbackChannelName: channelName,
            url,
            body,
          });
          writeJson(res, 200, service.deleteChannel(requestedChannelName ?? ""));
          if (mountedRef.current) {
            setStatus("success");
            setTimeout(() => {
              if (mountedRef.current) {
                onCompleteRef.current(true);
              }
            }, 600);
          }
          return;
        }

        if (req.method === "POST" && url.pathname === "/api/weixin/bind") {
          const body = (await parseJsonBody(req)) as { baseUrl?: string };
          writeJson(res, 200, await service.startWeixinBinding(body?.baseUrl));
          return;
        }

        if (req.method === "GET" && url.pathname === "/api/weixin/bind") {
          const bindingId = url.searchParams.get("bindingId");
          if (!bindingId) {
            writeJson(res, 400, {
              error: t('Query parameter "bindingId" is required.'),
            });
            return;
          }

          writeJson(res, 200, service.getWeixinBinding(bindingId));
          return;
        }

        if (req.method === "DELETE" && url.pathname === "/api/weixin/account") {
          writeJson(res, 200, service.clearWeixinAccount());
          return;
        }

        writeJson(res, 404, { error: t("Not found") });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (mountedRef.current) {
          setStatus("error");
          setErrorMessage(message);
        }
        writeJson(res, 500, { error: message });
      }
    });

    serverRef.current = server;
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      if (mountedRef.current) {
        setServerPort(address.port);
      }
    });

    server.on("error", (error) => {
      if (mountedRef.current) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t("Failed to start channel config server."),
        );
      }
    });

    return () => {
      mountedRef.current = false;
      server.close();
      serverRef.current = null;
    };
  }, [channelName, channelType, workspaceDir]);

  useEffect(() => {
    if (!serverPort || browserOpened) {
      return;
    }

    setBrowserOpened(true);
    void open(buildChannelConfigPageUrl(serverPort, channelName, channelType));
  }, [browserOpened, channelName, channelType, serverPort]);

  useInput((_input, key) => {
    if (key.escape) {
      serverRef.current?.close();
      onComplete(false);
    }
  });

  const configUrl = serverPort
    ? buildChannelConfigPageUrl(serverPort, channelName, channelType)
    : "";
  const resolvedChannelName = normalizeChannelName(channelName);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      width={100}
    >
      <Text bold>{t("TRAM Channel Configuration")}</Text>
      <Text color={theme.text.secondary}>{t("Esc to cancel")}</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          {t("Channel")}:{" "}
          <Text color="cyan">{resolvedChannelName || t("(choose in page)")}</Text>
        </Text>
        <Text>
          {t("Requested type")}: <Text color="cyan">
            {channelType || t("(choose in page)")}
          </Text>
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {serverPort ? (
          <>
            <Text>{t("Configuration page")}:</Text>
            <Text color="cyan">{configUrl}</Text>
            <Text color={theme.text.secondary}>
              <Spinner type="dots" /> {t("Browser opened. Waiting for save or delete...")}
            </Text>
          </>
        ) : (
          <Text color={theme.text.secondary}>
            <Spinner type="dots" /> {t("Starting local channel config server...")}
          </Text>
        )}
      </Box>

      {status === "success" && (
        <Box marginTop={1}>
          <Text color={theme.status.success}>
            {t("Channel configuration completed.")}
          </Text>
        </Box>
      )}
      {status === "error" && errorMessage && (
        <Box marginTop={1}>
          <Text color={theme.status.error}>{errorMessage}</Text>
        </Box>
      )}
    </Box>
  );
}

export async function runChannelWebConfig(
  options: RunChannelWebConfigOptions,
): Promise<boolean> {
  return new Promise((resolve) => {
    const instance = render(
      <ChannelWebConfigApp
        channelName={options.channelName}
        channelType={options.channelType}
        workspaceDir={options.workspaceDir}
        onComplete={(success) => {
          instance.unmount();
          resolve(success);
        }}
      />,
    );
  });
}
