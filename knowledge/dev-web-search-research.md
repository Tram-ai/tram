---
name: web-search-and-research
description: |
  网络搜索和研究技能。查询互联网信息、获取 API 文档、查找解决方案。
  支持多个搜索提供商（Tavily、Google、DashScope）。
allowedTools:
  - web_search
  - web_fetch
  - openapi_link_list
---

# 网络搜索和研究技能

## 概述

网络搜索让 Agent 能够：
- 查找最新技术文档和教程
- 搜索解决方案和最佳实践
- 获取 API 文档和代码示例
- 研究库、框架、工具的用法

---

## 快速参考

| 工具 | 用途 | 结果类型 | 自适应 |
|------|------|---------|--------|
| `web_search` | 网络搜索 | 5 条结果 + 概括 | ✅ 自动选提供商 |
| `web_fetch` | 获取网页内容 | 完整文本 | ✅ 自动提取内容 |
| `openapi_link_list` | API 示例库 | 公开 API 列表 | ✅ 预配置高质量链接 |

---

## 工具详解

### 1. web_search - 网络搜索

**用法**：

```typescript
web_search({
  query: '如何优化 Node.js 性能',           // 搜索查询（必填）
  provider: 'tavily',                        // 提供商选择（可选）
  num_results: 5                             // 返回结果数（可选）
})
```

**搜索提供商**：

| 提供商 | 特点 | 适合场景 |
|--------|------|--------|
| **Tavily** | AI 优化、相关度高、支持深度搜索 | 一般搜索、需要准确性 |
| **Google** | 全球最全、SEO 优化 | 商业、流量驱动内容 |
| **DashScope** | 阿里云中文优化、内容丰富 | 中文搜索、本地内容 |

**返回格式**：

```typescript
{
  answer?: string,  // 自然语言总结（某些提供商支持）
  results: [
    {
      title: 'Node.js 性能优化完全指南',
      url: 'https://example.com/...',
      content: '要优化 Node.js 性能，需要...这篇文章涵盖内存管理、事件循环...',
      score?: 0.95,
      publishedDate?: '2024-03-15'
    },
    // ... 更多结果
  ]
}
```

### 典型搜索场景

**场景 A：查找技术方案**

```typescript
web_search({
  query: '如何在 TypeScript 中实现范型编程'
})
// → 返回最相关的 5 条结果
// → 其中可能包括 TS 官方文档、教程、GitHub gist
```

**场景 B：错误排查**

```typescript
web_search({
  query: '[ERROR] OutOfMemoryError: Java heap space 如何修复'
})
// → 返回实战解决方案
// → 包括参数调优、代码优化
```

**场景 C：最新信息**

```typescript
web_search({
  query: 'Next.js 15 最新特性 2024'
})
// → 返回最新的框架更新、新特性
```

**场景 D：对比方案**

```typescript
web_search({
  query: 'React vs Vue vs Svelte 2024 性能对比'
})
// → 返回技术对比文章、性能数据
```

---

### 2. web_fetch - 获取网页内容

**用法**：

```typescript
web_fetch({
  url: 'https://nodejs.org/api/http.html',
  query: '建立 HTTP 服务器的基本步骤'  // 可选：用 AI 提取相关内容
})
```

**特性**：
- ✅ 自动处理 HTML → 纯文本转换
- ✅ 支持 LLM 提示词，自动提取相关部分
- ✅ 大文件自动裁剪，避免溢出

**使用流程**：

```
1. web_search() 找到文章或文档 URL
   ↓
2. web_fetch() 获取完整内容
   ↓
3. 从内容中提取相关信息
   ↓
4. 整合回答或代码
```

### 典型场景

**场景 A：查阅官方文档**

```typescript
// 1. 搜索找到文档 URL
const searchResult = web_search({
  query: 'Node.js fs 文件系统 API 文档'
})

// 2. 获取完整文档
web_fetch({
  url: searchResult.results[0].url,
  query: 'readFile 异步读文件方法'
})

// 3. 返回的内容包含完整 API 说明
```

**场景 B：阅读 GitHub 仓库**

```typescript
web_fetch({
  url: 'https://github.com/lodash/lodash#readme',
  query: 'lodash 库的共用方法有哪些'
})
```

**场景 C：研究深度文章**

```typescript
web_fetch({
  url: 'https://example.com/deep-dive-js-event-loop',
  query: '事件循环的工作原理和执行顺序'
})
```

---

### 3. openapi_link_list - API 示例库

**用法**：

```typescript
openapi_link_list({
  keyword: 'github'  // 可选：按关键字筛选
})

// 返回包含的 API 列表：
// GitHub API, Stripe API, OpenWeather, Hugging Face, ...
```

**预配置 API**：

大约覆盖 50+ 常用 API：
- **代码托管**：GitHub, GitLab, Gitea
- **支付**：Stripe, Wise
- **云服务**：AWS, Azure, Google Cloud
- **AI/ML**：OpenAI, Hugging Face, Stability AI
- **数据**：OpenWeather, NewsAPI
- **其他**：Discord, Slack, Notion

**使用场景**：

```typescript
// 查找 GitHub API 文档
openapi_link_list({ keyword: 'github' })
// → 返回：https://api.github.com/...

// 查找所有支付 API
openapi_link_list({ keyword: 'payment' })
// → 返回：Stripe, Wise, ...

// 查看所有已支持的 API
openapi_link_list()
// → 返回完整列表
```

---

## 工作流程

### 流程 1：解决问题（搜索 → 理解 → 实施）

```
1. 用户提出问题或需求
   ↓
2. web_search() 找相关资料
   ↓
3. web_fetch() 获取深度内容
   ↓
4. 提取关键信息和示例代码
   ↓
5. 根据理解实施解决方案
```

### 流程 2：查阅文档（快速查询 API）

```
1. openapi_link_list() 找到 API 文档 URL
   ↓
2. web_fetch() 获取文档内容
   ↓
3. 搜索相关方法、参数、示例
   ↓
4. 返回 API 用法
```

### 流程 3：研究最佳实践

```
1. web_search() 搜索关键词（如 'Node.js 性能优化 2024'）
   ↓
2. 筛选最相关的文章
   ↓
3. web_fetch() 深度阅读两三篇
   ↓
4. 综合成结构化的最佳实践指南
```

---

## 典型应用案例

### 案例 A：学习新框架

```
用户："帮我了解 SvelteKit"

1. web_search('SvelteKit 文档和教程')
   → 找到官方网站、教程

2. web_fetch(官网 URL, '快速开始和项目结构')
   → 获取完整指南

3. web_fetch(GitHub README, '主要特性')
   → 了解核心能力

4. 返回综合总结：
   - 什么是 SvelteKit
   - 如何搭建项目
   - 核心特性概览
   - 对比其他框架
```

### 案例 B：排查 bug

```
用户："我的 Docker 容器启动失败，提示 Port already in use"

1. web_search('Docker Port already in use 解决方案')
   → 找到常见原因和解决方法

2. 返回：
   - 排查步骤
   - 几种修复方案
   - 防止措施
```

### 案例 C：API 集成

```
用户："从 OpenWeather API 获取天气数据"

1. openapi_link_list('openweather')
   → 找到 API 文档链接

2. web_fetch(API 文档, '获取当前天气的端点和参数')
   → 了解 API 结构

3. 生成代码示例：
   - 认证方式
   - 请求格式
   - 响应结构
   - 错误处理
```

---

## 搜索技巧

### ✅ 有效搜索

| 搜索词 | 效果 |
|--------|------|
| `如何在 Node.js 中处理文件上传` | ✅ 具体问题，容易找到解决方案 |
| `TypeScript 泛型最佳实践 2024` | ✅ 加年份，找最新内容 |
| `[ERROR] Cannot find module 解决` | ✅ 包含错误信息，更容易定位 |
| `React hooks 性能优化` | ✅ 具体技术 + 具体需求 |

### ❌ 低效搜索

| 搜索词 | 问题 |
|--------|------|
| `JavaScript` | ❌ 太宽泛，结果噪音大 |
| `如何学编程` | ❌ 太笼统，不易解决具体问题 |
| `API` | ❌ 需要更多上下文 |

### 🎯 改进方向

```typescript
// ❌ 太宽泛
web_search({ query: 'Node.js' })

// ✅ 具体问题
web_search({ query: '在 Node.js 中用流处理大文件的最佳方式' })

// ✅ 包含错误或版本
web_search({ query: 'Node.js 18 ERR_REQUIRE_ESM 解决方案' })

// ✅ 带时间限定
web_search({ query: 'React 18 Suspense 最新用法 2024' })
```

---

## 常见错误

### ❌ 错误 1：搜索过于宽泛

```typescript
// ❌ 找不到有用信息
web_search({ query: '数据库' })

// ✅ 具体问题
web_search({ query: '在 Node.js 中使用 PostgreSQL 的最佳实践' })
```

### ❌ 错误 2：没有深入阅读

```typescript
// ❌ 只看搜索结果摘要，可能理解有偏差
const results = web_search({ query: '...' })
// 仅根据 content 片段给建议

// ✅ 深度阅读
const results = web_search({ query: '...' })
web_fetch(results[0].url, '详细原理')
// 彻底理解后再给建议
```

### ❌ 错误 3：忽视来源可信度

```typescript
// ❌ 所有结果等同对待
// 百科、文档、博客、StackOverflow 混在一起

// ✅ 优先看官方文档
// 官方文档 > 已验证的教程 > 博客 > 论坛讨论
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **具体搜索词** | 加上版本号、错误信息、技术栈 |
| **深度阅读** | 不仅看摘要，用 web_fetch 读完整文章 |
| **多源验证** | 从官方文档 + 社区讨论验证信息 |
| **时间敏感** | 加上年份确保获得最新内容 |
| **链接优先级** | 官网 > 官方文档 > 经过验证的教程 > 博客 |

---

## FAQ

**Q: web_search 和 web_fetch 的区别？**

A: 
- `web_search` 是快速概览，返回 5 条摘要
- `web_fetch` 是深度阅读，返回某个 URL 的完整内容

使用流程通常是：先 search 找到 URL → 再 fetch 读完整内容。

**Q: 如何确保搜索结果准确？**

A: 
- 使用具体的搜索词（包括版本号、错误信息）
- 优先选择官方文档或高质量教程
- 多个来源交叉验证

**Q: openapi_link_list 内置了哪些 API？**

A: 
大约 50+ API，包括 GitHub、Stripe、OpenWeather、Hugging Face 等。
用 `openapi_link_list()` 查看完整列表。

---

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| `搜索无结果` | 搜索词太冷门或拼写错误 | 简化搜索词、换关键字 |
| `web_fetch 返回网页样板** | 动态网页需要 JavaScript 渲染 | 尝试查找该网页的镜像或文档版本 |
| `搜索结果不相关` | 搜索词歧义多 | 加上更多上下文（技术栈、版本等） |
| `API 文档过时** | 文档没及时更新 | 查看最新版本或官方 GitHub issues |
