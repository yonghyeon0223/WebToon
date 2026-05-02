import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createTempDir, type TempDir } from './temp.js';

describe('createTempDir', () => {
  let cleanups: TempDir[] = [];

  afterEach(async () => {
    for (const tmp of cleanups) {
      await tmp.cleanup();
    }
    cleanups = [];
  });

  it('returns an absolute path', async () => {
    const tmp = await createTempDir();
    cleanups.push(tmp);
    expect(path.isAbsolute(tmp.path)).toBe(true);
  });

  it('returned path exists on disk and is a directory', async () => {
    const tmp = await createTempDir();
    cleanups.push(tmp);
    const stat = await fs.stat(tmp.path);
    expect(stat.isDirectory()).toBe(true);
  });

  it('returned path is under os.tmpdir()', async () => {
    const tmp = await createTempDir();
    cleanups.push(tmp);
    expect(tmp.path.startsWith(os.tmpdir())).toBe(true);
  });

  it('two calls return distinct paths', async () => {
    const a = await createTempDir();
    const b = await createTempDir();
    cleanups.push(a, b);
    expect(a.path).not.toBe(b.path);
  });

  it('cleanup removes the directory', async () => {
    const tmp = await createTempDir();
    await tmp.cleanup();
    await expect(fs.stat(tmp.path)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('cleanup is idempotent', async () => {
    const tmp = await createTempDir();
    await tmp.cleanup();
    await expect(tmp.cleanup()).resolves.toBeUndefined();
  });

  it('cleanup removes nested contents', async () => {
    const tmp = await createTempDir();
    await fs.mkdir(path.join(tmp.path, 'a', 'b'), { recursive: true });
    await fs.writeFile(path.join(tmp.path, 'a', 'b', 'file.txt'), 'content');
    await tmp.cleanup();
    await expect(fs.stat(tmp.path)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('temp dir name has identifying prefix', async () => {
    const tmp = await createTempDir();
    cleanups.push(tmp);
    expect(path.basename(tmp.path).startsWith('webtoon-test-')).toBe(true);
  });
});
