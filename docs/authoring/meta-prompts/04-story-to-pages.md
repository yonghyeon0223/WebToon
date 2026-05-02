# Meta-prompt 04 — Story → Page Prompts

Once your story, character cards, and location cards are all finalized, use this prompt to generate one page prompt per page in each chapter. Save each output as `passages/{id}/prompts/pages/chN/pNN.md`.

---

```
You are helping me build per-page image-generation prompts for a picture book
in the "Mr. Realistic Series" — Mr. Men style adaptations of SAT passages,
rendered in PIXAR × Mr. Men hybrid visual style.

INPUT — the three finalized artifacts for this passage:

1) story.md:
{{PASTE story.md HERE}}

2) Character roster (just the IDs and one-line concept descriptions for context):
{{LIST character IDs and one-liners — e.g., "01_realistic — observer with magnifying glass"}}

3) Location roster (IDs and one-line descriptions):
{{LIST location IDs and one-liners — e.g., "02_living_room — Mr. Realistic's
home interior with sofa, TV, mirror, shadowy corner"}}

YOUR TASK

For EACH chapter, decide a reasonable number of pages (typically 12–20 per
chapter — a page corresponds to one story beat or scene). For each page,
produce ONE page prompt following the template at
`docs/authoring/templates/page-prompt.template.md`.

VISUAL STYLE — non-negotiable
Embed the PIXAR × Mr. Men style anchor in EVERY page prompt. Read
`docs/authoring/style-anchor.md` for the full brief.

REFERENCE IMAGE ATTACHMENT — critical

Each page prompt MUST list the character and location reference IDs that
should be attached at generation time. The pipeline reads these and attaches
the corresponding PNG files to the Gemini call automatically. This is THE
mechanism that keeps appearance consistent across pages.

In the page prompt, include a strong CRITICAL section that tells Gemini to
treat the attached references as authoritative templates:

═══════════════════════════════════════════
⚠ CRITICAL — REFERENCE IMAGES ARE AUTHORITATIVE
═══════════════════════════════════════════

The attached reference images define how the named characters and locations
must look. Reproduce them EXACTLY: same colors, same proportions, same
details, same architectural features, same character design. Treat the
references as authoritative templates that must be matched precisely. Do NOT
reinterpret, redesign, or "improve" them. This page composes EXISTING designs
into a new scene — it is NOT redesigning them.

Do NOT re-describe the character's body color, glasses, props, etc. in the
page prompt — that's what the reference is for. Only describe what's
SCENE-SPECIFIC: the action, pose, composition, lighting, and any new objects
that aren't on the reference card.

PER-PAGE OUTPUT FORMAT

For each page, produce a markdown file with:

# Ch{{N}} P{{NN}} — {{Page Title}}

> **첨부 reference images**: {{character_id}}.png, {{location_id}}.png
> **저장 경로**: images/pages/ch{{N}}/p{{NN}}.png

## Prompt — Gemini에 그대로 복붙
\`\`\`
[Full Gemini prompt — embed:
  - PIXAR × Mr. Men style framing
  - CRITICAL reference-images-are-authoritative section
  - SCENE (1–2 sentence beat description)
  - COMPOSITION (camera angle, framing, who is where)
  - LIGHTING & MOOD (warm / cool / dramatic, time of day)
  - TEXT RENDERING (narration plates and/or speech bubbles, with exact Korean text)
  - Aspect ratio 9:16 vertical
]
\`\`\`

## Page intent
{{What this page accomplishes in the story arc — context for future iteration}}

PAGE PACING — picture book grammar

Each page is ONE STORY BEAT. Common page types:
- Establishing shot (introduce a setting, set a mood)
- Character introduction (hero shot of a single character)
- Comic timing (two characters with contrasting body language — visual joke)
- Dialogue exchange (multiple speech bubbles between characters)
- Inner-thought close-up (single character with thought bubble)
- Ensemble (multiple characters reacting together)
- Visual punchline (no text or minimal text — image carries the moment)

Vary the camera and composition across pages to keep the rhythm interesting:
wide / medium / close-up / extreme close-up / low-angle / high-angle /
over-the-shoulder / dutch angle (sparingly, e.g., when Mr. Bias is present) /
mirror or reflection shots.

TEXT RENDERING — webtoon storybook conventions

Use the conventions from `style-anchor.md`:
- Narration in soft cream rectangular plates with hand-painted edges and
  warm sepia-brown hand-lettered Korean
- Dialogue in classic round speech bubbles with hand-drawn imperfect outlines
  and white wash interior, tail to speaker
- Inner thought in dashed/cloud bubbles
- English vocabulary in character-thematic colors (Mr. Realistic words in
  terracotta-orange, Mr. Logical words in cobalt-blue, etc.) for consistency
- ALL text feels PAINTED INTO the illustration, not stamped on top

Specify the exact Korean text for each narration plate and speech bubble per
page. Pull text from the story.md prose, condensing to fit the page if needed
(picture book pacing favors short, punchy text per page).

NUMBERING

Pages are zero-padded: p01, p02, ..., p14, p15. Chapters are ch1, ch2.
Page IDs in references are written as `ch1/p01`, `ch1/p02`, etc.

ITERATE

After producing all pages for a chapter, ask me which to refine. Common
requests:
- "P05 needs a different camera angle — try low-angle"
- "P12's dialogue is too long for one bubble — split into two"
- "P18 should have a stronger visual punchline — minimal text"
- "Add a beat-pause page between P10 and P11"
```
