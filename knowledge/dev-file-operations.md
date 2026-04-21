---
name: file-operations
description: |
  文件操作基础技能。包括读取、写入、编辑、列表查询文件。
  支持文本、图像、PDF 等多种格式的操作。
allowedTools:
  - read_file
  - write_file
  - edit
  - list_directory
  - glob
---

# 文件操作技能

## 概述

文件操作是 AI Agent 最基础的能力。通过文件读写，Agent 可以：
- 理解项目结构和代码
- 创建和修改配置文件  
- 生成代码和文档
- 追踪变更历史

## 快速参考

| 工具 | 用途 | 确认 | 适用场景 |
|------|------|------|--------|
| `read_file` | 读取已有文件 | ❌ | 理解现有代码、配置、日志 |
| `write_file` | 创建/覆写文件 | ✅ | 新建文件、完全替换 |
| `edit` | 精确编辑 | ✅ | 修改局部内容、apply patch |
| `list_directory` | 列出目录 | ❌ | 浏览目录结构 |
| `glob` | 模式查找 | ❌ | 查找符合条件的文件 |

---

## 工具详解

### 1. read_file - 读取文件

**用法**：
```
read_file({ 
  absolute_path: '/path/to/file.ts',
  offset: 10,        // 可选：起始行号（0-based）
  limit: 50          // 可选：读取最大行数
})
```

**特性**：
- ✅ **自动格式识别**：文本、图像、PDF
- ✅ **大文件处理**：自动截断，提示分页读取
- ✅ **编码检测**：自动处理 BOM、编码转换
- ✅ **安全限制**：路径必须在工作区内；遵守 `.tramignore`

**典型场景**：

**场景 A：理解现有代码**
```typescript
// 想修改一个文件，先读它
read_file({ absolute_path: '/project/src/index.ts' })
// → 获取完整代码 → 理解结构 → 决定修改方式
```

**场景 B：分页读取大文件**
```typescript
// 日志文件可能有 10000 行
read_file({ absolute_path: '/var/log/app.log', offset: 0, limit: 100 })
// → 读前100行 → 找到错误 → 读后续相关部分
```

**场景 C：查看配置**
```typescript
read_file({ absolute_path: '/project/package.json' })
// → 了解依赖 → 了解脚本 → 确定构建方式
```

---

### 2. write_file - 创建或覆写文件

**用法**：
```typescript
write_file({
  file_path: '/path/to/newfile.ts',
  content: '...',
  modified_by_user: false,           // 用户是否修改了内容
  ai_proposed_content: '...'         // 初始建议（用于diff展示）
})
```

**特性**：
- ✅ **自动创建目录**：路径不存在时自动 mkdir -p
- ✅ **智能编码处理**：
  - 检测现有文件的 BOM
  - .json/.js/.ts 默认不要 BOM
  - .txt 默认 UTF-8 with BOM
- ✅ **确认机制**：显示 diff，等待用户批准
- ✅ **用户参与**：区分 AI 建议 vs 用户修改

**典型场景**：

**场景 A：创建新文件**
```typescript
write_file({
  file_path: '/project/src/utils/helpers.ts',
  content: 'export function foo() { ... }'
})
```

**场景 B：生成配置文件**
```typescript
write_file({
  file_path: '/project/.eslintrc.json',
  content: JSON.stringify({ rules: {...} }, null, 2)
})
// 自动处理 JSON 编码，不添加 BOM
```

**场景 C：初始化项目文件**
```typescript
write_file({
  file_path: '/project/README.md',
  content: '# My Project\n...',
})
```

---

### 3. edit - 精确编辑

**用法**：
```typescript
edit({
  absolute_path: '/path/to/file.ts',
  old_string: `function oldName() {
  console.log('test');
}`,
  new_string: `function newName() {
  console.log('test');
}`
})
```

**特性**：
- ✅ **精确替换**：必须提供完整、唯一的匹配文本
- ✅ **多行支持**：包含空白和缩进
- ✅ **上下文展示**：显示替换前后的 diff
- ✅ **确认机制**：展示修改内容，等待用户批准

**最佳实践**（✅ 推荐）：

1. **包含足够上下文** - 至少 3 行前后代码
```typescript
// ✅ GOOD：清晰标识位置
edit({
  absolute_path: '/src/app.ts',
  old_string: `const config = {
  port: 3000,
  debug: false,  ← 要修改这一行
  version: '1.0'
}`,
  new_string: `const config = {
  port: 3000,
  debug: true,
  version: '1.0'
}`
})
```

2. **避免过度泛化** - 匹配文本不能出现多次
```typescript
// ❌ BAD：太通用，可能有多个匹配
edit({
  old_string: `return result`,
  new_string: `return result.toUpperCase()`
})

// ✅ GOOD：包含唯一的上下文
edit({
  old_string: `function process() {
  const result = getName();
  return result
}`,
  new_string: `function process() {
  const result = getName();
  return result.toUpperCase()
}`
})
```

3. **准备工作** - 先用 read_file 查看要编辑的部分
```typescript
// 先看看文件内容
read_file({ absolute_path: '/src/app.ts' })
// → 找到准确的代码片段
// → 准备 old_string 和 new_string
// → 执行 edit
```

**典型场景**：

**场景 A：修改配置值**
```typescript
edit({
  absolute_path: '/project/config.ts',
  old_string: `export const MAX_RETRIES = 3;`,
  new_string: `export const MAX_RETRIES = 5;`
})
```

**场景 B：导入修改**
```typescript
edit({
  absolute_path: '/src/index.ts',
  old_string: `import { foo } from './utils';`,
  new_string: `import { foo, bar } from './utils';`
})
```

**场景 C：函数替换**
```typescript
edit({
  absolute_path: '/src/handler.ts',
  old_string: `function handler(req, res) {
  res.send('ok');
}`,
  new_string: `function handler(req, res) {
  res.json({ status: 'ok' });
}`
})
```

---

### 4. list_directory - 列出目录

**用法**：
```typescript
list_directory({ path: '/project/src' })
// → 返回：['index.ts', 'utils/', 'components/', ...]
```

**特性**：
- ✅ **区分文件和目录**：目录名末尾 `/`
- ✅ **过滤支持**：遵守 `.gitignore` 和 `.tramignore`
- ✅ **递归查询**：可列出子目录结构

**典型场景**：
```typescript
// 浏览项目结构
list_directory({ path: '/project' })
// → ['src/', 'test/', 'docs/', 'package.json', ...]

// 查看某个包的内容
list_directory({ path: '/project/src/components' })
// → ['Button.tsx', 'Dialog.tsx', 'utils/', ...]
```

---

### 5. glob - 模式查找

**用法**：
```typescript
glob({ pattern: '/project/src/**/*.test.ts' })
// → 返回所有测试文件路径

glob({ pattern: '/project/src/**/*.ts' })
// → 返回所有 TypeScript 文件
```

**常用模式**：
- `**/*.ts` - 所有 TypeScript 文件
- `src/**/*.test.ts` - 所有测试文件
- `packages/*/src/index.ts` - 各包的入口文件
- `**/.git/**` - 被忽略的目录

**典型场景**：

**场景 A：查找所有测试**
```typescript
glob({ pattern: '/project/**/*.test.ts' })
// → 用于运行测试、统计覆盖率
```

**场景 B：查找所有配置文件**
```typescript
glob({ pattern: '/project/**/{.env*,*.config.ts,*.config.js}' })
// → 理解项目配置
```

---

## 工作流程示例

### 流程：修改现有文件

```
1. read_file()      ← 读取现有内容，理解结构
2. edit()           ← 定位并修改特定部分
3. confirm          ← 用户确认修改
4. verify           ← (可选) 再次 read_file 确认修改成功
```

### 流程：创建新项目

```
1. list_directory() ← 查看项目根目录
2. read_file(package.json) ← 了解依赖和脚本
3. write_file()     ← 创建 src/index.ts
4. write_file()     ← 创建 tsconfig.json
5. confirm          ← 用户确认
```

---

## 常见错误

### ❌ 错误 1：忘记 read_file

```typescript
// 不知道文件内容，直接 edit → 出错找不到匹配文本
edit({ absolute_path: '/src/app.ts', old_string: '???', new_string: '...' })
```

**修复**：先读再改
```typescript
read_file({ absolute_path: '/src/app.ts' })  // 先看
// → 找到准确文本
edit({ ... })  // 再改
```

### ❌ 错误 2：edit 的 old_string 不唯一

```typescript
// 如果文件中有多个 'return value' 就会失败
edit({ 
  old_string: 'return value',
  new_string: 'return result'
})
```

**修复**：包含更多上下文
```typescript
edit({
  old_string: `function process() {
  const value = getValue();
  return value
}`,
  new_string: `function process() {
  const value = getValue();
  return result
}`
})
```

### ❌ 错误 3：路径不是绝对路径

```typescript
// ❌ 相对路径会失败
read_file({ absolute_path: './src/index.ts' })

// ✅ 使用绝对路径
read_file({ absolute_path: '/project/src/index.ts' })
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **先读后改** | 修改前总是 read_file 了解当前状态 |
| **提供上下文** | edit 的 old_string 包含 3+ 行前后代码 |
| **验证编码** | json/js/ts 不要加 BOM；关注现有文件的编码风格 |
| **拆小改动** | 大改动拆成多个 edit 调用，而不是一次性 write_file |
| **确认机制** | 等待用户批准，不要在自动模式下盲目修改 |

---

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| `old_string 不匹配` | 空白或缩进不一致；文本不存在 | read_file 查看原文 |
| `权限被拒绝` | 文件权限不足；目录不可写 | 检查文件权限、目录权限 |
| `文件过大超时` | 文件行数超过限制 | 使用 offset/limit 分页读取 |
| `编码错误` | BOM 或编码问题 | 让 write_file 自动检测 |
