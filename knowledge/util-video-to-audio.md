---
name: video-to-audio
description: Extract audio from video files using ffmpeg. Use when processing video content that cannot be directly understood by the model, or after downloading videos from Douyin/TikTok.
---

# video_to_audio — 视频转音频

Use `video_to_audio` to extract audio from video files. This is essential for processing video content that cannot be directly understood by the model.

- Requires ffmpeg installed on the system
- Supports output formats: mp3 (default), wav, aac
- Commonly used after downloading videos from Douyin, TikTok, etc.
- After conversion, use `read_file` on the audio file for transcription

```typescript
video_to_audio({ videoPath: "demo.mp4", format: "mp3" })
```
