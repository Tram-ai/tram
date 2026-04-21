---
name: planning-and-workflow
description: |
  规划和工作流控制技能。细化任务计划、请求用户批准、控制执行模式。
  支持规划验证、逆向确认、自动执行模式切换。
allowedTools:
  - exit_plan_mode
---

# 规划和工作流控制

## 概述

当任务需要编码实现时，最佳实践是先提出详细计划，获得用户批准，再开始编码。`exit_plan_mode` 工具就是用于这个目的的。

通过使用此工具，Agent 可以：

- **请求计划批准**: 在开始前展示实现步骤，让用户确认方向
- **切换执行模式**: 用户批准后自动进入编码模式
- **提升用户信任**: 清晰表达意图，避免盲目修改代码

---

## 何时使用规划模式

### ✅ 使用规划模式（使用 exit_plan_mode）

- **编码任务**: "实现一个新功能"、"重构模块"、"添加新工具"
- **复杂变更**: 涉及多文件修改、架构设计、重大逻辑变更
- **不确定性**: 如果你还有关于需求或实现方案的疑问

### ❌ 不使用规划模式

- **研究任务**: "搜索和理解现有实现"、"分析代码"
- **简单操作**: 修复一个显而易见的 bug、快速补丁
- **纯信息查询**: "这个文件做什么？"、"如何使用这个 API？"

---

## 工具详解

### exit_plan_mode - 规划批准请求

#### 功能

当你完成了实现计划时，使用此工具向用户展示计划，并请求批准。用户有三个选择：

1. **同意（永久模式）**: "ProceedAlways" → 后续所有编辑自动执行
2. **同意（一次）**: "ProceedOnce" → 本次批准后恢复为询问模式
3. **拒绝（返回规划）**: "Cancel" → 返回规划阶段，重新调整计划

#### 基本用法

```typescript
exit_plan_mode({
  plan: `## 实现计划

1. **创建新文件** \`packages/core/src/tools/example.ts\`
   - 实现 ExampleTool 类
   - 添加参数验证

2. **更新工具注册表**
   - 在 \`packages/core/src/tool-registry.ts\` 中注册

3. **创建 SKILL.md**
   - 文档化工具用法
   - 提供示例代码

4. **运行测试**
   - npm test 验证没有回归`
})
```

#### 完整参数

| 参数 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `plan` | string | 你的实现计划（支持 markdown）| ✓ |

#### 返回值

用户批准后，不返回特殊内容，而是改变 Agent 的执行模式。后续工具调用的行为会根据用户选择改变：

```typescript
{
  // ProceedAlways: 所有后续编辑自动执行，不再询问
  // ProceedOnce: 本次批准，后续恢复询问
  // Cancel: 回到规划，等待重新调整
}
```

---

## 使用场景

### 场景 A：规划一个新工具

```typescript
// 当用户要求"创建一个新工具来..."时
// Step 1: 思考实现方案
// Step 2: 提出计划

exit_plan_mode({
  plan: `## 创建 file_compress 工具

### 目的
压缩指定目录为 .zip 文件，用于备份或传输。

### 实现步骤

1. **新建工具文件** \`packages/core/src/tools/fileCompress.ts\`
   \`\`\`typescript
   export interface FileCompressParams {
     sourceDir: string;
     outputPath: string;
     exclude?: string[];
   }
   \`\`\`

2. **添加到工具注册表**
   - 在 \`src/tool-registry.ts\` 中引入和注册

3. **编写集成测试**
   - 测试成功压缩
   - 测试排除模式

4. **创建 SKILL.md** 文档

### 时间估计
约 30 分钟`
})

// 用户选择 ProceedOnce 或 ProceedAlways
// 然后 Agent 自动开始编码，无需再次询问
```

### 场景 B：规划代码重构

```typescript
exit_plan_mode({
  plan: `## 重构 ToolRegistry

### 当前问题
工具注册表使用 Map<string, Tool>，不支持动态发现和别名。

### 新架构
\`\`\`
ToolRegistry
  ├── 工具加载器（从磁盘扫描）
  ├── alias 映射（别名支持）
  ├── 工具缓存
  └── 插件系统
\`\`\`

### 变更计划

1. 创建 \`ToolLoader\` 类（新文件）
2. 修改 \`ToolRegistry\` 接口
3. 更新所有工具导出
4. 修改测试用例
5. 更新文档

### 兼容性
向后兼容，现有代码不变`
})
```

### 场景 C：规划架构设计

```typescript
exit_plan_mode({
  plan: `## 添加 MCP 服务器支持

### 背景
TRAM 需要支持外部 MCP（Model Context Protocol）服务器来扩展功能。

### 设计概览

\`\`\`
MCPClientManager (new)
  ├── MCPServerRegistry: 管理已安装的服务器
  ├── MCPToolAdapter: 将 MCP tools 转换为 TRAM tools
  └── MCPLifecycle: 启动/停止/健康检查
\`\`\`

### 文件变更
- 新增: \`packages/core/src/mcp/client-manager.ts\`
- 新增: \`packages/core/src/mcp/tool-adapter.ts\`
- 修改: \`packages/core/src/tool-registry.ts\` 集成 MCP tools
- 新增: \`packages/core/src/skills/bundled/mcp/SKILL.md\`

### 验证步骤
1. npm build 通过
2. npm test 覆盖 MCP 场景
3. npm run test:integration 验证端到端

### 预期收益
- 支持任意 MCP 服务器（Slack、GitHub、etc）
- 动态工具扩展
- 向后兼容`
})
```

---

## 工作流最佳实践

### 规划阶段检查清单

在调用 `exit_plan_mode` 前，确保：

| 项目 | 检查点 |
|------|--------|
| **需求清晰** | 用户的要求是否明确？有模糊之处吗？ |
| **方案明确** | 你是否知道如何实现？架构是否清晰？ |
| **文件清单** | 哪些文件要创建/修改？列出来。 |
| **测试策略** | 如何验证你的实现正确？ |
| **边界情况** | 有哪些特殊情况需要处理？ |
| **可能风险** | 这个实现有什么风险吗？ |

### 提出计划的技巧

✅ **好的计划**：
```markdown
## 计划

1. 创建 X 文件，包含 Y 类
2. 修改 Z 文件，在 A 处添加 B 调用  ← 具体位置
3. 添加测试用例，覆盖 C 和 D 场景
4. 更新文档
```

❌ **不好的计划**：
```markdown
## 计划
1. 实现这个功能
2. 添加测试
3. 完成

← 太模糊，用户无法评估
```

### 处理用户拒绝

如果用户选择 "Cancel"（拒绝计划）：

1. **听取反馈**: "有什么问题吗？"
2. **调整方案**: 根据反馈修改计划
3. **再次提出**: 修改后重新调用 `exit_plan_mode`

---

## 与其他工具的关系

### exit_plan_mode vs ask_user_question

| 工具 | 用途 | 时机 |
|------|------|------|
| `ask_user_question` | 澄清疑问 | 规划前（还有不确定） |
| `exit_plan_mode` | 请求批准 | 规划后（方案确定） |

**流程**：
```
User 要求实现功能
  ↓
Agent 有疑问？若有 → ask_user_question
  ↓
Agent 制定计划
  ↓
Agent 调用 exit_plan_mode （请求批准）
  ↓
User 选择 Proceed 或 Cancel
  ↓
若 Proceed → 开始编码
若 Cancel → 回到规划，调整方案
```

---

## 常见问题

**Q: 什么时候应该用规划模式？**  
A: 当任务涉及编码或修改代码时。纯研究任务（如搜索、分析、问答）不需要。

**Q: 规划太多细节还是太少？**  
A: 平衡点是：用户能理解你要做什么，但不需要每行代码都写出来。列出文件、主要变更点、测试策略即可。

**Q: 用户拒绝计划怎么办？**  
A: 这很正常。问用户哪里有问题，调整方案，再次提出。

**Q: 规划是否总要用 markdown 格式？**  
A: 尽量用。markdown 格式更清晰，便于用户阅读。

---

## 参数示例库

### 最小化计划

```typescript
exit_plan_mode({
  plan: `## 快速补丁

1. 修改 \`src/utils/helpers.ts\` 第 45 行
   - 从 \`const x = 10\` 改为 \`const x = 20\`

2. 运行测试验证`
})
```

### 标准计划

```typescript
exit_plan_mode({
  plan: `## 实现 X 功能

### 背景
[说明为什么要做这个]

### 方案
[高层设计]

### 实现步骤
1. 创建文件
2. 修改文件
3. 添加测试
4. 更新文档

### 预期结果
[实现完成后的效果]`
})
```

### 详细计划

```typescript
exit_plan_mode({
  plan: `## 实现 X 功能

### 需求分析
[详细的功能需求]

### 设计方案
[架构设计、数据流、API 设计]

### 文件变更清单
- 创建: [file1, file2, ...]
- 修改: [file3, file4, ...]
- 删除: [file5, ...]

### 详细步骤
[逐步说明每个文件的变更]

### 测试计划
[单元测试、集成测试、端到端测试]

### 风险评估
[可能的问题和解决方案]

### 时间估计
[大概需要多久]`
})
```
