# EXA MCP Web Search 集成指南

## 概述

TRAM-AI 的内置 web 搜索 providers（Tavily、Google、DashScope）已默认禁用。
现在使用 **EXA MCP（Model Context Protocol）** 服务器来提供 web 搜索功能。

## 什么是 EXA MCP？

EXA 是一个强大的 web 搜索和内容检索服务，通过 MCP 协议为 TRAM 提供：

- 🔍 高质量的 web 搜索结果
- 📄 内容检索和摘要功能  
- ⚡ 快速、可靠的搜索能力
- 🔌 自动工具发现和集成

## 配置指南

### 1️⃣ 编辑 settings.json

在你的 TRAM 设置文件中添加 EXA MCP 服务器配置。

**settings.json 位置：**
- **Linux/Mac**: `~/.local/share/tram/settings.json` 或 `~/.config/tram/settings.json`
- **Windows**: `%APPDATA%/tram/settings.json` 或 `%LOCALAPPDATA%/tram/settings.json`

**最简配置（推荐）**
```json
{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```

**完整配置（可选参数）**
```json
{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp",
      "timeout": 30000,
      "maxRetries": 3
    }
  }
}
```

### 2️⃣ 配置参数说明

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|-------|------|
| `url` | string | ✅ | - | EXA MCP 服务端点 |
| `timeout` | number | ❌ | 30000 | 请求超时时间（毫秒） |
| `maxRetries` | number | ❌ | 3 | 失败后的重试次数 |

### 3️⃣ 验证配置

配置完成后，重启 TRAM：

```bash
# Linux/Mac
npm start

# 或检查 EXA MCP 是否已被发现
npm start 2>&1 | grep -i "exa"
```

## 使用示例

### 自动任务搜索
```
User: "搜索最新的 AI 新闻"
```

TRAM 会自动使用 EXA 搜索工具：
```
Tool Call: exa/search
  query: "latest AI news"
  ...
```

### 内容检索
```
User: "获取这个网址的内容：https://example.com"
```

TRAM 可以直接通过 EXA 获取内容。

## 对比：内置 Providers vs EXA MCP

| 功能 | Tavily | Google | DashScope | EXA MCP |
|------|--------|--------|-----------|---------|
| 搜索结果 | ✅ | ✅ | ✅ | ✅ |
| AI 摘要 | ✅ | ❌ | ❌ | ✅ |
| 内容检索 | ❌ | ❌ | ❌ | ✅ |
| MCP 支持 | ❌ | ❌ | ❌ | ✅ |
| 默认启用 | ❌ | ❌ | ❌ | ✅ |

## 故障排除

### 问题 1：EXA MCP 未被发现

**症状：** 启动时没有看到 EXA 工具

**解决：**
1. 检查 settings.json 语法是否正确（JSON 格式）
2. 确保 `url` 是 `https://mcp.exa.ai/mcp`
3. 检查网络连接
4. 查看日志：`npm start 2>&1 | grep -i "exa"`

### 问题 2：搜索失败

**症状：** 调用 EXA 工具时返回错误

**解决：**
1. 检查网络连接
2. 验证 EXA 服务是否可用：`curl https://mcp.exa.ai/mcp`
3. 增加超时时间：
   ```json
   {
     "mcpServers": {
       "exa": {
         "url": "https://mcp.exa.ai/mcp",
         "timeout": 60000
       }
     }
   }
   ```

### 问题 3：找不到 settings.json

**解决：**
```bash
# 创建默认配置目录
mkdir -p ~/.local/share/tram

# 创建 settings.json
cat > ~/.local/share/tram/settings.json << 'EOF'
{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
EOF
```

## 禁用内置 Web 搜索

如果你之前配置过内置的 web 搜索 providers（Tavily/Google/DashScope），需要移除它们：

**settings.json 中移除以下部分：**
```json
// ❌ 移除这个配置（已禁用）
{
  "webSearch": {
    "provider": [
      { "type": "tavily", "apiKey": "..." },
      { "type": "google", "apiKey": "...", "searchEngineId": "..." },
      { "type": "dashscope" }
    ],
    "default": "tavily"
  }
}
```

## 更多信息

- **EXA 官网**: https://exa.ai/
- **EXA MCP 文档**: https://mcp.exa.ai/
- **MCP 协议**: https://modelcontextprotocol.io/

## 开发相关

### 修改内容

- **禁用提示**: [packages/core/src/tools/web-search/index.ts](../packages/core/src/tools/web-search/index.ts)
- **工具发现**: [packages/core/src/tools/mcp-client-manager.ts](../packages/core/src/tools/mcp-client-manager.ts)
- **配置加载**: [packages/core/src/config/config.ts](../packages/core/src/config/config.ts)

### 重新启用内置 Web 搜索

如果需要重新启用内置 providers，需要：

1. 在 settings.json 中添加 `webSearch` 配置
2. 提供相应的 API 密钥
3. 重启 TRAM

例：
```json
{
  "webSearch": {
    "provider": [
      {
        "type": "tavily",
        "apiKey": "your-tavily-api-key"
      }
    ],
    "default": "tavily"
  }
}
```

---

**上次更新**: 2026-03-25  
**状态**: ✅ EXA MCP 已成为默认搜索方案（内置提供商已禁用）
