import { Buffer } from 'node:buffer';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, StorageError } from '../../../src/errors.js';
import { LocalStorageService } from '../../../src/storage/local.js';
import { createTempDir, type TempDir } from '../../helpers/temp.js';

// Auto-spy on every export of node:fs/promises so individual tests can
// override specific methods (e.g., mockRejectedValueOnce). Unmocked calls
// pass through to the real implementation.
vi.mock('node:fs/promises', { spy: true });

describe('LocalStorageService', () => {
  let tmp: TempDir;
  let storage: LocalStorageService;

  beforeEach(async () => {
    tmp = await createTempDir();
    storage = new LocalStorageService(tmp.path);
  });

  afterEach(async () => {
    await tmp.cleanup();
  });

  describe('normal cases', () => {
    it('write then read round-trips bytes', async () => {
      const buf = Buffer.from('hello world', 'utf8');
      await storage.write('a.png', buf);
      const got = await storage.read('a.png');
      expect(got.equals(buf)).toBe(true);
    });

    it('write returns { key, url } where url is a valid file:// URL', async () => {
      const result = await storage.write('a.png', Buffer.from('x'));
      expect(result.key).toBe('a.png');
      expect(result.url.startsWith('file://')).toBe(true);
      expect(() => new URL(result.url)).not.toThrow();
    });

    it('exists returns true after write', async () => {
      await storage.write('x', Buffer.from('y'));
      expect(await storage.exists('x')).toBe(true);
    });

    it('exists returns false for never-written key', async () => {
      expect(await storage.exists('never.png')).toBe(false);
    });

    it('delete removes the file', async () => {
      await storage.write('x', Buffer.from('y'));
      await storage.delete('x');
      expect(await storage.exists('x')).toBe(false);
    });

    it('url returns valid file:// URL', async () => {
      const u = await storage.url('x.png');
      expect(u).toMatch(/^file:\/\//);
      expect(() => new URL(u)).not.toThrow();
    });
  });

  describe('special cases', () => {
    it('nested key creates parent dirs', async () => {
      await storage.write('a/b/c/file.png', Buffer.from('y'));
      const stat = await fs.stat(path.join(tmp.path, 'a', 'b', 'c', 'file.png'));
      expect(stat.isFile()).toBe(true);
    });

    it('Korean characters in key round-trip', async () => {
      const buf = Buffer.from('한글 데이터');
      await storage.write('한글.png', buf);
      expect((await storage.read('한글.png')).equals(buf)).toBe(true);
    });

    it('spaces in key round-trip and url is URL-encoded', async () => {
      const buf = Buffer.from('x');
      const result = await storage.write('my image.png', buf);
      expect((await storage.read('my image.png')).equals(buf)).toBe(true);
      expect(result.url).toContain('my%20image.png');
    });

    it('overwrite same key — second write wins', async () => {
      await storage.write('x', Buffer.from('first'));
      await storage.write('x', Buffer.from('second'));
      expect((await storage.read('x')).toString()).toBe('second');
    });

    it('empty buffer round-trips', async () => {
      const empty = Buffer.alloc(0);
      await storage.write('e', empty);
      const got = await storage.read('e');
      expect(got.length).toBe(0);
    });

    it('delete is idempotent on missing key', async () => {
      await expect(storage.delete('never-existed')).resolves.toBeUndefined();
    });

    it('url for non-existent key still returns URL (no existence check)', async () => {
      const u = await storage.url('does-not-exist.png');
      expect(u).toMatch(/^file:\/\//);
    });

    it('two instances with different rootPaths are isolated', async () => {
      const tmp2 = await createTempDir();
      try {
        const s2 = new LocalStorageService(tmp2.path);
        await storage.write('x', Buffer.from('one'));
        expect(await s2.exists('x')).toBe(false);
      } finally {
        await tmp2.cleanup();
      }
    });

    it('write to deep new directory tree (5 levels) succeeds', async () => {
      await storage.write('a/b/c/d/e/file.png', Buffer.from('y'));
      expect(await storage.exists('a/b/c/d/e/file.png')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('read for non-existent key throws NotFoundError', async () => {
      await expect(storage.read('missing')).rejects.toBeInstanceOf(NotFoundError);
      try {
        await storage.read('missing');
      } catch (err) {
        expect((err as NotFoundError).code).toBe('NOT_FOUND');
        expect((err as NotFoundError).context).toMatchObject({ key: 'missing' });
      }
    });

    it('path traversal "../escape.png" rejected with INVALID_KEY', async () => {
      try {
        await storage.write('../escape.png', Buffer.from('x'));
        expect.fail('expected StorageError');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).code).toBe('INVALID_KEY');
      }
    });

    it('absolute path as key rejected with INVALID_KEY', async () => {
      const abs = path.resolve('/etc/passwd');
      try {
        await storage.write(abs, Buffer.from('x'));
        expect.fail('expected StorageError');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).code).toBe('INVALID_KEY');
      }
    });

    it('embedded ".." segment rejected even if resolved path stays inside', async () => {
      try {
        await storage.write('a/../b.png', Buffer.from('x'));
        expect.fail('expected StorageError');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).code).toBe('INVALID_KEY');
      }
    });

    it('binary content (PNG-like bytes) round-trips byte-for-byte', async () => {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00, 0xab]);
      await storage.write('img.png', png);
      const got = await storage.read('img.png');
      expect(got.equals(png)).toBe(true);
    });

    it('large file (5 MB) round-trips', async () => {
      const big = Buffer.alloc(5 * 1024 * 1024, 0xab);
      await storage.write('big.bin', big);
      const got = await storage.read('big.bin');
      expect(got.length).toBe(big.length);
      expect(got[0]).toBe(0xab);
      expect(got[got.length - 1]).toBe(0xab);
    });

    it('read on a key that is a directory throws StorageError (not NotFoundError)', async () => {
      await fs.mkdir(path.join(tmp.path, 'imadir'));
      try {
        await storage.read('imadir');
        expect.fail('expected StorageError');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect(err).not.toBeInstanceOf(NotFoundError);
        expect((err as StorageError).code).toBe('STORAGE_READ_FAILED');
      }
    });

    it('write failure (mocked EACCES) throws StorageError with cause', async () => {
      const fakeErr = Object.assign(new Error('permission denied'), { code: 'EACCES' });
      vi.mocked(fs.writeFile).mockRejectedValueOnce(fakeErr);
      try {
        await storage.write('x', Buffer.from('y'));
        expect.fail('expected StorageError');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).code).toBe('STORAGE_WRITE_FAILED');
        expect((err as StorageError).cause).toBe(fakeErr);
      }
    });

    it('disk full simulation (mocked ENOSPC) throws StorageError', async () => {
      const fakeErr = Object.assign(new Error('no space'), { code: 'ENOSPC' });
      vi.mocked(fs.writeFile).mockRejectedValueOnce(fakeErr);
      try {
        await storage.write('x', Buffer.from('y'));
        expect.fail('expected StorageError');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).cause).toBe(fakeErr);
      }
    });

    it('delete failure with non-ENOENT error throws StorageError', async () => {
      const fakeErr = Object.assign(new Error('permission denied'), { code: 'EACCES' });
      vi.mocked(fs.unlink).mockRejectedValueOnce(fakeErr);
      try {
        await storage.delete('whatever');
        expect.fail('expected StorageError');
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).code).toBe('STORAGE_DELETE_FAILED');
        expect((err as StorageError).cause).toBe(fakeErr);
      }
    });

    it('url returns parseable URL on current platform (Windows or POSIX)', async () => {
      const u = await storage.url('a/b.png');
      const parsed = new URL(u);
      expect(parsed.protocol).toBe('file:');
      // Path should end with the key (URL-encoded)
      expect(decodeURIComponent(parsed.pathname).endsWith('/a/b.png')).toBe(true);
    });

    it('constructor with non-existent rootPath does not throw at construction', async () => {
      const fake = path.join(tmp.path, 'does', 'not', 'exist', 'yet');
      const s = new LocalStorageService(fake);
      // First write creates the directory tree
      await s.write('hello.txt', Buffer.from('hi'));
      expect(await s.exists('hello.txt')).toBe(true);
    });

    it('concurrent writes to different keys both succeed', async () => {
      await Promise.all([
        storage.write('a.png', Buffer.from('A')),
        storage.write('b.png', Buffer.from('B')),
      ]);
      expect((await storage.read('a.png')).toString()).toBe('A');
      expect((await storage.read('b.png')).toString()).toBe('B');
    });

    it('concurrent writes to same key — last write wins (some valid value)', async () => {
      await Promise.all([
        storage.write('x', Buffer.from('one')),
        storage.write('x', Buffer.from('two')),
      ]);
      const got = (await storage.read('x')).toString();
      expect(['one', 'two']).toContain(got);
    });
  });
});
