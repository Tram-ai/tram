import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { ToolNames, ToolDisplayNames } from './tool-names.js';
import type { Config } from '../config/config.js';

const TRAM_BIN_DIR = path.join(os.homedir(), '.tram', 'bin');

interface VideoToAudioParams {
  videoPath: string;
  outputPath?: string;
  format?: string;
}

export class VideoToAudioToolInvocation extends BaseToolInvocation<
  VideoToAudioParams,
  ToolResult
> {
  public readonly kind = Kind.Execute;
  public readonly name = ToolNames.VIDEO_TO_AUDIO;

  constructor(
    private readonly config: Config,
    params: VideoToAudioParams,
  ) {
    super(params);
  }

  override getDescription(): string {
    return `Convert video to audio: ${this.params.videoPath}`;
  }

  override async execute(): Promise<ToolResult> {
    const { videoPath, format = 'mp3' } = this.params;

    // Resolve the video path
    const resolvedVideoPath = path.isAbsolute(videoPath)
      ? videoPath
      : path.resolve(this.config.getTargetDir(), videoPath);

    if (!fs.existsSync(resolvedVideoPath)) {
      return {
        llmContent: `Error: Video file not found: ${resolvedVideoPath}`,
        returnDisplay: `Video file not found: ${resolvedVideoPath}`,
      };
    }

    // Determine output path
    const ext = `.${format}`;
    const outputPath = this.params.outputPath
      ? path.isAbsolute(this.params.outputPath)
        ? this.params.outputPath
        : path.resolve(this.config.getTargetDir(), this.params.outputPath)
      : resolvedVideoPath.replace(path.extname(resolvedVideoPath), ext);

    // Try to find ffmpeg
    const ffmpegPath = await findFfmpeg();
    if (!ffmpegPath) {
      return {
        llmContent:
          'Error: ffmpeg is not installed or not found in PATH or ~/.tram/bin/.\n' +
          'Please install ffmpeg to ~/.tram/bin/ (preferred) or system PATH:\n' +
          '- Windows: download from https://www.gyan.dev/ffmpeg/builds/ and extract ffmpeg.exe to ~/.tram/bin/\n' +
          '- macOS: brew install ffmpeg\n' +
          '- Linux: sudo apt install ffmpeg\n' +
          'Tip: Installing to ~/.tram/bin/ keeps it isolated and easy to clean up.',
        returnDisplay: 'ffmpeg not found',
      };
    }

    try {
      await runFfmpeg(ffmpegPath, resolvedVideoPath, outputPath, format);
      const stats = fs.statSync(outputPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      return {
        llmContent: `Successfully converted video to audio.\nInput: ${resolvedVideoPath}\nOutput: ${outputPath}\nFormat: ${format}\nSize: ${sizeMB}MB`,
        returnDisplay: `Converted to ${format}: ${outputPath} (${sizeMB}MB)`,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error converting video to audio: ${message}`,
        returnDisplay: `Conversion failed: ${message}`,
      };
    }
  }
}

/**
 * Try to find ffmpeg in ~/.tram/bin/ first, then system PATH.
 */
async function findFfmpeg(): Promise<string | null> {
  // Check ~/.tram/bin/ first (preferred location)
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
        // exists but not executable, try next
      }
    }
  }

  // Fallback to system PATH
  const systemCandidates =
    process.platform === 'win32'
      ? ['ffmpeg.exe', 'ffmpeg']
      : ['ffmpeg'];

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
      // not found, try next
    }
  }
  return null;
}

/**
 * Run ffmpeg to extract audio from video.
 */
function runFfmpeg(
  ffmpegPath: string,
  inputPath: string,
  outputPath: string,
  format: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i',
      inputPath,
      '-vn', // no video
      '-acodec',
      format === 'mp3' ? 'libmp3lame' : format === 'wav' ? 'pcm_s16le' : 'aac',
      '-y', // overwrite
      outputPath,
    ];
    execFile(ffmpegPath, args, { timeout: 300_000 }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`ffmpeg failed: ${stderr || error.message}`));
      } else {
        resolve();
      }
    });
  });
}

export class VideoToAudioTool extends BaseDeclarativeTool<
  VideoToAudioParams,
  ToolResult
> {
  public override readonly name = ToolNames.VIDEO_TO_AUDIO;
  public override readonly kind = Kind.Execute;
  public static readonly Name = ToolNames.VIDEO_TO_AUDIO;
  public override readonly displayName = ToolDisplayNames.VIDEO_TO_AUDIO;

  constructor(private readonly config: Config) {
    super(
      ToolNames.VIDEO_TO_AUDIO,
      ToolDisplayNames.VIDEO_TO_AUDIO,
      'Convert a video file to an audio file using ffmpeg. Useful for extracting audio from downloaded videos (e.g., Douyin/TikTok) so audio can be transcribed with read_file.',
      Kind.Execute,
      {
        type: 'OBJECT',
        properties: {
          videoPath: {
            type: 'STRING',
            description:
              'Path to the video file (absolute or relative to workspace)',
          },
          outputPath: {
            type: 'STRING',
            description:
              'Optional output path for the audio file. Defaults to same directory with changed extension.',
          },
          format: {
            type: 'STRING',
            description:
              'Output audio format: mp3, wav, or aac. Defaults to mp3.',
          },
        },
        required: ['videoPath'],
      },
    );
  }

  protected override createInvocation(
    params: VideoToAudioParams,
  ): ToolInvocation<VideoToAudioParams, ToolResult> {
    return new VideoToAudioToolInvocation(this.config, params);
  }
}
