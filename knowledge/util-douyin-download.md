---
name: douyin-download
description: Workflow for downloading Douyin (TikTok) videos, extracting audio, and transcribing content. Use when the user shares a Douyin share link and wants to get the video content, transcript, or summary.
---

# 抖音视频下载与处理

When user sends a Douyin (抖音) share link, follow this complete workflow:

## Step 1: Get download link

Use the `get_douyin_download_link` MCP tool (auto-injected when `douyinMcpEndpoint` is configured) to get the no-watermark video download URL, title, and description.

## Step 2: Download the video

Use `download_file` to save the video to a local file (e.g., `douyin_video.mp4`).

## Step 3: Convert video to audio

Use `video_to_audio` tool to extract audio from the downloaded video:
```
video_to_audio({ videoPath: "douyin_video.mp4", format: "mp3" })
```
This requires ffmpeg installed on the system. The tool outputs an audio file (e.g., `douyin_video.mp3`).

## Step 4: Transcribe the audio

Use `read_file` on the generated audio file to get the transcription text. The model will process the audio content if it supports audio input.

Alternatively, if the model doesn't support audio input, use `run_shell_command` to call an external transcription service or tool.

## Step 5: Present results

Combine the video metadata (title, description) with the transcribed text to present a complete summary to the user.

## Complete workflow example

```
1. get_douyin_download_link({ url: "https://v.douyin.com/xxx" })
   → Returns: { title, description, downloadUrl }

2. download_file({ url: downloadUrl, destPath: "douyin_video.mp4" })
   → Downloads video file

3. video_to_audio({ videoPath: "douyin_video.mp4", format: "mp3" })
   → Produces douyin_video.mp3

4. read_file({ file_path: "douyin_video.mp3" })
   → Returns audio transcription (if model supports audio)
   
5. Present: title + description + transcription to user
```

## Important Notes

- `video_to_audio` requires ffmpeg to be installed
- If ffmpeg is not available, guide user to install it
- If the model doesn't support audio input, suggest alternative transcription approaches
- Always clean up temporary files after processing
