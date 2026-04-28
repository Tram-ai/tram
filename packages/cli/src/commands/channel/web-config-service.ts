import { randomUUID } from "node:crypto";
import type { ChannelPlugin } from "@tram-ai/channel-base";
import {
  clearAccount,
  DEFAULT_BASE_URL,
  loadAccount,
  saveAccount,
  type AccountData,
} from "@tram-ai/channel-weixin/accounts";
import {
  waitForLogin,
  type LoginResult,
} from "@tram-ai/channel-weixin/login";
import { t } from "../../i18n/index.js";
import { parseChannelConfig } from "./config-utils.js";
import { getPlugin, supportedTypes } from "./channel-registry.js";

export type ChannelConfigFieldType =
  | "string"
  | "secret"
  | "number"
  | "enum"
  | "string-array"
  | "json";

export interface ChannelConfigFieldOption {
  value: string;
  label: string;
}

export interface ChannelConfigFieldDefinition {
  key: string;
  label: string;
  type: ChannelConfigFieldType;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
  options?: ChannelConfigFieldOption[];
}

export interface ChannelTypeDefinition {
  type: string;
  displayName: string;
  supportsQrBinding: boolean;
  fields: ChannelConfigFieldDefinition[];
}

export interface ChannelConfigRecord {
  name: string;
  exists: boolean;
  config: Record<string, unknown> | null;
  normalizedConfig: Record<string, unknown> | null;
  validationErrors: string[];
}

export interface WeixinAccountSummary {
  configured: boolean;
  baseUrl: string;
  userId?: string;
  savedAt?: string;
}

export interface ChannelWebConfigMetadata {
  channelName: string;
  selectedType?: string;
  commonFields: ChannelConfigFieldDefinition[];
  channelTypes: ChannelTypeDefinition[];
  current: ChannelConfigRecord;
  weixinAccount: WeixinAccountSummary;
}

export type WeixinBindingStatus = "pending" | "connected" | "failed";

export interface WeixinBindingState {
  bindingId: string;
  status: WeixinBindingStatus;
  startedAt: string;
  updatedAt: string;
  baseUrl: string;
  qrcodeId: string;
  qrCodeUrl?: string;
  message: string;
  userId?: string;
  savedAt?: string;
  error?: string;
}

export interface DeleteChannelResult {
  name: string;
  deleted: boolean;
}

interface WeixinQrCodeResponse {
  qrcodeId: string;
  qrCodeUrl?: string;
}

interface ChannelWebConfigServiceDeps {
  loadSettings: (workspaceDir?: string) => LoadedSettingsLike;
  getPlugin: (channelType: string) => Promise<ChannelPlugin | undefined>;
  supportedTypes: () => Promise<string[]>;
  parseChannelConfig: typeof parseChannelConfig;
  requestWeixinQrCode: (baseUrl: string) => Promise<WeixinQrCodeResponse>;
  waitForWeixinLogin: (params: {
    qrcodeId: string;
    apiBaseUrl: string;
    timeoutMs?: number;
  }) => Promise<LoginResult>;
  loadWeixinAccount: () => AccountData | null;
  saveWeixinAccount: (account: AccountData) => void;
  clearWeixinAccount: () => void;
  randomUUID: () => string;
  now: () => Date;
}

interface LoadedSettingsLike {
  forScope(scope: string): {
    settings: Record<string, unknown>;
  };
  setValue(scope: string, key: string, value: unknown): void;
}

export interface ChannelWebConfigServiceOptions {
  workspaceDir?: string;
  deps?: Partial<ChannelWebConfigServiceDeps>;
}

const WEB_CONFIG_EXCLUDED_TYPES = new Set(["websocket", "sse","plugin-example"]);

const DEFAULT_DEPS: ChannelWebConfigServiceDeps = {
  loadSettings: () => {
    throw new Error(
      "ChannelWebConfigService requires a loadSettings dependency.",
    );
  },
  getPlugin,
  supportedTypes,
  parseChannelConfig,
  requestWeixinQrCode,
  waitForWeixinLogin: waitForLogin,
  loadWeixinAccount: loadAccount,
  saveWeixinAccount: saveAccount,
  clearWeixinAccount: clearAccount,
  randomUUID,
  now: () => new Date(),
};

const USER_SCOPE = "User";

export class ChannelWebConfigService {
  private readonly deps: ChannelWebConfigServiceDeps;
  private readonly workspaceDir: string;
  private readonly bindings = new Map<string, WeixinBindingState>();

  constructor(options: ChannelWebConfigServiceOptions = {}) {
    this.workspaceDir = options.workspaceDir || process.cwd();
    this.deps = {
      ...DEFAULT_DEPS,
      ...(options.deps ?? {}),
    };
  }

  async getMetadata(
    channelName: string,
    requestedType?: string,
  ): Promise<ChannelWebConfigMetadata> {
    const current = await this.getChannel(channelName);
    const currentType =
      current.config && typeof current.config["type"] === "string"
        ? current.config["type"]
        : undefined;

    this.ensureSupportedWebConfigType(requestedType);
    this.ensureSupportedWebConfigType(currentType);

    const channelTypes = await this.getChannelTypes();
    const selectedType = this.resolveSelectedType(
      channelTypes,
      requestedType,
      currentType,
    );

    return {
      channelName,
      selectedType,
      commonFields: this.buildCommonFields(channelTypes),
      channelTypes,
      current,
      weixinAccount: this.getWeixinAccountSummary(),
    };
  }

  async getChannel(channelName: string): Promise<ChannelConfigRecord> {
    const settings = this.loadCurrentSettings();
    const rawConfig = this.getUserChannelConfig(settings, channelName);

    if (!rawConfig) {
      return {
        name: channelName,
        exists: false,
        config: null,
        normalizedConfig: null,
        validationErrors: [],
      };
    }

    try {
      const normalized = await this.deps.parseChannelConfig(channelName, rawConfig);
      return {
        name: channelName,
        exists: true,
        config: structuredClone(rawConfig),
        normalizedConfig: structuredClone(normalized),
        validationErrors: [],
      };
    } catch (error) {
      return {
        name: channelName,
        exists: true,
        config: structuredClone(rawConfig),
        normalizedConfig: null,
        validationErrors: [toErrorMessage(error)],
      };
    }
  }

  async putChannel(
    channelName: string,
    config: Record<string, unknown>,
  ): Promise<ChannelConfigRecord> {
    const sanitizedName = channelName.trim();
    if (!sanitizedName) {
      throw new Error(t("Channel name is required."));
    }
    if (typeof config !== "object" || config === null || Array.isArray(config)) {
      throw new Error(t("Channel config must be a JSON object."));
    }

    const cleanedConfig = sanitizeConfig(config);
    this.ensureSupportedWebConfigType(extractChannelType(cleanedConfig));
    await this.deps.parseChannelConfig(sanitizedName, cleanedConfig);

    const settings = this.loadCurrentSettings();
    settings.setValue(USER_SCOPE, `channels.${sanitizedName}`, cleanedConfig);
    return this.getChannel(sanitizedName);
  }

  deleteChannel(channelName: string): DeleteChannelResult {
    const sanitizedName = channelName.trim();
    if (!sanitizedName) {
      throw new Error(t("Channel name is required."));
    }

    const settings = this.loadCurrentSettings();
    const existed = Boolean(this.getUserChannelConfig(settings, sanitizedName));
    settings.setValue(USER_SCOPE, `channels.${sanitizedName}`, undefined);

    return {
      name: sanitizedName,
      deleted: existed,
    };
  }

  async startWeixinBinding(
    baseUrl: string = DEFAULT_BASE_URL,
  ): Promise<WeixinBindingState> {
    const bindingId = this.deps.randomUUID();
    const { qrcodeId, qrCodeUrl } = await this.deps.requestWeixinQrCode(baseUrl);
    const now = this.timestamp();

    const state: WeixinBindingState = {
      bindingId,
      status: "pending",
      startedAt: now,
      updatedAt: now,
      baseUrl,
      qrcodeId,
      qrCodeUrl,
      message: t("Waiting for WeChat QR code confirmation."),
    };

    this.bindings.set(bindingId, state);

    void this.deps
      .waitForWeixinLogin({ qrcodeId, apiBaseUrl: baseUrl })
      .then((result) => this.handleWeixinBindingResult(bindingId, result))
      .catch((error) => this.failWeixinBinding(bindingId, toErrorMessage(error)));

    return structuredClone(state);
  }

  getWeixinBinding(bindingId: string): WeixinBindingState {
    const state = this.bindings.get(bindingId);
    if (!state) {
      throw new Error(
        t("Unknown WeChat binding: {{bindingId}}", { bindingId }),
      );
    }
    return structuredClone(state);
  }

  getWeixinAccountSummary(): WeixinAccountSummary {
    const account = this.deps.loadWeixinAccount();
    if (!account) {
      return {
        configured: false,
        baseUrl: DEFAULT_BASE_URL,
      };
    }

    return {
      configured: true,
      baseUrl: account.baseUrl || DEFAULT_BASE_URL,
      userId: account.userId,
      savedAt: account.savedAt,
    };
  }

  clearWeixinAccount(): WeixinAccountSummary {
    this.deps.clearWeixinAccount();
    return this.getWeixinAccountSummary();
  }

  private loadCurrentSettings(): LoadedSettingsLike {
    return this.deps.loadSettings(this.workspaceDir);
  }

  private getUserChannelConfig(
    settings: LoadedSettingsLike,
    channelName: string,
  ): Record<string, unknown> | null {
    const userSettings = settings.forScope(USER_SCOPE).settings as {
      channels?: Record<string, unknown>;
    };
    const raw = userSettings.channels?.[channelName];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    return raw as Record<string, unknown>;
  }

  private async getChannelTypes(): Promise<ChannelTypeDefinition[]> {
    const types = (await this.deps.supportedTypes()).filter(
      (type) => !WEB_CONFIG_EXCLUDED_TYPES.has(type),
    );
    const items = await Promise.all(
      types.map(async (type) => {
        const plugin = await this.deps.getPlugin(type);
        const fieldKeys = [
          ...(plugin?.requiredConfigFields ?? []),
          ...getAdditionalFieldKeys(type),
        ];

        return {
          type,
          displayName: t(plugin?.displayName || prettifyKey(type)),
          supportsQrBinding: type === "weixin",
          fields: dedupeFieldKeys(fieldKeys).map((key) =>
            createFieldDefinition(key, (plugin?.requiredConfigFields ?? []).includes(key)),
          ),
        } satisfies ChannelTypeDefinition;
      }),
    );

    return items.sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    );
  }

  private buildCommonFields(
    channelTypes: ChannelTypeDefinition[],
  ): ChannelConfigFieldDefinition[] {
    return buildCommonFieldsBase().map((field) => {
      if (field.key !== "type") {
        return { ...field };
      }
      return {
        ...field,
        options: channelTypes.map((item) => ({
          value: item.type,
          label: item.displayName,
        })),
      };
    });
  }

  private ensureSupportedWebConfigType(channelType?: string): void {
    if (!channelType || !WEB_CONFIG_EXCLUDED_TYPES.has(channelType)) {
      return;
    }

    throw new Error(
      t(
        'Channel type "{{type}}" is not supported by channel initialize. Use settings.json or another CLI flow instead.',
        { type: channelType },
      ),
    );
  }

  private resolveSelectedType(
    channelTypes: ChannelTypeDefinition[],
    requestedType?: string,
    currentType?: string,
  ): string | undefined {
    if (requestedType && channelTypes.some((item) => item.type === requestedType)) {
      return requestedType;
    }

    if (currentType && channelTypes.some((item) => item.type === currentType)) {
      return currentType;
    }

    return channelTypes[0]?.type;
  }

  private handleWeixinBindingResult(
    bindingId: string,
    result: LoginResult,
  ): void {
    const state = this.bindings.get(bindingId);
    if (!state) {
      return;
    }

    if (result.connected && result.token) {
      const savedAt = this.timestamp();
      const baseUrl = result.baseUrl || state.baseUrl;
      this.deps.saveWeixinAccount({
        token: result.token,
        baseUrl,
        userId: result.userId,
        savedAt,
      });

      state.status = "connected";
      state.baseUrl = baseUrl;
      state.userId = result.userId;
      state.savedAt = savedAt;
      state.message = result.message;
      state.error = undefined;
      state.updatedAt = this.timestamp();
      return;
    }

    this.failWeixinBinding(bindingId, result.message);
  }

  private failWeixinBinding(bindingId: string, message: string): void {
    const state = this.bindings.get(bindingId);
    if (!state) {
      return;
    }

    state.status = "failed";
    state.error = message;
    state.message = message;
    state.updatedAt = this.timestamp();
  }

  private timestamp(): string {
    return this.deps.now().toISOString();
  }
}

async function requestWeixinQrCode(
  baseUrl: string,
): Promise<WeixinQrCodeResponse> {
  const response = await fetch(`${baseUrl}/ilink/bot/get_bot_qrcode?bot_type=3`);
  if (!response.ok) {
    throw new Error(
      t("Failed to get QR code: HTTP {{status}}", {
        status: String(response.status),
      }),
    );
  }

  const payload = (await response.json()) as {
    qrcode?: string;
    qrcode_img_content?: string;
  };

  if (!payload.qrcode) {
    throw new Error(t("No qrcode in response"));
  }

  return {
    qrcodeId: payload.qrcode,
    qrCodeUrl: payload.qrcode_img_content,
  };
}

function createFieldDefinition(
  key: string,
  required: boolean,
): ChannelConfigFieldDefinition {
  const override = buildFieldDefinitionOverrides()[key];
  if (override) {
    return {
      key,
      required,
      ...override,
    };
  }

  return {
    key,
    required,
    label: t(prettifyKey(key)),
    type: "string",
    description: t("Channel-specific field: {{key}}", { key }),
  };
}

function buildCommonFieldsBase(): ChannelConfigFieldDefinition[] {
  return [
    {
      key: "type",
      label: t("Channel Type"),
      type: "enum",
      required: true,
      description: t("Built-in or extension-provided channel adapter."),
    },
    {
      key: "senderPolicy",
      label: t("Sender Policy"),
      type: "enum",
      defaultValue: "pairing",
      description: t("Controls who can talk to this channel."),
      options: [
        { value: "allowlist", label: t("Allowlist") },
        { value: "pairing", label: t("Pairing") },
        { value: "open", label: t("Open") },
      ],
    },
    {
      key: "allowedUsers",
      label: t("Allowed Users"),
      type: "string-array",
      defaultValue: [],
      description: t("User IDs allowed when senderPolicy is allowlist."),
    },
    {
      key: "sessionScope",
      label: t("Session Scope"),
      type: "enum",
      defaultValue: "user",
      description: t("How channel messages map to TRAM sessions."),
      options: [
        { value: "user", label: t("User") },
        { value: "thread", label: t("Thread") },
        { value: "single", label: t("Single") },
      ],
    },
    {
      key: "cwd",
      label: t("Working Directory"),
      type: "string",
      description: t("Directory used when the channel starts TRAM sessions."),
    },
    {
      key: "approvalMode",
      label: t("Approval Mode"),
      type: "enum",
      description: t("Permission mode used by the channel service."),
      options: [
        { value: "plan", label: t("Plan") },
        { value: "default", label: t("Default") },
        { value: "auto-edit", label: t("Auto Edit") },
        { value: "yolo", label: t("Yolo") },
      ],
    },
    {
      key: "instructions",
      label: t("Instructions"),
      type: "string",
      description: t("Extra system instructions appended for this channel."),
    },
    {
      key: "model",
      label: t("Model"),
      type: "string",
      description: t("Override the model used by the shared ACP bridge."),
    },
    {
      key: "groupPolicy",
      label: t("Group Policy"),
      type: "enum",
      defaultValue: "disabled",
      description: t("How group chats are handled by the channel."),
      options: [
        { value: "disabled", label: t("Disabled") },
        { value: "allowlist", label: t("Allowlist") },
        { value: "open", label: t("Open") },
      ],
    },
    {
      key: "groups",
      label: t("Groups JSON"),
      type: "json",
      defaultValue: {},
      description: t("Per-group overrides keyed by group ID."),
    },
  ];
}

function buildFieldDefinitionOverrides(): Record<
  string,
  Omit<ChannelConfigFieldDefinition, "key" | "required">
> {
  return {
    token: {
      label: t("Token"),
      type: "secret",
      description: t("Bot or access token required by the channel adapter."),
    },
    clientId: {
      label: t("Client ID"),
      type: "string",
      description: t("Client identifier issued by the channel platform."),
    },
    clientSecret: {
      label: t("Client Secret"),
      type: "secret",
      description: t("Client secret issued by the channel platform."),
    },
    port: {
      label: t("Port"),
      type: "number",
      description: t("TCP port used by the local channel listener."),
    },
    serverWsUrl: {
      label: t("Server WebSocket URL"),
      type: "string",
      description: t("WebSocket endpoint used by the plugin example channel."),
    },
    baseUrl: {
      label: t("Base URL"),
      type: "string",
      description: t("Override the WeChat iLink API base URL."),
      defaultValue: DEFAULT_BASE_URL,
    },
  };
}

function getAdditionalFieldKeys(channelType: string): string[] {
  if (channelType === "weixin") {
    return ["baseUrl"];
  }
  return [];
}

function prettifyKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function dedupeFieldKeys(keys: string[]): string[] {
  return [...new Set(keys)];
}

function extractChannelType(config: Record<string, unknown>): string | undefined {
  return typeof config["type"] === "string" ? config["type"] : undefined;
}

function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, sanitizeValue(value)])
      .filter(([, value]) => value !== undefined),
  );
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object" && value !== null) {
    const sanitizedObject = Object.fromEntries(
      Object.entries(value)
        .map(([key, nested]) => [key, sanitizeValue(nested)])
        .filter(([, nested]) => nested !== undefined),
    );
    return sanitizedObject;
  }

  return value;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}