/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandModule, Argv } from "yargs";
import {
  handleQwenAuth,
  handleApiKeyAuth,
  runInteractiveAuth,
  showAuthStatus,
} from "./auth/handler.js";
import { t } from "../i18n/index.js";

// Define subcommands separately
const qwenOauthCommand = {
  command: "qwen-oauth",
  describe: t("Authenticate using Qwen OAuth"),
  handler: async () => {
    await handleQwenAuth("qwen-oauth", {});
  },
};

const codePlanCommand = {
  command: "coding-plan",
  describe: t("Authenticate using Alibaba Cloud Coding Plan"),
  builder: (yargs: Argv) =>
    yargs
      .option("region", {
        alias: "r",
        describe: t("Region for Coding Plan (china/global)"),
        type: "string",
      })
      .option("base-url", {
        alias: "u",
        describe: t("Base URL for Coding Plan"),
        type: "string",
      })
      .option("key", {
        alias: "k",
        describe: t("API key for Coding Plan"),
        type: "string",
      }),
  handler: async (argv: {
    region?: string;
    "base-url"?: string;
    key?: string;
  }) => {
    const region = argv["region"] as string | undefined;
    const baseUrl = argv["base-url"];
    const key = argv["key"] as string | undefined;

    // If region/baseUrl and key are provided, use them directly
    if ((region || baseUrl) && key) {
      await handleQwenAuth("coding-plan", { region, baseUrl, key });
    } else {
      // Otherwise, prompt interactively
      await handleQwenAuth("coding-plan", {});
    }
  },
};

const apiKeyCommand = {
  command: "api-key",
  describe: t("Authenticate using an API key"),
  handler: async () => {
    await handleApiKeyAuth();
  },
};

const openRouterCommand = {
  command: "openrouter",
  describe: t("Authenticate using OpenRouter API key setup"),
  builder: (yargs: Argv) =>
    yargs.option("key", {
      alias: "k",
      describe: t("API key for OpenRouter"),
      type: "string",
    }),
  handler: async (argv: { key?: string }) => {
    const key = argv["key"] as string | undefined;
    await handleQwenAuth("openrouter", { key });
  },
};

const statusCommand = {
  command: "status",
  describe: t("Show current authentication status"),
  handler: async () => {
    await showAuthStatus();
  },
};

export const authCommand: CommandModule = {
  command: "auth",
  describe: t(
    "Configure Tram authentication with OpenRouter, Coding Plan, API Key, or Tram-OAuth",
  ),
  builder: (yargs: Argv) =>
    yargs
      .command(qwenOauthCommand)
      .command(codePlanCommand)
      .command(openRouterCommand)
      .command(apiKeyCommand)
      .command(statusCommand)
      .demandCommand(0) // Don't require a subcommand
      .version(false),
  handler: async () => {
    // This handler is for when no subcommand is provided - show interactive menu
    await runInteractiveAuth();
  },
};
