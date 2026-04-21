---
name: shell-execution
description: |
  Shell 执行技能。运行系统命令、管理后台进程、执行部署脚本。
  支持前台/后台执行、超时控制、权限管理。
allowedTools:
  - run_shell_command
  - service_manage
---

# Shell 执行技能

## 概述

Shell 执行是 Agent 与操作系统交互的关键能力。通过 Shell 命令，Agent 可以：
- 执行构建、测试、部署脚本
- 管理系统服务和后台进程
- 收集系统信息和日志
- 安装依赖和工具

---

## 快速参考

| 工具 | 用途 | 前/后台 | 超时 | 确认 |
|------|------|--------|------|------|
| `run_shell_command` | 执行任意命令 | 两者 | ✅ 可配置 | ✅ 权限检查 |
| `service_manage` | 管理后台服务 | 专业管理 | ✅ 自动 | ✅ | 

---

## 工具详解

### 1. run_shell_command - 执行命令

**用法**：

```typescript
run_shell_command({
  command: 'npm run build',        // 命令（必填）
  is_background: false,            // 前台执行（必填）
  timeout: 60000,                  // 超时60秒（可选，毫秒）
  description: '构建项目',         // 描述（可选）
  directory: '/project'            // 执行目录（可选）
})
```

**核心特性**：

| 特性 | 说明 |
|------|------|
| **前台执行** | 阻塞等待，返回完整输出（exit code 0-255） |
| **后台执行** | 立即返回 PID，输出可随时查询 |
| **超时控制** | 前台默认 120s；可自定义 |
| **权限检查** | 危险命令（rm -rf、dd 等）需用户确认 |
| **跨平台** | Windows/Unix 自动适配 |

### 前台 vs 后台

**前台执行**（`is_background: false`）：

```typescript
run_shell_command({
  command: 'npm test',
  is_background: false,
  timeout: 120000
})

// 返回：
// {
//   stdout: '...test output...',
//   stderr: '...errors...',
//   exitCode: 0,
//   duration: 45000  // 毫秒
// }

// ✓ 适合：短期任务（<2分钟）
// ✓ 适合：需要立即知道结果的任务
```

**后台执行**（`is_background: true`）：

```typescript
run_shell_command({
  command: 'npm run dev',
  is_background: true,
  timeout: 0  // 不设超时，持续运行
})

// 返回：
// {
//   pid: 12345,
//   status: 'started'
// }

// ✓ 适合：长期进程（>2分钟）
// ✓ 适合：需要并行运行的任务
```

### 超时处理

```typescript
// ✅ 短命令：不需要特殊超时
run_shell_command({
  command: 'git status',
  is_background: false
  // 使用默认 120s
})

// ✅ 构建任务：5分钟超时
run_shell_command({
  command: 'npm run build:all',
  is_background: false,
  timeout: 300000  // 5 分钟
})

// ✅ 测试任务：10分钟超时
run_shell_command({
  command: 'npm test',
  is_background: false,
  timeout: 600000  // 10 分钟
})

// ⚠️ 后台任务：不设超时
run_shell_command({
  command: 'npm run watch',
  is_background: true,
  timeout: 0  // 0 = 永不超时
})
```

### 权限检查

某些危险命令需要用户确认：

```typescript
// ⚠️ 这些命令会触发权限检查
❌ rm -rf /
❌ dd if=/dev/zero of=/dev/sda
❌ sudo reboot
❌ del /S /Q C:\*

// ✅ 安全的命令（直接执行）
✅ git clone repo
✅ npm install pkg
✅ node script.js
✅ docker run image
```

---

## 典型场景

### 场景 A：构建项目

```typescript
run_shell_command({
  command: 'npm run build',
  is_background: false,
  timeout: 300000,
  description: '编译 TypeScript 和构建资源'
})
```

**期望输出**：
```
npm notice
npm warn deprecated ...
> npm run build
> tsc && vite build
✓ TypeScript compilation successful
✓ Assets bundled
Done in 45.2s
```

### 场景 B：运行测试

```typescript
run_shell_command({
  command: 'npm test -- --coverage',
  is_background: false,
  timeout: 600000,
  description: '运行单元测试并生成覆盖率报告'
})
```

### 场景 C：启动开发服务器

```typescript
run_shell_command({
  command: 'npm run dev',
  is_background: true,
  description: '启动 Vite 开发服务器'
})
// → 返回 PID
// → 可以继续执行其他任务
// → 查询输出：await getTerminalOutput(pid)
```

### 场景 D：部署应用

```typescript
run_shell_command({
  command: 'docker build -t myapp:latest . && docker push myapp:latest',
  is_background: false,
  timeout: 1200000,  // 20 分钟
  description: '构建 Docker 镜像并推送到仓库'
})
```

### 场景 E：批量文件操作

```typescript
// 安全替换:使用脚本而不是直接命令
run_shell_command({
  command: 'find /project -name "*.js" -type f | xargs sed -i "s/oldPattern/newPattern/g"',
  is_background: false,
  description: '批量文本替换'
})
```

---

### 场景 2. service_manage - 管理服务

**用法**：

```typescript
service_manage({
  action: 'start|stop|restart|register|unregister|status',
  serviceName: 'my-server',
  command: 'node server.js',  // 注册时需要
  autoRestart: true,          // 崩溃自动重启
  logPath: '/var/log/service.log'
})
```

**服务生命周期**：

| 操作 | 说明 | 用途 |
|------|------|------|
| `register` | 注册为系统服务 | 首次安装 |
| `start` | 启动服务 | 激活服务 |
| `stop` | 停止服务 | 维护或更新 |
| `restart` | 重启服务 | 应用新配置 |
| `status` | 查询状态 | 诊断 |
| `unregister` | 卸载服务 | 清理 |

**典型使用**：

```typescript
// 1. 注册服务
service_manage({
  action: 'register',
  serviceName: 'my-api',
  command: 'node /opt/my-api/server.js',
  autoRestart: true,
  logPath: '/var/log/my-api.log'
})

// 2. 启动服务
service_manage({
  action: 'start',
  serviceName: 'my-api'
})

// 3. 查询状态
service_manage({
  action: 'status',
  serviceName: 'my-api'
})
// → { status: 'running', pid: 1234, uptime: '2d 5h' }

// 4. 重启服务
service_manage({
  action: 'restart',
  serviceName: 'my-api'
})

// 5. 停止和卸载
service_manage({ action: 'stop', serviceName: 'my-api' })
service_manage({ action: 'unregister', serviceName: 'my-api' })
```

---

## 工作流程

### 流程 1：运行测试并分析结果

```
1. run_shell_command('npm test')
   ↓
2. 检查 exitCode
   ├─ 0 → 成功 ✓
   └─ 非0 → 分析 stderr 和 stdout
   ↓
3. 提取关键错误信息
   ↓
4. 给出修复建议
```

### 流程 2：启动和监控服务

```
1. service_manage(action='register', ...)
   ↓
2. service_manage(action='start', ...)
   ↓
3. service_manage(action='status', ...)  
   ↓
4. 定期 status 检查
   ├─ running → 正常
   └─ crashed → 自动重启或告警
```

---

## 常见错误

### ❌ 错误 1：命令超时

```typescript
// ❌ BAD：网络下载但不设超时
run_shell_command({
  command: 'wget large-file.zip'
  // 没有设置超时，默认 120s，但下载可能更久
})

// ✅ GOOD：为长操作设置足够超时
run_shell_command({
  command: 'wget large-file.zip',
  timeout: 600000  // 10 分钟
})
```

### ❌ 错误 2：后台任务输出丢失

```typescript
// ❌ BAD：启动后台任务但没有返回 PID
run_shell_command({
  command: 'npm run watch',
  is_background: true
})
// 无法追踪或停止

// ✅ GOOD：保存 PID，稍后查询输出
const result = run_shell_command({
  command: 'npm run watch',
  is_background: true
})
// result.pid = 12345
// 后续可用：getTerminalOutput(result.pid)
```

### ❌ 错误 3：权限提升失败

```typescript
// ❌ BAD：某些环境 sudo 效果不同
run_shell_command({
  command: 'sudo systemctl restart nginx'
})

// ✅ GOOD：使用 service_manage 管理
service_manage({
  action: 'restart',
  serviceName: 'nginx'
})
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **前台用于简短任务** | <2 分钟的命令用前台 |
| **后台用于长期进程** | 服务器、watch 模式等用后台 |
| **总是设置超时** | 防止卡住，异常时能及时中止 |
| **分析 exits code** | 0 = 成功；非 0 = 失败，分析 stderr |
| **用 service_manage** | 系统服务用专业工具，不用原始 shell |
| **错误处理** | 失败时分析日志并提出修复方案 |

---

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| `命令找不到` | 可执行文件不在 PATH | 检查环境变量、使用绝对路径 |
| `权限拒绝` | 用户权限不足 | 用 sudo 或切换用户 |
| `超时中止` | 操作耗时超过设定 | 增加 timeout 值 |
| `后台进程僵尸** | 进程已退出但 PID 未清理 | 用 service_manage 管理或手动 kill |
| `平台不兼容** | 命令在 Windows/Unix 差异 | 使用跨平台工具（如 Node.js 脚本） |
