/**
 * SiliconFlow Multimodal Fallback Service
 *
 * Provides OCR (image text extraction) and audio transcription capabilities
 * for models that don't natively support image/audio inputs.
 *
 * Uses SiliconFlow API:
 * - Image OCR: deepseek-ai/DeepSeek-OCR (chat completions with vision)
 * - Audio transcription: FunAudioLLM/SenseVoiceSmall (audio transcriptions)
 */

import { createDebugLogger } from "../utils/debugLogger.js";

const debugLogger = createDebugLogger();

const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const OCR_MODEL = "deepseek-ai/DeepSeek-OCR";
const ASR_MODEL = "FunAudioLLM/SenseVoiceSmall";

/**
 * Extract text from an image using DeepSeek-OCR via SiliconFlow API.
 *
 * @param apiKey SiliconFlow API key
 * @param base64Data Base64-encoded image data
 * @param mimeType Image MIME type (e.g., 'image/png')
 * @param fileName Display name for the image
 * @returns Extracted text content
 */
export async function extractImageText(
  apiKey: string,
  base64Data: string,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const url = `${SILICONFLOW_BASE_URL}/chat/completions`;

  const body = {
    model: OCR_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`,
            },
          },
          {
            type: "text",
            text: "Please extract and output all text content from this image. Preserve the original layout and formatting as much as possible. If there is no text, describe the image content briefly.",
          },
        ],
      },
    ],
    max_tokens: 4096,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLogger.error(
        `SiliconFlow OCR API error: ${response.status} ${errorText}`,
      );
      return `[OCR failed: API returned ${response.status}]`;
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;
    return content
      ? `[OCR result for ${fileName}]:\n${content}`
      : `[OCR returned empty result for ${fileName}]`;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    debugLogger.error(`SiliconFlow OCR request failed: ${message}`);
    return `[OCR failed: ${message}]`;
  }
}

/**
 * Transcribe audio using SenseVoiceSmall via SiliconFlow API.
 *
 * @param apiKey SiliconFlow API key
 * @param audioBuffer Raw audio file buffer
 * @param fileName Display name for the audio file
 * @returns Transcribed text content
 */
export async function transcribeAudio(
  apiKey: string,
  audioBuffer: Buffer,
  fileName: string,
): Promise<string> {
  const url = `${SILICONFLOW_BASE_URL}/audio/transcriptions`;

  try {
    // Build multipart form data manually
    const boundary = `----FormBoundary${Date.now()}`;
    const parts: Buffer[] = [];

    // Model field
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${ASR_MODEL}\r\n`,
      ),
    );

    // Audio file field
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
      ),
    );
    parts.push(audioBuffer);
    parts.push(Buffer.from("\r\n"));

    // End boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLogger.error(
        `SiliconFlow ASR API error: ${response.status} ${errorText}`,
      );
      return `[Audio transcription failed: API returned ${response.status}]`;
    }

    const result = (await response.json()) as { text?: string };
    return result.text
      ? `[Audio transcription for ${fileName}]:\n${result.text}`
      : `[Audio transcription returned empty result for ${fileName}]`;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    debugLogger.error(`SiliconFlow ASR request failed: ${message}`);
    return `[Audio transcription failed: ${message}]`;
  }
}
