---
name: memory-and-task-management
description: |
  内存和任务管理技能。记忆事实、管理待办列表、委派复杂任务给子代理。
  支持全局和项目级内存、结构化任务追踪。
allowedTools:
  - save_memory
  - todo_write
  - task
  - ask_user_question
---

# 内存和任务管理技能

## 概述

内存和任务管理让 Agent 能够：
- 记住重要信息，跨对话保留
- 追踪复杂任务的进度
- 委派工作给专门的子代理
- 向用户提问和收集决策

---

## 快速参考

| 工具 | 用途 | 范围 | 确认 |
|------|------|------|------|
| `save_memory` | 记忆重要事实 | 全局或项目级 | ✅ |
| `todo_write` | 管理任务清单 | 单次对话 | ❌ |
| `task` | 委派复杂任务 | 子代理处理 | ❌ |
| `ask_user_question` | 向用户提问 | 收集决策 | ✅ (交互) |

---

## 工具详解

### 1. save_memory - 记忆管理

**用法**：

```typescript
save_memory({
  fact: '项目 MyApp 使用 React 18 + TypeScript + Vite',
  scope: 'project'  // 'global' 或 'project'
})
```

**内存文件位置**：

| Scope | 位置 | 用途 |
|-------|------|------|
| `global` | `~/.tram/TRAM.md` | 全局知识库，跨所有项目有效 |
| `project` | `${cwd}/TRAM.md` | 项目级知识库，仅当前项目有效 |

**内存格式**：

```markdown
## Qwen Added Memories

- 项目 MyApp 使用 React 18 + TypeScript + Vite
- 构建脚本：npm run build, npm run dev, npm run lint
- API 基础 URL：https://api.example.com
- 数据库：PostgreSQL，主机 localhost:5432
```

### 什么应该被记忆？

✅ **应该记忆**（重要、多次使用）：
- 项目配置和秘密信息
- 已验证的最佳实践
- 长期目标和约束
- 第三方服务的 API 信息
- 代码约定和规范

❌ **不应该记忆**（细节、临时）：
- 单个函数的实现
- 一次性的错误信息
- 文件路径（可以 read_file）
- 命令输出（可以重新运行）

### 典型场景

**场景 A：记录项目信息**

```typescript
// 刚开始处理一个新项目，记住核心信息
save_memory({
  fact: '项目结构：packages/{cli,core,sdk}，npm workspaces 管理',
  scope: 'project'
})

save_memory({
  fact: '构建命令：npm run build（依赖顺序自动管理）',
  scope: 'project'
})

save_memory({
  fact: '测试框架：Vitest，位置：src/**/*.test.ts',
  scope: 'project'
})
```

**场景 B：记录排查结果**

```typescript
// 发现并解决一个 bug，记住原因，防止再犯
save_memory({
  fact: 'Windows PowerShell Set-Content 会破坏 UTF-8 文件，改用 C# API',
  scope: 'global'
})

save_memory({
  fact: '该项目的 Promise 链必须显式 return，否则会提前完成',
  scope: 'project'
})
```

**场景 C：记录配置要点**

```typescript
save_memory({
  fact: 'API 密钥：使用环境变量 OPENAI_API_KEY，不要硬编码',
  scope: 'project'
})

save_memory({
  fact: 'MCP 服务器配置位置：~/.mcp/config.json，需手动编辑',
  scope: 'global'
})
```

---

### 2. todo_write - 任务追踪

**用法**：

```typescript
todo_write({
  tasks: [
    { id: 1, title: '实现 API 端点', status: 'in-progress' },
    { id: 2, title: '编写单元测试', status: 'not-started' },
    { id: 3, title: '集成文档', status: 'completed' }
  ]
})
```

**任务状态**：

| 状态 | 含义 |
|------|------|
| `not-started` | 未开始 |
| `in-progress` | 进行中（同时只能一个） |
| `completed` | 已完成 |

**任务结构**：

```typescript
{
  id: 1-999,           // 任务 ID（自动递增）
  title: string,       // 简洁的任务标题
  status: string       // not-started / in-progress / completed
}
```

### 任务清单的作用

✅ **适合用 todo_write**：
- 计划多步骤工程项目
- 追踪大型重构进度
- 分解复杂工作
- 与用户同步进度

❌ **不需要 todo_write**：
- 单个简单任务
- 一次性的小改代码
- 临时探索

### 典型场景

**场景 A：多步骤项目规划**

```typescript
// 开始一个大项目，列出步骤
todo_write({
  tasks: [
    { id: 1, title: '设计数据库 schema', status: 'not-started' },
    { id: 2, title: '实现 CRUD API', status: 'not-started' },
    { id: 3, title: '编写单元测试', status: 'not-started' },
    { id: 4, title: '集成到前端', status: 'not-started' },
    { id: 5, title: '性能测试and优化', status: 'not-started' }
  ]
})

// 开始任务 1
todo_write({
  tasks: [
    { id: 1, title: '设计数据库 schema', status: 'in-progress' },
    // ... 其他任务
  ]
})

// 完成任务 1，开始任务 2
todo_write({
  tasks: [
    { id: 1, title: '设计数据库 schema', status: 'completed' },
    { id: 2, title: '实现 CRUD API', status: 'in-progress' },
    // ...
  ]
})
```

**场景 B：追踪重构进度**

```typescript
todo_write({
  tasks: [
    { id: 1, title: '迁移旧 API 到新架构', status: 'in-progress' },
    { id: 2, title: '更新所有调用点', status: 'not-started' },
    { id: 3, title: '删除旧代码', status: 'not-started' },
    { id: 4, title: '回归测试', status: 'not-started' }
  ]
})
```

---

### 3. task - 子代理委派

**用法**：

```typescript
task({
  title: '重构模块 X 的代码',
  description: '目标：提升代码清晰度和性能',
  context: {
    files: ['/src/module-x/index.ts', '/src/module-x/utils.ts'],
    constraints: '保持公共 API 向后兼容'
  }
})
```

**委派流程**：

```
Agent A（主代理）
  ↓
  委派任务给 Agent B（子代理）
  └─→ Agent B 独立处理，返回结果给 A
```

### 何时使用 task 委派？

✅ **适合委派**：
- 需要专门深入研究的工作（如代码审查）
- 需要用另一个专门 Agent 的技能
- 当前 Agent 陷入循环或不确定

❌ **不需要委派**：
- 当前 Agent 已完全掌握
- 工作很小，直接做更快
- 需要实时交互的决策

### 典型场景

**场景 A：代码审查委派**

```typescript
task({
  title: '审查新增的支付处理模块',
  description: '检查安全、性能、代码质量',
  context: {
    files: ['/src/payment/stripe.ts', '/src/payment/webhook.ts'],
    constraints: '确保 PCI 合规'
  }
})
// 子代理会详细审查并返回反馈
```

**场务 B：文档生成委派**

```typescript
task({
  title: '生成 API 文档',
  description: '基于源代码 JSDoc 和 OpenAPI 规范',
  context: {
    files: ['/src/api/**/*.ts'],
    constraints: '格式遵循项目规范'
  }
})
```

**场景 C：问题排查委派**

```typescript
task({
  title: '诊断内存泄漏问题',
  description: '应用运行 24 小时后内存持续增长',
  context: {
    logs: ['/var/log/app.log'],
    tools_available: ['read_file', 'web_search', 'run_shell_command']
  }
})
```

---

### 4. ask_user_question - 用户交互

**用法**：

```typescript
ask_user_question({
  question: '你想使用哪个数据库？',
  options: ['PostgreSQL', 'MongoDB', 'MySQL']
})

// 或开放式问题
ask_user_question({
  question: '项目的目标使用人数是多少？'
})
```

**返回值**：

```typescript
{
  answer: '用户选择或输入的答案'
}
```

### 什么时候问用户？

✅ **应该问**：
- 多个选项，无明显最佳方案
- 需要了解用户的需求或偏好
- 涉及重大决策

❌ **不必问**：
- 技术选择有明确答案
- 可以通过代码推断
- 用户之前已说明

### 典型场景

**场景 A：技术选型**

```typescript
ask_user_question({
  question: '项目是否需要实时功能？',
  options: ['是', '否']
})
// 根据答案选择 WebSocket vs HTTP polling
```

**场景 B：收集需求**

```typescript
ask_user_question({
  question: '预期的并发用户数？',
})
// 根据答案调整架构方案
```

**场景 C：确认重要决策**

```typescript
ask_user_question({
  question: '确定要删除这个模块吗？这会影响其他 3 个模块。',
  options: ['继续删除', '保留']
})
```

---

## 工作流程

### 流程 1：长期项目记忆和追踪

```
对话 1（第一次接触项目）:
├─ save_memory() 记住项目配置
├─ todo_write() 规划工作步骤
└─ 开始实施

对话 2（几天后回到项目）:
├─ 自动加载上次的 memory ✓
├─ 自动加载上次的 todo ✓
├─ 理解已完成的进度
└─ 继续工作

对话 3（又几天后）:
├─ 加载 memory 和 todo
└─ 基于上次进度继续
```

### 流程 2：复杂任务分工

```
主代理（用户交互）
├─ 收集需求（ask_user_question）
├─ 制定计划（todo_write）
├─ 委派设计（task → 子代理）
├─ 委派实施（task → 子代理）
├─ 委派测试（task → 子代理）
└─ 综合结果和用户反馈
```

---

## 实际应用案例

### 案例 1：多周期重构项目

```
周一提交计划：

save_memory({
  fact: '重构目标：将单体应用拆分为微服务架构',
  scope: 'project'
})

todo_write({
  tasks: [
    { id: 1, title: '分析现有依赖关系', status: 'in-progress' },
    { id: 2, title: '设计服务边界', status: 'not-started' },
    { id: 3, title: '提取用户服务', status: 'not-started' },
    { id: 4, title: '提取订单服务', status: 'not-started' },
    { id: 5, title: '迁移前端依赖', status: 'not-started' },
    { id: 6, title: '集成测试', status: 'not-started' }
  ]
})

周二继续：
// 加载了之前的 memory 和 todo，了解进度
// 继续任务 1，然后开始任务 2

周三：
todo_write({
  tasks: [
    { id: 1, title: '分析现有依赖关系', status: 'completed' },
    { id: 2, title: '设计服务边界', status: 'in-progress' },
    // ...
  ]
})
```

### 案例 2：团队工作分工

```
主代理分阶段处理：

task({
  title: '实现用户认证模块',
  description: '支持 JWT + OAuth2',
  context: { files: [...], constraints: '兼容现有 API' }
})
// 子代理处理实现

task({
  title: '审查认证实现的安全性',
  description: '检查 SQL 注入、CSRF、JWT 生命周期等',
  context: { files: ['/src/auth/**'] }
})
// 子代理进行审查

save_memory({
  fact: 'OAuth2 provider: GitHub, Google, 配置在 .env.local',
  scope: 'project'
})
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **及时保存内存** | 遇到重要发现立即 save_memory |
| **清晰的任务描述** | todo 标题简洁，描述准确 |
| **合理的任务粒度** | 任务不能太大或太小，通常 1-8 小时工作量 |
| **及时更新状态** | 完成任务立即标记为 completed |
| **适度委派** | 不要过度拆分，简单任务直接做 |
| **让用户参与重大决策** | 关键选择用 ask_user_question |

---

## 常见错误

### ❌ 错误 1：过度保存内存

```typescript
// ❌ 太多细节的记忆
save_memory({
  fact: 'index.ts 第 42 行的 handleClick 函数用来处理按钮点击'
})

// ✅ 只记关键信息
save_memory({
  fact: '项目使用 React hooks，事件处理在 utils/handlers.ts 中统一'
})
```

### ❌ 错误 2：任务颗粒太细

```typescript
// ❌ 太碎片化
todo_write({
  tasks: [
    { id: 1, title: '导入 lodash', status: 'not-started' },
    { id: 2, title: '定义 interface', status: 'not-started' },
    { id: 3, title: '写 function', status: 'not-started' },
    { id: 4, title: '添加 JSDoc', status: 'not-started' }
  ]
})

// ✅ 合理的粒度
todo_write({
  tasks: [
    { id: 1, title: '实现数据验证工具函数', status: 'not-started' },
    { id: 2, title: '编写单元测试', status: 'not-started' },
    { id: 3, title: '集成到表单组件', status: 'not-started' }
  ]
})
```

### ❌ 错误 3：过度委派简单工作

```typescript
// ❌ 过度设计
task({
  title: '修改一个变量名从 foo 到 bar'
})
// 简单 find-replace，直接用 edit 工具

// ✅ 用 task 处理复杂工作
task({
  title: '重构认证流程并添加多因素认证支持'
})
```

---

## FAQ

**Q: memory 和 todo 的区别？**

A:
- `memory`：持久化知识库，跨对话有效，记录重要信息
- `todo`：任务追踪，单次对话有效，追踪进度

**Q: 什么时候用 task 委派？**

A:
当需要另一个代理的专门技能，或当前陷入困境时。简单工作直接做更高效。

**Q: memory 会无限增长吗？**

A:
memory 是手工管理的列表，应定期审查、清理过期信息。系统不自动清理。

---

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| `memory 查询不到信息` | 拼写错误或不在当前范围 | 检查拼写、选择正确的 scope |
| `todo 丢失** | 列表未保存或被覆盖 | 确保调用了 todo_write |
| `task 委派无结果** | 子代理卡住或提交了无用结果 | 检查委派描述清晰度 |
| `forgotten about important info** | 没有及时保存 memory | 建立习惯：重要发现立即记住 |
