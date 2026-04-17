# Web Search 实现切换：内置 Providers → EXA MCP

## 变更摘要

TRAM-AI 的 web 搜索实现已从内置 providers（Tavily、Google、DashScope）切换为 **EXA MCP**。

## 修改内容

### 1. 工具层（Web Search Tool）
- **文件**: `packages/core/src/tools/web-search/index.ts`
- **变更**:
  - 更新了工具描述信息，标记为已禁用
  - 修改错误消息，指导用户使用 EXA MCP
  - 添加了配置示例和文档链接

### 2. 配置层（Config）
- **文件**: `packages/core/src/config/config.ts`
- **变更**:
  - 在 `ConfigParameters` 接口中标记 `webSearch` 为 DEPRECATED
  - 在 Config 类中添加弃用提示
  - 更新工具注册逻辑注释，说明 web search 已被禁用

### 3. 文档
- **新建**: `packages/core/docs/EXA-MCP-INTEGRATION.md`
  - 完整的 EXA MCP 设置指南
  - 配置步骤和参数说明
  - 使用示例和故障排除
  
- **新建**: `packages/core/docs/settings.example.exa-mcp.json`
  - EXA MCP 配置示例

## 禁用详解

### 什么被禁用了？

1. **Tavily Provider** - 需要 API Key
2. **Google Provider** - 需要 API Key + Search Engine ID  
3. **DashScope Provider** - Qwen OAuth 集成

### 为什么禁用？

- ✅ EXA MCP 提供更完整的功能
- ✅ 通过 MCP 协议自动发现和集成
- ✅ 统一的工具管理方式
- ✅ 减少内置维护负担

## 如何使用 EXA MCP？

### 基本配置

在你的 `settings.json` 中添加：

```json
{
  "mcpServers": {
    "exa": {
      "url": "https://mcp.exa.ai/mcp"
    }
  }
}
```

### 完整配置

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

### 验证配置

```bash
npm start
# 启动日志应该显示 EXA MCP 工具的发现
```

## 迁移检查清单

- [ ] 查看 `packages/core/docs/EXA-MCP-INTEGRATION.md` 了解完整指南
- [ ] 更新 settings.json，移除旧的 webSearch 配置
- [ ] 添加 mcpServers.exa 配置
- [ ] 重启 TRAM 
- [ ] 验证 EXA 工具在工具列表中

## 代码位置参考

| 文件 | 作用 | 修改内容 |
|------|------|--------|
| `packages/core/src/tools/web-search/index.ts` | WebSearchTool 主类 | 工具描述、错误消息 |
| `packages/core/src/config/config.ts` | 配置管理 | webSearch 配置弃用注释 |
| `packages/core/docs/EXA-MCP-INTEGRATION.md` | 集成指南 | 新建 |
| `packages/core/docs/settings.example.exa-mcp.json` | 配置示例 | 新建 |

## 向后兼容性

- ✅ 如果 settings.json 中有旧的 webSearch 配置，工具仍会尝试注册（但无法找到 API Key）
- ⚠️ 建议移除旧的 webSearch 配置以避免混淆
- 🔄 可以随时通过添加 webSearch 配置来重新启用内置 providers

## 常见问题

### Q: 可以重新启用内置 providers 吗？
A: 可以。在 settings.json 中添加 webSearch 配置即可重新启用（需要 API Key）。

### Q: EXA MCP 有成本吗？
A: 请访问 https://exa.ai 了解定价信息。

### Q: 搜索结果会变好吗？
A: EXA 提供高质量结果和 AI 摘要功能，通常比内置 providers 更强大。

---

**修改日期**: 2026-03-25  
**状态**: ✅ 完成 - Web Search 已完全迁移至 EXA MCP
