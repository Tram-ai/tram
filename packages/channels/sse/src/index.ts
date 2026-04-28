export { SseChannel } from "./SseAdapter.js";

import { SseChannel } from "./SseAdapter.js";
import type { ChannelPlugin } from "@tram-ai/channel-base";

export const plugin: ChannelPlugin = {
  channelType: "sse",
  displayName: "Server-Sent Events",
  requiredConfigFields: ["port"], // expecting a port to run the server on
  createChannel: (name, config, bridge, options) =>
    new SseChannel(name, config, bridge, options),
};
