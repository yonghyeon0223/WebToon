# Sprint 01 — Foundation & Storage

## Phase 1: Planning

### Objectives

This sprint produces the foundation that every subsequent sprint depends on. Nothing in this sprint generates an image; nothing calls Gemini. The deliverable is a working TypeScript project with strict tooling, validated configuration, structured logging, an error class hierarchy, a local filesystem storage layer, test infrastructure, and CI gates.

By the end of Sprint 1:
- `npm test` is green
- `npm run type-check` is clean
- `npm run lint` is clean
- CI passes on PRs
- Sprint 2 (prompts + state) can begin without revisiting any of these decisions

**Non-objectives** (deferred to later sprints, listed so we don't accidentally pull them in):
- Gemini API client → Sprint 3
- Prompt parsing (`gray-matter` + zod schema for frontmatter) → Sprint 2
- State tracking (`.state.json` read/write/diff) → Sprint 2
- Pipeline orchestration (3-stage dependency execution) → Sprint 4
- CLI commands (`commander` + handlers) → Sprint 5
- Migration of existing prompts to new structure → Sprint 6
- StorageService interface + R2 implementation → deferred until R2 is needed (likely sprint 8+ when serving begins)

### Affected / New Modules

All new. Twelve files:

| Path | Responsibility |
|---|---|
| `package.json` | npm manifest, exact-pinned dependency versions, scripts |
| `tsconfig.json` | Strict TypeScript compiler options |
| `vitest.config.ts` | Test runner configuration |
| `eslint.config.js` | ESLint flat config with @typescript-eslint and Prettier integration |
| `.prettierrc.json` | Prettier formatting rules |
| `.gitignore` | Exclude node_modules, dist, .env, generated images, .state.json files |
| `.env.example` | Documented env template (no actual secrets — only example values and comments) |
| `src/config.ts` | zod env validation; exports a typed `config` object; throws `ConfigError` on invalid env |
| `src/logger.ts` | pino-based structured logger; per-invocation child logger with correlation ID |
| `src/errors.ts` | `WebToonError` base class + initial subclasses (`ConfigError`, `StorageError`, `NotFoundError`) |
| `src/storage/local.ts` | `LocalStorageService` class with constructor DI for `rootPath` |
| `tests/helpers/temp.ts` | Utility to create and clean up temporary directories for storage tests |
| `.github/workflows/ci.yml` | Runs lint + type-check + test on every PR |

### Function Signatures

#### `src/config.ts`

```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_IMAGE_MODEL: z.string().default('gemini-2.5-flash-image'),
  MAX_PARALLEL_REQUESTS: z.coerce.number().int().positive().default(5),
  GENERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  STORAGE_BACKEND: z.enum(['local']).default('local'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  WORKSPACE_ROOT: z.string().default(process.cwd()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof EnvSchema>;
export const config: Config; // validated at module load time; throws ConfigError on failure
```

#### `src/errors.ts`

```typescript
export interface WebToonErrorOptions {
  code: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export class WebToonError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  readonly context?: Record<string, unknown>;
  constructor(message: string, options: WebToonErrorOptions);
}

export class ConfigError extends WebToonError {}      // env validation failed
export class StorageError extends WebToonError {}     // storage operation failed (parent)
export class NotFoundError extends StorageError {}    // requested key does not exist
```

#### `src/logger.ts`

```typescript
import type { Logger } from 'pino';

export const logger: Logger;                                              // root logger (level + transport from config)
export function createInvocationLogger(invocationId?: string): Logger;    // child logger; binds invocationId field on every log
export function newInvocationId(): string;                                // returns "inv_" + URL-safe random string
```

#### `src/storage/local.ts`

```typescript
import type { Buffer } from 'node:buffer';

export interface StorageWriteResult {
  key: string;     // the key as stored (passage-relative path)
  url: string;     // file:// URL with absolute path
}

export interface StorageWriteOptions {
  contentType?: string;  // currently unused for local FS; kept for future R2 compatibility
}

export interface StorageUrlOptions {
  signed?: boolean;      // ignored for local FS
  expiresIn?: number;    // ignored for local FS
}

export class LocalStorageService {
  constructor(rootPath: string);                                                              // all keys resolved against rootPath
  exists(key: string): Promise<boolean>;
  read(key: string): Promise<Buffer>;                                                         // throws NotFoundError if missing
  write(key: string, data: Buffer, options?: StorageWriteOptions): Promise<StorageWriteResult>; // creates intermediate dirs
  delete(key: string): Promise<void>;                                                         // no-op if missing (idempotent)
  url(key: string, options?: StorageUrlOptions): Promise<string>;                             // returns file:// URL
}
```

### Data Flow

#### Config (executes once on first import)
```
process.env  →  EnvSchema.safeParse()  →  result.success?
                                              │
                                  yes ────────┴────────  no
                                  │                       │
                          exported as `config`     throw ConfigError
                                                          │
                                                  process exits with code 2
```

#### Logger
```
import { logger }              →  root logger writes JSON to stderr
createInvocationLogger(invId)  →  child logger; every log entry includes { invocationId }
```

#### Storage (read/write cycle)
```
caller →  storage.write(key, buffer)
       │
       ▼
       LocalStorageService:
         1. resolve absolute path: path.join(rootPath, key)
         2. mkdir -p the parent directory
         3. fs.writeFile(absolutePath, buffer)
         4. return { key, url: pathToFileURL(absolutePath).toString() }

caller →  storage.read(key)
       │
       ▼
       LocalStorageService:
         1. resolve absolute path
         2. fs.readFile → returns Buffer
         3. ENOENT → throw NotFoundError({ code: 'NOT_FOUND', context: { key } })
         4. other errors → throw StorageError({ code: 'STORAGE_READ_FAILED', cause: err })
```

### Design Decisions

For each: what we decided, what alternatives we considered, why we chose this, what trade-offs we accept.

#### 1. zod for environment validation

- **Decided:** zod
- **Alternatives:** envalid (env-specific), joi, manual `if (!process.env.X) throw`
- **Why:** zod will already be used elsewhere (frontmatter parsing in Sprint 2, possibly state file schema). One validation library reduces dependencies and cognitive load. Excellent TypeScript inference: `z.infer<typeof EnvSchema>` gives a fully typed `Config` for free. `z.coerce.number()` handles env vars (which are always strings) cleanly.
- **Trade-off:** zod is slightly more verbose than envalid for this specific use case. Consistency wins.

#### 2. pino for logging

- **Decided:** pino
- **Alternatives:** winston, bunyan, console.log
- **Why:** Fastest Node.js logger by a wide margin. Structured JSON by default — required for any future log aggregation. `pino-pretty` transport gives readable colored output in development without code changes. Mature, well-maintained, small bundle.
- **Trade-off:** pino's transports model is less flexible than winston's. We don't need the flexibility. If we ever do, we can wrap pino with custom transports.

#### 3. Class-based error hierarchy

- **Decided:** Classes extending native `Error`, each carrying a `code` string field
- **Alternatives:** Discriminated union of plain error objects, Result types (Rust-style `Ok`/`Err`), plain `throw new Error('NOT_FOUND')` with code in message
- **Why:** `instanceof` checks work for downstream `try/catch` discrimination. Stack traces preserved automatically. Standard Node.js pattern — interop with everything. The `code` field gives a machine-readable identifier without parsing the message string. Subclasses (`NotFoundError extends StorageError extends WebToonError`) allow catching at the granularity that matters.
- **Trade-off:** Classes are slightly more boilerplate than discriminated unions. But Node's error ecosystem assumes class-based errors — `Error.cause`, `util.inspect`, `process.on('uncaughtException')`, etc. all work better with classes.

#### 4. No StorageService interface yet — just the class

- **Decided:** `LocalStorageService` class only. No `StorageService` interface, no factory.
- **Alternatives:** Define interface now even though only one implementation exists, factory function that returns the concrete type
- **Why:** YAGNI. With one implementation, an interface is pure indirection. Call sites use `LocalStorageService` directly. When R2 is added (likely sprint 8+), we extract the interface from the class — a 30-minute refactor with the test safety net in place. Constructor DI (`rootPath` parameter) gives us all the testability benefits — interface adds nothing for testing.
- **Trade-off:** When R2 is added, we'll touch every file that references `LocalStorageService` to change to the interface type. Estimated 5–10 files at that point. Acceptable refactor cost vs current YAGNI cost.

#### 5. Constructor DI for `rootPath`

- **Decided:** `new LocalStorageService(rootPath)`
- **Alternatives:** Read from global config (`config.WORKSPACE_ROOT`), pass per-method
- **Why:** Each test creates its own `LocalStorageService` with its own temp directory — no global state to mock or reset. Multiple instances can coexist (e.g., one for cache, one for outputs). Pure dependency injection.
- **Trade-off:** Caller must construct with rootPath. Pipeline code creates one instance at startup using `config.WORKSPACE_ROOT` — minor explicit step.

#### 6. Vitest, not Jest

- **Decided:** Vitest
- **Alternatives:** Jest (most popular), Node test runner (built-in, zero deps), Mocha
- **Why:** Native TypeScript support without `ts-jest` configuration. ESM-first. Significantly faster test runs. Same API surface as Jest — Stack Overflow answers and docs transfer. Watch mode is excellent.
- **Trade-off:** Newer than Jest, smaller plugin ecosystem. We don't need plugins.

#### 7. ESLint + Prettier (traditional)

- **Decided:** ESLint flat config + Prettier + eslint-config-prettier (disable conflicting rules)
- **Alternatives:** Biome (single tool, faster, simpler), oxlint (Rust-based, no Prettier integration yet)
- **Why:** Most familiar to most TypeScript developers. Largest ecosystem of rules and plugins. Stable, well-documented. eslint-config-prettier is the standard way to make them coexist.
- **Trade-off:** Two tools instead of one (Biome). Slightly slower lint runs. Some configuration overhead.

#### 8. `process.cwd()` as default `WORKSPACE_ROOT`

- **Decided:** `WORKSPACE_ROOT` defaults to `process.cwd()`
- **Alternatives:** Hardcoded path, throw if not set, derive from `__dirname`
- **Why:** Invoking the CLI from the project root makes the default Just Work. Tests can override via env. Allows running from any directory if set explicitly.
- **Trade-off:** Running from the wrong directory silently uses the wrong root. Mitigated by logging the resolved root at info level on startup.

#### 9. NODE_ENV used only for logger transport selection

- **Decided:** `NODE_ENV=development` enables `pino-pretty`; otherwise raw JSON
- **Alternatives:** Gate other features by NODE_ENV (e.g., disable cache in dev), require explicit `LOG_FORMAT` env var
- **Why:** This is a personal local CLI, not a deployed service. The only meaningful distinction is "human reading the logs in a terminal" vs "logs being parsed by a tool." NODE_ENV is the standard signal for this. Keeping NODE_ENV's role narrow prevents the usual "what does NODE_ENV do here?" sprawl.
- **Trade-off:** If we later want production-level features gated by env, we'll add specific env vars (`PRODUCTION_FEATURES_ENABLED`, etc.) rather than overload NODE_ENV.

#### 10. CI runs lint + type-check + test (all three required to pass)

- **Decided:** Three independent steps; any failure fails the build
- **Alternatives:** Bundle into a single `npm run check` script, only run tests, defer CI until Sprint 5
- **Why:** Independent steps give clearer failure signals. Lint catches style/quality issues fast. Type-check catches type errors not always caught by tests. Tests catch behavioral regressions. All three are cheap to run and worth the parallel execution.
- **Trade-off:** Slightly longer CI time. Worth it.

### Implementation Plan

Order matters — each step builds on the previous. Within a step, write tests first per TDD.

1. **Project files** (no logic, no tests):
   - `package.json` with scripts and exact-pinned deps
   - `tsconfig.json` with strict mode
   - `eslint.config.js` flat config
   - `.prettierrc.json`
   - `.gitignore`
   - `.env.example`

2. **Test infrastructure**:
   - `vitest.config.ts`
   - `tests/helpers/temp.ts` — creates a unique temp dir per call, returns cleanup function

3. **Errors** (`src/errors.ts`):
   - No dependencies. Simple base class + three subclasses.
   - Tests:
     - `WebToonError` carries `code`, `message`, `cause`, `context`
     - `instanceof WebToonError` works for subclasses
     - Each subclass has the correct prototype chain
     - `Error.cause` is preserved (Node 16+ standard)

4. **Config** (`src/config.ts`):
   - Depends on `errors` (throws `ConfigError` on validation failure)
   - Tests:
     - Valid env parses successfully and returns typed `Config`
     - Missing required `GEMINI_API_KEY` throws `ConfigError` with helpful message
     - Optional fields fall back to documented defaults
     - `MAX_PARALLEL_REQUESTS=abc` (non-numeric) throws `ConfigError`
     - `LOG_LEVEL=trace` (invalid enum) throws `ConfigError`
     - `WORKSPACE_ROOT` defaults to `process.cwd()` when unset

5. **Logger** (`src/logger.ts`):
   - Depends on `config` (reads `LOG_LEVEL` and `NODE_ENV`)
   - Tests:
     - Root logger respects `LOG_LEVEL` (debug-level call suppressed at info)
     - Child logger from `createInvocationLogger` includes `invocationId` in every entry
     - `newInvocationId()` returns unique values starting with `inv_`
     - Default `createInvocationLogger()` (no arg) generates an ID

6. **Local storage** (`src/storage/local.ts`):
   - Depends on `errors` (throws `NotFoundError`, `StorageError`)
   - Tests (each uses `tests/helpers/temp.ts` for an isolated rootPath):
     - `write` then `read` round-trips identical bytes
     - `write` to a key with nested directories creates parent dirs
     - `read` for non-existent key throws `NotFoundError` with key in context
     - `exists` returns true after write, false after delete
     - `delete` is idempotent (no error on missing key)
     - `url` returns a valid `file://` URL pointing at the absolute path
     - `url` for non-existent key still returns a URL (matches what the path would be — no existence check)
     - Two instances with different rootPaths are isolated

7. **CI** (`.github/workflows/ci.yml`):
   - Triggers: pull_request, push to main
   - Steps: checkout → setup-node@v4 (Node 24.11) → npm ci → npm run lint → npm run type-check → npm test
   - Each step runs even if a previous one fails (so we see all errors at once)
   - Node version sourced from `package.json` `engines.node` to keep CI and local dev aligned

After Sprint 1, the user can:
- Add a `.env` file from `.env.example`
- Run `npm test` and see green
- Open a PR and see CI green
- Move into Sprint 2 with confidence in the foundation

### Risks & Mitigations

| Risk | Mitigation |
|---|---|
| zod schema for env diverges from `.env.example` over time | `.env.example` is the documented source; reviewer checks both files in any env-related PR |
| pino transport differences between dev and CI cause confusing test output | Tests use `pino`'s test-friendly mode (silent or captured); never depend on transport-specific formatting |
| Local FS rootPath confusion when running from wrong directory | Logger emits "WebToon initialized with WORKSPACE_ROOT=..." at info level on every CLI invocation |
| ESLint + Prettier rule conflicts | `eslint-config-prettier` extended last in the config to disable any ESLint formatting rules |
| Test temp dirs leak on test failure | `tests/helpers/temp.ts` uses `os.tmpdir()` + `mkdtemp` (unique names); cleanup in `afterEach`; OS eventually reclaims any leaks |
