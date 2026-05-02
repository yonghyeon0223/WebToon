import type { Buffer } from 'node:buffer';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NotFoundError, StorageError } from '../errors.js';

export interface StorageWriteResult {
  /** The key as provided by the caller (passage-relative). */
  key: string;
  /** Stable URL pointing at the stored object. For local FS, a file:// URL. */
  url: string;
}

export interface StorageWriteOptions {
  /** MIME type. Currently unused for local FS; kept for parity with future R2/GCS impls. */
  contentType?: string;
}

export interface StorageUrlOptions {
  /** Whether to return a signed URL. Ignored for local FS. */
  signed?: boolean;
  /** Signed URL expiration in seconds. Ignored for local FS. */
  expiresIn?: number;
}

/**
 * Local filesystem storage. All keys are interpreted relative to a root path.
 *
 * The class uses constructor injection for the root path so each instance is
 * isolated — tests pass a temp directory; production passes
 * `config.WORKSPACE_ROOT`.
 *
 * Keys are validated to prevent path traversal: absolute paths and any segment
 * equal to `..` are rejected. This is defense-in-depth — even though keys come
 * from prompt files we author, a typo or future external input source could
 * otherwise escape `rootPath`.
 */
export class LocalStorageService {
  private readonly rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
  }

  async exists(key: string): Promise<boolean> {
    const absolute = this.resolveKey(key);
    try {
      await fs.access(absolute);
      return true;
    } catch {
      return false;
    }
  }

  async read(key: string): Promise<Buffer> {
    const absolute = this.resolveKey(key);
    try {
      return await fs.readFile(absolute);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new NotFoundError(`Key not found: ${key}`, {
          code: 'NOT_FOUND',
          cause: err,
          context: { key },
        });
      }
      throw new StorageError(`Failed to read key: ${key}`, {
        code: 'STORAGE_READ_FAILED',
        cause: err,
        context: { key },
      });
    }
  }

  async write(
    key: string,
    data: Buffer,
    _options?: StorageWriteOptions,
  ): Promise<StorageWriteResult> {
    const absolute = this.resolveKey(key);
    try {
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, data);
      return { key, url: pathToFileURL(absolute).toString() };
    } catch (err) {
      throw new StorageError(`Failed to write key: ${key}`, {
        code: 'STORAGE_WRITE_FAILED',
        cause: err,
        context: { key },
      });
    }
  }

  async delete(key: string): Promise<void> {
    const absolute = this.resolveKey(key);
    try {
      await fs.unlink(absolute);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return; // idempotent
      }
      throw new StorageError(`Failed to delete key: ${key}`, {
        code: 'STORAGE_DELETE_FAILED',
        cause: err,
        context: { key },
      });
    }
  }

  url(key: string, _options?: StorageUrlOptions): Promise<string> {
    return Promise.resolve(pathToFileURL(this.resolveKey(key)).toString());
  }

  /**
   * Validate the key and resolve to an absolute path under rootPath.
   * Throws StorageError(INVALID_KEY) for absolute keys or `..` traversal.
   */
  private resolveKey(key: string): string {
    if (path.isAbsolute(key)) {
      throw new StorageError('Absolute keys are not allowed', {
        code: 'INVALID_KEY',
        context: { key, rootPath: this.rootPath, reason: 'absolute' },
      });
    }
    const segments = key.split(/[/\\]/);
    if (segments.includes('..')) {
      throw new StorageError("Keys may not contain '..' segments", {
        code: 'INVALID_KEY',
        context: { key, rootPath: this.rootPath, reason: 'traversal' },
      });
    }
    const absolute = path.resolve(this.rootPath, key);
    // Defense-in-depth: even after rejecting `..` segments, verify the resolved
    // path stays inside rootPath. Catches edge cases on platforms with
    // surprising path normalization (Windows reserved names, UNC prefixes).
    // Practically unreachable given the segment check above — kept as a
    // belt-and-suspenders safety net.
    /* v8 ignore start */
    if (absolute !== this.rootPath && !absolute.startsWith(this.rootPath + path.sep)) {
      throw new StorageError('Key resolves outside rootPath', {
        code: 'INVALID_KEY',
        context: { key, rootPath: this.rootPath, resolved: absolute },
      });
    }
    /* v8 ignore stop */
    return absolute;
  }
}
