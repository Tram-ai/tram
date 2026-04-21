---
name: minecraft-mod-management
description: |
  Minecraft 模组搜索、识别和管理技能。从 CurseForge、Modrinth、Hangar 和 SpiGet 搜索模组、
  通过哈希识别已安装的模组、智能依赖解析、版本兼容性检查、下载URL获取。
  包含模组识别教学，以及 CurseForge/Modrinth 整合包的服务端组装辅助流程。
allowedTools:
  - mod_search
  - mod_hash_lookup
  - download_file
  - modpack_server_pack
---

# Minecraft 模组管理技能

## 概述

模组管理是 Minecraft 服务器部署和维护的核心能力。通过模组工具，Agent 可以：
- 搜索兼容的模组（含下载URL和版本ID）
- 通过哈希值识别已安装的模组
- 解析依赖关系
- 检查版本和加载器兼容性
- 自动化模组安装和更新
- 获取测试版/预发布版本信息
- 判断整合包是否提供官方服务端包，并生成服务端覆盖文件

---

## 快速参考

| 工具 | 用途 | 来源 | 返回信息 |
|------|------|------|---------|
| `mod_search` | 搜索模组 | CurseForge + Modrinth + Hangar + SpiGet | 名称、版本号、版本ID、**下载URL**、渠道 |
| `mod_hash_lookup` | 哈希查询模组 | Modrinth + CurseForge + Hangar | 精确匹配模组身份 |
| `download_file` | 下载模组文件 | 任意URL | HTTP状态码、Content-Type、文件大小 |
| `modpack_server_pack` | 解析整合包服务端方案 | CurseForge + Modrinth `.mrpack` | server pack 信息、服务端覆盖文件、客户端专用模组列表 |

---

## 工具详解

### 1. mod_search - 模组搜索

**用法**：

```typescript
mod_search({
  query: 'Fabric API',                    // 模组名（必填）
  source: 'both',                         // 平台：'curseforge'|'modrinth'|'hangar'|'spiget'|'both'|'all'（可选）
  loaders: ['fabric'],                    // 加载器过滤（可选）
  gameVersion: '1.20.1',                  // MC 版本过滤（可选）
  limit: 10,                              // 返回数量（可选，默认10）
  includePreRelease: false                // 包含beta/alpha版本（可选，默认false）
})

// 返回格式：
// {
//   results: [
//     {
//       name: 'Fabric API',
//       slug: 'fabric-api',
//       projectId: 'P7dR8mSH',
//       description: '...',
//       source: 'modrinth',
//       latestVersion: '0.92.2',
//       versionId: 'abc123',
//       downloadUrl: 'https://cdn.modrinth.com/.../fabric-api-0.92.2.jar',
//       releaseChannel: 'release',
//       compatibleLoaders: ['fabric'],
//       compatibleVersions: ['1.20', '1.20.1', '1.21'],
//       projectUrl: 'https://modrinth.com/mod/fabric-api',
//       downloads: 123456789
//     },
//     ...
//   ]
// }
```

**新增字段说明**：
- `versionId`: 版本的唯一ID（Modrinth版本ID / CurseForge文件ID / Hangar版本名）
- `downloadUrl`: **直接下载链接**，可直接传给 `download_file` 工具
- `releaseChannel`: `'release'` | `'beta'` | `'alpha'` 标识版本稳定性
- `includePreRelease`: 设置为 `true` 时返回beta/alpha测试版版本号

**支持的加载器**：
- `fabric` - Fabric Loader
- `forge` - Forge
- `neoforge` - NeoForge
- `quilt` - Quilt Loader

**支持的平台**：
- `modrinth` - Modrinth（版本号✅ 下载URL✅ 版本ID✅）
- `curseforge` - CurseForge（版本号✅ 下载URL✅ 版本ID✅）
- `hangar` - Hangar Paper插件（版本号✅ 下载URL✅ 版本ID✅）
- `spiget` - SpiGet Spigot插件（版本号❌ 下载URL❌）
- `both` - Modrinth + CurseForge（默认）
- `all` - 全部4个平台

**搜索策略**：

| 场景 | 搜索词 | 示例 |
|------|--------|------|
| **精确模组**| 完整名称 | "Fabric API", "Sodium", "LazyDFU" |
| **功能搜索** | 功能描述 | "性能优化", "mod菜单", "管理界面" |
| **前缀搜索** | 部分名称 | "Create" (Create, Create Steam, ...) |

### 典型场景

**场景 A：查找特定版本的模组并获取下载链接**

```typescript
// 为 1.20.1 Fabric 查找 Sodium
mod_search({
  query: 'Sodium',
  gameVersion: '1.20.1',
  loaders: ['fabric'],
  limit: 5
})

// 返回包含：
// - latestVersion: '0.5.8'
// - versionId: 'xyz789'
// - downloadUrl: 'https://cdn.modrinth.com/.../sodium-0.5.8.jar'
// - releaseChannel: 'release'

// 直接用 download_file 下载：
download_file({ url: result.downloadUrl, destPath: './mods/sodium-0.5.8.jar' })
```

**场景 B：获取测试版/预发布版本**

```typescript
// 查找包含beta版在内的最新版本
mod_search({
  query: 'Sodium',
  gameVersion: '1.21',
  loaders: ['fabric'],
  includePreRelease: true   // ← 包含beta/alpha
})

// 可能返回：
// - latestVersion: '0.6.0-beta.3'
// - releaseChannel: 'beta'
// - downloadUrl: 'https://cdn.modrinth.com/.../sodium-0.6.0-beta.3.jar'
```

**场景 C：跨平台搜索对比**

```typescript
// 同时搜索所有平台
mod_search({
  query: 'EssentialsX',
  source: 'all',
  gameVersion: '1.20.1'
})

// 返回来自 CurseForge、Modrinth、Hangar、SpiGet 的结果
// 每个结果都有各自平台的下载URL
```

---

### 2. mod_hash_lookup - 哈希查询

**用法**：

```typescript
mod_hash_lookup({
  filePath: '/path/to/mod.jar',          // 模组文件路径（必填）
  hash?: 'sha1' | 'md5'                  // 哈希算法（可选，默认自动）
})

// 返回格式：
// {
//   hash: 'a1b2c3d4...',
//   algorithm: 'sha1',
//   matchedMods: [
//     {
//       name: 'Sodium',
//       version: '0.5.8',
//       slug: 'sodium',
//       source: 'modrinth',
//       project_id: 'aak7r5p8',
//       versionId: '...'
//     }
//   ]
// }
```

**特性**：
- ✅ **精确匹配**：通过 Modrinth/CurseForge API 确认 mod 身份
- ✅ **元数据提取**：获得 mod 名称、版本、项目信息
- ✅ **ZIP内部解析**：读取 fabric.mod.json / mods.toml 等元数据
- ⚠️ **限制**：仅覆盖 Modrinth + CurseForge 数据库

---

### 3. modpack_server_pack - 整合包服务端处理

**用法**：

```typescript
// CurseForge：解析官方 server pack
modpack_server_pack({
  action: 'curseforge-server-pack',
  projectId: 123456,
  fileId: 789012  // 可选，不传则默认取最新文件
})

// Modrinth：解析 .mrpack 并生成服务端覆盖文件
modpack_server_pack({
  action: 'modrinth-server-pack',
  mrpackPath: './modpacks/example-pack.mrpack',
  outputDir: './server-pack'
})
```

**能力**：
- CurseForge：解析 `serverPackFileId`，确认是否存在官方服务端包
- CurseForge：在有服务端包时返回可下载的服务端包信息
- Modrinth：解析 `.mrpack` 索引，区分服务端可用模组和客户端专用模组
- Modrinth：可选地把 overrides / config 等服务端覆盖文件写入 `outputDir`

**典型场景**：

**场景 A：先判断 CurseForge 整合包有没有官方服务端包**

```typescript
modpack_server_pack({
  action: 'curseforge-server-pack',
  projectId: 98765
})
// 返回是否存在 serverPackFileId，以及后续下载信息
```

**场景 B：解析 Modrinth `.mrpack`，生成服务端组装计划**

```typescript
modpack_server_pack({
  action: 'modrinth-server-pack',
  mrpackPath: './packs/atm9.mrpack',
  outputDir: './servers/atm9'
})
// 返回 serverMods、clientOnlyMods、overrides 和输出目录
```

**使用建议**：
- 先用它判断有没有现成 server pack，再决定是否手动组装
- Modrinth `.mrpack` 结果适合后续交给 `download_file`、`service_manage`、`write_file` 继续处理
- 如果结果显示无官方服务端包，应回退到“搜索兼容模组 + 手动组装”的流程

---

## 模组识别教学（替代原 mod_identify 工具）

**重要**：`mod_identify` 工具已移除。以下是 Agent 应当遵循的模组识别流程，
使用 `mod_hash_lookup` + `mod_search` 组合完成。

### 识别流程

当需要识别一个未知的 .jar 模组文件时，按以下顺序尝试：

```
步骤 1: mod_hash_lookup (精确匹配)
   ├─ 命中 → 返回结果（最可靠，置信度高）
   └─ 未命中 ↓

步骤 2: 从文件名推断搜索词
   ├─ 提取文件名中的模组名部分
   │   例: "sodium-fabric-0.5.8+mc1.20.1.jar" → 搜索 "sodium"
   │   例: "fabric-api-0.92.2+1.20.1.jar" → 搜索 "fabric api"
   └─ ↓

步骤 3: mod_search (搜索回退)
   ├─ 用提取的名称搜索
   ├─ 对比版本号和兼容性
   └─ 返回最佳匹配（置信度中等）
```

### 文件名解析规则

| 文件名模式 | 提取搜索词 |
|-----------|-----------|
| `sodium-fabric-0.5.8+mc1.20.1.jar` | `sodium` |
| `fabric-api-0.92.2+1.20.1.jar` | `fabric api` |
| `create-1.20.1-0.5.1.f.jar` | `create` |
| `jei-1.20.1-forge-15.3.0.4.jar` | `jei` |
| `worldedit-bukkit-7.2.15.jar` | `worldedit` |

**规则**：
1. 去掉 `.jar` 后缀
2. 去掉版本号部分（连续数字+点号）
3. 去掉加载器标识（fabric, forge, neoforge, quilt, bukkit 等）
4. 去掉 MC 版本标识（1.xx.x 格式）
5. 剩余部分用空格替换 `-`，作为搜索词

### 识别示例

**示例 A：未知模组识别**

```
1. 用户给了 /mods/unknown-mod-123.jar

2. Agent 先尝试哈希查询：
   mod_hash_lookup({ filePath: '/mods/unknown-mod-123.jar' })

3. 如果哈希匹配 → 直接返回模组信息

4. 如果未匹配 → 从文件名提取 "unknown mod"
   mod_search({ query: 'unknown mod', limit: 5 })

5. 对比搜索结果，根据名称相似度判断最可能的匹配
```

**示例 B：批量识别 mods 目录**

```
1. 列出 /server/mods/ 下所有 .jar 文件

2. 对每个文件执行 mod_hash_lookup

3. 对未识别的文件，从文件名提取搜索词并用 mod_search 搜索

4. 汇总结果形成模组清单
```

### 置信度判断

| 识别方式 | 置信度 | 说明 |
|---------|--------|------|
| mod_hash_lookup 命中 | **高** | 哈希精确匹配，100%确定 |
| mod_search 名称精确匹配 | **中** | 文件名和搜索结果名称一致 |
| mod_search 模糊匹配 | **低** | 需要用户确认 |
| 无法识别 | **未知** | 提示用户手动查询 |

---

## 工作流程

### 流程 1：搜索并下载安装 mod

```
1. mod_search({ query: '...', gameVersion: '1.20.1', loaders: ['fabric'] })
   ↓
2. 搜索结果包含 downloadUrl → 展示选项给用户
   ↓
3. 用户选择 → 使用 download_file 下载
   download_file({ url: result.downloadUrl, destPath: './mods/mod-name.jar' })
   ↓
4. download_file 返回 HTTP状态码、Content-Type、大小
   验证下载成功
   ↓
5. mod_hash_lookup 验证安装
   ✓ 安装成功
```

### 流程 2：自动诊断 mod 问题

```
服务器启动崩溃
  ↓
读取日志 → 发现 "mod X 兼容性错误"
  ↓
mod_hash_lookup(modX.jar) → 获取版本信息
  ↓
检查：
  - 该版本是否支持当前 MC 版本
  - 该版本是否支持当前加载器
  - 是否缺少依赖
  ↓
自动修复：
  - mod_search 搜索兼容版本（带 downloadUrl）
  - download_file 下载兼容版本
  - 或卸载不兼容的 mod
  - 或装依赖
  ↓
重启服务器
  ✓ 恢复运行
```

### 流程 3：服务器迁移

```
从 A 服务器迁移 mod 到 B 服务器

1. 旧服务器：扫描所有 mods
   for file in mods/ -> mod_hash_lookup() -> 记录列表
   
2. 记录保存为清单 (manifest.json)
   [
     { slug: 'fabric-api', version: '0.92.2', source: 'modrinth' },
     { slug: 'sodium', version: '0.5.8', source: 'modrinth' },
     ...
   ]

3. 新服务器：自动恢复
   mod_search() 逐个搜索 → 获取 downloadUrl
   → download_file 下载
   → mod_hash_lookup 验证哈希
   → 安装完成
   
4. 完成：mods 目录完全复制
```

---

## 搜索最佳实践

### ✅ 有效搜索策略

| 搜索词 | 效果 | 适合 |
|--------|------|------|
| `Sodium` | ✅ 直接搜索 mod 名 | 已知的热门 mod |
| `性能优化` | ✅ 功能描述 | 不知道名字 |
| `Create` | ✅ 前缀搜索 | 寻找系列 mod |
| `Fabric API 1.20.1` | ✅ 带版本 | 精确配置 |

### ❌ 低效搜索

| 搜索词 | 问题 | 改进 |
|--------|------|------|
| `mod` | ❌ 太笼统 | "性能 mod" |
| `客户端mod` | ❌ 歧义大 | "Sodium" / "性能优化" |
| `1.20` | ❌ 无信息 | "1.20 渲染优化" |

---

## 依赖管理

### 模组依赖类型

| 类型 | 影响 | 处理方式 |
|------|------|--------|
| **Required** | 缺少则崩溃 | 自动安装 |
| **Optional** | 缺少则减功能 | 提示用户 |
| **Incompatible** | 冲突崩溃 | 自动卸载 |
| **Recommends** | 增强体验 | 建议安装 |

### 冲突检测

```typescript
// 某些 mod 不能共存
const conflicts = {
  'sodium': ['optifine', 'canvas'],  // Sodium 与 Optifine 冲突
  'create': ['immersive-engineering']  // 某些配置下冲突
}

// 安装前检查
if (conflicts[modName]?.includes(existingMod)) {
  // 警告用户或自动卸载冲突的 mod
}
```

---

## 常见错误

### ❌ 错误 1：版本不兼容

```typescript
// ❌ WRONG：装了错版本
mod_search({
  query: 'Fabric API'
  // 没有指定 gameVersion，返回所有版本
})
// 可能装了 1.16.5 的，但服务器是 1.20.1

// ✅ CORRECT：指定版本
mod_search({
  query: 'Fabric API',
  gameVersion: '1.20.1',
  loaders: ['fabric']
})
```

### ❌ 错误 2：加载器不匹配

```typescript
// ❌ WRONG：混淆加载器
// Fabric mod 装到 Forge 服务器
// 结果：崩溃或完全不加载

// ✅ CORRECT：搜索时指定正确加载器
mod_search({
  query: 'Sodium',
  loaders: ['fabric'],   // 确保匹配服务器的加载器
  gameVersion: '1.20.1'
})
```

### ❌ 错误 3：忽视依赖

```typescript
// ❌ WRONG：只装主 mod，忘记库 mod
// mod_search('Create') → 装了 Create
// 但没装 Registrate（必需库）
// 结果：Create 无法加载

// ✅ CORRECT：搜索并安装依赖
mod_search({ query: 'Registrate', loaders: ['forge'], gameVersion: '1.20.1' })
// 获取 downloadUrl 后用 download_file 安装
```

### ❌ 错误 4：不使用下载URL直接下载

```typescript
// ❌ WRONG：手动拼接下载链接
download_file({ url: 'https://modrinth.com/mod/sodium/...' })
// 这不是真正的下载链接！

// ✅ CORRECT：使用 mod_search 返回的 downloadUrl
const result = mod_search({ query: 'Sodium', gameVersion: '1.20.1' })
download_file({ url: result.downloadUrl })
// downloadUrl 是 CDN 直链，保证可下载
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **总是指定版本** | mod_search 需要 gameVersion 和 loaders |
| **检查兼容性** | 安装前验证版本和加载器 |
| **管理依赖** | 不能忽视依赖关系，自动装 |
| **验证完整性** | 安装后用 mod_hash_lookup 验证 |
| **建立清单** | 记录已装 mod，便于迁移和恢复 |
| **使用 downloadUrl** | 直接用搜索结果的 downloadUrl，不要手动拼链接 |
| **注意 releaseChannel** | 区分 release/beta/alpha，提醒用户稳定性 |

---

## 故障排除

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| mod 无法加载 | 版本/加载器不搭 | 检查 gameVersion 和 loaders |
| 服务器启动崩溃 | 缺少依赖或冲突 | 用 mod_hash_lookup 扫描 + mod_search 查依赖 |
| 哈希查询失败 | CurseForge mod 不在 Modrinth | 用 mod_search 搜索备选 |
| 搜索结果为空 | 搜索词不对或 mod 名变更 | 尝试功能描述搜索 |
| 下载URL为空 | SpiGet不提供直链 | 使用 projectUrl 引导用户手动下载 |
| 版本号显示异常 | CurseForge的displayName格式不同 | CurseForge版本号可能是文件名格式 |

---

## 高级用法

### 获取测试版/预发布版

```typescript
// 需要最新的开发版本时
mod_search({
  query: 'Sodium',
  gameVersion: '1.21',
  includePreRelease: true   // 包含 beta/alpha
})

// 结果中 releaseChannel 字段标识：
// 'release' → 稳定版
// 'beta'    → 测试版
// 'alpha'   → 早期开发版
```

### 建立 Mod 配置文件

```json
{
  "gameVersion": "1.20.1",
  "loader": "fabric",
  "mods": [
    {
      "slug": "fabric-api",
      "version": "0.92.2",
      "source": "modrinth",
      "required": true,
      "downloadUrl": "https://cdn.modrinth.com/...",
      "deps": []
    },
    {
      "slug": "sodium",
      "version": "0.5.8",
      "source": "modrinth",
      "required": false,
      "downloadUrl": "https://cdn.modrinth.com/...",
      "deps": ["fabric-api"]
    }
  ]
}
```

### 自动恢复配置

```typescript
// 根据清单自动安装所有 mod
for (const modSpec of modList) {
  // 优先使用保存的 downloadUrl
  if (modSpec.downloadUrl) {
    download_file({ url: modSpec.downloadUrl, destPath: `./mods/${modSpec.slug}.jar` })
  } else {
    // 否则搜索获取最新下载链接
    const result = await mod_search({
      query: modSpec.slug,
      gameVersion: config.gameVersion,
      loaders: [config.loader]
    })
    if (result.downloadUrl) {
      download_file({ url: result.downloadUrl, destPath: `./mods/${modSpec.slug}.jar` })
    }
  }
}
```

---

## 全景图

```
Minecraft Mod 生态
├─ CurseForge  (250,000+ mods)  → 版本号✅ 下载URL✅ 版本ID✅
├─ Modrinth    (15,000+ mods)   → 版本号✅ 下载URL✅ 版本ID✅
├─ Hangar      (Paper plugins)  → 版本号✅ 下载URL✅ 版本ID✅
├─ SpiGet      (Spigot plugins) → 版本号❌ 下载URL❌
└─ 其他源       (GitHub, 论坛等)

mod_search() 统一接口
├─ CurseForge API → 搜索、版本号、下载URL
├─ Modrinth API → 搜索、版本号、下载URL
├─ Hangar API → 搜索、版本号、下载URL
├─ SpiGet API → 搜索（无版本/下载信息）
└─ 合并去重 → 统一格式（含 downloadUrl, versionId, releaseChannel）

mod_hash_lookup() → 哈希精确匹配
├─ Modrinth SHA1 → mod 身份
├─ CurseForge MurmurHash2 → mod 身份
├─ ZIP 元数据提取 → fabric.mod.json / mods.toml
└─ 回退搜索 → 从文件名推断

结果：自动化的 mod 搜索 → 下载 → 安装 → 验证
```
