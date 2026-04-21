---
name: skill-system
description: |
  技能系统和技能调用。查询可用技能，执行特定领域的技能。
  Meta 工具：用于发现和激活其他技能，实现渐进式功能加载。
allowedTools:
  - skill
---

# 技能系统和技能调用

## 概述

TRAM 中的"技能"是可复用的领域特定知识和工作流。通过 `skill` 工具，Agent 可以：

- **发现技能**: 查询项目中有哪些可用的技能
- **激活技能**: 切换到特定技能的上下文（如 Minecraft 技能、代码审查技能）
- **链接工作流**: 在主任务中调用专门的技能工作流
- **渐进加载**: 只在需要时加载特定领域的知识

---

## 核心概念

### 什么是技能？

技能是一个 SKILL.md 文件，包含：

```yaml
---
name: skill-name                    # 技能标识符
description: "技能说明"             # 用途描述  
allowedTools: [tool1, tool2]       # 该技能可用的工具
applyTo: ["src/**/*.ts"]           # 可选：应用范围
---

# 详细文档
...包含示例、工作流、最佳实践等
```

### 技能的层级

- **内置技能**: TRAM 自带的通用技能（文件操作、shell 执行、web 搜索等）
- **专用技能**: 针对特定项目/技术的技能（Minecraft、电商、IoT 等）
- **用户自定义技能**: 用户或团队创建的专属工作流

### 技能 vs 工具

| 对比 | 工具 | 技能 |
|------|------|------|
| **粒度** | 细粒度（单一功能）| 粗粒度（工作流）|
| **例子** | read_file, write_file | file-operations, review |
| **调用** | 直接调用 | 激活上下文 |
| **文档** | JSON Schema | Markdown + 指南 |
| **用途** | 原子操作 | 领域流程 |

---

## 工具详解

### skill - 技能查询和激活

#### 功能

Meta 工具，用于：
1. **列出可用技能**: 了解项目中有哪些技能
2. **激活技能**: 进入特定技能的上下文（本工具自动提供详细说明）

#### 基本用法

```typescript
// 查询可用技能
skill({
  skill: 'file-operations'  // 激活"文件操作"技能
})

// 或查询其他技能
skill({
  skill: 'minecraft-tools'
})

skill({
  skill: 'review'
})
```

#### 返回值

当调用 `skill` 时，返回该技能的完整文档（来自 SKILL.md）：

```typescript
{
  name: 'file-operations',
  description: '文件操作技能。读写编辑删除文件...',
  content: '# 文件操作技能\n\n## 概述\n...',  // 完整 SKILL.md 内容
  tools: ['read_file', 'write_file', 'edit', 'delete', ...]
}
```

#### 参数

| 参数 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `skill` | string | 技能名称，如 "file-operations" | ✓ |

---

## 使用场景

### 场景 A：探索项目中有哪些可用技能

当你不确定项目有哪些特殊功能时：

```typescript
// Step 1: 激活 skill-system 技能来查看有什么可用
skill({
  skill: 'skill-system'
})

// 返回会列出项目中的所有技能：
// - file-operations
// - shell-execution
// - minecraft-tools
// - minecraft-mod-management
// - service-management
// - memory-and-task-management
// - review
// - code-navigation-and-analysis
// - sublm-and-log-analysis
// - web-and-api-fetching
// - media-processing
// - planning-and-workflow
// ... 等等

// Step 2: 如果看到 'minecraft-tools'，你可以激活它
skill({
  skill: 'minecraft-tools'
})

// 现在获得了 Minecraft 相关的所有工具和最佳实践
```

### 场景 B：任务涉及特定领域时激活相关技能

```typescript
// 任务：用户要求"帮我搭建一个 Minecraft 服务器"

// Step 1: 识别这是 Minecraft 相关任务
console.log("检测到任务涉及 Minecraft")

// Step 2: 激活 Minecraft 技能
skill({
  skill: 'minecraft-tools'
})

// Step 3: 激活 Minecraft mod 管理技能（可选的补充）
skill({
  skill: 'minecraft-mod-management'
})

// 现在你拥有了：
// - Minecraft 服务器相关的完整知识
// - 如何安装 mods
// - Minecraft 特定的工作流最佳实践

// 然后可以开始实施任务：
// - 使用 minecraft_server_info 工具查询版本
// - 使用 service_manage 工具启动/停止服务器
// - 使用 mod_search 工具搜索和安装 mods
```

### 场景 C：在代码审查中激活代码审查模式

```typescript
// 任务：审查一个 PR 或代码

// Step 1: 激活代码审查技能
skill({
  skill: 'review'
})

// 返回的文档会包含：
// - 代码审查的关键方面
// - 如何使用 LSP 工具进行代码分析
// - 审查清单
// - 常见问题模式
// - 修复建议流程

// Step 2: 按照技能中的指导进行审查
// - 使用 lsp 工具检查类型错误
// - 使用 grep_search 查找反模式
// - 使用 sublm 快速分析复杂代码
// - 生成审查报告
```

### 场景 D：链接多个技能来解决复杂问题

```typescript
// 任务：修复一个 Minecraft 服务器的运行性能问题

// Step 1: 激活服务管理技能
skill({
  skill: 'service-management'
})

// Step 2: 激活日志分析技能
skill({
  skill: 'sublm-and-log-analysis'
})

// Step 3: 激活 Minecraft 工具技能
skill({
  skill: 'minecraft-tools'
})

// 现在有了完整的工具箱：
// - 服务诊断工具
// - 日志分析工具 (sublm, request_log_pattern)
// - Minecraft 特定知识

// 然后执行诊断流程：
// service_manage: analyze logs
// → sublm: quick diagnosis
// → request_log_pattern: learn error patterns
// → minecraft_tools: check server config
// → service_manage: apply fixes
```

---

## 技能的自动发现

### 如何发现可用技能？

当你不知道有什么技能时，有两种方法：

#### 方法 1：直接尝试激活

```typescript
// 如果你猜测可能有某个技能，直接尝试
skill({
  skill: 'blockchain'  // 不存在
})

// 如果不存在，会返回错误信息和可用技能列表
```

#### 方法 2：阅读 SKILL.md 文件

项目中的 SKILL.md 文件位置：

```
packages/core/src/skills/bundled/
├── file-operations/SKILL.md
├── shell-execution/SKILL.md
├── memory-and-task-management/SKILL.md
├── minecraft-tools/SKILL.md
├── minecraft-mod-management/SKILL.md
├── service-management/SKILL.md
├── review/SKILL.md
├── code-navigation-and-analysis/SKILL.md
├── sublm-and-log-analysis/SKILL.md
├── web-and-api-fetching/SKILL.md
├── media-processing/SKILL.md
├── planning-and-workflow/SKILL.md
└── ... 更多技能
```

---

## 技能工作流设计

### 典型的技能激活流程

```
User 提出任务
  ↓
Agent 识别所需技能
  ↓
Agent 调用 skill() 激活
  ↓
获得技能的完整文档和工具列表
  ↓
根据技能指导执行任务
  ↓
任务完成
```

### 多技能协作示例

```typescript
// 场景：复杂的 DevOps 任务

// 任务组成：
// 1. 代码部署（需要代码导航、git 操作）
// 2. 服务启动（需要服务管理）
// 3. 监控验证（需要日志分析）
// 4. 文档更新（需要文件操作）

// 技能激活：
const skills = [
  'code-navigation-and-analysis',
  'service-management',
  'sublm-and-log-analysis',
  'file-operations',
  'memory-and-task-management'
]

for (const skillName of skills) {
  skill({ skill: skillName })
  // 逐个加载技能的完整文档
}

// 现在执行任务，每个阶段使用相应技能
```

---

## 创建自定义技能

如果你的项目需要新技能，遵循以下模板：

### 技能文件模板

```markdown
---
name: my-custom-skill
description: |
  你的技能描述。
  可以多行。
allowedTools:
  - tool1
  - tool2
  - tool3
applyTo:           # 可选：限制应用范围
  - src/myarea/**
---

# 技能标题

## 概述
[技能介绍]

## 快速参考
[快速表格或命令]

## 工具详解
[各工具用法]

## 使用场景
[具体例子]

## 最佳实践
[做和不做]
```

### 注册自定义技能

1. 创建文件：`packages/core/src/skills/bundled/my-skill/SKILL.md`
2. npm build 重新构建
3. 调用 `skill({ skill: 'my-skill' })` 激活

---

## 技能生命周期

### 技能的关键生命周期事件

| 事件 | 时机 | 行为 |
|------|------|------|
| **创建** | 新建 SKILL.md | SkillManager 自动发现 |
| **加载** | 用户调用 skill() 或 IDE 启动 | 文件被读取，文档被解析 |
| **激活** | skill() 返回文档 | Agent 获得技能的完整上下文 |
| **使用** | Agent 执行任务 | 使用技能中提到的工具 |
| **更新** | SKILL.md 被修改 | SkillManager 自动重新加载 |

---

## 与其他技能的关系

### 技能依赖关系

某些技能会相互引用：

| 技能 | 依赖/相关 | 说明 |
|------|----------|------|
| review | code-navigation-and-analysis | 审查时需要代码导航 |
| minecraft-mod-management | minecraft-tools | mod 管理基于服务器工具 |
| service-management | sublm-and-log-analysis | 服务诊断用日志分析工具 |
| minecraft-tools | web-and-api-fetching | 服务器集成前常要先查 API / 文档 |
| sublm-and-log-analysis | media-processing | 视频日志说明常先转音频再处理 |
| planning-and-workflow | （无核心依赖） | 独立的工作流控制 |

### 技能的推荐组合

| 场景 | 推荐技能组合 |
|------|------------|
| **后端 API 开发** | file-operations, code-navigation-and-analysis, review, shell-execution |
| **Minecraft 服务维护** | minecraft-tools, minecraft-mod-management, service-management, sublm-and-log-analysis |
| **Web 应用开发** | file-operations, review, code-navigation-and-analysis |
| **系统管理** | shell-execution, service-management, sublm-and-log-analysis, memory-and-task-management |
| **数据分析** | file-operations, sublm-and-log-analysis |
| **文档/API 调研** | web-and-api-fetching, file-operations |
| **多媒体转写与交付** | media-processing, file-operations, sublm-and-log-analysis |

---

## 常见问题

**Q: 技能和 SKILL.md 是一回事吗？**  
A: 是的。每个 `.md` 文件就是一个技能的定义。`skill()` 工具用来读取和激活这些文件。

**Q: 激活一个技能会改变 Agent 的行为吗？**  
A: 会。Agent 获得该技能的完整文档后，会根据文档中的指导来执行相关任务。

**Q: 能同时激活多个技能吗？**  
A: 可以。调用多次 `skill()` 来激活多个技能。Agent 会在上下文中保留所有激活的技能文档。

**Q: 如果技能中提到的工具不可用怎么办？**  
A: 技能文件中的 `allowedTools` 列表定义了该技能中可用的工具。如果工具不可用，调用时会产生错误。

**Q: 技能文档会自动更新吗？**  
A: 是的。SkillManager 监听文件系统变化，SKILL.md 被修改后自动重新加载。

**Q: 技能可以有不同的版本吗？**  
A: 当前的设计中，技能由名称唯一标识，没有版本机制。如需版本化，可用命名约定（如 `file-operations-v2`）。

---

## 参数参考

### skill 工具参数矩阵

| 场景 | 参数 | 结果 |
|------|------|------|
| 激活文件操作技能 | `{ skill: 'file-operations' }` | 获得 read_file, write_file 等文档 |
| 激活 Minecraft 服务工具 | `{ skill: 'minecraft-tools' }` | 获得 Minecraft 特定工具的文档 |
| 激活代码审查 | `{ skill: 'review' }` | 获得审查指南和工具列表 |
| 激活日志分析 | `{ skill: 'sublm-and-log-analysis' }` | 获得 sublm 和日志规则工具文档 |
| 激活 Web/API 抓取 | `{ skill: 'web-and-api-fetching' }` | 获得 web_fetch 和 openapi_link_list 文档 |
| 激活媒体处理 | `{ skill: 'media-processing' }` | 获得视频转音频和媒体压缩文档 |

### 技能命名约定

| 命名模式 | 示例 | 说明 |
|---------|------|------|
| `{domain}-{operation}` | file-operations | 操作类技能 |
| `{domain}-and-{operation}` | code-navigation-and-analysis | 复合技能 |
| `{product}-{feature}` | minecraft-mod-management | 产品特定技能 |
| `{workflow}` | planning-and-workflow | 流程类技能 |

---

## 技能最佳实践

| 原则 | 说明 |
|------|------|
| **分类清晰** | 技能应按功能域明确分类 |
| **文档完整** | SKILL.md 应包含概述、参考、场景、最佳实践 |
| **示例充分** | 多提供代码示例，降低学习成本 |
| **工具列表** | allowedTools 应准确列出使用的工具 |
| **版本化文档** | 大的变更记在 CHANGELOG 或文档顶部 |
| **可发现性** | 使用清晰的命名，便于通过 skill() 查找 |
