---
name: media-processing
description: |
  媒体处理技能。适合将视频转为音频、压缩图片/音频/视频，
  以便后续转写、分析、上传和分享。
allowedTools:
  - video_to_audio
  - media_compress
---

# 媒体处理技能

## 概述

当任务涉及视频、音频、图片等媒体文件时，不应该直接靠主模型硬吃原始文件。
更稳的做法是先把媒体转换成适合后续步骤的格式，再进入转写、总结、分享或上传流程。

通过这两个工具，Agent 可以：
- 从视频中提取音频，交给 `read_file` 做转写或分析
- 压缩体积过大的图片、视频和音频，减少上传和分享成本
- 在不破坏原文件的前提下生成可交付的派生文件

---

## 快速参考

| 工具 | 用途 | 典型输出 |
|------|------|---------|
| `video_to_audio` | 从视频提取音轨 | mp3 / wav / aac 音频文件 |
| `media_compress` | 压缩图片、视频或音频 | 体积更小的派生文件 |

---

## 工具详解

### 1. video_to_audio - 视频转音频

**用法**：

```typescript
video_to_audio({
  videoPath: './downloads/demo.mp4',
  format: 'mp3'
})
```

**参数**：
- `videoPath`：必填，视频文件路径
- `format`：可选，`mp3`、`wav` 或 `aac`，默认 `mp3`

**典型场景**：

**场景 A：把视频转成可转写的音频**

```typescript
video_to_audio({
  videoPath: './meeting-recording.mp4',
  format: 'mp3'
})

// 然后继续
read_file({ file_path: './meeting-recording.mp3' })
```

**场景 B：处理短视频内容**

```typescript
// 先下载视频，再转音频
download_file({ url: videoUrl, destPath: './clip.mp4' })
video_to_audio({ videoPath: './clip.mp4', format: 'aac' })
```

### 2. media_compress - 媒体压缩

**用法**：

```typescript
media_compress({
  inputPath: './assets/demo.mp4',
  quality: 'medium',
  mediaType: 'video',
  maxWidth: 1280,
  maxHeight: 720
})
```

**参数**：
- `inputPath`：必填，源文件路径
- `outputPath`：可选，自定义输出路径
- `mediaType`：可选，`auto`、`image`、`video`、`audio`
- `quality`：可选，`low`、`medium`、`high`，默认 `medium`
- `maxWidth` / `maxHeight`：可选，限制输出尺寸

**典型场景**：

**场景 A：压缩截图再分享**

```typescript
media_compress({
  inputPath: './screenshots/full.png',
  mediaType: 'image',
  quality: 'medium',
  maxWidth: 1600
})
```

**场景 B：压缩视频再上传**

```typescript
media_compress({
  inputPath: './recordings/session.mov',
  mediaType: 'video',
  quality: 'low',
  outputPath: './recordings/session-small.mov'
})
```

**场景 C：压缩转写前的音频文件**

```typescript
media_compress({
  inputPath: './meeting-recording.mp3',
  mediaType: 'audio',
  quality: 'medium'
})
```

---

## 典型工作流

### 工作流 1：视频转写

```
下载或获得视频文件
  ↓
video_to_audio 提取音轨
  ↓
read_file 读取音频并转写
  ↓
整理摘要或结构化信息
```

### 工作流 2：媒体瘦身后再交付

```
获得原始图片/视频/音频
  ↓
media_compress 降低体积
  ↓
确认输出文件可用
  ↓
上传、分享或继续分析
```

### 工作流 3：先压缩后转音频

```
超大视频文件
  ↓
media_compress 降低分辨率/码率
  ↓
video_to_audio 提取音频
  ↓
read_file 转写
```

---

## 最佳实践

| 原则 | 说明 |
|------|------|
| **保留原文件** | 默认输出派生文件，不要覆盖唯一原件 |
| **转写优先 mp3** | 一般体积更小，兼容性更好 |
| **先压缩再分享** | 大文件先瘦身，能减少失败和等待时间 |
| **需要尺寸约束时显式传参** | 图片和视频可配合 `maxWidth` / `maxHeight` |
| **注意 ffmpeg 依赖** | 两个工具都依赖 ffmpeg，可优先放在 `.tram/bin/` 或系统 PATH |

---

## 常见错误

### 错误 1：直接让模型处理视频

```typescript
// ❌ WRONG：大多数模型不能直接理解视频内容
read_file({ file_path: './demo.mp4' })

// ✅ CORRECT：先抽取音频
video_to_audio({ videoPath: './demo.mp4', format: 'mp3' })
read_file({ file_path: './demo.mp3' })
```

### 错误 2：压缩时没有指定目标质量

```typescript
// ⚠️ 可以工作，但结果不可预期
media_compress({ inputPath: './video.mov' })

// ✅ 更清晰的做法
media_compress({
  inputPath: './video.mov',
  mediaType: 'video',
  quality: 'low'
})
```

---

## 协作方式

```
download_file()    ← 获取媒体文件
   ↓
media_compress()   ← 先瘦身（可选）
   ↓
video_to_audio()   ← 提取音频
   ↓
read_file()        ← 转写或分析
```