export { WebsocketChannel } from "./WebsocketAdapter.js";

import { WebsocketChannel } from "./WebsocketAdapter.js";
import type { ChannelPlugin } from "@tram-ai/channel-base";

export const plugin: ChannelPlugin = {
  channelType: "websocket",
  displayName: "WebSocket",
  requiredConfigFields: ["port"], // expecting a port to run the server on
  createChannel: (name, config, bridge, options) =>
    new WebsocketChannel(name, config, bridge, options),
};