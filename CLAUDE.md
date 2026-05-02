# CLAUDE.md — WebToon

## Project Overview

WebToon is a personal **image-generation pipeline** that turns already-authored prompts into Mr. Men style mobile picture books, one passage at a time, via Gemini Pro image generation.

### Scope (sharp)

- **Pipeline input** = manually authored prompts (character cards + location cards + page prompts) plus the raw passage and adapted story for context.
- **Pipeline output** = generated images, one per character / location / page, with reference images attached automatically so style stays consistent.
- **Pipeline does NOT** generate stories or prompts. Those are written by a human collaborating with Claude in chat, following the templates and meta-prompts in `docs/authoring/`. Keeping story authoring outside the pipeline is a deliberate scope choice — see `docs/authoring/README.md`.

### Why this split

Story writing and prompt writing benefit from human creative control + iteration in chat. Image generation benefits from automation: parallel API calls, retry/backoff, prompt-hash idempotency, automatic reference attachment. Putting them in different layers gives each its right tool.

### Other constraints

This is a **personal local tool**, not a deployed product. The user is the only operator. There is no HTTP server, no authentication, no multi-user concerns. Priorities, in order: (1) consistent character/location appearance across all pages of a book (via reference image attachment), (2) efficient parallel generation that respects API limits, (3) easy iteration on prompts when the visual style needs tuning, (4) scalability to 100+ passages without architectural rework. Speed of delivery matters less than getting the architecture right.

The visual style is locked across all passages: **PIXAR animation studio quality × classic Roger Hargreaves Mr. Men silhouettes**. Story content varies per passage; visual style does not. The full brief lives in `docs/authoring/style-anchor.md` and is embedded in every prompt.

## Tech Stack

- **Runtime:** Node.js 24.11+ with TypeScript (strict mode). Pinned via `engines` in `package.json` and enforced in CI.
- **CLI Framework:** `commander`
- **AI Provider:** Google Gemini API for image generation (`@google/genai` SDK)
- **Storage:** Local filesystem (abstracted behind a `StorageService` interface so Cloudflare R2 / GCS can be added later without touching pipeline code)
- **State Tracking:** Per-passage `.state.json` file (no database)
- **Validation:** `zod` for env, config, and frontmatter validation
- **Markdown Parsing:** `gray-matter` (YAML frontmatter + markdown body)
- **Concurrency:** `p-limit` for parallel API call capping
- **Logging:** `pino` (structured JSON, with `pino-pretty` for dev)
- **Testing:** Vitest
- **CI:** GitHub Actions (lint + type-check + test gates on every PR)

## Architecture Principles

### Source of Truth

**Markdown files in `passages/{id}/` are the single source of truth for all content.** Prompts, story, metadata — all live in version-controlled markdown. The pipeline reads them and produces images. State files (`.state.json`) are derived/cached state, not source of truth — they can always be reconstructed by re-running generation. Generated images are likewise reproducible artifacts, not source.

This means: edits happen in markdown files, not in the database, not in a UI. The repo is the truth.

### Passage Isolation

- Each passage is fully self-contained under `passages/{passage_id}/`
- Characters and locations are unique per passage — no cross-passage sharing, no global character library. A "Mr. Realistic" character in one passage is a separate entity from any character in another passage, even if names overlap.
- A passage can be developed, regenerated, archived, or deleted with zero impact on other passages.

**Passage ID format:** `{YYYY-MM}-{region}-{grade}-Q{NN}-{content-slug}`

Each segment encodes meaningful metadata directly in the ID for sortability and filterability:
- `YYYY-MM` — when the test was taken (year-month). Enables chronological sorting.
- `region` — kebab-case region of the test (`busan`, `seoul`, `daegu`, `gyeonggi`, `national` for 전국 모의고사, etc.)
- `grade` — student grade (`10th`, `11th`, `12th`). Enables filtering by grade level.
- `Q{NN}` — question number on the test (`Q24`, `Q33`). Enables locating the source.
- `content-slug` — brief kebab-case content description (`open-to-interpretation`, `biased-perception`).

Example: `2025-06-busan-10th-Q24-open-to-interpretation`

The full structured metadata is also duplicated into `passage.yaml` (separate fields) so the pipeline can query without parsing the slug. The folder name is the human-readable handle; `passage.yaml` is the machine-readable source.

### Generation Pipeline (Stages with Dependencies)

The pipeline has three stages with strict dependency order:

1. **Characters** — no dependencies, fully parallel within stage
2. **Locations** — no dependencies, fully parallel within stage
3. **Pages** — depend on characters AND locations being generated first; fully parallel within stage

Stages run sequentially. Within a stage, all resources generate in parallel up to the configured concurrency cap. The pipeline fails fast if a page references a character or location that hasn't been generated and isn't queued.

### Project Structure

```
src/
  cli.ts                # Command entry (commander) — only routes to handlers
  config.ts             # Env validation (zod), exports typed `config` object
  pipeline.ts           # Stage orchestration (characters → locations → pages)
  generator.ts          # Gemini API calls, retry logic, parallelism control
  prompts.ts            # Markdown + frontmatter parsing, prompt extraction
  state.ts              # .state.json read/write/diff, prompt hash comparison
  hash.ts               # Prompt hashing (sha256 of prompt body + ref image hashes)
  references.ts         # Resolves reference IDs to image file paths
  storage/
    types.ts            # StorageService interface
    local.ts            # Local filesystem implementation
    # r2.ts             # (future) Cloudflare R2 implementation
  logger.ts             # pino setup, per-invocation correlation ID
  errors.ts             # WebToonError base class + subclasses
passages/
  {YYYY-MM}-{region}-{grade}-Q{NN}-{slug}/   # Self-contained passage
    passage.yaml        # Metadata: id + structured fields (testDate, region, grade, questionNumber, contentSlug, title, sourceType)
    source.md           # Original input text (e.g., the SAT passage)
    story.md            # Adapted picture book story
    prompts/
      characters/
        NN_name.md
      locations/
        NN_name.md
      pages.md      # SINGLE master file for all pages (global style + per-page sections)
    images/             # Generated outputs (when StorageService is local)
      characters/
      locations/
      pages/        # flat — no chapter subdirs
    .state.json         # Generation state (auto-managed)
tests/
  unit/                 # Mirrors src/ structure
  integration/          # Full pipeline tests with mocked Gemini
  fixtures/             # Sample passages, expected state transitions
  helpers/              # Test utilities (temp dirs, mock storage)
docs/
  sprints/              # Sprint folders (sprint-NN-short-description/)
  prompts/
    format.md           # Prompt file format spec (frontmatter schema)
  cli.md                # CLI command reference (living doc)
scripts/
  migrate.ts            # One-shot scripts (e.g., migrating existing prompts)
```

### Module Pattern

This project does not have controllers/services/models because there is no HTTP layer. Modules are organized by **responsibility**, not by feature:

- **`cli.ts`** wires commands to handler functions. No business logic.
- **`pipeline.ts`** orchestrates stages. Knows about dependency order. Calls `generator` and updates `state`.
- **`generator.ts`** is the only module that talks to the Gemini SDK. Handles retries, timeouts, error normalization. Returns generated image bytes.
- **`prompts.ts`** parses prompt files. Returns structured `Prompt` objects.
- **`references.ts`** resolves frontmatter `references` arrays to actual image file paths. Verifies they exist.
- **`state.ts`** is the only module that reads/writes `.state.json`. All other modules go through it.
- **`storage/`** is the only module that touches `fs` for image bytes. Pipeline writes images via `StorageService`.

This separation keeps responsibilities testable in isolation. `pipeline.ts` can be unit-tested with mocked `generator`, `state`, `storage`.

### Prompt File Format

Every prompt file uses YAML frontmatter for machine-readable metadata + markdown body for human content (the prompt text). The pipeline parses frontmatter, extracts the prompt from the first fenced code block in the body.

**Character / Location prompts:**
```markdown
---
id: 01_realistic
output: characters/01_realistic.png
---

# Mr. Realistic — Character Reference Card

## Prompt
\`\`\`
[prompt text Gemini will receive]
\`\`\`

## Notes
[free-form human notes — not sent to Gemini]
```

**Page master file (`pages.md`):**

A single file per passage that contains:

1. **GLOBAL STYLE block** at the top — the full PIXAR × Mr. Men style brief, defined ONCE. The user pastes this with every page when generating images.
2. **REFERENCE GLOSSARY** — descriptive names → image file paths.
3. **Per-page sections** — minimal: refs (descriptive names) + the exact text on the page. Composition and rendering details left to Gemini given proper references.

```markdown
## 🎨 GLOBAL STYLE (paste this with every page)
\`\`\`
[full style brief]
\`\`\`

## 📚 REFERENCE GLOSSARY
| Reference name | File | Description |
| **Mr. Realistic** | images/characters/01_realistic.png | ... |

## 📑 Pages

### P01 — 동네 첫 등장
**Refs:** Mr. Realistic, Mr. Realistic's house
**Show on page:**
- Narration plate: "이 동네에서 가장 유명한 사람은 Mr. Realistic이에요."

### P02 — ...
```

This format is intentionally minimal per page. Style is defined globally; references provide visual context; Gemini handles composition.

**Frontmatter schema for character/location cards (validated with zod):**
- `id` (required) — unique within its category for the passage
- `output` (required) — relative path under `passages/{id}/images/`

**`pages.md` parsing:** the pipeline parses the master file by markdown headings. Each `### PNN — title` section becomes one page, with `**Refs:**` parsed for reference IDs and `**Show on page:**` content extracted as the prompt body. The GLOBAL STYLE block is prepended to every page's effective prompt at generation time.

### Reference Resolution

When a page declares `references.characters: [01_realistic]`, the pipeline:
1. Looks up `passages/{id}/images/characters/01_realistic.png` via the configured `StorageService`
2. If missing → throws `MissingReferenceError` with the page ID and missing reference ID
3. If present → reads the bytes, attaches as multimodal input to the Gemini API call alongside the prompt text

This is the consistency mechanism. Pages must always reference the canonical character/location image — they never re-describe the character in text alone, because text descriptions drift across pages and Gemini interprets them differently each time. The reference image is the visual contract.

### State Tracking (`.state.json`)

Per-passage state file tracks every generation attempt. Schema (validated with zod on read):

```json
{
  "version": 1,
  "passageId": "2025-06-busan-10th-Q24-open-to-interpretation",
  "characters": {
    "01_realistic": {
      "status": "completed",
      "promptHash": "sha256:abc123...",
      "outputPath": "images/characters/01_realistic.png",
      "generatedAt": "2026-05-02T14:30:00.000Z",
      "attempts": 1
    }
  },
  "locations": { },
  "pages": {
    "ch1/p01": {
      "status": "failed",
      "promptHash": "sha256:def456...",
      "lastAttempt": "2026-05-02T14:35:00.000Z",
      "attempts": 3,
      "error": {
        "code": "RATE_LIMITED",
        "message": "Gemini quota exceeded"
      }
    }
  }
}
```

**Status values:** `pending` (queued), `running` (in-flight), `completed` (success), `failed` (terminal failure after retries), `interrupted` (CLI killed mid-flight — recoverable).

**Hash semantics:**
- `promptHash` = sha256 of (prompt text + sorted reference image hashes)
- If hash matches `state.json` AND `status: completed` → skip regeneration
- If hash differs → regenerate (prompt or upstream reference changed)
- `--force` flag bypasses hash check entirely

**Cascade invalidation:**
- Regenerating a character invalidates every page that references it (next pipeline run will detect the hash change because the reference image bytes changed)
- This is automatic via the hash mechanism, not a separate cascade pass

**State file is the source for "what's done"; the filesystem is the cache.** If state and filesystem disagree (e.g., image deleted but state says completed), state wins and the next run re-checks via `StorageService.exists()`.

### Storage Abstraction

Pipeline never touches `fs` for image bytes. Always goes through `StorageService`:

```typescript
interface StorageService {
  exists(key: string): Promise<boolean>;
  read(key: string): Promise<Buffer>;
  write(key: string, data: Buffer, contentType?: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
  url(key: string, options?: { signed?: boolean; expiresIn?: number }): Promise<string>;
}
```

`key` is a passage-relative path (e.g., `passages/2025-06-busan-10th-Q24-open-to-interpretation/images/characters/01_realistic.png`). The implementation translates to its own backend.

Implementations:
- **`LocalStorageService`** — uses Node.js `fs/promises`. Reads/writes under the project's `passages/` directory. `url()` returns `file://` URLs.
- **`R2StorageService`** — (future) Cloudflare R2 via S3-compatible SDK. Returns `https://` URLs (signed or public).

The pipeline works with `StorageService`, never directly with `fs` or any cloud SDK. Tests use an in-memory mock implementation.

### Concurrency & Rate Limits

- `p-limit` caps concurrent Gemini API calls at `MAX_PARALLEL_REQUESTS` (default 5)
- Within a stage, all resources run in parallel up to the limit; stages themselves run sequentially
- Failed calls retry with exponential backoff: 1s, 4s, 16s (3 attempts default, configurable)
- Rate-limit errors (HTTP 429 from Gemini) trigger longer backoff and reduce in-flight concurrency by half until next success
- Generation timeout per call: 120 seconds (configurable). Image generation is slow.

### Idempotency via Prompt Hashing

- Hash = sha256 of (prompt body text + sorted SHA-256s of attached reference image bytes)
- Same hash → same generation request → skip if previously completed
- This means: if a character image is regenerated (different bytes), every dependent page's hash changes → cascade regeneration triggered automatically on the next pipeline run
- `--force` bypasses hash check; useful when prompt is unchanged but you want a different stochastic output

### Error Handling

- Custom error classes extend `WebToonError` base, which carries: `code` (machine-readable), `message` (human-readable), `cause` (original error), `context` (passage ID, resource ID, etc.)
- **Operational errors** (missing reference, invalid frontmatter, API rate limit, timeout) are caught by the pipeline, logged, and surfaced in `.state.json` with the resource marked `failed`
- **Programmer errors** (undefined access, type mismatches) crash the process — let them bubble up
- **CLI exit codes:** `0` success, `1` partial generation failures (some resources failed but others succeeded), `2` configuration / setup error (invalid env, missing API key, malformed passage), `130` SIGINT
- Error messages **always include** the affected passage ID and resource ID so the user knows where to look

### Logging

- Structured JSON via `pino` — never `console.log` in production code paths
- Per-CLI-invocation correlation ID generated at start (`inv_xxx`), included in every log entry
- Log levels: `error` (failures requiring attention), `warn` (retries, degradations, rate limit hits), `info` (stage start/end, resource completions, summary stats), `debug` (per-call detail, hash comparisons)
- **Log every Gemini API call** with: model, prompt length, attached reference count, latency, output size, retry count
- **Never log:** the API key, full prompt bodies at info level (debug only — large), generated image bytes
- Output: JSON to stderr (so stdout stays clean for any future CLI piping). Dev mode uses `pino-pretty` transport for colored, readable terminal output.

### Configuration

All environment variables are validated at startup with `zod`. The process crashes immediately if any required var is missing, has the wrong type, or has an unexpected value. Validation happens in `src/config.ts`, which exports a typed `config` object. The rest of the app imports from `config` — **no module touches `process.env` directly outside `config.ts`**.

Required env vars (will be defined in sprint 1):
- `GEMINI_API_KEY` — Google Gemini API key
- `GEMINI_IMAGE_MODEL` — model name (default: `gemini-2.5-flash-image` — verify in [Google AI Studio](https://aistudio.google.com/) and override if newer model is available; user prefers latest most-capable image model)
- `MAX_PARALLEL_REQUESTS` — concurrency cap for Gemini calls (default: 5)
- `GENERATION_TIMEOUT_MS` — per-call timeout (default: 120000)
- `MAX_RETRIES` — retry attempts on failure (default: 3)
- `STORAGE_BACKEND` — `local` (default; future: `r2`)
- `LOG_LEVEL` — `error` | `warn` | `info` | `debug` (default: `info`)
- `WORKSPACE_ROOT` — absolute path to the `passages/` parent directory (default: project root)

### Date / Time Handling

- All timestamps in `.state.json` stored as ISO 8601 UTC strings (e.g., `"2026-05-02T14:30:00.000Z"`)
- Internal handling uses `Date` objects in UTC, formatted to ISO when persisting
- No local timezone math anywhere in the codebase

### Graceful Shutdown

- On SIGINT (Ctrl+C) or SIGTERM: stop scheduling new generations, wait for in-flight calls to finish (with a timeout — default 30 seconds), persist `.state.json`, exit cleanly
- Resources interrupted mid-flight are marked `interrupted` in state — next run will retry them
- Implemented in `cli.ts` as a single signal handler — not scattered across modules
- Prevents corrupted `.state.json` and orphaned partial files on Ctrl+C

### Visual Style Consistency

The pipeline does not enforce visual style — that's the job of the prompt content. But the architecture supports style consistency through these mechanisms:

- **Reference image attachment** — pages always include canonical character/location images, so the model has visual examples to maintain
- **Prompt fragment reuse** — the locked PIXAR × Mr. Men style anchor is repeated verbatim in every prompt file. (A future sprint may extract it into a `shared/style_anchor.md` fragment that the pipeline injects automatically. Not yet — premature abstraction.)
- **Per-passage isolation** — a passage's style cannot drift due to changes in another passage

## Development Process

### Test-Driven Development (TDD)

For every module in every sprint:
1. **Discuss** what the module should do, what its inputs and outputs are, what edge cases and failure modes exist
2. **Write tests first** — unit tests for pure logic (prompts.ts, hash.ts, state.ts), integration tests for full pipeline runs against a mocked Gemini API
3. **Implement** until all tests pass
4. **Refactor** with the test safety net in place

Test categories every module must cover:
- **Normal cases:** Valid inputs, expected outputs (single character, simple page, fresh state)
- **Special cases:** Empty passages, single resource, no references, max parallelism, hash collision recovery
- **Edge cases:** Malformed frontmatter, missing reference files mid-run, Gemini API errors (timeout, rate limit, invalid model), partial generation interrupted by SIGINT, state file corruption, concurrent CLI invocations on the same passage, Unicode in prompt content, prompt body without a code block, reference image with same name as another but different content

### Sprint Process

Each sprint happens in a separate Claude Code session. To maintain continuity across sessions:

1. **Phase 1 — Planning:** Discuss the module(s) being built, function signatures, data flow, design decisions down to implementation detail. The user is involved in every decision. Document the plan before writing any code.
2. **Phase 2 — Testing:** Discuss normal, special, edge cases. Discuss performance and failure-mode considerations. Write all tests before implementation.
3. **Phase 3 — Implementation:** Write code until all tests pass. Refactor with the safety net.
4. **Phase 4 — Review:** Write the sprint report, verify test results, document deferred work and handoff notes for the next sprint.

### Sprint Documentation

Each sprint gets its own folder under `docs/sprints/` with a descriptive name:
```
docs/sprints/
  sprint-01-foundation-and-storage/   ✅ done
  sprint-02-prompts-and-state/        — parse prompt files, manage .state.json
  sprint-03-gemini-generator/         — Gemini API client, retry logic
  sprint-04-pipeline-orchestration/   — 3-stage parallel pipeline
  sprint-05-cli/                      — commander commands, CLI UX
  ...
```

Note: an earlier plan included a Sprint 6 migration script. The first passage was migrated manually before Sprint 2 started, so future passages are created from the templates in `docs/authoring/templates/` — no migration script needed.

Each sprint folder contains the four-phase report. The folder name follows `sprint-NN-short-description` (kebab-case).

**Sprint scope:**
- Each sprint covers one focused area (a module, a feature, a refactor) — small enough to plan, test, and implement in one session
- Sprints should be modular — each sprint's deliverable should be as self-contained as possible, minimizing half-built dependencies on future sprints
- If a feature requires more than ~6 substantial functions or touches more than 3 modules, split it across sprints with clear handoff notes

**Critical rules for sprint docs:**
- **Cumulative, not just diffs.** When adding a new module, document its full interface and how it interacts with existing modules — not just what changed.
- **Code walkthroughs are teaching-level.** Explain not just what the code does, but WHY it's written that way, what would go wrong if done differently, and the underlying concepts (Node.js streams, Gemini API multimodal input format, zod schema composition, p-limit semantics, sha256 properties, Express middleware order if/when we add UI, etc.). The user is a student and wants to learn professional patterns.
- **Planning is granular.** Include function signatures, error-handling branches, hash algorithm choices, file format decisions, middleware order if applicable. No black boxes.

```markdown
# Sprint NN — [Title]

## Phase 1: Planning

### Objectives
What we're building and why. How it fits the larger pipeline.

### Affected / New Modules
List of modules touched, with their responsibility statements.

### Function Signatures
TypeScript signatures for every new function, with parameter and return type rationale.

### Data Flow
How data moves through this sprint's code (e.g., "CLI invocation → loads passage.yaml → for each prompt file in characters/ → parses frontmatter → schedules generator call → writes image via storage → updates state").

### Design Decisions
For each decision:
- What we decided
- What alternatives we considered
- Why we chose this approach
- Trade-offs accepted

### Implementation Plan
Step-by-step build order, error handling strategy per function, dependencies between components.

## Phase 2: Testing

### Test Cases
#### Normal Cases
#### Special Cases
#### Edge Cases

### Failure Mode Analysis
What can go wrong, how we detect it, how we report it, how we recover.

### Performance Considerations
Memory footprint of large state files, parallel call efficiency, hash computation cost, file I/O patterns.

## Phase 3: Implementation

### Code Walkthrough
Detailed, teaching-level explanation:
- What each file/function does and why it exists
- How data flows through the layers
- Why specific patterns were chosen over alternatives
- Underlying concepts explained (e.g., why we use sha256 not md5, how zod's schema composition works, why we attach reference images as bytes not URLs to the Gemini SDK)
- Common mistakes and how the code avoids them

### Key Implementation Details
Non-obvious choices, performance optimizations, defensive measures.

## Phase 4: Review

### Test Results
- Total tests: N passed / N total
- Coverage summary
- Notable edge cases and what they caught

### Deferred Work
What's explicitly not done, why, and which future sprint should pick it up.

### Notes for Next Sprint
Handoff context: known limitations, modules that the next sprint will need to integrate with, schema decisions that may need revisiting.
```

### Living Documentation

Two living-reference docs (separate from sprint journals):

- **`docs/prompts/format.md`** — the prompt file format spec. YAML frontmatter schema, body conventions, examples. Updated in place as the format evolves.
- **`docs/cli.md`** — the CLI command reference. Every command, flag, and example. Updated in place as commands are added.

Sprint docs are the journal (what happened in this sprint). Living docs are the current truth.

## Conventions

### TypeScript
- Strict mode enabled (`strict: true` in tsconfig)
- No `any` — use `unknown` and narrow with type guards when type is truly unknown
- Prefer interfaces for object shapes, type aliases for unions/primitives
- All function parameters and return types explicitly typed (no implicit `any` from inference of complex args)
- Use `as const` assertions for fixed string sets
- Prefer discriminated unions for state machines (e.g., `GenerationStatus`)

### Naming
- Files: `kebab-case` (e.g., `prompt-parser.ts`)
- Variables / functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Type aliases / interfaces: `PascalCase`
- Passage IDs: `{YYYY-MM}-{region}-{grade}-Q{NN}-{content-slug}` (e.g., `2025-06-busan-10th-Q24-open-to-interpretation`)
- Resource IDs (characters / locations): `{NN}_{snake_name}` (e.g., `01_realistic`, `06_village_square`)
- Page IDs: `pNN` flat-numbered (e.g., `p01`, `p32`) — narrative chapter division belongs to `story.md`, not the file system
- Environment variables: `UPPER_SNAKE_CASE`, prefixed by category where helpful (e.g., `GEMINI_API_KEY`, `STORAGE_BACKEND`)

### Code Comments
- **Don't comment what the code does** — the code should be readable. If it isn't, rewrite the code.
- **Do comment why** — non-obvious decisions, workarounds for known issues, performance optimizations that make the code less intuitive.
- **Do comment Gemini API quirks** — model-specific behaviors, prompt patterns that work / don't work, observed inconsistencies. These are tribal knowledge and belong near the code that depends on them.
- **No bare `// TODO`** — `// TODO(sprint-3): add cascade invalidation pass` is fine; bare `// TODO` is not.
- **Detailed explanations belong in sprint docs**, not in code. Code comments are signposts, not essays.

### Dependencies
- **Pin exact versions** — no `^` or `~` in `package.json`. Deterministic builds.
- **Minimal dependencies** — before adding a package, ask: can Node's standard library do this in under 30 lines? If yes, skip. Every dependency is an attack surface and a maintenance burden.
- **No unmaintained packages** — check last publish date, open issue count, weekly downloads. If a security-relevant package hasn't been updated in 2+ years, find an alternative.
- **`npm audit`** runs in CI — build fails on high/critical vulnerabilities.
- **`package-lock.json` is always committed** to git.

### Git
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`
- One logical change per commit
- Tests and implementation may be in the same commit if they're for the same feature
- **Commit and push at the end of each sprint** — after Phase 4 (Review) is complete, create a commit with all sprint work and push to the remote repository
