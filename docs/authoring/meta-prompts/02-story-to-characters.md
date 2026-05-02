# Meta-prompt 02 — Story → Character Reference Cards

Once your `story.md` is finalized, use this prompt to generate one character reference card per named character. Save each output as `passages/{id}/prompts/characters/NN_name.md`.

---

```
You are helping me build character reference cards for a picture book in the
"Mr. Realistic Series" — Mr. Men style adaptations of SAT passages, rendered
in PIXAR × Mr. Men hybrid visual style.

INPUT — the finalized story for this passage:

{{PASTE story.md HERE}}

YOUR TASK — for EACH named character in the story (listed in the 등장 캐릭터
table), produce ONE character reference card following the template at
`docs/authoring/templates/character-card.template.md`.

VISUAL STYLE — non-negotiable
Embed the PIXAR × Mr. Men style anchor in EVERY card. Read
`docs/authoring/style-anchor.md` for the full brief. Each card must include:

- The hybrid framing line ("AS IF PIXAR PUBLISHED A MR. MEN PICTURE BOOK")
- The PRESERVE list (round body silhouette, mitten hands, dot eyes, bold outlines, signature props)
- The ADD list (subtle volumetric shading, real-feeling materials with character-specific examples, warm cinematic lighting, polished animation studio finish)
- The AVOID list (no razor-sharp 3D, no crude flat 2D, no cluttered backgrounds, no tacked-on icons)

CONCEPT-WORD INTEGRATION — critical

For every character, the concept word in their name must be visualized through
MULTIPLE integrated design elements, not a single tacked-on icon. Examples
from the locked style anchor:

- Mr. Realistic ("observer") → magnifying glass + planted wide stance + terracotta color (earth)
- Mr. Bias ("biased perception") → 30° tilted body + mismatched shadow at different angle
- Mr. Red / Mr. Blue (paired partisan fans) → tinted aviator/round sunglasses + face paint stripes + team-colored props
- A character whose name is "Mr. Patient" might have: extra-long arms (infinite reach), waiting-bench prop, slow body posture, soft muted color

Bring this depth. Take the time per character.

PER-CHARACTER OUTPUT FORMAT (one code block per character)

For each character, produce a markdown file with:

# {{Character Name}} — Character Reference Card

> 저장 경로: images/characters/{{NN_name}}.png

## Prompt (English)
\`\`\`
[Full Gemini prompt — embed style anchor + concept-word integration + 3 poses
(central + upper-left + upper-right) + lighting + text constraint + layout]
\`\`\`

## 핵심 특징
- **색**: {{}}
- **체형**: {{}}
- **시그니처 prop**: {{}}
- **자세**: {{}}

## 등장 장면
{{which chapters / pages this character appears in, based on the story}}

THREE-POSE COMPOSITION

Each character card shows the SAME character in three poses (1:1 square format,
arranged: large central pose + two smaller upper-corner poses). The three poses
should give the model enough material to maintain consistency in subsequent
page generations:

- Central (large): standing pose with signature prop in primary use
- Upper-left (small): variant — using the prop differently or in action
- Upper-right (small): variant — different emotion or signature gesture

For paired characters (e.g., Mr. Red / Mr. Blue), make them visually DISTINCT
beyond color: different body proportions, different headwear, different props,
different stance. Mirror twins look interchangeable in pages — make them
recognizably different individuals.

NUMBERING

Number the characters NN_name (01, 02, 03, ...) in the order they appear in
the story's 등장 캐릭터 table. Use snake_case for the name part:
- 01_realistic
- 02_logical
- 03_rational
- 04_red
- 05_blue
- 06_bias

ITERATE

After producing all cards, ask me which character I want to refine first.
Common requests:
- "Mr. X needs a different signature prop — try Y"
- "Mr. X and Mr. Y look too similar — differentiate body proportions"
- "Add more concept-word integration for Mr. Z"

Do NOT generate location cards or page prompts yet — those come from separate
meta-prompts (03, 04) once characters are finalized.
```
