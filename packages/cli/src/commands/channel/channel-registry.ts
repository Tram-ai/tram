import * as path from "node:path";
import type { ChannelPlugin } from "@tram-ai/channel-base";
import { writeStderrLine } from "../../utils/stdioHelpers.js";
import { getExtensionManager } from "../extensions/utils.js";

const registry = new Map<string, ChannelPlugin>();
let builtinsPromise: Promise<void> | null = null;
let extensionsPromise: Promise<void> | null = null;

function ensureBuiltins(): Promise<void> {
  if (!builtinsPromise) {
    builtinsPromise = (async () => {
      const [telegram, weixin, dingtalk, pluginExample] = await Promise.all([
        import("@tram-ai/channel-telegram"),
        import("@tram-ai/channel-weixin"),
        import("@tram-ai/channel-dingtalk"),
        import("@qwen-code/channel-plugin-example"),
      ]);

      for (const mod of [telegram, weixin, dingtalk, pluginExample]) {
        registry.set(mod.plugin.channelType, mod.plugin);
      }
    })();
  }
  return builtinsPromise;
}

function ensureExtensions(): Promise<void> {
  if (!extensionsPromise) {
    extensionsPromise = (async () => {
      await ensureBuiltins();

      try {
        const extensionManager = await getExtensionManager();
        const extensions = extensionManager
          .getLoadedExtensions()
          .filter((extension) => extension.isActive && extension.channels);

        for (const extension of extensions) {
          for (const [channelType, channelDef] of Object.entries(
            extension.channels ?? {},
          )) {
            if (registry.has(channelType)) {
              continue;
            }

            const entryPath = path.join(extension.path, channelDef.entry);

            try {
              const module = (await import(entryPath)) as {
                plugin?: ChannelPlugin;
              };
              const plugin = module.plugin;

              if (!plugin || typeof plugin.createChannel !== "function") {
                writeStderrLine(
                  `[Extensions] \"${extension.name}\": channel entry point does not export a valid plugin object`,
                );
                continue;
              }

              if (plugin.channelType !== channelType) {
                writeStderrLine(
                  `[Extensions] \"${extension.name}\": channelType mismatch - manifest says \"${channelType}\", plugin says \"${plugin.channelType}\"`,
                );
                continue;
              }

              registry.set(channelType, plugin);
            } catch (error) {
              writeStderrLine(
                `[Extensions] Failed to load channel \"${channelType}\" from \"${extension.name}\": ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }
        }
      } catch (error) {
        writeStderrLine(
          `[Extensions] Failed to load extensions: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })();
  }

  return extensionsPromise;
}

export function registerPlugin(plugin: ChannelPlugin): void {
  if (registry.has(plugin.channelType)) {
    throw new Error(
      `Channel type "${plugin.channelType}" is already registered.`,
    );
  }
  registry.set(plugin.channelType, plugin);
}

export async function getPlugin(
  channelType: string,
): Promise<ChannelPlugin | undefined> {
  await ensureBuiltins();
  await ensureExtensions();
  return registry.get(channelType);
}

export async function supportedTypes(): Promise<string[]> {
  await ensureBuiltins();
  await ensureExtensions();
  return [...registry.keys()];
}
