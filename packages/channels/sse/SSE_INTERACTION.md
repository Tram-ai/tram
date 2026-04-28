# Server-Sent Events (SSE) 渠道连通与交互文档

本文档说明了如何作为客户端与基于 `channel-sse` 的 TRAM SSE 服务端进行连通与信息交互。

不像 WebSocket 是原生全双工协议，SSE 采用基于 HTTP / REST 的准半双工模式。通信被拆分为两个接口：

1. `GET /events`: 客户端订阅服务器下发的数据（SSE 格式）
2. `POST /message`: 客户端向服务器发送数据对话（HTTP 格式）

## 1. 连接与认证配置

服务端在启动时会根据频道配置 (Channel Config) 监听指定的 `port`。

- **获取回复端点 (Server -> Client)**: `GET http://<host>:<port>/events`
- **发送消息端点 (Client -> Server)**: `POST http://<host>:<port>/message`

**客户端身份标识（非常重要）**: 
与服务器的所有交互都需要保证关联到同一个客户端标识，推荐方案有两种：
1. **通过 Header**: 附加 `x-client-id: <clientId>` 请求头
2. **通过 Query**: `.get("/events?clientId=<clientId>")` 和 `POST /message?clientId=<clientId>`

## 2. 消息格式

### 2.1 客户端请求发送 -> 服务端 (上行)

使用 `POST` 方式将你想要发送给机器人的会话数据通过 JSON Body 提交。

请求示例: `POST /message` (头信息别忘了附带 `x-client-id`)

请求 Body 结构：
```json
{
  "senderName": "测试用户",
  "chatId": "chat-sse-001",
  "text": "你好，请帮忙解释一下 SSE 和 WebSocket 的区别。",
  "isGroup": false,
  "isMentioned": false
}
```

**字段详细说明：**
- `text` (String): **必填**，实际发送给机器人的对话文字内容。
- `senderName` (String): *选填*，发送方的昵称。
- `chatId` (String): *选填*，对话框的唯一标识。如果不填，默认会使用身份标识 (clientId)。
- `isGroup` (Boolean): *选填*，标记当前会话是否为群聊，默认为 `false`。
- `isMentioned` (Boolean): *选填*，如果是群聊，是否被直接艾特。

### 2.2 服务端推送 -> 客户端 (下行)

对于前置通过 `GET /events` 建立的流式连接，服务器会按照标准 SSE (`text/event-stream`) 的机制进行推送，并默认支持流式思考结果逐步下发 (`isFinal: false`)。所有的内容将附加在 `data:` 数据体前缀之后。

流式分段时（思考中连续获取的部分）：
```json
data: {"chunk":"你好，SSE是 ","isFinal":false}
```

响应结束下发的最后全量文本时：
```json
data: {"text":"你好，SSE是 Server Sent Events。","isFinal":true}
```

字段解析说明：
- `chunk` (String): 流式下发阶段增量的生成的文本分块 (`isFinal: false`)。
- `text` (String): 表示最终全量回合生成的拼接文本 (`isFinal: true`)。

### 2.3 获取聊天列表与对话历史 (REST API)

除了连接收发消息，服务端同时还开放了查询内部状态与漫游历史消息的 REST 接口（常用于渲染左侧聊天会话列表和消息框漫游记录）：

- **获取活跃的会话列表**：
  `GET http://<host>:<port>/chats`
  返回如：`{"type":"chatList", "data":["sse-user-1", "chat-id-001"]}`

- **获取指定对话的具体上下文消息历史**：
  `GET http://<host>:<port>/history?chatId=sse-user-1`
  返回如：`{"type":"history", "chatId":"sse-user-1", "data":[ {"id":"...", "role":"user", "text":"..."}, {"id":"...", "role":"bot", "text":"..."} ]}`

## 3. 交互示例

以下是一个基于浏览器原生 `EventSource` (或类似实现) 以及 `fetch` API 来与 SSE 服务端交互的 JavaScript 示例：

```javascript
// ====== 客户端代码示例 ======
const port = 8080;
const clientId = "sse-user-" + Math.floor(Math.random() * 10000);
const baseUrl = `http://localhost:${port}`;

// 1. 订阅服务端的消息推送
const eventSource = new EventSource(`${baseUrl}/events?clientId=${clientId}`);

eventSource.onopen = () => {
  console.log("✅ 成功订阅 SSE 服务");
};

// 收到 SSE 推送事件的监听
eventSource.onmessage = (event) => {
  // 服务端下发的一条结构化消息体解析
  const messageData = JSON.parse(event.data);
  
  if (!messageData.isFinal) { // 中间状态，获得流式块内容
    process.stdout.write(messageData.chunk);
  } else { // 结束时，收到全量内容
    console.log("\n\n🤖 收到最终回复: ", messageData.text);
  }
};

eventSource.onerror = (error) => {
  console.error("❌ SSE 连接错误 / 断开:", error);
};

// 2. 发送聊天信息
async function sendChatMessage(text) {
  const payload = {
    chatId: clientId,
    senderName: "User",
    text: text
  };

  const response = await fetch(`${baseUrl}/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": clientId // 等同于 url 中带上 client id
    },
    body: JSON.stringify(payload)
  });

  const resJson = await response.json();
  if (resJson.status === "success") {
    console.log("📤 消息已投递:", text);
  }
}

// 模拟一次测试交互
setTimeout(() => {
  sendChatMessage("帮我解释一下什么是 SSE 协议");
}, 1000);
```