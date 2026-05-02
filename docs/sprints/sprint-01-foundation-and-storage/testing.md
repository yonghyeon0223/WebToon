# Sprint 01 — Phase 2: Testing

## Overview

This document specifies every test case for Sprint 1 modules **before** implementation begins. Each module is covered by normal, special, and edge cases. Failure modes are explicitly enumerated. The implementation in Phase 3 must produce code that satisfies these tests and only these tests — no untested features, no untested error paths.

Test runner: **Vitest**. Test layout mirrors `src/` — `tests/unit/errors.test.ts`, `tests/unit/config.test.ts`, etc. Storage tests use `tests/helpers/temp.ts` for isolated temp directories.

## Test Strategy

- **Unit tests** for every module in `src/`. Each test exercises one behavior, names it explicitly.
- **No integration tests in Sprint 1** — there is no pipeline, no Gemini, no orchestration yet. Sprint 4 introduces integration tests against a mocked Gemini.
- **No network, no Gemini API, no real I/O outside temp dirs.** Sprint 1 deliverables don't touch external services.
- **Coverage target: 100% statements, 100% branches for `src/`.** Modules are small; full coverage is achievable and prevents drift. Test helpers (`tests/helpers/`) are excluded from coverage requirements (they ARE the test infrastructure).

## What We're Explicitly NOT Testing in Sprint 1

- Real Gemini API calls (Sprint 3)
- Prompt parsing or frontmatter (Sprint 2)
- State file read/write (Sprint 2)
- Pipeline orchestration (Sprint 4)
- CLI commands (Sprint 5)
- Cross-platform behavior beyond what CI exercises (Linux on CI, Windows on user's dev machine — both should work but only `file://` URL formatting is platform-sensitive in this sprint)

---

## Test Cases by Module

### `src/errors.ts`

#### Normal Cases
1. **Construct `WebToonError` with all options** — `code`, `cause`, `context` all accessible on the instance after construction.
2. **Construct subclass** — `new NotFoundError('msg', { code: 'NOT_FOUND' })` returns an instance whose `.message`, `.code` are set.
3. **`instanceof` chain** — a `NotFoundError` instance passes `instanceof NotFoundError`, `instanceof StorageError`, `instanceof WebToonError`, `instanceof Error`.
4. **`error.name` reflects subclass** — `new NotFoundError(...).name === 'NotFoundError'`. (Node sets `.name` to the constructor name when properly configured.)

#### Special Cases
5. **Construct without `cause`** — `new WebToonError('msg', { code: 'X' })`. `.cause` is `undefined`.
6. **Construct without `context`** — `.context` is `undefined`.
7. **Construct with empty context object** — `.context` is `{}` (not coerced to undefined).
8. **`cause` is itself a `WebToonError`** — preserved as-is, accessible via `.cause`. Useful for error chaining (e.g., `StorageError` wrapping a `NotFoundError`).
9. **`cause` is a non-Error value** — `cause: 'string reason'` or `cause: 42` preserved without coercion.
10. **`cause` is a native `Error`** — preserved; `(err.cause as Error).message` accessible.

#### Edge Cases
11. **Empty `message` string** — `new WebToonError('', { code: 'X' })` succeeds. `.message === ''`.
12. **Very long `message`** — 10,000 character message accepted (no truncation in our code; Node's Error doesn't truncate).
13. **`code` with special characters** — `code: 'ERR:STORAGE/NOT_FOUND'` preserved verbatim. We don't validate code format.
14. **`context` with circular reference** — does NOT crash error construction. (The error stores the reference; serialization is the caller's concern. We don't JSON.stringify on construction.)
15. **Stack trace present** — `error.stack` includes the constructor location (verifies V8's `captureStackTrace` works for our subclasses).
16. **`Error.cause` standard preserved** — when the test passes `cause: someError`, the resulting `error.cause` matches `someError` by reference identity. Confirms Node 16+ `Error` cause semantics.

---

### `src/config.ts`

These tests stub `process.env` per test (set up in `beforeEach`, restore in `afterEach`). The config module re-imports cleanly using `vi.resetModules()` between tests since validation happens at module load.

#### Normal Cases
1. **All env vars set with valid values** — module loads, exports `config` object with all fields typed correctly.
2. **Numeric coercion works** — `MAX_PARALLEL_REQUESTS='10'` (string) becomes `config.MAX_PARALLEL_REQUESTS === 10` (number).
3. **Enum value parsed** — `LOG_LEVEL='warn'` → `config.LOG_LEVEL === 'warn'`.

#### Special Cases
4. **Only required env set** — only `GEMINI_API_KEY` set; all optional fields fall back to documented defaults. Verify each default value matches the schema.
5. **`WORKSPACE_ROOT` defaults to `process.cwd()`** — when unset, `config.WORKSPACE_ROOT === process.cwd()`.
6. **`MAX_RETRIES=0` accepted** — zero is a valid nonnegative value. `config.MAX_RETRIES === 0`.
7. **All `LOG_LEVEL` values accepted** — `error`, `warn`, `info`, `debug` each parse successfully (parameterized test).
8. **All `NODE_ENV` values accepted** — `development`, `production`, `test` each parse.
9. **`STORAGE_BACKEND='local'` accepted** — currently the only valid value.

#### Edge Cases
10. **Missing `GEMINI_API_KEY`** — `delete process.env.GEMINI_API_KEY` then re-import → throws `ConfigError`. Error message identifies the missing field.
11. **Empty `GEMINI_API_KEY`** — `process.env.GEMINI_API_KEY = ''` → throws `ConfigError` (min 1 char).
12. **Non-numeric `MAX_PARALLEL_REQUESTS`** — `'abc'` → throws `ConfigError`. Message identifies the field and expected type.
13. **Zero `MAX_PARALLEL_REQUESTS`** — `'0'` → throws (positive constraint, not nonnegative).
14. **Negative `MAX_PARALLEL_REQUESTS`** — `'-5'` → throws.
15. **Float `MAX_PARALLEL_REQUESTS`** — `'5.5'` → throws (int constraint).
16. **Negative `MAX_RETRIES`** — `'-1'` → throws (nonnegative).
17. **Invalid `LOG_LEVEL` enum value** — `'trace'` → throws.
18. **Invalid `STORAGE_BACKEND`** — `'r2'` → throws (not yet a valid value; will be added when R2 sprint happens).
19. **Invalid `NODE_ENV`** — `'staging'` → throws.
20. **`GENERATION_TIMEOUT_MS=0`** — throws (positive).
21. **Multiple errors in one validation** — when 3 fields are invalid simultaneously, the thrown `ConfigError` includes all 3 in its message (zod returns multi-issue errors; we serialize all of them).
22. **Thrown error is `ConfigError`, not raw `ZodError`** — caller can `instanceof ConfigError`. The original `ZodError` is preserved in `cause`.

---

### `src/logger.ts`

Tests use pino's `destination` option to route output to an in-memory writable stream that captures log lines. Lines are JSON-parsed and asserted against expectations.

#### Normal Cases
1. **Root logger writes JSON** — `logger.info('hello')` produces a JSON line with `level`, `time`, `msg: 'hello'`.
2. **Root logger respects `LOG_LEVEL`** — when `config.LOG_LEVEL === 'info'`, `logger.debug('x')` produces no output; `logger.info('x')` does.
3. **`createInvocationLogger(invId)` returns a logger that emits `invocationId` on every entry** — `child.info('hi')` line includes `invocationId: invId`.
4. **`newInvocationId()` returns a string** — starts with `'inv_'`, followed by URL-safe characters, length > 4.

#### Special Cases
5. **`createInvocationLogger()` with no arg** — auto-generates an ID via `newInvocationId()`. The returned logger's logs include some `invocationId` field.
6. **Multiple child loggers coexist** — two child loggers with different IDs each emit their own ID; no cross-contamination.
7. **Child logger inherits root level** — when root is `info`, child's `debug` calls also suppressed.
8. **`LOG_LEVEL='error'`** — only `logger.error(...)` produces output; `warn`, `info`, `debug` all suppressed.
9. **`LOG_LEVEL='debug'`** — all four levels produce output.
10. **Logging an object** — `logger.info({ foo: 'bar' }, 'message')` includes both the message and the `foo` field in the JSON.

#### Edge Cases
11. **`newInvocationId()` uniqueness** — calling 1000 times produces 1000 distinct strings. (Uses `crypto.randomBytes` or `randomUUID` under the hood.)
12. **Logging a circular reference** — does NOT crash. pino's serializer handles circular refs gracefully (replaces with `'[Circular]'`).
13. **Logging an Error instance** — `logger.error(err)` produces JSON with `err.message`, `err.code`, `err.stack` properly serialized. (Configure pino's `serializers.err = pino.stdSerializers.err`.)
14. **Empty message** — `logger.info('')` produces a line with `msg: ''`. No crash.
15. **`NODE_ENV='development'`** — pretty transport active. (Test by checking that logger does not write raw JSON to the test destination — instead, we verify our pino configuration sets the transport when NODE_ENV is development. We don't assert on pretty output format itself; that's pino-pretty's responsibility.)
16. **`NODE_ENV='production'`** — raw JSON to stderr (no pretty transport).

---

### `src/storage/local.ts`

Each test creates a fresh temp dir via `tests/helpers/temp.ts`, instantiates `new LocalStorageService(tempDir)`, runs the assertion, and cleans up the temp dir in `afterEach`.

#### Normal Cases
1. **`write` then `read` round-trips bytes** — `await storage.write('a.png', buf); const got = await storage.read('a.png'); expect(got.equals(buf)).toBe(true);`
2. **`write` returns `{ key, url }`** — `key` matches input; `url` starts with `file://` and ends with the resolved absolute path.
3. **`exists` returns true after `write`** — `await storage.write('x', buf); expect(await storage.exists('x')).toBe(true);`
4. **`exists` returns false for never-written key** — `expect(await storage.exists('never.png')).toBe(false);`
5. **`delete` removes the file** — `await storage.write('x', buf); await storage.delete('x'); expect(await storage.exists('x')).toBe(false);`
6. **`url` returns valid `file://` URL** — `const u = await storage.url('x'); expect(u).toMatch(/^file:\/\//); expect(() => new URL(u)).not.toThrow();`

#### Special Cases
7. **Nested key creates parent dirs** — `await storage.write('a/b/c/file.png', buf)` succeeds; file exists at `${rootPath}/a/b/c/file.png`. Verify intermediate directories were created.
8. **Korean characters in key** — `await storage.write('한글.png', buf)` round-trips correctly.
9. **Spaces in key** — `await storage.write('my image.png', buf)` round-trips. URL is properly encoded (`my%20image.png`).
10. **Overwrite same key** — `await storage.write('x', buf1); await storage.write('x', buf2); const got = await storage.read('x'); expect(got.equals(buf2)).toBe(true);`
11. **Empty buffer round-trips** — `const empty = Buffer.alloc(0); await storage.write('e', empty); const got = await storage.read('e'); expect(got.length).toBe(0);`
12. **`delete` is idempotent** — `await storage.delete('never-existed')` does NOT throw.
13. **`url` for non-existent key** — does NOT throw, does NOT check existence; returns the URL the file would have if written. (Useful for pre-computing URLs before generation completes.)
14. **Two instances with different `rootPath`s are isolated** — `const s1 = new LocalStorageService(dir1); const s2 = new LocalStorageService(dir2); await s1.write('x', buf); expect(await s2.exists('x')).toBe(false);`
15. **`write` to a key in a deep new directory tree (5+ levels)** — succeeds, all intermediate dirs created.

#### Edge Cases
16. **`read` for non-existent key throws `NotFoundError`** — `await expect(storage.read('missing')).rejects.toThrow(NotFoundError);` Verify error has `code: 'NOT_FOUND'` and `context.key === 'missing'`.
17. **Path traversal attempt rejected** — `await expect(storage.write('../escape.png', buf)).rejects.toThrow(StorageError);` with `code: 'INVALID_KEY'`. (Defense-in-depth: even though keys come from our own files, we reject keys whose resolved absolute path falls outside `rootPath`.)
18. **Absolute path as key rejected** — `await expect(storage.write('/etc/passwd', buf)).rejects.toThrow(StorageError);` with `code: 'INVALID_KEY'`.
19. **Key with embedded `..` segment in middle rejected** — `'a/../../b.png'` is rejected even if its resolved path stays inside rootPath (defense-in-depth: path normalization differences across platforms).
20. **Binary content (PNG bytes) round-trips byte-for-byte** — write a real PNG buffer (use a small fixture), read back, assert exact equality.
21. **Large file (5 MB)** — `const big = Buffer.alloc(5 * 1024 * 1024, 0xAB); await storage.write('big', big); const got = await storage.read('big'); expect(got.length).toBe(big.length); expect(got[0]).toBe(0xAB);`
22. **Read on a path that exists but is a directory** — throws `StorageError` (not `NotFoundError`). The error code distinguishes from "not found."
23. **Permission denied simulation** — when `fs.writeFile` rejects with `EACCES`, our code throws `StorageError` with `code: 'STORAGE_WRITE_FAILED'` and the original error in `.cause`. (Mock `fs/promises` for this test.)
24. **Disk full simulation** — `ENOSPC` from `fs.writeFile` → `StorageError` with `code: 'STORAGE_WRITE_FAILED'` and cause preserved.
25. **`url` produces correct format on Windows** — when `rootPath` is a Windows path like `C:\foo\bar`, the resulting URL is `file:///C:/foo/bar/key`. (Use `url.pathToFileURL` from Node's stdlib — it handles this correctly on both platforms.)
26. **Constructor with non-existent `rootPath`** — does NOT throw at construction. The directory is created on first `write` (via `mkdir -p`). This avoids needing async constructors.
27. **Concurrent writes to different keys succeed** — `Promise.all([storage.write('a', buf1), storage.write('b', buf2)])` both complete; both files exist with correct contents.
28. **Concurrent writes to same key — last write wins** — `Promise.all([storage.write('x', buf1), storage.write('x', buf2)])` completes; `storage.read('x')` returns either `buf1` or `buf2` (we accept either; we don't promise atomicity beyond `fs.writeFile`'s semantics, which itself is atomic at the syscall level on POSIX but not necessarily on Windows). The test asserts the result equals one of the two inputs.

---

### `tests/helpers/temp.ts`

The helper itself gets tests — it's foundational for storage tests and bugs here would silently corrupt every storage test.

#### Normal Cases
1. **`createTempDir()` returns an absolute path** — `const dir = await createTempDir(); expect(path.isAbsolute(dir)).toBe(true);`
2. **Returned path exists on disk** — `expect(await fs.stat(dir)).toBeDefined();` (it's a directory).
3. **Returned path is under `os.tmpdir()`** — `expect(dir.startsWith(os.tmpdir())).toBe(true);`
4. **Two calls return distinct paths** — uniqueness via `mkdtemp`.
5. **`cleanup()` removes the directory** — after cleanup, `fs.stat(dir)` rejects with `ENOENT`.

#### Edge Cases
6. **Cleanup is idempotent** — `await cleanup(); await cleanup();` does not throw.
7. **Cleanup removes nested contents** — write files into temp dir, then cleanup; all contents removed (uses `fs.rm({ recursive: true })`).
8. **Temp dir name has identifying prefix** — `expect(path.basename(dir).startsWith('webtoon-test-')).toBe(true);` (helps identify orphaned dirs from crashed tests).

---

## Failure Mode Analysis

For each module, what fails, how we detect it, how we report it, and how the operator finds out.

### Config

| Failure | Detection | Reporting | Operator Sees |
|---|---|---|---|
| Required env var missing | zod validation at module load | `ConfigError` with code `'CONFIG_INVALID'`, message names the field, `cause` is the underlying `ZodError` | Process exits with code 2; stderr line: `[FATAL] CONFIG_INVALID: GEMINI_API_KEY is required` |
| Env var has wrong type | zod validation | Same as above; message includes type expectation | `MAX_PARALLEL_REQUESTS expected number, got 'abc'` |
| Multiple invalid fields | zod returns all issues | `ConfigError` message lists all failed fields | One stderr line per failed field for clarity |

### Logger

| Failure | Detection | Reporting | Operator Sees |
|---|---|---|---|
| Invalid `LOG_LEVEL` | Caught upstream by config validation | `ConfigError` from config module — never reaches logger | Same as config errors |
| Pino fails to write to stderr (rare; closed file descriptor) | Pino emits an internal error; we don't intercept | Process may exit | This is so rare in practice we don't defensively handle it |

### Storage (`LocalStorageService`)

| Failure | Detection | Reporting | Operator Sees |
|---|---|---|---|
| Read missing key | `fs.readFile` throws `ENOENT` | `NotFoundError` with code `'NOT_FOUND'`, context `{ key }` | Caller receives the error; pipeline marks resource as failed in state |
| Path traversal attempt | Pre-flight key validation in `resolveKey()` | `StorageError` with code `'INVALID_KEY'`, context `{ key, rootPath }` | Same handling as other storage errors; logged at warn level |
| Permission denied | `fs.writeFile` / `fs.readFile` throws `EACCES` / `EPERM` | `StorageError` with code `'STORAGE_WRITE_FAILED'` or `'STORAGE_READ_FAILED'`, original error in `.cause` | Pipeline marks failed; logs include cause's errno |
| Disk full | `ENOSPC` from `fs.writeFile` | `StorageError` with code `'STORAGE_WRITE_FAILED'`, original error in `.cause` | Same |
| Read a directory as a file | `fs.readFile` throws `EISDIR` | `StorageError` with code `'STORAGE_READ_FAILED'` | Same |
| Concurrent same-key write | Last write wins (no detection) | No error reported | Operator sees the file with whichever bytes won the race; not a defect for our use case (each resource has a unique key) |

---

## Performance Considerations

Sprint 1 deliverables are foundational, low-traffic. Brief notes:

- **Config**: validates once at module load. O(env var count). Negligible.
- **Logger**: pino is the fastest Node logger. Per-log overhead in microseconds. Async writes via stream backpressure prevent blocking.
- **Storage**:
  - `write`: one `mkdir -p` (often a no-op, single syscall when present) + one `fs.writeFile`. For 1–5 MB image buffers, dominated by I/O (~5–20 ms on SSD).
  - `read`: one `fs.readFile`. Allocates a Buffer of file size. For 5 MB, ~5 ms on SSD.
  - `exists`: one `fs.access`. Faster than `stat` because we don't need metadata. Microseconds when cached.
  - `url`: pure string formatting, no I/O. Sub-microsecond.
  - Path validation in `resolveKey()`: `path.resolve` + string comparison. Sub-microsecond.

No batching or parallelism concerns in Sprint 1. The pipeline (Sprint 4) will introduce `p-limit` on top of these primitives.

**One performance gotcha to avoid:** do not call `fs.stat` (full metadata) when only existence is needed — use `fs.access`.

---

## Test Coverage Targets

- `src/`: **100% statements, 100% branches**. Modules are small enough that full coverage is achievable and prevents drift.
- `tests/helpers/`: excluded from coverage requirements (these ARE the test infrastructure).
- Coverage enforcement: `npm test` does not block on coverage; `npm run test:coverage` runs Vitest with coverage reporter and fails if thresholds are not met. CI runs `test:coverage`.

## Open Questions for Phase 3 Implementation

1. **Should `LocalStorageService` accept relative or absolute keys?** Decided: relative only. Absolute keys (`/etc/passwd`, `C:\Windows\...`) are rejected with `INVALID_KEY`. Test #18 enforces this.
2. **Should `read` accept an option like `{ encoding: 'utf8' }`?** Decided: no. Always returns `Buffer`. Callers that need text decode it themselves. Keeps the interface narrow and matches future R2 / GCS implementations which return bytes.
3. **Should we expose `list()` for listing keys?** Decided: not in Sprint 1. The pipeline knows its keys from prompts; it doesn't need to enumerate the storage backend. `list()` is a known future need (e.g., for cleanup commands) but premature now.
4. **Should `write` support streams (large files)?** Decided: not in Sprint 1. Image buffers from Gemini fit in memory comfortably (under 10 MB each). Stream support is a future concern if we add video or higher-res outputs.
