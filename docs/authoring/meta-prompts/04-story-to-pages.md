# Meta-prompt 04 — Story → Page Generation Master File

Once your story, character cards, and location cards are all finalized, use this prompt to generate a SINGLE master file containing all pages. Save the output as `passages/{id}/prompts/pages.md`.

---

```
You are helping me build per-page image-generation instructions for a picture
book in the "Mr. Realistic Series" — Mr. Men style adaptations of SAT
passages, rendered in PIXAR × Mr. Men hybrid visual style.

INPUT — the three finalized artifacts for this passage:

1) story.md:
{{PASTE story.md HERE}}

2) Character roster (IDs, names, one-line visual descriptions):
{{LIST character IDs and one-liners — e.g., "01_realistic — Mr. Realistic, terracotta body with magnifying glass"}}

3) Location roster (IDs, names, one-line descriptions):
{{LIST location IDs and one-liners — e.g., "02_living_room — Living room with dusty pink sofa, TV, mirror, shadowy corner"}}

═══════════════════════════════════════════
YOUR TASK — produce ONE master file: pages.md
═══════════════════════════════════════════

The master file follows the template at `docs/authoring/templates/pages.template.md`. It contains:

1. **GLOBAL STYLE block** — the full PIXAR × Mr. Men style brief, defined ONCE at the top. The user pastes this with every page when generating.

2. **REFERENCE GLOSSARY** — a table mapping descriptive reference names to file paths. Lets the user know which image files to attach for each page.

3. **Page entries** — one section per page with:
   - **Refs:** descriptive names (matching the glossary), including cross-page refs for scene continuity
   - **Anonymous in scene:** description of any non-named Mr. Men that should appear (only when applicable)
   - **Show on page:** the exact narration plates and speech bubbles, with EVERY sentence from story.md preserved
   - **Scene note:** ONE line of camera/composition guidance only when non-obvious (most pages: skip this)

Per-page entries should be MINIMAL. Trust Gemini to handle composition and rendering given the references and the global style. Do NOT repeat style instructions in each page (that's the global block's job).

═══════════════════════════════════════════
INCLUDE EVERY SENTENCE FROM story.md
═══════════════════════════════════════════

Every sentence in story.md must appear on some page. Do not abbreviate, summarize, or drop "transitional" sentences — they are what makes the picture book read as a continuous story. If a beat has long narration, split it into multiple pages.

Distinguish narration vs dialogue:
- Narration text → narration plate
- Quoted dialogue → speech bubble, attributed to speaker

═══════════════════════════════════════════
USE MULTIPLE REFERENCES PER PAGE
═══════════════════════════════════════════

Every page should have at least:
- 1 location reference (for spatial anchor — even if the page is a close-up)
- All speaking/visible characters

Plus, when the same setting recurs, REFERENCE EARLIER PAGES of that setting as additional anchors:
- Page 18 might be the establishing shot of the sofa setup
- Pages 19–25 (which all happen there) should reference Page 18 for continuity

This prevents Gemini from drifting to a different setting when a page is character-focused with implicit location.

═══════════════════════════════════════════
DESCRIPTIVE REF NAMES, NOT FILENAMES
═══════════════════════════════════════════

In page entries, use **descriptive names** (matching the glossary) so the user can see at a glance which images to attach:

GOOD: "Refs: Mr. Realistic, Living room, Page 18"
BAD:  "Refs: 01_realistic.png, 02_living_room.png"

═══════════════════════════════════════════
PAGE COUNT
═══════════════════════════════════════════

Decide a reasonable number of pages — a page corresponds to one story beat or scene. Typical: 30–50 pages per passage. Pages are FLAT-NUMBERED sequentially: P01, P02, ..., PNN. Ignore any chapter/scene divisions in story.md for FILE numbering.

ITERATION

After producing the master file, ask me which pages to refine. Common requests:
- "P14 dialogue is too long for one bubble — split into multiple"
- "P22 needs a different camera angle"
- "Add a beat-pause page between P10 and P11"
```
