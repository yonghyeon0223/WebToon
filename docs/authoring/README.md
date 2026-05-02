# Authoring a New Passage

This directory documents the **manual authoring workflow** for adding a new passage to the WebToon project. The image-generation pipeline does not generate stories or prompts — those are crafted by a human collaborating with Claude in chat, following the structure documented here.

## Why manual?

Story writing and prompt writing benefit from human creative control + iteration in Claude chat. Image generation benefits from automation. The split is deliberate. See `../../CLAUDE.md` § Project Overview.

## Quick start

1. **Pick a passage ID** in the format `{YYYY-MM}-{region}-{grade}-Q{NN}-{slug}` (e.g., `2025-06-busan-10th-Q24-open-to-interpretation`).
2. **Create the directory**: `passages/{id}/` with subdirs `prompts/{characters,locations,pages/{ch1,ch2}}/` and `images/{characters,locations,pages/{ch1,ch2}}/`. (A scaffold script will land in a future sprint.)
3. **Run the meta-prompts** (in `meta-prompts/`) in order, with Claude in chat:
   - `01-passage-to-story.md` — paste raw passage → get adapted story
   - `02-story-to-characters.md` — paste story → get character cards
   - `03-story-to-locations.md` — paste story → get location cards
   - `04-story-to-pages.md` — paste story + character/location refs → get page prompts
4. **Save outputs** into the corresponding files under `passages/{id}/`, using the file structures in `templates/`.
5. **Run the pipeline**: `webtoon generate {id}` (Sprint 5+). The pipeline reads your prompts, attaches reference images, and produces the final picture book images.

## Files in this directory

| File | Purpose |
|---|---|
| `README.md` | this file |
| `workflow.md` | the full step-by-step authoring process with checks |
| `style-anchor.md` | the locked PIXAR × Mr.Men visual style brief — embedded in every prompt |
| `templates/` | file-structure templates with `{{PLACEHOLDER}}` markers |
| `meta-prompts/` | copy-paste prompts for Claude chat to produce structured outputs |

## Templates

The output of each meta-prompt should match the corresponding template:

| Meta-prompt | Produces files matching | Save to |
|---|---|---|
| `01-passage-to-story.md` | `templates/source.template.md` + `templates/story.template.md` + `templates/passage.yaml.template` | `passages/{id}/source.md`, `story.md`, `passage.yaml` |
| `02-story-to-characters.md` | `templates/character-card.template.md` (one per character) | `passages/{id}/prompts/characters/NN_name.md` |
| `03-story-to-locations.md` | `templates/location-card.template.md` (one per location) | `passages/{id}/prompts/locations/NN_name.md` |
| `04-story-to-pages.md` | `templates/page-prompt.template.md` (one per page) | `passages/{id}/prompts/pages/chN/pNN.md` |

## When in doubt

- Style questions → `style-anchor.md`
- Frontmatter / file structure questions → `templates/`
- "How do I get Claude to produce X?" → `meta-prompts/`
- Pipeline runtime questions → `../sprints/` or `../cli.md` (Sprint 5)
