# Authoring Workflow — New Passage

Step-by-step process for adding a new passage to WebToon. Each step references the templates and meta-prompts that go with it.

## 0. Prerequisites

- The raw passage text (English exam passage).
- Knowledge of test metadata: year-month, region, grade, question number.
- A Claude chat session ready (claude.ai or Claude Code).

## 1. Decide the passage ID

Format: `{YYYY-MM}-{region}-{grade}-Q{NN}-{content-slug}`

Examples:
- `2025-06-busan-10th-Q24-open-to-interpretation`
- `2024-11-seoul-12th-Q33-language-shapes-thought`

The `content-slug` should be a 2–5 word kebab-case summary of the passage's main idea — descriptive enough to recognize, short enough to type.

## 2. Scaffold the passage directory

Create the following structure under `passages/{id}/`:

```
passages/{id}/
├── passage.yaml          # from templates/passage.yaml.template
├── source.md             # from templates/source.template.md
├── story.md              # from templates/story.template.md
├── prompts/
│   ├── characters/
│   ├── locations/
│   └── pages/            # FLAT — no chapter subdirs
└── images/
    ├── characters/
    ├── locations/
    └── pages/            # FLAT — no chapter subdirs
```

(A future sprint will provide `webtoon scaffold {id}` to do this in one command.)

## 3. Source extraction

In Claude chat, use **`meta-prompts/01-passage-to-story.md`** with the raw passage as input. The output includes:

- A `source.md` body (raw passage + key vocabulary + theme summary)
- A draft `story.md` (adapted Mr. Men style picture-book story, with chapters and vocabulary tables)
- A draft `passage.yaml` (with structured metadata)

Save each into the corresponding files under `passages/{id}/`.

**Iterate** with Claude until you're happy with the story. The story is the foundation — every downstream artifact (characters, locations, pages) depends on it.

## 4. Character extraction

Once the story is finalized, use **`meta-prompts/02-story-to-characters.md`** with the story as input. The output is one character reference card per character, each matching `templates/character-card.template.md`.

Save them as `passages/{id}/prompts/characters/NN_name.md` (numbered for stable ordering, e.g., `01_realistic.md`, `02_logical.md`).

**Important**: every character card embeds the visual style anchor from `style-anchor.md`. The pipeline relies on the style anchor being present in every prompt to maintain cross-page consistency.

## 5. Location extraction

Use **`meta-prompts/03-story-to-locations.md`** with the story as input. The output is one location reference card per recurring location.

Save as `passages/{id}/prompts/locations/NN_name.md`.

**Skip locations** that appear only in 1 page — describe them inline in the page prompt instead. Reference cards are an investment that pays off when a location recurs.

## 6. Page prompts

Use **`meta-prompts/04-story-to-pages.md`** with the story + character list + location list as input. The output is one page prompt per page in each chapter.

Save as `passages/{id}/prompts/pages/pNN.md` (e.g., `p01.md`, `p02.md`, ..., `p32.md`). Pages are flat-numbered regardless of how many chapters/scenes the narrative has — the chapter division belongs to `story.md`, not to the file system.

Each page prompt must include in its frontmatter:
```yaml
references:
  characters: [01_realistic, 02_logical]
  locations: [02_living_room]
```

The pipeline reads this and attaches the corresponding reference images automatically.

## 7. Generate reference images first

Run the pipeline limited to characters and locations:

```bash
webtoon generate {id} --stage characters
webtoon generate {id} --stage locations
```

(Sprint 5+ syntax, subject to change.)

Inspect the generated images. If a character or location looks wrong, edit the prompt and rerun. The pipeline detects prompt changes via hash and re-generates only what changed.

## 8. Generate page images

Once references look right:

```bash
webtoon generate {id} --stage pages
```

The pipeline runs all pages in parallel (up to `MAX_PARALLEL_REQUESTS`), attaching the right character + location references to each page automatically.

## 9. Review and iterate

Look at the page outputs. If a page is off:

- Edit the page prompt and rerun just that page: `webtoon generate {id} --page p05`
- If a character looks inconsistent across pages, the issue is usually the character reference — re-run the character generation, then re-run all pages that use it (the pipeline cascades automatically when a reference image's hash changes).

## 10. Done

When all images look right, the passage is complete. Output is under `passages/{id}/images/`. State is tracked in `passages/{id}/.state.json` so the next run skips already-completed work.

---

## Tips

- **The style anchor is non-negotiable.** Don't deviate per passage — visual consistency across passages is what makes the project a coherent series.
- **Per-passage village color palette** is fine and encouraged. Each passage can have its own dominant tones; the style anchor specifies how to render, not what colors.
- **Iterate prompts cheaply.** The pipeline's hash-based skip means re-running is cheap once a passage is mostly done.
- **Don't generate everything at once on first run.** Generate one character first to verify the style is landing right, THEN scale up. Saves API quota and disappointment.
