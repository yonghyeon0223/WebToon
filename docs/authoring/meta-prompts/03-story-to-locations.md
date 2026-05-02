# Meta-prompt 03 — Story → Location Reference Cards

Once your `story.md` is finalized AND character cards are done, use this prompt to generate location reference cards for recurring settings. Save each output as `passages/{id}/prompts/locations/NN_name.md`.

---

```
You are helping me build location reference cards for a picture book in the
"Mr. Realistic Series" — Mr. Men style adaptations of SAT passages, rendered
in PIXAR × Mr. Men hybrid visual style.

INPUT — the finalized story for this passage:

{{PASTE story.md HERE}}

(Optional — for context, also paste the character cards if a character has
a personal location like a house or workplace; the location should integrate
that character's motif.)

YOUR TASK

For EACH RECURRING location in the story (settings that appear in 2+ pages),
produce ONE location reference card following the template at
`docs/authoring/templates/location-card.template.md`.

SKIP one-time locations. If a setting appears in only one page, describe it
inline in the page prompt instead — reference cards are an investment that
pays off when reused.

VISUAL STYLE — non-negotiable
Embed the PIXAR × Mr. Men style anchor in EVERY card. Read
`docs/authoring/style-anchor.md` for the full brief. Backgrounds specifically:

PRESERVE: Mr. Men architectural simplicity
- Houses are rectangles + triangular roofs
- Trees are lollipop circles on sticks
- Paths are simple cobblestone
- NO detailed brickwork, no roof tiles, no realistic perspective

ADD: PIXAR craft
- Real materials suggested through painted texture and color (warm wood with
  grain hint, brass with metallic sheen, fabric with folds)
- Soft warm cinematic lighting
- Atmospheric depth and ambient occlusion
- Considered architectural details (decorative trim, awning stripes,
  thoughtful proportions)

AVOID: cinematic atmospheric particles overdone, photorealistic textures,
crude flat shapes with no craft.

PER-PASSAGE COLOR PALETTE

Pick a coherent color palette for THIS passage's village/world. List it in
each location card so all locations share the palette and feel like one place.
Example palette: warm beige + dusty pink + sage green + butter yellow + soft
terracotta. Different passages can have different palettes; within a passage,
locations are consistent.

INTEGRATED MOTIFS

For locations belonging to a specific named character (their house, their
workplace, etc.), integrate that character's concept-word motif into the
ARCHITECTURE — multiple places, woven into the design, not as a tacked-on icon.

Example from the locked anchor (Mr. Realistic's house):
- Terracotta door (matches his color identity)
- Circular porthole "lens" window on second floor (the window IS a magnifying glass)
- Brass magnifying-glass-shaped door knocker (sculptural metalwork)
- Lens-shaped peephole at eye level
- Decorative carved circles in window frame corners (lens motif echoed)
- Hanging wooden sign with painted magnifying-glass illustration

Take the time. Five integrations beats one slapped-on icon.

PER-LOCATION OUTPUT FORMAT

For each location, produce a markdown file with:

# {{Location Name}} — Location Reference Card

> 저장 경로: images/locations/{{NN_name}}.png

## Prompt — Gemini에 그대로 복붙
\`\`\`
[Full Gemini prompt — embed style anchor + per-passage palette + characterful
architecture + integrated motifs (if applicable) + lighting + composition (9:16
vertical) + text constraint (no text in image except location label)]
\`\`\`

## 핵심 디자인 원칙
- **건물 색**: {{}}
- **시그니처 디테일**: {{}}
- **금지**: {{}}

## 사용 페이지
{{which pages this location appears in}}

NUMBERING

Number the locations NN_name following appearance order:
- 01_realistic_house
- 02_living_room
- 03_cafe
- ...

EMPTY LOCATIONS

The location card should be of the EMPTY scene — no characters present. The
pipeline will compose characters into the location at page-generation time
using both the location ref and character refs together. An empty location
card is a cleaner reference than one with a particular character already in it.

ITERATE

After producing all cards, ask me which to refine. Common requests:
- "Differentiate the bakery and cafe more — they look too similar"
- "Add more decorative architectural detail to {{location}}"
- "The integrated motif for Mr. X's house feels weak — add more"
```
