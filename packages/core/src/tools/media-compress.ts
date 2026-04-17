/**
 * @license
 * Copyright 2026 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { ToolNames, ToolDisplayNames } from './tool-names.js';
import type { Config } from '../config/config.js';

const TRAM_BIN_DIR = path.join(os.homedir(), '.tram', 'bin');

interface MediaCompressParams {
  inputPath: string;
  outputPath?: string;
  mediaType?: 'auto' | 'image' | 'video' | 'audio';
  quality?: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Try to find ffmpeg in ~/.tram/bin/ first, then system PATH.
 */
async function findFfmpeg(): Promise<string | null> {
  const tramBinCandidates =
    process.platform === 'win32'
      ? [path.join(TRAM_BIN_DIR, 'ffmpeg.exe')]
      : [path.join(TRAM_BIN_DIR, 'ffmpeg')];

  for (const candidate of tramBinCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        await new Promise<void>((resolve, reject) => {
          execFile(candidate, ['-version'], (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
        return candidate;
      } catch {
        // exists but not executable
      }
    }
  }

  const systemCandidates =
    process.platform === 'win32' ? ['ffmpeg.exe', 'ffmpeg'] : ['ffmpeg'];

  for (const cmd of systemCandidates) {
    try {
      await new Promise<void>((resolve, reject) => {
        execFile(cmd, ['-version'], (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      return cmd;
    } catch {
      // not found
    }
  }
  return null;
}

function detectMediaType(filePath: string): 'image' | 'video' | 'audio' {
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp', '.gif'];
  const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts'];
  const audioExts = ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a', '.wma', '.opus'];

  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  return 'video'; // default to video
}

export class MediaCompressInvocation extends BaseToolInvocation<
  MediaCompressParams,
  ToolResult
> {
  public readonly kind = Kind.Execute;
  public readonly name = ToolNames.MEDIA_COMPRESS;

  constructor(
    private readonly config: Config,
    params: MediaCompressParams,
  ) {
    super(params);
  }

  override getDescription(): string {
    return `Compress media: ${this.params.inputPath}`;
  }

  override async execute(): Promise<ToolResult> {
    const { inputPath, quality = 'medium' } = this.params;

    const resolvedInput = path.isAbsolute(inputPath)
      ? inputPath
      : path.resolve(this.config.getTargetDir(), inputPath);

    if (!fs.existsSync(resolvedInput)) {
      return {
        llmContent: `Error: File not found: ${resolvedInput}`,
        returnDisplay: `File not found: ${resolvedInput}`,
      };
    }

    const ffmpegPath = await findFfmpeg();
    if (!ffmpegPath) {
      return {
        llmContent:
          'Error: ffmpeg is not installed or not found in PATH or ~/.tram/bin/.\n' +
          'Please install ffmpeg:\n' +
          '- Windows: download from https://www.gyan.dev/ffmpeg/builds/\n' +
          '- macOS: brew install ffmpeg\n' +
          '- Linux: sudo apt install ffmpeg',
        returnDisplay: 'ffmpeg not found',
      };
    }

    const mediaType = this.params.mediaType === 'auto' || !this.params.mediaType
      ? detectMediaType(resolvedInput)
      : this.params.mediaType;

    const originalSize = fs.statSync(resolvedInput).size;

    // Determine output path
    const ext = path.extname(resolvedInput);
    const baseName = path.basename(resolvedInput, ext);
    const dir = path.dirname(resolvedInput);
    const outputExt = mediaType === 'image' ? '.jpg' : ext;
    const outputPath = this.params.outputPath
      ? path.isAbsolute(this.params.outputPath)
        ? this.params.outputPath
        : path.resolve(this.config.getTargetDir(), this.params.outputPath)
      : path.join(dir, `${baseName}_compressed${outputExt}`);

    try {
      const args = this.buildFfmpegArgs(resolvedInput, outputPath, mediaType, quality);
      await this.runFfmpeg(ffmpegPath, args);

      const newSize = fs.statSync(outputPath).size;
      const ratio = ((1 - newSize / originalSize) * 100).toFixed(1);
      const originalMB = (originalSize / (1024 * 1024)).toFixed(2);
      const newMB = (newSize / (1024 * 1024)).toFixed(2);

      return {
        llmContent: `Compressed ${mediaType} successfully.\nInput: ${resolvedInput} (${originalMB}MB)\nOutput: ${outputPath} (${newMB}MB)\nCompression: ${ratio}% reduction\nQuality: ${quality}`,
        returnDisplay: `Compressed ${mediaType}: ${originalMB}MB → ${newMB}MB (${ratio}% reduction)\nOutput: ${outputPath}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error compressing media: ${message}`,
        returnDisplay: `Compression failed: ${message}`,
      };
    }
  }

  private buildFfmpegArgs(
    input: string,
    output: string,
    mediaType: 'image' | 'video' | 'audio',
    quality: string,
  ): string[] {
    const qualityMap = {
      image: { low: '10', medium: '5', high: '2' },
      video: { low: '35', medium: '28', high: '23' },
      audio: { low: '128k', medium: '192k', high: '320k' },
    };

    const args = ['-i', input, '-y']; // -y to overwrite

    if (mediaType === 'image') {
      // Image compression: convert to JPEG with quality
      const q = qualityMap.image[quality as keyof typeof qualityMap.image] || '5';
      args.push('-q:v', q);

      // Resize if dimensions specified
      if (this.params.maxWidth || this.params.maxHeight) {
        const w = this.params.maxWidth || -1;
        const h = this.params.maxHeight || -1;
        args.push('-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease`);
      }

      args.push(output);
    } else if (mediaType === 'video') {
      // Video compression with H.264
      const crf = qualityMap.video[quality as keyof typeof qualityMap.video] || '28';
      args.push(
        '-c:v', 'libx264',
        '-crf', crf,
        '-preset', quality === 'low' ? 'ultrafast' : quality === 'high' ? 'slow' : 'medium',
        '-c:a', 'aac',
        '-b:a', qualityMap.audio[quality as keyof typeof qualityMap.audio] || '192k',
      );

      if (this.params.maxWidth || this.params.maxHeight) {
        const w = this.params.maxWidth || -2;
        const h = this.params.maxHeight || -2;
        args.push('-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease`);
      }

      args.push(output);
    } else {
      // Audio compression
      const bitrate = qualityMap.audio[quality as keyof typeof qualityMap.audio] || '192k';
      args.push('-c:a', 'libmp3lame', '-b:a', bitrate, output);
    }

    return args;
  }

  private runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(ffmpegPath, args, { timeout: 600_000 }, (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`ffmpeg failed: ${stderr || error.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}

export class MediaCompressTool extends BaseDeclarativeTool<
  MediaCompressParams,
  ToolResult
> {
  public override readonly name = ToolNames.MEDIA_COMPRESS;
  public override readonly kind = Kind.Execute;
  public static readonly Name = ToolNames.MEDIA_COMPRESS;
  public override readonly displayName = ToolDisplayNames.MEDIA_COMPRESS;

  constructor(private readonly config: Config) {
    super(
      ToolNames.MEDIA_COMPRESS,
      ToolDisplayNames.MEDIA_COMPRESS,
      'Compress images, videos, or audio files using ffmpeg. Supports quality levels (low/medium/high) and optional resizing. Auto-detects media type from file extension. Outputs compressed file alongside original.',
      Kind.Execute,
      {
        type: 'OBJECT',
        properties: {
          inputPath: {
            type: 'STRING',
            description: 'Path to the media file to compress (absolute or relative to workspace)',
          },
          outputPath: {
            type: 'STRING',
            description: 'Optional output path. Defaults to {name}_compressed.{ext} in same directory.',
          },
          mediaType: {
            type: 'STRING',
            description: 'Type of media: auto, image, video, or audio. Default is auto (detected from extension).',
          },
          quality: {
            type: 'STRING',
            description: 'Compression quality: low (smallest), medium (balanced), high (best quality). Default is medium.',
          },
          maxWidth: {
            type: 'INTEGER',
            description: 'Maximum width in pixels (optional, for image/video resize).',
          },
          maxHeight: {
            type: 'INTEGER',
            description: 'Maximum height in pixels (optional, for image/video resize).',
          },
        },
        required: ['inputPath'],
      },
    );
  }

  protected override createInvocation(
    params: MediaCompressParams,
  ): ToolInvocation<MediaCompressParams, ToolResult> {
    return new MediaCompressInvocation(this.config, params);
  }
}
