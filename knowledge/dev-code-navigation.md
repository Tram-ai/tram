---
name: code-navigation-and-analysis
description: |
  代码导航和分析技能。使用 LSP（Language Server Protocol）进行代码查询、定义查找、引用搜索。
  支持符号导航、诊断检查、代码修复建议。优化于类型检查和代码理解。
allowedTools:
  - lsp
  - grep_search
  - glob
---

# 代码导航和分析

## 概述

当需要深入理解代码结构、查找定义、理解依赖关系时，`lsp` 工具提供了强大的代码分析能力。通过 LSP（Language Server Protocol），Agent 可以：

- **精准查找**: 去定义、找引用、查实现
- **符号导航**: 查找工作区中的类、函数、变量
- **代码诊断**: 检查代码错误、类型问题、警告
- **快速修复**: 获得 IDE 级别的代码修复建议
- **调用链分析**: 查看函数的调用者/被调用方

---

## 快速参考

### LSP 支持的操作

| 操作 | 说明 | 需要位置 | 返回值 |
|------|------|---------|--------|
| `goToDefinition` | 去定义 | 文件 + 行列 | 定义位置 |
| `findReferences` | 查找所有引用 | 文件 + 行列 | 引用位置列表 |
| `findImplementations` | 查找接口实现 | 文件 + 行列 | 实现位置列表 |
| `hover` | 悬停信息 | 文件 + 行列 | 类型/文档 |
| `documentSymbol` | 文件中所有符号 | 文件 | 符号列表 |
| `workspaceSymbol` | 工作区符号搜索 | 查询字符串 | 符号列表 |
| `diagnostics` | 文件诊断 | 文件 | 错误/警告列表 |
| `workspaceDiagnostics` | 全工作区诊断 | 无 | 所有文件的诊断 |
| `codeActions` | 代码修复建议 | 文件 + 范围 | 修复建议 |
| `prepareCallHierarchy` | 准备调用层次 | 文件 + 行列 | 调用项 |
| `incomingCalls` | 调用者 | 调用项 | 谁调用了这个函数 |
| `outgoingCalls` | 被调用 | 调用项 | 这个函数调用了谁 |

---

## 工具详解

### lsp - Language Server Protocol 集成

#### 功能

提供 IDE 级别的代码分析和导航，利用语言服务器（LSP）来理解代码结构。

#### 基本用法

```typescript
// 去定义
lsp({
  operation: 'goToDefinition',
  filePath: 'src/services/UserService.ts',
  line: 45,        // 1-based
  character: 10    // 1-based
})

// 查找引用
lsp({
  operation: 'findReferences',
  filePath: 'src/utils/helpers.ts',
  line: 12,
  character: 5,
  includeDeclaration: true  // 包括声明本身
})

// 搜索符号
lsp({
  operation: 'workspaceSymbol',
  query: 'UserService',  // 搜索 UserService 类
  limit: 10
})
```

#### 完整参数参考

| 参数 | 类型 | 说明 | 必填* |
|------|------|------|-------|
| `operation` | LspOperation | 要执行的操作 | ✓ |
| `filePath` | string | 文件路径（相对或绝对） | 位置操作 |
| `line` | number | 行号（1-based） | 位置操作 |
| `character` | number | 列号（1-based） | 位置操作 |
| `endLine` | number | 范围结束行（用于 codeActions） | 可选 |
| `endCharacter` | number | 范围结束列 | 可选 |
| `includeDeclaration` | boolean | 引用搜索是否包括声明 | 可选 |
| `query` | string | 符号搜索查询 | workspaceSymbol |
| `limit` | number | 返回结果的最大数量 | 可选 |
| `diagnostics` | array | 代码修复的诊断上下文 | codeActions |
| `codeActionKinds` | array | 过滤代码修复类型 | 可选 |
| `serverName` | string | 指定 LSP 服务器 | 可选 |

---

## 使用场景

### 场景 A：理解陌生代码的数据流

```typescript
// 任务：理解 UserService.getUser() 会调用哪些其他函数

// Step 1: 找到函数定义
const definition = await lsp({
  operation: 'goToDefinition',
  filePath: 'src/services/UserService.ts',
  line: 45,
  character: 10
})
// 结果：找到 getUser 在 src/services/UserService.ts:45:10

// Step 2: 查看这个文件的所有符号
const symbols = await lsp({
  operation: 'documentSymbol',
  filePath: definition.filePath
})
// 结果：[UserService 类, getUser 方法, validateUser 方法, ...]

// Step 3: 查看 getUser 调用了什么
const outgoing = await lsp({
  operation: 'outgoingCalls',
  filePath: definition.filePath,
  line: definition.range.start.line,
  character: definition.range.start.character
})
// 结果：[validateUser, getUserFromDB, cacheResult]

// Step 4: 递归查看 getUserFromDB 的实现
const dbDefinition = await lsp({
  operation: 'goToDefinition',
  filePath: 'src/services/UserService.ts',
  line: dbCallLine,
  character: dbCallCharacter
})
// 现在理解了数据流
```

### 场景 B：找出为什么代码会编译错误

```typescript
// 任务：某个文件有编译错误，需要找出原因

// Step 1: 获取文件诊断
const diagnostics = await lsp({
  operation: 'diagnostics',
  filePath: 'src/components/UserForm.tsx'
})

// 结果，例如：
// [
//   { message: "Property 'userId' does not exist on type 'User'", line: 34 },
//   { message: "Argument of type 'string' is not assignable to parameter...", line: 56 }
// ]

// Step 2: 去定义确认 User 类型
const userType = await lsp({
  operation: 'goToDefinition',
  filePath: 'src/components/UserForm.tsx',
  line: 34,
  character: 20  // 'User' 的位置
})

// Step 3: 查看 User 类型的所有属性
const typeSymbols = await lsp({
  operation: 'documentSymbol',
  filePath: userType.filePath
})
// 发现 User 没有 userId，可能是 id？

// Step 4: 获取自动修复建议
const fixes = await lsp({
  operation: 'codeActions',
  filePath: 'src/components/UserForm.tsx',
  line: 34,
  character: 20,
  diagnostics: diagnostics.filter(d => d.line === 34)
})
// 结果可能包含 "Change 'userId' to 'id'" 的建议
```

### 场景 C：重构时查找所有使用点

```typescript
// 任务：重构 getUser 函数，需要找出有多少地方在使用

// Step 1: 查找所有引用
const references = await lsp({
  operation: 'findReferences',
  filePath: 'src/services/UserService.ts',
  line: 45,
  character: 10,
  includeDeclaration: false  // 不包括定义本身
})

// 结果：
// [
//   { file: 'src/api/userApi.ts', line: 12 },
//   { file: 'src/components/UserProfile.tsx', line: 34 },
//   { file: 'src/tests/user.test.ts', line: 78 },
//   ...
// ]

console.log(`getUser 被使用了 ${references.length} 次`)

// Step 2: 逐个查看使用上下文（用 read_file 获取上下文）
for (const ref of references.slice(0, 5)) {  // 只看前 5 个
  const code = await read_file({
    filePath: ref.file,
    startLine: Math.max(1, ref.line - 2),
    endLine: Math.min(lastLine, ref.line + 2)
  })
  console.log(`Usage in ${ref.file}:${ref.line}:\n${code}`)
}
```

### 场景 D：追踪函数调用链

```typescript
// 任务：理解 User 创建流程中的所有步骤

// Step 1: 准备调用层次
const callHierarchy = await lsp({
  operation: 'prepareCallHierarchy',
  filePath: 'src/services/UserService.ts',
  line: 28,  // createUser 函数
  character: 10
})

// Step 2: 查看谁调用了 createUser
const incomingCalls = await lsp({
  operation: 'incomingCalls',
  callHierarchyItem: callHierarchy[0]
})

// 结果：
// [
//   { caller: 'registerUser', file: 'src/api/auth.ts' },
//   { caller: 'bulkCreateUsers', file: 'src/services/UserService.ts' }
// ]

// Step 3: 查看 createUser 调用了什么
const outgoingCalls = await lsp({
  operation: 'outgoingCalls',
  callHierarchyItem: callHierarchy[0]
})

// 结果：
// [
//   { callee: 'validateUserData', file: 'src/utils/validators.ts' },
//   { callee: 'saveToDatabase', file: 'src/db/user-repo.ts' },
//   { callee: 'sendWelcomeEmail', file: 'src/email/sender.ts' }
// ]

// 现在了解了完整的调用链：
// registerUser → createUser → [validateUserData, saveToDatabase, sendWelcomeEmail]
```

### 场景 E：查找接口的所有实现

```typescript
// 任务：找出所有实现 PaymentProcessor 接口的类

// Step 1: 去接口定义
const interfaceLocation = await lsp({
  operation: 'goToDefinition',
  filePath: 'src/services/PaymentService.ts',
  line: 15,
  character: 25  // PaymentProcessor 的位置
})

// Step 2: 查找实现
const implementations = await lsp({
  operation: 'findImplementations',
  filePath: interfaceLocation.filePath,
  line: interfaceLocation.line,
  character: interfaceLocation.character
})

// 结果：
// [
//   { file: 'src/payments/stripe-processor.ts', class: 'StripeProcessor' },
//   { file: 'src/payments/paypal-processor.ts', class: 'PayPalProcessor' },
//   { file: 'src/payments/mock-processor.ts', class: 'MockProcessor' }
// ]

console.log(`接口 PaymentProcessor 有 ${implementations.length} 个实现`)
```

---

## LSP 操作详细说明

### goToDefinition

找到符号的定义位置。最常用的操作。

```typescript
const def = await lsp({
  operation: 'goToDefinition',
  filePath: 'src/app.ts',
  line: 10,
  character: 5
})

// 返回：
// {
//   file: 'src/types/index.ts',
//   range: { start: { line: 45, character: 6 }, end: { line: 45, character: 20 } }
// }
```

### findReferences

找到符号的所有引用位置。常用于重构。

```typescript
const refs = await lsp({
  operation: 'findReferences',
  filePath: 'src/utils/helpers.ts',
  line: 12,
  character: 5,
  includeDeclaration: true  // 包括定义本身
})

// 返回：
// [
//   { file: 'src/app.ts', line: 10, character: 5 },
//   { file: 'src/components/Form.tsx', line: 34, character: 12 },
//   ...
// ]
```

### hover

获取符号的类型信息和文档。

```typescript
const info = await lsp({
  operation: 'hover',
  filePath: 'src/app.ts',
  line: 10,
  character: 5
})

// 返回：
// {
//   contents: 'function getUserInfo(id: number): User',
//   range: { ... }
// }
```

### documentSymbol

获取单个文件中的所有符号（类、函数、变量）。

```typescript
const symbols = await lsp({
  operation: 'documentSymbol',
  filePath: 'src/services/UserService.ts'
})

// 返回：
// [
//   { name: 'UserService', kind: 'class', line: 5 },
//   { name: 'getUser', kind: 'method', line: 15 },
//   { name: 'createUser', kind: 'method', line: 30 },
//   ...
// ]
```

### workspaceSymbol

搜索工作区中的符号（速度较慢但覆盖全部）。

```typescript
const results = await lsp({
  operation: 'workspaceSymbol',
  query: 'UserService',
  limit: 10
})

// 返回：
// [
//   { name: 'UserService', file: 'src/services/UserService.ts', line: 5 },
//   { name: 'userServiceInstance', file: 'src/app.ts', line: 20 }
// ]
```

### diagnostics / workspaceDiagnostics

获取代码错误和警告。

```typescript
// 单文件诊断
const diags = await lsp({
  operation: 'diagnostics',
  filePath: 'src/app.ts'
})

// 全工作区诊断
const allDiags = await lsp({
  operation: 'workspaceDiagnostics'
})

// 返回：
// {
//   'src/app.ts': [
//     { line: 10, message: "Type 'string' is not assignable to type 'number'" }
//   ]
// }
```

### codeActions

获取 IDE 的代码修复建议。

```typescript
const actions = await lsp({
  operation: 'codeActions',
  filePath: 'src/app.ts',
  line: 10,
  character: 5,
  endLine: 10,
  endCharacter: 20,
  codeActionKinds: ['quickfix']  // 只要快速修复
})

// 返回：
// [
//   { title: "Change 'userId' to 'id'", kind: 'quickfix' },
//   { title: "Add type annotation: string", kind: 'quickfix' }
// ]
```

---

## 与其他工具的组合

### LSP + grep_search

当需要精准查找时，组合使用：

```typescript
// 场景：找出所有使用了某个不推荐的 API 的位置

// 先用 grep 粗筛
const matches = await grep_search({
  query: 'deprecatedApi',
  isRegexp: false
})

// 再用 LSP 精确定位和获取上下文
for (const match of matches) {
  const ref = await lsp({
    operation: 'goToDefinition',
    filePath: match.file,
    line: match.line,
    character: match.column
  })
  console.log(`Deprecated API used at ${match.file}:${match.line}`)
}
```

### LSP + read_file

获取诊断后读取上下文：

```typescript
const diagnostics = await lsp({
  operation: 'diagnostics',
  filePath: 'src/app.ts'
})

// 为每个诊断读取上下文
for (const diag of diagnostics) {
  const context = await read_file({
    filePath: 'src/app.ts',
    startLine: Math.max(1, diag.line - 2),
    endLine: diag.line + 2
  })
  console.log(`Error at line ${diag.line}: ${diag.message}\n${context}`)
}
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **从定义开始** | 理解代码时先用 goToDefinition 找定义 |
| **追踪调用链** | 使用 incomingCalls/outgoingCalls 理解流程 |
| **验证诊断** | 在修改前用 diagnostics 检查是否有编译错误 |
| **利用修复建议** | codeActions 提供的修复建议往往很准确 |
| **范围限制** | 工作区操作可能很慢，优先用文件级操作 |
| **缓存结果** | 频繁使用的查询结果可以缓存避免重复 |

---

## 常见问题

**Q: LSP 操作有什么性能考虑吗？**  
A: 是的。`workspaceSymbol` 和 `workspaceDiagnostics` 会扫描整个工作区，可能较慢。优先使用文件级操作。

**Q: line 和 character 是 0-based 还是 1-based？**  
A: LSP 标准通常是 0-based，但 TRAM 的 LSP 工具用的是 1-based（更符合编辑器习惯）。

**Q: 如果查询返回空结果怎么办？**  
A: 可能是：1) LSP 服务器还没启动；2) 符号确实不存在；3) 位置不准确（line/character 偏差）

**Q: 能否用 LSP 进行自动重构？**  
A: LSP 本身不提供大规模重构功能，但 codeActions 可以帮助局部修复。大规模重构建议用 AST 工具或 grep + edit 组合。
