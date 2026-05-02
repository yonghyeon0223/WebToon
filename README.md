# WebToon

Sequential image generation for the *Mr. Realistic* picture-book series via Nano Banana Pro.

## Setup

```bash
npm install
cp .env.example .env
# fill GEMINI_API_KEY
```

## Generate

```bash
npm run generate                          # catch-up: skip existing, fill gaps
npm run generate -- --start=1 --end=1     # just p01 (regenerates)
npm run generate -- --start=5 --end=10    # p05 ~ p10 (both inclusive)
npm run generate -- --start=15            # p15 to last
npm run generate -- --end=5               # p01 ~ p05
npm run generate -- p05 p07               # specific pages by id
```

Two modes:

- **No args (catch-up mode)** — skips any page whose image already exists. Re-running after a partial completion safely fills in gaps without burning API credits.
- **Explicit targeting (`--start`/`--end` or positional)** — always (re)generates the targeted pages. Any existing image is **archived first** to `images/pages/_archive/pNN_YYYY-MM-DDTHHmmss.png` before being replaced. Nothing is ever silently destroyed.

Range flags take priority over positional page IDs when both are given.

## Layout

- `passages/{id}/prompts/_global_style.md` — canonical PIXAR × Mr. Men style brief, auto-injected into every prompt.
- `passages/{id}/prompts/pages/pNN.md` — per-page prompt body. YAML frontmatter `refs: [...]` declares which previously-generated page images to attach as references.
- `passages/{id}/images/pages/pNN.png` — current generated outputs.
- `passages/{id}/images/pages/_archive/` — timestamped previous versions of regenerated pages (clean it up manually when no longer needed).
- `passages/{id}/story.md` — source narrative the prompts derive from.
- `generate.ts` — the script.
