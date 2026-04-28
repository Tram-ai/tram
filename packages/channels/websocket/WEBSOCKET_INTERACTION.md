# WebSocket 渠道连通与交互文档

本文档说明了如何作为客户端与基于 `channel-websocket` 的 TRAM WebSocket 服务端进行连通与信息交互。

## 1. 连接与认证配置

服务端在启动时会根据频道配置 (Channel Config) 监听指定的 `port`。

- **协议**: `ws://` 或 `wss://` (如果有反向代理提供 wss 支持)
- **地址**: 运行 TRAM 的服务器 IP 或域名
- **端口**: TRAM 配置对应渠道时指定的 `port` (例如 `8080`)
- **客户端身份标识**: 
  - 推荐在连接时通过 HTTP Header 传入 `x-client-id` 作为客户端的唯一标识，这用于接收端点和特定用户的路由和双向绑定。
  - *注：如果不传入 `x-client-id`，服务端会降级使用请求方的 Remote IP (`request.socket.remoteAddress`) 或 `"unknown"` 作为会话隔离的标识，可能导致多端混淆。*

## 2. 消息格式

所有数据交互建议采用 **JSON 格式字符串**。由于内部做了兼容处理，如果你直接发送纯文本也支持，但会丢失大部分元信息特征。

### 2.1 客户端收到触发发送 -> 服务端 (上行消息)

发送完整的消息负载来提供更好的上下文。

建议发送的 JSON 结构：
```json
{
  "senderName": "测试用户",
  "chatId": "chat-001",
  "text": "你好，请问你能做什么？",
  "isGroup": false,
  "isMentioned": false,
  "isReplyToBot": false,
  "referencedText": ""
}
```

**字段详细说明：**
- `text` (String): **必填**，实际发送给机器人的对话文字内容。
- `senderName` (String): *选填*，发送方的昵称，方便机器人在对话语境中称呼用户。
- `chatId` (String): *选填*，对话框/群组的唯一标识。如果不填，默认会使用身份标识 (clientId)。
- `isGroup` (Boolean): *选填*，标记当前会话是否为群聊，默认为 `false`。
- `isMentioned` (Boolean): *选填*，机器人在群聊中是否被明确 @ 提及。
- `isReplyToBot` (Boolean): *选填*，当前消息是否是引用回复了机器人的过往消息。
- `referencedText` (String): *选填*，当前消息引用的上文（如引用某个特定的文本进行追问）。

### 2.2 服务端 -> 回传给客户端 (下行消息)

当机器人的模型处理完成或者中间思考环节产生输出时，会通过已建立的 WebSocket 句柄，向对应的客户端下发回应数据。该服务端默认支持**流式输出 (Streaming)**，在产生回复期间会连续推送增量切片，最终完成时下发全量文本。

返回 JSON 结构示例（流式分块推送中）：
```json
{
  "chunk": "你好",
  "isFinal": false
}
```

返回 JSON 结构示例（全部推送完毕后回下发最终全量结果）：
```json
{
  "text": "你好！我是当前分配给该频道的智能助理，可以回答问题、帮助编写代码等。",
  "isFinal": true
}
```

**字段详细说明：**
- `chunk` (String): 处于流式输送状态时 (`isFinal: false`)，代表当次生成的增量字符串。
- `text` (String): 会话结束时 (`isFinal: true`)，回传的完整响应合并文本内容。
- `isFinal` (Boolean): 标识响应状态。如果为 `false`，说明机器人还在思考输出中。为 `true` 时代表输出结束并且 `text` 字段包含完整的语境。

### 2.3 获取聊天列表与历史记录 (历史查询)

服务端会在内存中自动持久化用户上报和机器人下发的对应双边聊天记录，客户端可通过下发专门带有 `action` 的指令来获取：

**查询最近的对话 `chatId` 列表**:
```json
{
  "action": "getChats"
}
```
*服务端会返回列表 JSON*: `{"type": "chatList", "data": ["chat-001", "room-2", ...]}`

**查询某一对局的具体聊天历史**:
```json
{
  "action": "getHistory",
  "targetChatId": "chat-001" 
}
```
*如果不带 targetChatId，则默认查询自身连接 clientId 对应的会话。服务端会返回*:
`{"type": "history", "chatId": "chat-001", "data": [{"id": "...", "role": "user", "text": "你好"}, ...]}`

## 3. 交互示例

以下是一个基于 `Node.js` (使用 `ws` 库) 的客户端接入示例：

```javascript
import WebSocket from 'ws';

const clientId = "user-123456";
const port = 8080; // 假设服务端运行在本地 8080 端口

// 建立连接，带上唯一的客户端标识 Header
const ws = new WebSocket(`ws://localhost:${port}`, {
  headers: {
    "x-client-id": clientId
  }
});

ws.on('open', () => {
  console.log("✅ 已成功连接到 TRAM WebSocket 服务端");

  // 组装发送消息
  const msgPayload = {
    senderName: "User01",
    text: "帮我写一个简单的 Python HelloWorld代码。",
    chatId: "test-room-1"
  };
  
  // 发送
  ws.send(JSON.stringify(msgPayload));
});

let accumulatedResponse = "";

ws.on('message', (data) => {
  // 处理接收到的消息对象
  const response = JSON.parse(data.toString());
  
  if (!response.isFinal) {
    // 此时属于流式中间分块的到达
    accumulatedResponse += response.chunk;
    process.stdout.write(response.chunk); // 增量打印
  } else {
    // 最终完整到达
    console.log("\n\n🤖 收到的最终完整回复: \n", response.text);
    accumulatedResponse = ""; // 重置供下一次对话
  }
});

ws.on('error', (error) => {
  console.error("❌ 连接抛出异常：", error);
});

ws.on('close', () => {
  console.log("🔌 连接已断开");
});
```
