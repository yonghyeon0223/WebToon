# Sprint 01 — Phase 3: Implementation

## Overview

Phase 3 turned the planning and test specifications into working code. All 95 tests pass with 100% statement, branch, function, and line coverage. ESLint and `tsc --noEmit` both run clean. CI workflow is in place.

This document is the **teaching walkthrough** — the WHY behind the code. The code itself is the WHAT.

## Final Test Results

```
Test Files  5 passed (5)
Tests       95 passed (95)

Coverage report from v8
─────────────────────────────────────────
All files       100% stmts | 100% branch | 100% funcs | 100% lines
  src/config.ts        100 |        100 |        100 |        100
  src/errors.ts        100 |        100 |        100 |        100
  src/logger.ts        100 |        100 |        100 |        100
  src/storage/local.ts 100 |        100 |        100 |        100
```

(One defensive branch in `resolveKey` — the "resolved path outside rootPath" check after the `..` segment check — is wrapped in `/* v8 ignore start/stop */`. Practically unreachable; kept as belt-and-suspenders.)

## File Map

```
WebToon/
├── package.json                     12 lines
├── tsconfig.json                    24 lines
├── vitest.config.ts                 24 lines
├── eslint.config.js                 35 lines
├── .prettierrc.json                 10 lines
├── .gitignore                       30 lines
├── .env.example                     30 lines
├── .github/workflows/ci.yml         32 lines
├── src/
│   ├── errors.ts                    47 lines
│   ├── config.ts                    55 lines
│   ├── logger.ts                    52 lines
│   └── storage/local.ts            150 lines
└── tests/
    ├── setup.ts                      7 lines
    ├── helpers/
    │   ├── temp.ts                  24 lines
    │   └── temp.test.ts             68 lines
    └── unit/
        ├── errors.test.ts          113 lines
        ├── config.test.ts          178 lines
        ├── logger.test.ts          165 lines
        └── storage/local.test.ts   263 lines
```

---

## Code Walkthrough

### `src/errors.ts` — Why a base class with `code`?

```typescript
export class WebToonError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;
  // ...
}
```

The fundamental design choice: separate machine-readable identification (`code`) from human-readable description (`message`). Three reasons:

1. **`message` is for humans.** It can be reworded freely without breaking callers. "File not found" might become "The requested resource doesn't exist on disk" without code-level breakage.
2. **`code` is for code.** Callers should `switch (err.code)` not `if (err.message.includes('not found'))`. Message parsing is fragile and locale-dependent.
3. **`context` carries structured debug info.** A `NotFoundError` for `key='passages/X/foo.png'` includes that key in `context.key`. When the error reaches a logger, the structured fields go into JSON — easy to filter, query, alert on.

The constructor uses Node's standard `Error.cause` (a Node 16+ feature) for chaining:

```typescript
super(message, { cause: options.cause });
```

This means `err.cause` works without us redeclaring it on the class. When you log a chained error, Node's util.inspect (and pino's serializer) automatically traverse the cause chain.

The `Object.setPrototypeOf` pattern that older TypeScript code uses for Error subclasses **isn't needed** here. Our tsconfig targets ES2022, where class inheritance correctly preserves the prototype chain. We verified this with the `instanceof` chain test:

```typescript
expect(err).toBeInstanceOf(NotFoundError);
expect(err).toBeInstanceOf(StorageError);
expect(err).toBeInstanceOf(WebToonError);
expect(err).toBeInstanceOf(Error);
```

`Error.captureStackTrace(this, this.constructor)` removes the constructor's own frame from the stack trace, so the stack starts at the caller's invocation point. V8-only API, but Node always uses V8.

### `src/config.ts` — Why a factory function plus a cached export?

```typescript
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config { ... }
export const config: Config = loadConfig();
```

Two exports for two callers:

1. **Production code** imports `config` (the cached instance). It validates once at module load. If validation fails, the import itself throws `ConfigError`, which propagates out of `cli.ts` (Sprint 5) and exits the process with code 2 — exactly the fail-fast behavior we want for misconfigured environments.

2. **Tests** call `loadConfig({ ... })` directly with a fixture env. No need to mutate `process.env`, no need for `vi.resetModules()` between tests, no flaky test interaction. Each test is hermetic.

**Why `z.coerce.number()`?** Environment variables are always strings (`process.env.MAX_PARALLEL_REQUESTS === '5'`). Plain `z.number()` would reject because the input isn't a `number`. `coerce` runs `Number(input)` first; non-numeric strings produce `NaN`, which fails the `.int().positive()` chain. Tests verify `'abc'` and `'5.5'` both reject.

**Why `WORKSPACE_ROOT: z.string().default(() => process.cwd())`?** A function default, not a value default. `process.cwd()` is evaluated at parse time, not at module load — so if a test changes cwd, the next `loadConfig()` call sees the new value. This wouldn't matter for our test suite, but it's the correct pattern.

**Why custom `configErrorFromZod`?** Zod's `safeParse` returns a `ZodError` with rich `issues` array. The default `.toString()` is verbose and JSON-flavored. Our converter produces `'Invalid environment configuration: GEMINI_API_KEY: Required; LOG_LEVEL: Invalid enum value'` — a human-friendly summary, with the full `ZodError` preserved in `cause` for programmatic access.

### `src/logger.ts` — Why a factory plus a cached `logger`?

```typescript
export function createLogger(opts: { level; isDev; destination? }): Logger;
export const logger: Logger = createLogger({...});
```

Same pattern as `config.ts`, same reasoning: production code uses the cached `logger`; tests construct fresh instances with a custom `destination` to capture output.

**Why two pino constructor branches?**

```typescript
if (opts.isDev) {
  return pino({ level, transport: { target: 'pino-pretty', options: { colorize: true } } });
}
return opts.destination
  ? pino({ level }, opts.destination)
  : pino({ level });
```

Pino's `transport` and `destination` are mutually exclusive. The `transport` option spawns a worker thread that pipes JSON through `pino-pretty` to format it for human reading — required for dev console output. The `destination` option overrides the output stream (default: stderr) — required for tests that capture log output.

In production: `isDev=false`, no destination → raw JSON to stderr. In dev: `isDev=true`, no destination → pretty-printed to stdout via worker. In tests: `isDev=false`, custom sink → JSON to in-memory buffer.

**Why `randomBytes(8).toString('base64url')` for invocation IDs?**

```typescript
return `inv_${randomBytes(8).toString('base64url')}`;
```

8 bytes = 64 bits of entropy. `base64url` encoding (no padding, URL-safe characters) produces 11 characters. `inv_` prefix makes log entries instantly recognizable as correlation IDs vs. other UUID-like strings in the logs. We tested 1000 successive calls produce 1000 unique values — entropy is more than sufficient for this use.

We could use `crypto.randomUUID()` (36 characters), but that's overkill. Invocation IDs only need to be unique across concurrent runs of the CLI, not globally unique forever.

### `src/storage/local.ts` — Why a class with constructor DI?

```typescript
export class LocalStorageService {
  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
  }
  // ...
}
```

The class takes `rootPath` in the constructor. Each test creates its own instance with its own temp dir → tests are isolated, no shared global state. Production creates one instance pointed at `config.WORKSPACE_ROOT`.

**Why no interface yet?** YAGNI. Only one implementation exists. When we add R2 (Sprint 8+), extracting an interface from this class is a 30-minute mechanical refactor. Decided in Phase 1.

**Why `path.resolve(rootPath)` in constructor?** Normalizes the input so all subsequent path operations work against an absolute, normalized form. If the user passes `./foo`, we store `/abs/path/to/foo`. This makes the `startsWith(rootPath + path.sep)` check in `resolveKey` reliable.

**Why `resolveKey` is private and the public methods all call it first?**

```typescript
private resolveKey(key: string): string {
  if (path.isAbsolute(key)) {
    throw new StorageError(...);  // INVALID_KEY
  }
  if (key.split(/[/\\]/).includes('..')) {
    throw new StorageError(...);  // INVALID_KEY
  }
  // ... defense-in-depth check (v8 ignored) ...
  return path.resolve(this.rootPath, key);
}
```

Single source of truth for key validation. Every public method (`exists`, `read`, `write`, `delete`, `url`) calls `resolveKey` first. Defense in depth:

1. Reject absolute paths — keys are passage-relative; absolute paths are programmer error or attack.
2. Reject `..` segments — would let a key escape `rootPath`.
3. Reject anything else that resolves outside `rootPath` (the `v8 ignore` block) — practically unreachable given (1) and (2), but kept as a backstop for platform-specific path normalization edge cases.

The split regex `/[/\\]/` handles both POSIX and Windows separators. A key like `..\\escape.png` on Windows is correctly rejected.

**Why does `read` distinguish `ENOENT` from other errors?**

```typescript
catch (err) {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === 'ENOENT') {
    throw new NotFoundError(`Key not found: ${key}`, { code: 'NOT_FOUND', cause: err, context: { key } });
  }
  throw new StorageError(`Failed to read key: ${key}`, { code: 'STORAGE_READ_FAILED', cause: err, context: { key } });
}
```

`NotFoundError` is an expected, recoverable failure mode (the resource hasn't been generated yet) — the pipeline should mark the resource as `pending` and continue with others. `STORAGE_READ_FAILED` (permission denied, disk error, file is a directory) signals something deeper is wrong — the pipeline should escalate.

The original error is preserved on `cause` so logs include the system errno (EACCES, EISDIR, etc.) for debugging.

**Why `delete` is idempotent?**

```typescript
catch (err) {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    return;
  }
  throw new StorageError(...);
}
```

Calling `delete('never-existed')` shouldn't be an error. The desired post-condition is "the key does not exist," and that condition is already true if it never existed. Removing an idempotency guard would force every caller to `if (await exists()) await delete()` — racy and verbose.

**Why does `write` create parent directories?**

```typescript
await fs.mkdir(path.dirname(absolute), { recursive: true });
await fs.writeFile(absolute, data);
```

Page outputs are nested: `images/pages/ch1/p01.png`. The pipeline shouldn't have to pre-create `images/pages/ch1/` before writing. `mkdir({ recursive: true })` is a no-op when the directory already exists, so this is cheap and safe.

**Why `pathToFileURL` instead of string concatenation?**

```typescript
url(key: string): Promise<string> {
  return Promise.resolve(pathToFileURL(this.resolveKey(key)).toString());
}
```

`file://` URLs have non-obvious encoding rules. On Windows, `C:\foo` becomes `file:///C:/foo`. Spaces become `%20`, Korean characters get UTF-8 percent-encoding, etc. Node's stdlib `pathToFileURL` handles all of it correctly. Hand-rolling the conversion is a recipe for cross-platform bugs.

**Why is `url()` `Promise<string>` even though the implementation is synchronous?**

For interface compatibility with future R2/GCS implementations, which need to be async (signed URL generation involves the SDK). Returning `Promise.resolve(...)` keeps the contract stable. The non-async function form (no `async` keyword) avoids ESLint's `require-await` complaint.

### `eslint.config.js` — Why `strictTypeChecked` + `stylisticTypeChecked`?

```javascript
...tseslint.configs.strictTypeChecked,
...tseslint.configs.stylisticTypeChecked,
```

`strictTypeChecked` adds rules that catch real bugs using full type information: misuse of promises (forgotten `await`), unsafe assignments (`any` leaking through), nullish access without checks. These rules are slow (require typechecking) but worth it.

`stylisticTypeChecked` adds opinions about code shape: prefer `T[]` over `Array<T>`, dot notation when possible, no useless type assertions. Some of these opinions (like dot notation) we wouldn't write by hand but happily accept from the linter.

The tests folder gets relaxed rules:

```javascript
{
  files: ['tests/**/*.ts'],
  rules: {
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
},
```

Test code often legitimately uses `!` (we just wrote the value, we know it's there) and `any` (mock return types don't need precision). Production code shouldn't.

### `vitest.config.ts` — Why `globals: false` and 100% coverage thresholds?

```typescript
test: {
  globals: false,
  // ...
  coverage: {
    thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
},
```

`globals: false` means tests must `import { describe, it, expect } from 'vitest'` explicitly. No magical `describe`/`it` injected into scope. Pros: explicit dependencies, consistent with how every other module is imported, ESLint correctly knows what's defined. Cons: a few extra characters at the top of every test file. Worth it.

100% coverage is achievable for this sprint because the modules are small and the testing was planned upfront. For modules with genuinely defensive code (the resolveKey backstop), `/* v8 ignore */` excludes specific blocks with explanatory comments. The threshold catches regressions: if a future commit adds untested code paths, CI fails.

### `tests/helpers/temp.ts` — Why a helper module gets its own tests

```typescript
export async function createTempDir(): Promise<TempDir>;
```

The helper is foundational for all storage tests. A bug in the helper would silently corrupt every storage test. Our 8 tests on the helper catch:

- Returned paths are absolute (relative paths would break `LocalStorageService` construction)
- Cleanup actually removes the dir (orphaned test dirs accumulate over runs)
- Cleanup handles missing dirs (idempotent — needed because tests sometimes call cleanup twice)
- Recursive removal works (tests write nested files; partial cleanup would leak)
- Names start with `webtoon-test-` (quick `find /tmp -name 'webtoon-test-*'` for crash diagnosis)

If you only test the things you trust, you're not testing.

### `tests/unit/storage/local.test.ts` — The `vi.mock('node:fs/promises', { spy: true })` trick

```typescript
vi.mock('node:fs/promises', { spy: true });
// ...
vi.mocked(fs.writeFile).mockRejectedValueOnce(fakeErr);
```

This pattern was the result of our first run failing with `TypeError: Cannot redefine property: writeFile`.

The reason: Node ESM module bindings are immutable. `vi.spyOn(fs, 'writeFile')` works for CommonJS exports (mutable `module.exports.writeFile`) but fails for ESM (frozen namespace exports).

The workaround: `vi.mock('node:fs/promises', { spy: true })` replaces the module with a proxy that wraps every export in a spy. Methods still call through to the real implementation by default, so unrelated tests aren't affected. Individual tests can override one call with `mockRejectedValueOnce`, which only affects the next invocation.

This same pattern will work whenever we need to inject failures into Node's stdlib modules — which we will when testing the Gemini SDK in Sprint 3.

### `.github/workflows/ci.yml` — Why `if: always()` on every step?

```yaml
- name: Lint
  if: always()
  run: npm run lint

- name: Type-check
  if: always()
  run: npm run type-check

- name: Test (with coverage)
  if: always()
  run: npm run test:coverage
```

By default, GitHub Actions skips remaining steps in a job after one fails. With `if: always()`, every step runs regardless. This means:

- A lint error and a test failure are both reported in the same CI run
- Reviewers see all problems at once instead of fix-one, push, see-the-next-one cycles
- The job still fails overall (any failed step makes the job fail), but failure feedback is complete

`node-version-file: 'package.json'` reads the Node version from `engines.node`. Single source of truth: bumping the version in `package.json` automatically updates CI.

`env: GEMINI_API_KEY: ci-test-key` provides a placeholder for the env validation that happens at module load. Tests don't actually call Gemini in Sprint 1, but `config.ts` requires the variable to be set.

---

## Key Implementation Details

### Order of writes was deliberate

The TDD plan from Phase 1 specified an order: project files → test infra → errors → config → logger → storage → CI. We followed it. Each module's tests passed against its own code without requiring later modules. This kept iterations fast — when a test failed, the cause was always in the just-written code, not in dependencies that hadn't been written yet.

### Two test failures led to two real lessons

**`Cannot redefine property: writeFile`** taught us about ESM immutability and `vi.mock({ spy: true })`. Documented for Sprint 3.

**`Imports "ZodError" are only used as type`** and the matching Buffer issue taught us that `verbatimModuleSyntax: true` strictly enforces type-only imports. Catching this at lint time rather than runtime is a small win for build determinism.

### One TypeScript error was substantive

```
src/logger.ts: This expression is not callable.
  Type 'typeof import("pino")' has no call signatures.
```

`import pino from 'pino'` (default import) doesn't work cleanly with `verbatimModuleSyntax: true` because pino uses CommonJS-style exports. The fix: `import { pino } from 'pino'` (named import) — the named export is the same callable function.

This kind of friction is the cost of strict ESM compliance. We accept it because it makes the bundler/runtime story unambiguous: every import maps to a real export, no synthetic interop magic.

### The defensive `resolveKey` block earns its `v8 ignore`

```typescript
/* v8 ignore start */
if (absolute !== this.rootPath && !absolute.startsWith(this.rootPath + path.sep)) {
  throw new StorageError(...);
}
/* v8 ignore stop */
```

We left the check in despite excluding it from coverage because:

- The cost is one comparison per `resolveKey` call (~nanoseconds)
- The benefit is catching surprises on platforms with non-obvious path normalization (Windows reserved names, UNC `\\?\` prefixes, future Node behavior changes)
- Removing it to "boost coverage" would be the wrong incentive — coverage is a means, not an end

The comment explains the trade-off so a future reader understands why this code exists and why it's excluded from coverage.

### Coverage 100% is real, not gamed

Every executable code path in `src/` runs in some test. The only excluded code is the explicitly-defensive backstop. There are no `/* istanbul ignore */` over real logic, no untested error paths quietly accepted as "rare," no skipped-but-not-deleted tests.

This standard will get harder to maintain as the project grows. We commit to keeping it for foundational modules; we may relax it for modules with genuinely complex defensive code (e.g., the Gemini retry logic in Sprint 3, where some retry-after states are hard to mock without writing a fake server).
