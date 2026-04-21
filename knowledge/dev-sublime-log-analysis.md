---
name: sublm-and-log-analysis
description: |
  子模型(SubLM)和日志分析技能。快速分析代码/日志，定义日志过滤规则。
  支持自动化日志规则学习、文件快速诊断、上下文精简处理和日志分享。
allowedTools:
  - sublm
  - request_log_pattern
  - service_manage
  - share_log
applyTo:
  - "**/*.log"
  - "**/*.log.*"
  - "**/logs/**"
  - "**/crash-reports/**"
---

# 子模型和日志分析技能

## 强制路由规则

> **约束**：当用户提供的内容包含日志文本（超过 20 行的服务日志、崩溃报告、堆栈跟踪），
> **必须**先使用 `sublm` 工具进行初步分析，而不是直接让主模型处理。
>
> 理由：大型日志会污染主模型的上下文窗口，降低后续推理质量。
> sublm 使用独立的轻量模型和截断策略，不影响主对话。

### 何时必须使用 sublm

| 条件 | 动作 |
|------|------|
| 用户提供了日志文件（.log / crash-report） | **必须** 用 sublm 先分析 |
| 日志内容超过 50 行 | **必须** 用 sublm 先分析 |
| 用户粘贴了堆栈跟踪 / 错误输出 > 2KB | **推荐** 用 sublm 先分析 |
| 日志中出现重复的错误模式（> 3 次） | 用 sublm 分析后，调用 request_log_pattern |
| 用户只提供了简短错误信息（< 10 行） | 可以直接由主模型处理 |

### 路由流程

```
检测到日志/错误输入
  ↓
内容长度 > 50行 或 文件路径匹配 *.log?
  ├─ 是 → sublm 先分析 → 结果交给主模型做决策
  └─ 否 → 主模型直接处理
```

## 概述

在处理海量日志或代码时，不需要让 LLM 主模型处理所有细节。通过子模型和日志规则工具，Agent 可以：

- **快速诊断**: 用精简子模型在不污染主对话的情况下分析日志/代码（默认 12K 字符预算）
- **日志规则学习**: 让用户定义正则表达式规则来自动化日志过滤、抑制、修复
- **上下文管理**: 自动截断超大文件，保持推理效率
- **自动化工作流**: 一旦规则被接受，可用于自动处理相似日志

---

## 快速参考

### 三个工具

| 工具 | 用途 | 类型 |
|------|------|------|
| `sublm` | 用精简子模型快速分析内容 | 分析工具 |
| `request_log_pattern` | 请求用户为日志定义规则模式 | 交互工具 |
| `share_log` | 上传日志并生成可分享链接 | 分享工具 |

### 典型流程

```
检测问题日志
  ↓
sublm: 快速分析日志的根本原因
  ↓
request_log_pattern: 请求用户定义规则
  ↓
share_log: 需要远程协作时生成共享链接
  ↓
用户接受/修改规则
  ↓
自动应用规则（suppress/analyze/fix）
```

---

## 工具详解

### 1. sublm - 精简上下文子模型调用

#### 功能

使用一个轻量级模型（默认 Qwen Flash）来处理需要精简上下文的任务，而不将详细内容传给主 LLM。这样可以：

- 分析大型日志文件（自动截断到 12000 字符）
- 总结代码文件
- 快速诊断问题
- 不污染主模型的对话历史

#### 基本用法

```typescript
sublm({
  userPrompt: '分析这个日志文件，找出 OutOfMemoryError 的根本原因',
  filePaths: ['/var/log/minecraft/vanilla.log'],
  maxInputChars: 12000  // 超过此大小自动截断
})
```

#### 完整参数

| 参数 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `userPrompt` | string | 要求子模型执行的具体任务 | ✓ |
| `filePaths` | string[] | 要分析的文件路径（支持相对路径和绝对路径） | |
| `inlineContent` | string | 直接提供内容（用于动态生成的内容） | |
| `maxInputChars` | number | 输入预算（默认 12000，超过自动截断） | |
| `systemPrompt` | string | 自定义系统 prompt（默认：谨慎的助手，严格按指示执行） | |
| `model` | string | 指定模型（默认 Qwen Flash） | |

#### 使用场景

**场景 A：快速诊断 Minecraft 服务器崩溃**

```typescript
// 提示：服务器日志 5 MB，不想全部传给主 LLM
const diagnosis = await sublm({
  userPrompt: `分析这个 Minecraft 服务器日志，找出：
1. 为什么服务器在 12:34 崩溃
2. 最可能的原因（内存、插件、连接）
3. 建议的修复步骤`,
  filePaths: ['/var/log/minecraft/crash.log'],
  maxInputChars: 15000  // 增加预算用于长日志
})
```

**场景 B：分析代码变更**

```typescript
// 用子模型审查 PR 代码，不污染主对话
const review = await sublm({
  userPrompt: `审查这个 Java 代码，检查：
1. 是否有内存泄漏的风险？
2. 线程安全吗？
3. 有 N+1 查询问题吗？`,
  filePaths: ['src/main/java/com/example/UserService.java'],
  systemPrompt: '你是一个严格的代码审查员，只基于提供的代码进行审查。'
})
```

**场景 C：从混杂日志中提取关键错误**

```typescript
const errors = await sublm({
  userPrompt: `从这个混杂日志中：
1. 提取所有错误和异常
2. 按时间顺序列出
3. 标记严重级别（critical/error/warning）
4. 分组相似的错误`,
  filePaths: ['/opt/app/server.log'],
  maxInputChars: 20000
})
```

**场景 D：多文件对比分析**

```typescript
// 子模型可以同时分析多个文件
const comparison = await sublm({
  userPrompt: '对比这两个配置文件，列出所有差异和潜在的配置冲突',
  filePaths: [
    'config/production.yml',
    'config/staging.yml'
  ],
  maxInputChars: 10000
})
```

#### 重要行为

- **自动截断**: 如果内容超过 `maxInputChars`，代码自动从开头截断，后面附注 `[Input was truncated...]`
- **文件验证**: 所有文件路径必须在工作区内，.tramignore 中的文件会被拒绝
- **温度设定**: 分析任务温度固定为 0（确定性输出，不产生虚构内容）
- **错误处理**: 如果文件读取失败，会在返回中包含 `[Warnings]` 部分

---

### 2. request_log_pattern - 请求日志过滤规则

#### 功能

特殊的交互工具，让用户为重复出现的日志问题定义正则表达式规则。用户可以接受、修改或提出自己的正则表达式，规则一旦定义就可以用于自动化处理。

#### 基本用法

```typescript
request_log_pattern({
  serviceName: 'minecraft-server',
  description: '连接超时错误',
  sampleLines: [
    { line: 'Connection timeout: java.net.ConnectException at port 25565', lineNumber: 1234 },
    { line: 'I/O error: Connection reset by peer', lineNumber: 1256 },
    { line: 'Socket timeout when connecting to database', lineNumber: 1289 }
  ],
  suggestedPattern: 'Connection (timeout|reset|refused)|Socket timeout'
})
```

#### 完整参数

| 参数 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `serviceName` | string | 服务名称（用于规则作用域） | ✓ |
| `description` | string | 规则描述（如 "连接超时错误"） | ✓ |
| `sampleLines` | array | 2-5 条示例日志行（带行号）| ✓ |
| `suggestedPattern` | string | 可选的建议正则模式 | |
| `metadata` | object | 可选元数据（如来源信息） | |

#### 返回值

用户提供规则后，返回以下信息：

```typescript
{
  pattern: 'Connection (timeout|reset|refused)|Socket timeout',    // 最终正则表达式
  action: 'suppress' | 'analyze' | 'auto-fix',                    // 应对行动
  isGlobal: boolean,                                               // 是否适用所有服务
  severity: 'low' | 'medium' | 'high'                            // 严重级别
}
```

#### 使用场景

**场景 A：自动抑制已知的无害日志**

```typescript
// Step 1: 提交日志规则请求
await request_log_pattern({
  serviceName: 'web-server',
  description: '定期的健康检查请求',
  sampleLines: [
    { line: '[2026-03-25 10:00:00] GET /health 200 OK - 0.5ms', lineNumber: 5432 },
    { line: '[2026-03-25 10:01:00] GET /health 200 OK - 0.3ms', lineNumber: 5445 },
    { line: '[2026-03-25 10:02:00] GET /health 200 OK - 0.6ms', lineNumber: 5458 }
  ],
  suggestedPattern: 'GET /health 200 OK'
})

// Step 2: 用户接受并选 action='suppress'
// Step 3: 所有匹配的日志被自动过滤掉，不再显示
```

**场景 B：定义规则用于自动诊断和修复**

```typescript
// 当 Minecraft 服务器频繁触发内存警告时
await request_log_pattern({
  serviceName: 'mc-server-vanilla',
  description: 'GC 暂停和内存警告',
  sampleLines: [
    { line: '[12:34:56] [Server thread/WARN]: Memory usage is at 95%', lineNumber: 8901 },
    { line: '[12:34:57] [GC] Full GC pause: 2.5 seconds', lineNumber: 8902 },
    { line: '[12:35:00] [Server thread/WARN]: Consider increasing heap size', lineNumber: 8910 }
  ],
  suggestedPattern: 'Memory usage is at|Full GC pause|heap size'
})

// 用户可选 action='auto-fix'，系统自动：
// 1. 增加 JVM 堆大小
// 2. 调整 GC 参数
// 3. 重启服务
```

**场景 C：学习新的错误模式**

```typescript
// 第一次看到插件冲突错误
const analysis = await sublm({
  userPrompt: '分析这个错误，原因是什么？',
  inlineContent: '[12:45:00] Plugin X conflicts with Plugin Y on async handler'
})

// 如果判定是插件冲突，请求用户定义规则
if (analysis.includes('冲突')) {
  await request_log_pattern({
    serviceName: 'mc-server-vanilla',
    description: '插件冲突错误',
    sampleLines: [
      { line: '[12:45:00] Plugin X conflicts with Plugin Y on async handler', lineNumber: 9023 }
    ],
    suggestedPattern: 'Plugin .* conflicts with .* on'
  })
}

// 用户定义规则后，后续冲突会自动处理（禁用、告警或修复）
```

---

### 3. share_log - 生成日志分享链接

#### 功能

当问题需要远程协作、贴给第三方或交给用户继续转发时，`share_log` 可以把日志上传到 mclo.gs，返回一个易于分享的 URL。

#### 基本用法

```typescript
// 直接上传日志文件
share_log({
  content: './logs/latest.log'
})

// 上传内存中的原始日志文本
share_log({
  content: logOutput,
  isFilePath: false
})
```

#### 使用场景

**场景 A：把服务日志发给用户或第三方支持**

```typescript
const latestLog = await service_manage({
  action: 'log',
  name: 'minecraft-server',
  tail: 300
})

const shareResult = await share_log({
  content: latestLog,
  isFilePath: false
})
```

**场景 B：直接分享落盘日志文件**

```typescript
share_log({
  content: './server/logs/latest.log'
})
```

#### 何时使用

- 用户需要把日志转发给别人
- 需要在聊天里避免粘贴超长日志
- 需要把 `service_manage` / `sublm` 的诊断上下文同步给其他人

---

## 工作流示例

### 完整的日志分析和自动化流程

```typescript
async function autoAnalyzeAndHandleServiceIssues(serviceName: string) {
  // 1. 读取最近的日志
  const logOutput = await service_manage({
    action: 'log',
    name: serviceName,
    tail: 500
  })
  
  // 2. 用 sublm 快速诊断（不污染主模型）
  const diagnosis = await sublm({
    userPrompt: `分析这个日志：
1. 主要问题是什么？
2. 根本原因是什么？
3. 建议的修复方式（按优先级）`,
    inlineContent: logOutput
  })
  
  console.log('诊断结果:', diagnosis)
  
  // 3. 如果发现重复的错误模式，请求用户定义规则
  const extractedLines = logOutput.split('\n')
    .filter(line => line.includes('ERROR') || line.includes('FATAL'))
    .slice(0, 5)
    .map((line, idx) => ({ 
      line, 
      lineNumber: idx 
    }))
  
  if (extractedLines.length > 0) {
    // 用 sublm 先生成规则建议
    const suggestedRegex = await sublm({
      userPrompt: '为这些错误行生成一个捕获它们的正则表达式（只输出正则）',
      inlineContent: extractedLines.map(e => e.line).join('\n')
    })
    
    // 请求用户批准规则
    await request_log_pattern({
      serviceName: serviceName,
      description: `自动检测到的错误模式`,
      sampleLines: extractedLines,
      suggestedPattern: suggestedRegex.trim()
    })
  }
  
  // 4. 如果有修复建议，自动执行
  if (diagnosis.includes('增加内存') || diagnosis.includes('堆大小')) {
    await service_manage({
      action: 'restart',
      name: serviceName
    })
    console.log('✓ 服务已重启')
  }
}
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **用 sublm 做初诊** | 快速分析后再决定是否让主模型深入研究 |
| **规则要通用** | 定义的正则应该捕获错误类别，而不是单一实例 |
| **保持预算意识** | maxInputChars 默认 12000，大文件分段处理 |
| **链接工具** | sublm 输出 → request_log_pattern / share_log → 自动化处理或远程协作 |
| **记录规则** | 用户定义的规则应保存到项目配置，便于复用 |
| **避免过滤误删** | 复杂规则先在 'analyze' 模式验证再用 'suppress' |

---

## 与 service_manage 的集成

sublm 和 request_log_pattern 配合 service_manage 的日志操作：

```typescript
// 完整的服务诊断流程
async function diagnoseServiceAndLearnRules(serviceName: string) {
  // 1. 获取服务日志（service_manage）
  const logs = await service_manage({
    action: 'log',
    name: serviceName,
    tail: 200
  })
  
  // 2. 快速分析（sublm）
  const analysis = await sublm({
    userPrompt: '找出这个日志中的所有错误模式和根本原因',
    inlineContent: logs,
    maxInputChars: 15000
  })
  
  // 3. 用 service_manage 的 analyze 深度分析
  const deepAnalysis = await service_manage({
    action: 'analyze',
    name: serviceName,
    mode: 'errors'  // 只看错误
  })
  
  // 4. 如果发现新的错误类型，请求用户定义规则
  for (const issue of deepAnalysis.issues) {
    await request_log_pattern({
      serviceName: serviceName,
      description: `${issue.type}（出现 ${issue.count} 次）`,
      sampleLines: extractSampleLinesForIssue(logs, issue.type),
      suggestedPattern: generateRegexForIssue(issue.type)
    })
  }
}
```

---

## 常见问题

**Q: sublm 和主模型有什么区别？**  
A: sublm 是轻量级模型（Qwen Flash），主要优势是：
- 速度快（适合大量日志）
- 上下文独立（不污染对话历史）
- 成本低（token 消耗少）
- 预算有限（maxInputChars）鼓励精简

**Q: request_log_pattern 中的正则支持什么语法？**  
A: 标准的 ECMAScript 正则（JavaScript 语法）。示例：
- `Connection (timeout|reset|refused)` - 选择
- `\[ERROR\].*OutOfMemory` - 前缀和内容
- `Port (\d+) already in use` - 提取端口号

**Q: 如果 sublm 的输入超过 maxInputChars 会怎样？**  
A: 内容自动从开头截断，返回会包含 `[Input was truncated to 12000 characters.]` 提示

**Q: 能否同时使用 sublm 和文件的 file_reference 功能？**  
A: 不行。sublm 要么用 `filePaths`，要么用 `inlineContent`。需要分段处理大文件。

---

## 参数参考表

### sublm 参数矩阵

| 场景 | userPrompt | filePaths | inlineContent | maxInputChars | systemPrompt |
|------|-----------|-----------|---------------|---------------|--------------|
| 分析日志文件 | "分析这个日志" | ['log.txt'] | - | 15000 | 默认 |
| 审查代码 | "代码审查检查..." | ['Main.java'] | - | 12000 | 代码审查 prompt |
| 分析动态内容 | "总结这个输出" | - | logOutput | 8000 | 默认 |
| 多文件对比 | "对比配置..." | ['config1.yml', 'config2.yml'] | - | 12000 | 默认 |

### request_log_pattern 参数矩阵

| 参数 | 类型 | 示例 | 必填 |
|------|------|------|------|
| serviceName | string | 'minecraft-server' | ✓ |
| description | string | 'OutOfMemory 错误' | ✓ |
| sampleLines[].line | string | '[12:34] ERROR: ...' | ✓ |
| sampleLines[].lineNumber | number | 12345 | ✓ |
| suggestedPattern | string | 'OutOfMemory\|Heap' | |
| metadata.source | string | 'crash.log' | |
