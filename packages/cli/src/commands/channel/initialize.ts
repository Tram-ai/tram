import type { CommandModule } from "yargs";
import { loadSettings } from "../../config/settings.js";
import {
  initializeI18n,
  t,
  type SupportedLanguage,
} from "../../i18n/index.js";
import { writeStderrLine } from "../../utils/stdioHelpers.js";
import { runChannelWebConfig } from "./web-config-display.js";

async function initializeChannelWebConfigI18n(
  workspaceDir: string,
): Promise<void> {
  let language: SupportedLanguage | "auto" = "auto";

  try {
    const settings = loadSettings(workspaceDir);
    const configuredLanguage = settings.merged.general?.language;
    if (typeof configuredLanguage === "string" && configuredLanguage.trim()) {
      language = configuredLanguage as SupportedLanguage;
    }
  } catch {
    // Fall back to auto-detected language when settings cannot be loaded.
  }

  await initializeI18n(language);
}

function normalizeChannelName(name?: string): string | undefined {
  const trimmedName = name?.trim();
  if (trimmedName) {
    return trimmedName;
  }
  return undefined;
}

export const initializeCommand: CommandModule<
  object,
  { name?: string; type?: string }
> = {
  command: "initialize [name]",
  aliases: ["web-config"],
  get describe() {
    return t(
      "Create or edit a channel with a local web configuration flow, including WeChat QR binding.",
    );
  },
  builder: {
    type: {
      type: "string",
      describe: t(
        "Preferred channel type for a new config. Existing channel configs can still be changed in the page.",
      ),
    },
  },
  handler: async (argv) => {
    try {
      const workspaceDir = process.cwd();
      await initializeChannelWebConfigI18n(workspaceDir);
      const channelName = normalizeChannelName(argv.name);

      const success = await runChannelWebConfig({
        channelName,
        channelType: argv.type,
        workspaceDir,
      });

      if (!success) {
        process.exit(1);
      }
    } catch (error) {
      writeStderrLine(
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  },
};
