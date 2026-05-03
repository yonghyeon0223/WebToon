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
npm run generate -- --start=5 --end=10 --seq   # pause after each page; see --seq prompt below
```

### Two modes

- **No args (catch-up mode)** — skips any page whose image already exists. Re-running after a partial completion safely fills in gaps without burning API credits.
- **Explicit targeting (`--start`/`--end` or positional)** — always (re)generates the targeted pages. Any existing image is **archived first** to `images/pages/_archive/pNN_YYYY-MM-DDTHHmmss.png` before being replaced. Nothing is ever silently destroyed.

Range flags take priority over positional page IDs when both are given.

### --seq (interactive review)

After each page is generated, the script pauses and prompts:

```
✓ p05 done. Inspect, then:
  [Enter]     next page                          stop         exit
  rf          regenerate with flash2             rp           regenerate with pro
  ef <text>   edit with flash2 + feedback        ep <text>    edit with pro + feedback
> 
```

- **Enter** → advance to next page.
- **`stop`** (or **Ctrl+C**) → graceful exit.
- **`rf` / `rp`** → regenerate this page from scratch (same prompt, same refs) using flash2 or pro. For when the output is just stochastically off; per-page model swap is allowed.
- **`ef <feedback>` / `ep <feedback>`** → edit this page using flash2 or pro: the feedback string is injected into the prompt and the current image is attached as the LAST reference, so the model treats it as "modify this image based on the feedback."
- Verbose forms also work: `regen flash2`, `regen with pro`, `edit pro vocab clip too small`, etc.
- Loops on the same page until you press Enter or stop. Each retry / edit archives the previous attempt.

### Model selection

Default is **flash2** (`gemini-3.1-flash-image-preview`) — cheap iteration. Use `--model=pro` for the final pass per page. Switch tier per run with `--model`:

```bash
npm run generate -- --model=flash         # Nano Banana (gemini-2.5-flash-image)
npm run generate -- --model=flash2        # Nano Banana 2 (gemini-3.1-flash-image-preview)
npm run generate -- --model=pro           # Nano Banana Pro (default)
npm run generate -- --model=<full-id>     # any model id passes through verbatim
```

Resolution priority: `--model` flag > `GEMINI_IMAGE_MODEL` env var > default Pro.

**Recommended cost-saving workflow** — draft with Flash (~$0.04/image), upgrade only finals to Pro (~$0.13/image):

```bash
# 1. First pass on the whole book with Flash (~$5 for 107 pages)
npm run generate -- --model=flash

# 2. Inspect outputs, identify weak pages

# 3. Regenerate the weak ones with Pro (archives the Flash version)
npm run generate -- --model=pro --start=5 --end=5
npm run generate -- --model=pro p18 p27
```

## View

Open `passages/{id}/viewer.html` in a browser. Cuttoon (page-by-page)
reader optimized for mobile. Navigate with the buttons, tap left/right
edges of the image, swipe (mobile), or arrow keys (desktop). URL hash
preserves position across refresh. Auto-detects which pages exist.

## Export (share via messenger)

```bash
npm run export
```

Bundles every generated page into a single self-contained interactive HTML
at `passages/{id}/{id}.html`. All images embedded as base64 — one file,
no external dependencies, opens in any modern browser.

UI:
- Image fills the full viewport (no chrome).
- Tap anywhere → next page.
- Swipe left / right (mobile), arrow keys (desktop) to navigate.
- A gesture hint shows on first load (with the first page dimmed behind
  it) and stays visible until the user makes their first navigation —
  any tap, swipe, or arrow key clears it. Subsequent loads via URL
  hash skip the hint entirely.
- "끝" end-screen with a restart button after the last page.
- URL hash preserves position across refresh.

Send the file via KakaoTalk / Telegram / email and the recipient opens it
in their browser.

## Layout

- `passages/{id}/prompts/_global_style.md` — canonical PIXAR × Mr. Men style brief, auto-injected into every prompt.
- `passages/{id}/prompts/pages/pNN.md` — per-page prompt body. YAML frontmatter `refs: [...]` declares which previously-generated page images to attach as references.
- `passages/{id}/images/pages/pNN.png` — current generated outputs.
- `passages/{id}/images/pages/_archive/` — timestamped previous versions of regenerated pages (clean it up manually when no longer needed).
- `passages/{id}/story.md` — source narrative the prompts derive from.
- `generate.ts` — the script.
