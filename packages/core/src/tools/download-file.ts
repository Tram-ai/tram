import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { ToolNames, ToolDisplayNames } from './tool-names.js';
import type { Config } from '../config/config.js';

interface DownloadFileParams {
  url: string;
  destPath?: string;
  threads?: number;
}

export class DownloadFileToolInvocation extends BaseToolInvocation<
  DownloadFileParams,
  ToolResult
> {
  public readonly kind = Kind.Fetch;
  public readonly name = ToolNames.DOWNLOAD_FILE;

  constructor(
    params: DownloadFileParams
  ) {
    super(params);
  }

  override getDescription(): string {
    return `Download file ${this.params.url} to ${this.params.destPath || '.tram/downloads/'}`;
  }

  private resolveDestPath(url: string, destPath?: string): string {
    if (destPath) return destPath;

    // Default: store in .tram/downloads/ with filename from URL
    const tramDownloadsDir = path.join(process.cwd(), '.tram', 'downloads');
    if (!fs.existsSync(tramDownloadsDir)) {
      fs.mkdirSync(tramDownloadsDir, { recursive: true });
    }

    // Extract filename from URL
    const urlObj = new URL(url);
    let fileName = path.basename(urlObj.pathname);
    if (!fileName || fileName === '/' || fileName === '') {
      fileName = `download-${Date.now()}`;
    }

    return path.join(tramDownloadsDir, fileName);
  }

  override async execute(): Promise<ToolResult> {
    const { url, threads = 4 } = this.params;
    const destPath = this.resolveDestPath(url, this.params.destPath);
    const client = url.startsWith('https') ? https : http;

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    try {
      const headInfo = await new Promise<{
        contentLength: number;
        contentType: string;
        finalUrl: string;
        statusCode: number;
        headers: Record<string, string>;
      }>((resolve, reject) => {
        const collectHeaders = (r: http.IncomingMessage, resolvedUrl: string) => ({
          contentLength: parseInt(r.headers['content-length'] || '0', 10),
          contentType: r.headers['content-type'] || 'unknown',
          finalUrl: resolvedUrl,
          statusCode: r.statusCode || 0,
          headers: {
            'content-type': r.headers['content-type'] || '',
            'content-length': r.headers['content-length'] || '',
            'content-disposition': r.headers['content-disposition'] || '',
            'last-modified': r.headers['last-modified'] || '',
          },
        });

        const doHead = (currentUrl: string, redirectCount: number = 0) => {
          if (redirectCount > 10) {
            reject(new Error('Too many redirects (max 10)'));
            return;
          }
          const c = currentUrl.startsWith('https') ? https : http;
          c.request(currentUrl, { method: 'HEAD' }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              doHead(res.headers.location, redirectCount + 1);
              return;
            }
            resolve(collectHeaders(res, currentUrl));
          }).on('error', reject).end();
        };
        doHead(url);
      });

      const headerLines = [
        `HTTP ${headInfo.statusCode}`,
        `Content-Type: ${headInfo.contentType}`,
        `Content-Length: ${headInfo.contentLength} bytes`,
        headInfo.finalUrl !== url ? `Redirected: ${url} → ${headInfo.finalUrl}` : null,
        headInfo.headers['content-disposition'] ? `Content-Disposition: ${headInfo.headers['content-disposition']}` : null,
        headInfo.headers['last-modified'] ? `Last-Modified: ${headInfo.headers['last-modified']}` : null,
      ].filter(Boolean).join('\n');

      if (!headInfo.contentLength || threads <= 1) {
        await this.downloadSingle(url, destPath, client);
        return {
          llmContent: `Downloaded ${url} to ${destPath}\n${headerLines}`,
          returnDisplay: `Downloaded (single thread) to ${destPath}\n${headerLines}`,
        };
      }

      await this.downloadConcurrent(url, destPath, headInfo.contentLength, threads, client);

      return {
        llmContent: `Downloaded ${url} to ${destPath}\n${headerLines}`,
        returnDisplay: `Downloaded with ${threads} threads to ${destPath} (${headInfo.contentLength} bytes)\n${headerLines}`,
      };
    } catch (e: any) {
      return {
        llmContent: `Error downloading file: ${e.message}`,
        returnDisplay: `Failed to download file: ${e.message}`,
      };
    }
  }

  private downloadSingle(url: string, destPath: string, client: typeof http | typeof https): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const doGet = (currentUrl: string, redirectCount: number = 0) => {
        if (redirectCount > 10) {
          reject(new Error('Too many redirects (max 10)'));
          return;
        }
        const c = currentUrl.startsWith('https') ? https : http;
        c.get(currentUrl, (response) => {
          if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            doGet(response.headers.location, redirectCount + 1);
            return;
          }
          response.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (err) => { fs.unlink(destPath, () => reject(err)); });
      };
      doGet(url);
    });
  }

  private async downloadConcurrent(url: string, destPath: string, totalBytes: number, threads: number, client: typeof http | typeof https): Promise<void> {
    const chunkSize = Math.ceil(totalBytes / threads);
    const promises: Promise<void>[] = [];

    // Create sparse file
    const fd = fs.openSync(destPath, 'w');
    fs.closeSync(fd);

    for (let i = 0; i < threads; i++) {
        const start = i * chunkSize;
        const end = i === threads - 1 ? totalBytes - 1 : (i + 1) * chunkSize - 1;
        
        promises.push(new Promise((resolve, reject) => {
            this.followRedirects(url, client).then(finalUrl => {
                  const reqClient = finalUrl.startsWith('https') ? https : http;
                  reqClient.get(finalUrl, { headers: { Range: `bytes=${start}-${end}` } }, (res) => {
                      if (res.statusCode !== 206 && res.statusCode !== 200) {
                          reject(new Error(`Unexpected status code ${res.statusCode} for chunk ${i}`));
                          return;
                      }
                      
                      const stream = fs.createWriteStream(destPath, { flags: 'r+', start });
                      res.pipe(stream);
                      stream.on('finish', resolve);
                      stream.on('error', reject);
                  }).on('error', reject);
            }).catch(reject);
        }));
    }

    await Promise.all(promises);
  }

  private followRedirects(url: string, defaultClient: typeof http | typeof https, maxRedirects: number = 10): Promise<string> {
      return new Promise((resolve, reject) => {
           const follow = (currentUrl: string, count: number) => {
               if (count > maxRedirects) {
                   reject(new Error('Too many redirects (max 10)'));
                   return;
               }
               const c = currentUrl.startsWith('https') ? https : http;
               c.request(currentUrl, { method: 'HEAD' }, (res) => {
                   if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                       follow(res.headers.location, count + 1);
                   } else {
                       resolve(currentUrl);
                   }
               }).on('error', reject).end();
           };
           follow(url, 0);
      });
  }
}

export class DownloadFileTool extends BaseDeclarativeTool<
  DownloadFileParams,
  ToolResult
> {
  public override readonly name = ToolNames.DOWNLOAD_FILE;
  public override readonly kind = Kind.Fetch;
  public static readonly Name = ToolNames.DOWNLOAD_FILE;
  public override readonly displayName = ToolDisplayNames.DOWNLOAD_FILE;

  constructor(config: Config) {
    super(
      ToolNames.DOWNLOAD_FILE,
      ToolDisplayNames.DOWNLOAD_FILE,
      'Download a file from a URL, supports concurrent/multi-threaded downloads. If destPath is omitted, files are saved to .tram/downloads/ in the working directory. Response includes HTTP headers (Content-Type, Content-Length, redirects) for the model to understand what was downloaded.',
      Kind.Fetch,
      {
        type: 'OBJECT',
        properties: {
          url: { type: 'STRING', description: 'URL to download from' },
          destPath: { type: 'STRING', description: 'Destination path. If omitted, saves to .tram/downloads/ with filename from URL.' },
          threads: { type: 'INTEGER', description: 'Number of download threads (default 4)' },
        },
        required: ['url'],
      },
    );
  }

  protected override createInvocation(params: DownloadFileParams): ToolInvocation<DownloadFileParams, ToolResult> {
    return new DownloadFileToolInvocation(params);
  }
}
