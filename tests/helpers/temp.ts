import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export interface TempDir {
  /** Absolute path to the temp directory. */
  readonly path: string;
  /** Removes the temp directory and all its contents. Idempotent. */
  cleanup: () => Promise<void>;
}

/**
 * Creates a unique temp directory under os.tmpdir() with a recognizable prefix.
 * Returns the path and a cleanup function. Cleanup is idempotent.
 */
export async function createTempDir(): Promise<TempDir> {
  const prefix = path.join(os.tmpdir(), 'webtoon-test-');
  const dir = await fs.mkdtemp(prefix);
  return {
    path: dir,
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
