---
name: service-management
description: |
  系统服务管理技能。注册、启动、停止、重启、监控后台服务。
  支持自动重启、日志管理、故障恢复。特别优化于 Minecraft 服务器等长期进程。
allowedTools:
  - service_manage
  - run_shell_command
---

# 系统服务管理技能

## 概述

服务管理是生产环境的关键能力。通过服务工具，Agent 可以：
- 注册和卸载系统服务
- 启动、停止、重启服务
- 查询服务状态和运行时长
- 配置自动重启和故障恢复
- 管理服务日志
- 监控资源使用

---

## 快速参考

### 全部支持的 Actions(12 个)

| 操作 | 用途 | 分类 | 权限 |
|------|------|------|------|
| `register` | 注册为系统服务 | 生命周期 | Admin |
| `start` | 启动服务 | 生命周期 | Admin |
| `stop` | 停止服务 | 生命周期 | Admin |
| `restart` | 重启服务 | 生命周期 | Admin |
| `remove` | 卸载服务 | 生命周期 | Admin |
| `list` | 列出所有服务 | 查询 | User |
| `log` | 读取服务日志 | 日志 | User |
| `follow` | 开始跟随日志 | 日志 | User |
| `unfollow` | 停止跟随日志 | 日志 | User |
| `send` | 发送输入到服务 | 交互 | Admin |
| `alert` | 配置监控告警 | 监控 | Admin |
| `analyze` | 分析服务日志 | 分析 | User |

---

## 工具详解

### service_manage - 统一服务管理

## 生命周期 Actions

#### 1. register - 注册服务

```typescript
service_manage({
  action: 'register',
  name: 'minecraft-server',               // 服务名（必填）
  command: 'java -Xmx4G -jar server.jar nogui',  // 启动命令（必填）
  cwd: '/opt/minecraft',                  // 工作目录（可选）
  autoStart: true,                        // 自动启动（可选）
  watchPatterns: ['*.jar', 'config/**'],  // 监听文件变更（可选）
  stopInputs: ['stop', 'shutdown']        // 停止输入标识（可选）
})
```

#### 2. start - 启动服务

```typescript
service_manage({
  action: 'start',
  name: 'minecraft-server'
})
```

#### 3. stop - 停止服务

```typescript
service_manage({
  action: 'stop',
  name: 'minecraft-server'
})
```

#### 4. restart - 重启服务

```typescript
service_manage({
  action: 'restart',
  name: 'minecraft-server'
})
```

#### 5. remove - 卸载服务

```typescript
service_manage({
  action: 'remove',
  name: 'minecraft-server'
})
```

### 查询 Actions

#### 6. list - 列出所有服务

```typescript
service_manage({
  action: 'list'
})

// 返回：
// {
//   services: [
//     { name: 'minecraft-server', running: true, pid: 1234, ... },
//     { name: 'backup-service', running: false, ... },
//     ...
//   ]
// }
```

### 日志 Actions

#### 7. log - 读取日志

```typescript
service_manage({
  action: 'log',
  name: 'minecraft-server',
  tail: 100,          // 读取最后 100 行（可选，必须 > 0）
  follow: false       // 不跟随（可选，默认 false）
})

// 返回最后 100 行日志
```

#### 8. follow - 跟随日志（实时）

```typescript
service_manage({
  action: 'follow',
  name: 'minecraft-server'
})

// 持续输出日志，直到 unfollow
```

#### 9. unfollow - 停止跟随日志

```typescript
service_manage({
  action: 'unfollow',
  name: 'minecraft-server'
})
```

### 交互 Actions

#### 10. send - 发送输入到服务 ✨

```typescript
service_manage({
  action: 'send',
  name: 'minecraft-server',
  input: 'say 服务器将在10秒后关闭'  // 发送的内容（必填）
})

// 向运行中的服务发送命令/输入
// 用于与交互式服务通信
```

**send 使用场景**：

```typescript
// 场景 A：向 Minecraft 服务器发送命令
// 1. 发送公告
service_manage({
  action: 'send',
  name: 'minecraft-server',
  input: 'say 更新维护中，请稍候...'
})

// 2. 查看效果（从日志确认）
const log = await service_manage({
  action: 'log',
  name: 'minecraft-server',
  tail: 20
})

// 3. 继续发送其他命令
service_manage({
  action: 'send',
  name: 'minecraft-server',
  input: 'save-all'  // 保存世界
})

// 等待日志确认保存完成
await sleep(2000)

// 4. 最后停止服务
service_manage({
  action: 'send',
  name: 'minecraft-server',
  input: 'stop'
})

// 场景 B：与 Docker 容器交互
service_manage({
  action: 'send',
  name: 'my-app-container',
  input: 'health-check'
})

// 场景 C：向数据库服务发送查询
service_manage({
  action: 'send',
  name: 'postgres-server',
  input: 'SELECT COUNT(*) FROM logs;'
})
```

**重要提示**（官方明确）：
> 发送后要等待片刻，然后立即读取日志（使用 `log action with tail=...`），以确认命令是否执行成功，再做结论传达。

### 监控 Actions

#### 11. alert - 配置监控告警

```typescript
service_manage({
  action: 'alert',
  name: 'minecraft-server',
  alertCondition: 'memoryUsage > 6.5GB',  // 告警条件
  alertAction: 'restart',                 // 告警动作
  severity: 'warning'                     // 严重级别
})

// 配置服务异常时的自动响应
```

### 分析 Actions

#### 12. analyze - 分析服务日志 ✨

```typescript
service_manage({
  action: 'analyze',
  name: 'minecraft-server',
  mode: 'all'  // 或 'errors'：只分析错误行
})

// 返回：
// {
//   summary: '分析摘要',
//   issues: [
//     { type: 'OutOfMemoryError', count: 2, severity: 'critical' },
//     { type: 'SocketException', count: 5, severity: 'warning' },
//     ...
//   ],
//   recommendations: [
//     '增加 JVM 内存',
//     '检查网络连接',
//     ...
//   ]
// }
```

**analyze 场景**：

```typescript
// 场景 A：快速诊断服务问题
const analysis = await service_manage({
  action: 'analyze',
  name: 'minecraft-server',
  mode: 'errors'  // 只看错误
})

if (analysis.issues.some(i => i.type === 'OutOfMemoryError')) {
  console.log('内存不足，考虑增加 JVM 堆大小')
}

// 场景 B：获取大方向建议
const fullAnalysis = await service_manage({
  action: 'analyze',
  name: 'minecraft-server',
  mode: 'all'
})

for (const rec of fullAnalysis.recommendations) {
  console.log('优化建议:', rec)
}
```

---

## 完整参数参考

| 参数 | 类型 | 适用 Actions | 说明 |
|------|------|--------|------|
| `action` | ServiceAction | 全部 | 操作类型（必填）|
| `name` | string | 除 list | 服务名称（必填）|
| `command` | string | register | 启动命令（register 必填）|
| `cwd` | string | register | 工作目录（可选）|
| `autoStart` | boolean | register | 自动启动（可选）|
| `watchPatterns` | string[] | register | 监听文件模式（可选）|
| `stopInputs` | string[] | register | 停止输入标识（可选）|
| `tail` | number | log | 读取最后 N 行（>0，可选）|
| `follow` | boolean | log | 跟随输出（可选）|
| `input` | string | send | 发送内容（send 必填）|
| `mode` | 'all' \| 'errors' | analyze | 分析模式（可选，默认 'all'）|

---

## 服务生命周期

### 状态机

```
┌─────────────┐
│  Unregistered
│  (不存在)
└──────┬──────┘
       │ register()
       ↓
┌─────────────┐
│  Registered
│  (已注册，停止)
└──────┬──────┘
       │ start()
       ↓
┌─────────────┐
│  Running
│  (运行中)
└───┬──────┬──┘
    │      │
 stop()  crash (auto-restart enabled)
    │      │
    ↓      ↓
┌─────────────┐
│  Stopped
│  (停止)
└──────┬──────┘
       │ unregister()
       ↓
┌─────────────┐
│  Unregistered
└─────────────┘
```

### 服务生命周期事件

| 事件 | 触发条件 | 后续状态 |
|------|---------|--------|
| `registered` | 注册成功 | Stopped |
| `started` | start() 成功 | Running |
| `stopped` | stop() 成功 | Stopped |
| `restarted` | restart() 成功 | Running |
| `crashed` | 进程异常退出 | Stopped → (auto-restart) Running |
| `unregistered` | unregister() 成功 | Unregistered |

---

## 典型场景

### 场景 A：注册 Minecraft 服务器

```typescript
// 首次设置 Minecraft 服务器作为系统服务
service_manage({
  action: 'register',
  name: 'mc-server-vanilla',
  command: 'java -Xmx6G -Xms6G -jar server.jar nogui',
  cwd: '/opt/minecraft-servers/vanilla',
  autoStart: true,
  watchPatterns: ['*.jar', 'plugins/**'],
  stopInputs: ['stop', 'shutdown']
})

// 结果：
// ✓ 服务已注册为系统守护进程
// ✓ 文件变更自动监听（监听 jar 和插件）
// ✓ 日志输出到系统日志
```

### 场景 B：监控服务状态

```typescript
// 定时检查服务健康状态
async function monitorServer() {
  // 获取日志最后 100 行
  const log = await service_manage({
    action: 'log',
    name: 'mc-server-vanilla',
    tail: 100
  })
  
  // 分析日志找出错误
  if (log.includes('OutOfMemoryError')) {
    console.warn('内存不足，需要增加堆大小')
  }
  
  if (log.includes('ConcurrentModificationException')) {
    console.warn('可能存在线程安全问题')
  }
}

// 每分钟检查一次
setInterval(monitorServer, 60000)
```

### 场景 C：优雅关闭服务

```typescript
// 优雅关闭：先通知玩家，再保存，最后停止
async function gracefulShutdown() {
  // 1. 发送警告
  await service_manage({
    action: 'send',
    name: 'mc-server-vanilla',
    input: 'say 服务器将在 10 秒后关闭！保存进度...'
  })
  
  // 等待消息显示
  await sleep(1000)
  
  // 2. 保存世界
  await service_manage({
    action: 'send',
    name: 'mc-server-vanilla',
    input: 'save-all'
  })
  
  // 等待保存完成
  await sleep(2000)
  
  // 3. 检查保存完成（从日志确认）
  const log = await service_manage({
    action: 'log',
    name: 'mc-server-vanilla',
    tail: 20
  })
  
  if (!log.includes('Saved the game')) {
    console.error('保存失败！')
    return
  }
  
  // 4. 停止服务
  await service_manage({
    action: 'stop',
    name: 'mc-server-vanilla'
  })
  
  console.log('✓ 优雅关闭完成')
}

// 每分钟检查一次
setInterval(monitorServer, 60000)
```

### 场景 D：服务更新和重启

```typescript
// 更新 Minecraft 服务端或插件
async function updateAndRestart() {
  // 1. 发送预告
  await service_manage({
    action: 'send',
    name: 'mc-server-vanilla',
    input: 'say 服务器更新，3 分钟后重启'
  })
  
  // 2. 停止服务
  await service_manage({
    action: 'stop',
    name: 'mc-server-vanilla'
  })
  
  // 3. 等待完全停止
  await sleep(2000)
  
  // 4. 替换 server.jar 或插件
  await downloadLatestServerJar('/opt/minecraft-servers/vanilla')
  
  // 5. 重启
  await service_manage({
    action: 'start',
    name: 'mc-server-vanilla'
  })
  
  console.log('✓ 更新和重启完成')
}
```

### 场景 E：故障自动诊断

```typescript
// 当服务崩溃时自动分析原因
async function autodiagnosis() {
  // 1. 检查日志中的错误
  const log = await service_manage({
    action: 'log',
    name: 'mc-server-vanilla',
    tail: 200
  })
  
  // 2. 让 AI 分析日志
  const analysis = await service_manage({
    action: 'analyze',
    name: 'mc-server-vanilla',
    mode: 'errors'  // 只看错误行
  })
  
  // 3. 根据分析结果采取行动
  for (const issue of analysis.issues) {
    if (issue.type === 'OutOfMemoryError') {
      console.log('发现内存不足，推荐：增加 JVM 堆大小')
    } else if (issue.type === 'PluginException') {
      console.log('发现插件错误，推荐：检查插件兼容性')
    } else if (issue.type === 'ModConflict') {
      console.log('发现 mod 冲突，推荐：卸载最近安装的 mod')
    }
  }
  
  // 4. 显示 AI 的优化建议
  console.log('优化建议:')
  for (const rec of analysis.recommendations) {
    console.log('  -', rec)
  }
}
```

### 场景 F：多实例管理

```typescript
// 管理多个 Minecraft 服务器实例
const servers = [
  { name: 'vanilla', version: '1.20.1', memory: '6G' },
  { name: 'modded', version: '1.20.1', memory: '8G' },
  { name: 'pvp', version: '1.19.2', memory: '4G' }
]

// 查看所有服务器状态
async function statusAll() {
  const allServices = await service_manage({
    action: 'list'
  })
  
  for (const service of allServices.services) {
    console.log(`${service.name}: ${service.running ? '运行中' : '已停止'}`)
    if (service.running) {
      console.log(`  PID: ${service.pid}, 内存: ${service.memoryUsage}`)
    }
  }
}

// 启动所有服务器
async function startAllServers() {
  for (const server of servers) {
    await service_manage({
      action: 'start',
      name: `mc-${server.name}`
    })
    await sleep(1000)  // 间隔启动，避免资源竞争
  }
}

// 全部停止
async function stopAllServers() {
  for (const server of servers) {
    // 优雅关闭
    await service_manage({
      action: 'send',
      name: `mc-${server.name}`,
      input: 'say 关闭服务器'
    })
    
    await sleep(2000)
    
    await service_manage({
      action: 'stop',
      name: `mc-${server.name}`
    })
  }
  
  console.log('✓ 所有服务器已停止')
}

---

## 跨平台考虑

### Windows 特性

```typescript
// Windows 系统服务注册（NSSM、SC 等）
service_manage({
  action: 'register',
  name: 'MinecraftServer',
  command: 'C:\\Java\\bin\\java -Xmx6G -jar server.jar nogui',
  cwd: 'C:\\Servers\\Minecraft',
  autoStart: true
})

// 特点：
// ✓ 通过 NSSM (Non-Sucking Service Manager) 实现
// ✓ 支持服务依赖
// ✓ Windows 任务管理器可见
// ✓ 支持延迟启动
```

### Unix/Linux 特性

```typescript
// Linux 系统服务注册（systemd 等）
service_manage({
  action: 'register',
  name: 'minecraft-server',
  command: '/usr/bin/java -Xmx6G -jar /opt/minecraft/server.jar nogui',
  cwd: '/opt/minecraft',
  user: 'minecraft',  // 重要：以普通用户运行
  environment: {
    'JAVA_HOME': '/usr/lib/jvm/java-17',
    'PATH': '/opt/minecraft/bin:$PATH'
  },
  autoStart: true
})

// 特点：
// ✓ 通过 systemd service 实现
// ✓ systemctl start/stop/restart 可用
// ✓ 支持 OnFailure= 策略
// ✓ 支持资源限制 (Limit*)
// ✓ journalctl 日志查看
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **总是用专用用户** | 避免以 root 或 admin 运行游戏服务器 |
| **启用 autoRestart** | 崩溃自动恢复，但要监控重启频率 |
| **配置日志** | logPath 必填，便于故障排查 |
| **监控状态** | 定时检查 status，不要假设服务一直运行 |
| **优雅关闭** | 有条件时采用 graceful shutdown（如发送 stop 命令） |
| **资源限制** | 设置最大内存/CPU，防止资源耗尽 |
| **备份配置** | 记录所有服务注册参数，便于恢复 |

---

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| `服务无法启动` | 启动命令错误、权限不足 | 检查 command 参数、运行用户权限 |
| `持续重启（死循环）** | 进程启动后立即崩溃 | 检查日志，找到根本原因，disable autoRestart |
| `内存持续增长** | 内存泄漏 | 增加 JVM -Xms 初始内存，或寻找泄漏源 |
| `服务停止响应缓慢** | 进程未正确关闭 | 增加 stop timeout，必要时强制 kill |
| `日志文件占满磁盘** | 日志未轮转 | 配置 logrotate（Linux）或日志压缩 |

---

## 配置示例集合

### 示例 1：Vanilla Minecraft 服务器

```typescript
service_manage({
  action: 'register',
  serviceName: 'mc-vanilla-1.20.1',
  command: 'java -Xmx6G -Xms6G -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -jar server.jar nogui',
  workingDirectory: '/opt/minecraft/vanilla',
  autoRestart: true,
  restartDelaySeconds: 5,
  logPath: '/var/log/minecraft/vanilla.log',
  user: 'minecraft',
  environment: {
    'JAVA_HOME': '/usr/lib/jvm/java-17-openjdk'
  }
})
```

### 示例 2：Modded (Fabric) 服务器

```typescript
service_manage({
  action: 'register',
  serviceName: 'mc-fabric-1.20.1',
  command: 'java -Xmx8G -Xms8G -XX:+UseG1GC -XX:MaxGCPauseMillis=130 -jar fabric-server-launch.jar nogui',
  workingDirectory: '/opt/minecraft/fabric',
  autoRestart: true,
  logPath: '/var/log/minecraft/fabric.log',
  user: 'minecraft'
})
```

### 示例 3：打造 Paper 服务器

```typescript
service_manage({
  action: 'register',
  serviceName: 'mc-paper-1.20.4',
  command: 'java -Xmx10G -Xms10G -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:+UnlockExperimentalVMOptions -XX:G1NewCollectionHeuristicPercent=30 -jar paper-1.20.4.jar nogui',
  workingDirectory: '/opt/minecraft/paper',
  autoRestart: true,
  logPath: '/var/log/minecraft/paper.log',
  user: 'minecraft'
})
```

---

## 监控集成示例

```typescript
// 与监控系统集成
async function integrateWithMonitoring() {
  const status = await service_manage({
    action: 'status',
    serviceName: 'mc-server'
  })
  
  // 推送到 Prometheus / Grafana
  const metrics = {
    'service_running': status.running ? 1 : 0,
    'service_uptime_seconds': parseUptime(status.uptime),
    'service_restarts': status.restarts,
    'memory_bytes': parseMemory(status.memoryUsage),
    'cpu_percent': parseFloat(status.cpuUsage)
  }
  
  // 发送到监控后端
  await sendMetrics('minecraft-server', metrics)
}
```

---

## 命令行等价

| service_manage | Shell 命令 (Linux) | PowerShell (Windows) |
|--------|--------|--------|
| register | systemctl enable servicename | sc create servicename |
| start | systemctl start servicename | net start servicename |
| stop | systemctl stop servicename | net stop servicename |
| restart | systemctl restart servicename | net stop && net start |
| status | systemctl status servicename | sc query servicename |
| unregister | systemctl disable servicename | sc delete servicename |

**prefer service_manage!** — 自动处理平台差异，更简洁可靠。

---

## 总结

**service_manage 的核心价值**：

1. **统一接口** - Windows 和 Unix 命令一致
2. **生命周期管理** - 从注册到卸载的完整流程
3. **自动恢复** - autoRestart 支持
4. **监控友好** - status 返回详细信息
5. **生产就绪** - 专为服务器设计

特别适合：
- 🎮 Minecraft 服务器管理
- 🖥️ 其他游戏服务器
- 🐳 容器外的应用服务
- 📊 后台数据处理服务
- 🔧 自动化运维脚本
