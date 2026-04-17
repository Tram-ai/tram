# EXA MCP Web Search 集成指南

## 概述

TRAM-AI的内置web搜索providers（Tavily、Google、DashScope）已默认禁用。
现在使用 **EXA MCP（Model Context Protocol）** 服务器来提供web搜索功能。

## 什么是EXA MCP？

EXA是一个强大的web搜索和内容检索服务，通过MCP协议为TRAM提供：
- 高质量的web搜索结果
- 内容检索和摘要功能
- 快速、可靠的搜索能力

## 配置步骤

### 1. 修改 `settings.json`

在你的TRAM设置文件中添加EXA MCP服务器配置：

#### 最简配置（推荐）
```json
{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```

#### 完整配置
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

### 2. 配置参数说明

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `url` | string | ✅ | EXA MCP服务的端点：`https://mcp.exa.ai/mcp` |
| `timeout` | number | ❌ | 请求超时时间（毫秒），默认30000 |
| `maxRetries` | number | ❌ | 失败重试次数，默认3 |

## 使用方法

### 自动发现
一旦正确配置了EXA MCP服务器，TRAM会自动发现并注册其提供的工具：

```bash
npm start
# EXA MCP工具将自动被发现和注册
```

### 在对话中使用
当你需要web搜索时，LLM会自动调用EXA提供的搜索工具：

```
User: "搜索最新的AI新闻"