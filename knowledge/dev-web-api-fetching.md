---
name: web-and-api-fetching
description: |
  网页抓取和 OpenAPI 目录发现技能。适合读取指定 URL、提炼页面重点、
  发现可用 API 规范入口，并为后续调用建立稳定的数据来源。
allowedTools:
  - web_fetch
  - openapi_link_list
---

# Web 和 API 抓取技能

## 概述

当任务需要从固定 URL 提取信息，或先找到可用的 OpenAPI 规范再继续分析时，
应优先使用这组工具，而不是退回到 shell 或手工复制网页内容。

通过这两个工具，Agent 可以：
- 抓取网页、README、API 页面并按目标提炼信息
- 发现项目内置维护的 OpenAPI 规范入口
- 先找 API 再决定后续是否继续抓取文档或调用其他工具
- 为后续文件写入、服务部署或配置生成提供可靠来源

---

## 快速参考

| 工具 | 用途 | 适合场景 |
|------|------|---------|
| `web_fetch` | 读取单个 URL 并按 prompt 提炼内容 | 文档、README、API 页面、安装说明 |
| `openapi_link_list` | 列出可用 OpenAPI 规范入口 | 先找 API、再做集成或自动化 |

---

## 工具详解

### 1. web_fetch - 读取指定 URL 并提炼内容

**用法**：

```typescript
web_fetch({
  url: 'https://docs.example.com/install',
  prompt: '提取安装步骤、依赖要求和环境变量'
})
```

**特点**：
- 适合单个、已知的具体 URL
- 会先抓取页面，再根据 prompt 输出整理后的结果
- 对 GitHub blob 链接会自动转换为 raw 链接
- 支持文档页、README、OpenAPI 页面、localhost/private URL

**典型场景**：

**场景 A：提取文档里的关键步骤**

```typescript
web_fetch({
  url: 'https://docs.example.com/deploy',
  prompt: '总结部署步骤、所需命令和注意事项'
})
```

**场景 B：读取 modpack 页面或 wiki**

```typescript
web_fetch({
  url: 'https://modrinth.com/modpack/example-pack',
  prompt: '提取 Minecraft 版本、加载器类型、推荐内存和安装说明'
})
```

**场景 C：快速理解 API 文档页面**

```typescript
web_fetch({
  url: 'https://service.example.com/openapi.json',
  prompt: '列出认证方式、核心资源和常用端点'
})
```

### 2. openapi_link_list - 发现可用 OpenAPI 规范入口

**用法**：

```typescript
openapi_link_list({
  category: 'gaming'
})

openapi_link_list({
  keyword: 'modrinth'
})
```

**特点**：
- 返回的是规范入口和文档入口，不是业务数据本身
- 支持 `keyword` 模糊筛选
- 支持 `category` 精确分类筛选
- 适合“先找 API，再决定下一步”的工作流

**典型场景**：

**场景 A：查找某类 API 的规范**

```typescript
openapi_link_list({
  category: 'gaming'
})
// 返回 Modrinth、CurseForge、MCJars 等规范入口
```

**场景 B：查找特定服务的 OpenAPI 文档**

```typescript
openapi_link_list({
  keyword: 'mcjars'
})
```

**场景 C：配合 web_fetch 继续阅读规范**

```typescript
// Step 1: 先找规范入口
openapi_link_list({ keyword: 'modrinth' })

// Step 2: 再抓取规范或 docs 页面重点
web_fetch({
  url: 'https://docs.modrinth.com/openapi.yaml',
  prompt: '列出与搜索项目和版本查询相关的端点'
})
```

---

## 典型工作流

### 工作流 1：已知页面，直接抓取

```
用户给出具体 URL
  ↓
web_fetch 提取关键信息
  ↓
整理成配置、结论或下一步动作
```

### 工作流 2：未知 API，先发现再抓取

```
用户说“找某类 API”
  ↓
openapi_link_list 找规范入口
  ↓
web_fetch 读取规范或 docs 页面
  ↓
确定认证方式、端点和后续调用方案
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **具体 URL 用 web_fetch** | 已知页面地址时不要多走一步 |
| **未知 API 先查目录** | 不确定 API 在哪里时先用 openapi_link_list |
| **prompt 要具体** | 明确要“提取什么”，不要只写“总结一下” |
| **先文档后执行** | 先确认端点、参数和认证，再做后续自动化 |
| **和领域技能联动** | Minecraft 场景可与 minecraft-tools、minecraft-mod-management 一起使用 |

---

## 常见错误

### 错误 1：把 openapi_link_list 当业务查询接口

```typescript
// ❌ WRONG：它不会返回项目搜索结果
openapi_link_list({ keyword: 'sodium' })

// ✅ CORRECT：它返回的是规范入口
openapi_link_list({ keyword: 'modrinth' })
web_fetch({
  url: 'https://docs.modrinth.com/openapi.yaml',
  prompt: '列出项目搜索端点'
})
```

### 错误 2：web_fetch 的 prompt 太模糊

```typescript
// ❌ WRONG
web_fetch({
  url: 'https://docs.example.com',
  prompt: '看看这个'
})

// ✅ CORRECT
web_fetch({
  url: 'https://docs.example.com',
  prompt: '提取安装命令、环境变量和默认端口'
})
```

---

## 协作方式

```
openapi_link_list() ← 发现规范入口
   ↓
web_fetch()         ← 提炼文档内容
   ↓
file-operations     ← 写入配置/计划/说明
   ↓
shell-execution     ← 按确认后的步骤执行
```