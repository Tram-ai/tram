/**
 * SiliconFlow Multimodal Fallback Service
 *
 * Provides image understanding (OCR / summarization) and audio transcription
 * capabilities via the SiliconFlow API.
 *
 * Models:
 * - Image understanding: Qwen/Qwen3.5-4B (chat completions with vision)
 *   Supports two modes:
 *     - "extract":   pure OCR — extract all text verbatim, preserving layout.
 *     - "summarize": describe the image content (objects, scene, charts, UI,
 *                    text gist, intent) — not just literal text extraction.
 * - Audio transcription: FunAudioLLM/SenseVoiceSmall (audio transcriptions)
 */

import { createDebugLogger } from "../utils/debugLogger.js";

const debugLogger = createDebugLogger();

const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
const IMAGE_MODEL = "Qwen/Qwen3.5-4B";
const ASR_MODEL = "FunAudioLLM/SenseVoiceSmall";

/**
 * Mode for image understanding:
 * - "extract":   pure OCR (text extraction only)
 * - "summarize": natural-language summary / description of the image
 */
export type ImageUnderstandMode = "extract" | "summarize";

const EXTRACT_PROMPT =
  "Please extract and output all text content from this image verbatim. " +
  "Preserve the original layout, line breaks, ordering, and any tabular " +
  "structure as faithfully as possible. Do not add commentary, do not " +
  "translate, do not summarize. If the image contains no readable text, " +
  "reply with the single line: [no text in image].";

const SUMMARIZE_PROMPT =
  "Please describe and summarize the content of this image in clear, " +
  "structured natural language. Cover the following when applicable: " +
  "1) overall scene / type of image (photo, screenshot, diagram, chart, UI, " +
  "document, etc.); 2) key objects, people, or UI elements and their " +
  "spatial relationships; 3) any visible text rendered as a short gist " +
  "rather than verbatim transcription; 4) charts/tables: the data trend or " +
  "what it conveys; 5) likely intent or context of the image. Be concise " +
  "but complete. Respond in the same language as the image content when " +
  "possible, otherwise in English.";

/**
 * Run image understanding (OCR or summarization) on a base64-encoded image
 * using a vision-capable chat-completions model via SiliconFlow.
 *
 * @param apiKey SiliconFlow API key
 * @param base64Data Base64-encoded image data
 * @param mimeType Image MIME type (e.g., 'image/png')
 * @param fileName Display name for the image
 * @param options Optional: mode ("extract" | "summarize", default "summarize")
 *                and an optional custom prompt that overrides the built-in one.
 * @returns Result text (already wrapped with a header line identifying the
 *          source file and mode).
 */
export async function understandImage(
  apiKey: string,
  base64Data: string,
  mimeType: string,
  fileName: string,
  options: { mode?: ImageUnderstandMode; prompt?: string } = {},
): Promise<string> {
  const mode: ImageUnderstandMode = options.mode ?? "summarize";
  const promptText =
    options.prompt && options.prompt.trim().length > 0
      ? options.prompt
      : mode === "extract"
        ? EXTRACT_PROMPT
        : SUMMARIZE_PROMPT;

  const url = `${SILICONFLOW_BASE_URL}/chat/completions`;

  const body = {
    model: IMAGE_MODEL,
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
            text: promptText,
          },
        ],
      },
    ],
    max_tokens: 4096,
  };

  const label = mode === "extract" ? "OCR result" : "Image summary";

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
        `SiliconFlow image-understand API error (mode=${mode}): ${response.status} ${errorText}`,
      );
      return `[Image understanding failed: API returned ${response.status}]`;
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;
    return content
      ? `[${label} for ${fileName}]:\n${content}`
      : `[${label} returned empty result for ${fileName}]`;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    debugLogger.error(
      `SiliconFlow image-understand request failed (mode=${mode}): ${message}`,
    );
    return `[Image understanding failed: ${message}]`;
  }
}

/**
 * Backward-compatible OCR-only entry point.
 *
 * @deprecated Prefer `understandImage(...)` which supports both `extract`
 *             and `summarize` modes. This wrapper calls the new function
 *             with mode="extract" to preserve legacy behaviour.
 */
export async function extractImageText(
  apiKey: string,
  base64Data: string,
  mimeType: string,
  fileName: string,
): Promise<string> {
  return understandImage(apiKey, base64Data, mimeType, fileName, {
    mode: "extract",
  });
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
