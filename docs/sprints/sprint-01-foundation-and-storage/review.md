# Sprint 01 — Phase 4: Review

## Test Results

```
Test Files:    5 passed (5)
Tests:         95 passed (95)
Duration:      ~1.0s

Coverage (v8):
  src/config.ts          100% / 100% / 100% / 100%
  src/errors.ts          100% / 100% / 100% / 100%
  src/logger.ts          100% / 100% / 100% / 100%
  src/storage/local.ts   100% / 100% / 100% / 100%
  All files              100% / 100% / 100% / 100%
                         (stmts / branch / funcs / lines)
```

`npm run check` (lint → type-check → tests) passes end-to-end.

### Tests by module

| Module | Tests | Notable coverage |
|---|---|---|
| `tests/helpers/temp.ts` | 8 | Cleanup idempotency, recursive removal, prefix verification |
| `src/errors.ts` | 16 | Subclass `instanceof` chain, `Error.cause` preservation, circular context |
| `src/config.ts` | 27 | All defaults, all enum values, type coercion, multi-issue errors, ZodError preservation |
| `src/logger.ts` | 15 | Level filtering, child logger inheritance, circular ref handling, ID uniqueness over 1000 calls |
| `src/storage/local.ts` | 29 | Round-trip, nested keys, Korean/space encoding, traversal rejection, mocked FS errors, 5MB binary |

### Notable edge cases that caught real issues

- **`Cannot redefine property: writeFile`** (caught early, before merge): ESM module bindings are immutable. Switched to `vi.mock(..., { spy: true })`. Same pattern will apply to all stdlib mocking from Sprint 3 onward.
- **`Imports are only used as type`** for `ZodError` and `Buffer`: `verbatimModuleSyntax: true` strictly enforces `import type`. Caught at lint time, no runtime impact.
- **`This expression is not callable` for pino default import**: Pino's CJS-style export doesn't play well with strict ESM. Named import (`import { pino }`) works.
- **Branch coverage hole on `i.path.join('.') || '<root>'`**: Removed the fallback (rare zod root-level errors get bare `: message`). Cleaner code, fewer branches.

## Deferred Work

Items considered and explicitly deferred (with target sprints):

| Deferred Item | Why | Target Sprint |
|---|---|---|
| `StorageService` interface + factory | YAGNI with one impl; extract when R2 added | 8+ (when R2 integration happens) |
| R2 storage implementation | Local FS sufficient for personal MVP; R2 deferred per user direction | 8+ (when serving images via UI) |
| `list()` method on storage | Pipeline knows its keys from prompts; no enumeration needed yet | When cleanup commands are introduced |
| Stream-based read/write | Image buffers fit in memory (<10MB each); streams premature | If we add video or higher-res outputs |
| Cross-platform path coverage tests on CI | Currently CI runs Linux only; user dev is Windows | When Windows-specific bugs surface |
| Code coverage report upload (Codecov, etc.) | Not needed for personal repo; CI prints summary inline | When/if multiple contributors |

## Notes for Next Sprint

### Sprint 2 — Prompts & State (recommended next)

**Scope:** Parse prompt files (markdown + YAML frontmatter) and read/write the per-passage `.state.json`. No Gemini calls, no orchestration.

**Modules to add:**
- `src/prompts.ts` — parses character/location/page prompt files. Validates frontmatter schema with zod. Extracts the prompt code block from the markdown body.
- `src/state.ts` — reads and writes `.state.json`. Computes prompt hashes (sha256 of body + sorted reference image hashes). Diffs current prompts against persisted state to determine what needs regeneration.
- `src/hash.ts` — sha256 helpers. Pure functions; trivially testable.
- `src/references.ts` — resolves frontmatter `references` arrays to file paths. Verifies referenced character/location prompt files exist (will verify image existence in Sprint 4 once generation is implemented).

**Dependencies they'll need:**
- `gray-matter` for frontmatter parsing (already in our planned-deps list; install in Sprint 2)
- `node:crypto` for sha256 (stdlib)

**Things this sprint enabled that Sprint 2 should leverage:**
- `LocalStorageService` is ready — Sprint 2's state module can use it for reading/writing `.state.json` (treat it like any other key under the passage's root)
- `WebToonError` hierarchy — Sprint 2 will add `PromptParseError`, `InvalidFrontmatterError`, `MissingReferenceError` (all extending `WebToonError`)
- `createInvocationLogger` — pass the logger through Sprint 2's modules so all hash/diff logs include the invocation correlation ID
- Test pattern `vi.mock(..., { spy: true })` — ready for mocking other stdlib modules

### General handoff context

- **Strict mode is unforgiving.** `noUncheckedIndexedAccess` means `arr[0]` is `T | undefined`. Future code must handle the undefined case explicitly. `exactOptionalPropertyTypes` means `{ x?: string }` and `{ x: string | undefined }` are distinct types. These choices catch real bugs but require more deliberate code.
- **`verbatimModuleSyntax: true` enforces `import type` discipline.** Anything used only as a type must use `import type`. ESLint catches violations.
- **Coverage at 100%** is the standard. New modules should aim for 100% from the start. Defensive blocks that are practically unreachable get `/* v8 ignore start/stop */` with an explanatory comment, never a silent skip.
- **Tests use `vi.mock({ spy: true })` for stdlib modules.** Don't use `vi.spyOn(fs, 'writeFile')` directly — it fails on ESM.

### Open items for review at the start of Sprint 2

- Does `prompts.ts` parse one file at a time, or does it batch-parse all files in a passage? (Recommendation: one at a time; batch operations live in `pipeline.ts` later.)
- Where does the prompt body's code-block extraction happen? Plain regex, or a markdown AST library? (Recommendation: regex — the format is constrained and we control the input. Adding a markdown parser dependency for one extraction is overkill.)
- How does state versioning work when the schema evolves? (Recommendation: include a `version: 1` field; future migrations check this and upgrade in place.)

These are Phase 1 (Planning) questions for Sprint 2 — answer them at the start of that session, not now.

## Final Status

✅ Sprint 1 complete. All planning, testing, implementation, and review documents committed under `docs/sprints/sprint-01-foundation-and-storage/`. Foundation is ready for Sprint 2.
