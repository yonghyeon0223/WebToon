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
npm run generate                          # all pages (skips existing)
npm run generate -- --start=1 --end=1     # just p01
npm run generate -- --start=5 --end=10    # p05 ~ p10 (both inclusive)
npm run generate -- --start=15            # p15 to last
npm run generate -- --end=5               # p01 ~ p05
npm run generate -- p05 p07               # specific pages
npm run generate -- --force               # regenerate even if image exists
```

Combine flags as needed (e.g. `--start=3 --end=8 --force`). Range flags take priority over positional page IDs.

## Layout

- `passages/{id}/prompts/_global_style.md` — canonical PIXAR × Mr. Men style brief, auto-injected into every prompt.
- `passages/{id}/prompts/pages/pNN.md` — per-page prompt body. YAML frontmatter `refs: [...]` declares which previously-generated page images to attach as references.
- `passages/{id}/images/pages/pNN.png` — generated outputs.
- `passages/{id}/story.md` — source narrative the prompts derive from.
- `generate.ts` — the script.
