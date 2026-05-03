═══════════════════════════════════════════
ASPECT RATIO
═══════════════════════════════════════════
9:16 vertical mobile portrait. Always taller than wide. Force the composition
into 9:16 even when scene contents would naturally compose horizontally.

═══════════════════════════════════════════
STYLE — PIXAR × MR. MEN PICTURE BOOK
═══════════════════════════════════════════
Render as if PIXAR published a Roger Hargreaves Mr. Men book — illustrated
medium with PIXAR craft, not a 3D animation still.

Full-bleed: image fills the entire frame edge-to-edge. No border, margin,
frame, matte, or device mockup.

Mr. Men identity: geometric body silhouettes (round / rectangle / oval),
stick arms with white mitten hands, stubby legs with simple shoes, big
dot-eye faces, soft hand-drawn black outlines, signature character props.

EVERY human-like figure in the scene — named main characters, anonymous
cameos, background fillers, crowd members, deep-background silhouettes —
MUST be rendered in this Mr. Men style. NEVER photorealistic people,
NEVER stylized humans with realistic proportions, NEVER cartoon humans
with arms-and-legs anatomy. Even a tiny figure in the back of a crowd
is a Mr. Men shape (small geometric body, mitten hands, dot eyes).

PIXAR craft: subtle volumetric shading, soft ambient occlusion, real
materials (brass, leather, fabric, wood, glass), warm cinematic golden
lighting, polished studio finish.

Avoid: pure flat 2D, pure 3D CGI, razor-sharp edges, photorealistic clutter.

═══════════════════════════════════════════
MAIN CHARACTER DISTINCTNESS
═══════════════════════════════════════════
The six main characters of the book — Mr. Realistic, Mr. Logical,
Mr. Rational, Mr. Red, Mr. Blue, Mr. Bias — MUST be designed to look
immediately distinct from each other. A reader should be able to
identify any of them from silhouette alone (no color, no props
visible). No two main characters share a body shape, height-to-width
ratio, posture, or face style.

When introducing a NEW main character on their debut page, the prompt
body should describe THREE dimensions in detail. Color and one prop
are NOT enough:

  · Body silhouette — overall geometric shape (round / tall rectangle /
    rounded square / short-wide / tall-slim / draped, etc.), explicit
    height-to-width ratio, weight distribution (top-heavy / bottom-heavy
    / centered), distinguishing proportion notes.
  · Face features — eye shape and size (round dots vs almond, large vs
    small), eyebrow style (absent / thin / thick / angled), default mouth
    shape (line / curve / open), blush or cheek marks, head adornment
    (cap, hood, hair).
  · Posture & stance — characteristic body language carried across all
    appearances (planted wide / leaning forward / upright stiff / narrow
    elegant / asymmetric tilt, etc.).

A new main character must differ from every previously established
main character along ALL three dimensions, not just color. Cameo
descriptions can stay simpler — this rule applies to named main
characters only.

═══════════════════════════════════════════
TEXT RENDERING
═══════════════════════════════════════════
- Narration → cream parchment plate, painterly imperfect edges, sepia-brown
  hand-lettered Korean (NOT system font), subtle drop shadow.
- Dialogue → round speech bubble, hand-drawn wobbly outline, soft white
  interior, tail clearly attached to speaker's mouth.
- Plates and bubbles sized generously; ~12–18% padding inside; bubble visual
  weight ≈ plate weight (don't shrink dialogue).

FONT — single hand-lettered Korean face throughout the book. Same exact
typography (font face, weight, slant, stroke style) for every narration
plate and every dialogue bubble. The book must read as if one artist
hand-lettered every line.

FONT SIZE — minimum floors for accessibility on the 768 × 1376 canvas
(Nano Banana Pro at 1K + 9:16). Sizes vary naturally with scene energy
(quiet moment vs shout) — that's fine. The minimums below are
NON-NEGOTIABLE; text never goes smaller than these floors:

  · Narration plate Korean text  →  ≥ 40 px glyph height
  · Dialogue bubble Korean text  →  ≥ 40 px glyph height
  · Inner thought / italicized   →  ≥ 40 px
  · SFX / kinetic shouting       →  visibly larger + bolder than body,
                                    no upper bound

Within a single plate or bubble, text is one consistent size — don't
shrink one line to make another fit. If a long line doesn't fit at the
floor, ENLARGE the plate / bubble; never drop below the floor.

LETTER SPACING — same tracking everywhere. Same line-height. Lines look
hand-set by the same hand on every page.

LINE BREAKS — wrap at natural phrase / clause boundaries. Don't split set
phrases ("차근차근", "어김없이"), compound words, or particles from nouns
("하늘은"). Resize the plate / bubble rather than forcing awkward breaks.

COLOR EMPHASIS — Korean text in plain warm sepia-brown; no character-color
tinting on Korean phrases. Color emphasis only for:
    · Main character names → that character's signature color (plates AND bubbles)
    · English vocab words → relevant character's color (or amber-gold if
      shared by all three friends)
Cameos (Mr. Worried, townspeople, angry character, baker, florist,
confused listener) get no color emphasis.

Text feels painted INTO the illustration, not a digital sticker.
Render only what the page's Text section specifies. Never any markdown
characters (`*` `_` `` ` `` `#` etc.) even if they appear in the source.

Main character palette:
    Mr. Realistic → terracotta-orange    Mr. Logical → cobalt-blue
    Mr. Rational  → cool steel-gray      Mr. Red     → vermilion
    Mr. Blue      → royal blue           Mr. Bias    → aubergine-purple

═══════════════════════════════════════════
VOCAB TAG (only on pages with a Vocab tag section)
═══════════════════════════════════════════
SHAPE & POSITION — identical across every vocab tag page so the reader
recognizes "another vocab card" instantly:
  · Rectangular sepia parchment, FLAT — NOT tilted, NOT skewed, NOT
    rotated. Edges align squarely with the page edges (top edge of the
    parchment parallel to the top edge of the page).
  · Painterly imperfect edges, soft painted drop shadow. No corner
    curl or dog-ear.
  · A small brass paper-clip pinning it to the page.
  · Always in the bottom-right corner of the page.
  · Sits ON TOP of the illustration; doesn't cover faces or key props.

SIZE — generous so the text is easy to read on a phone:
  · Parchment width adapts to the Korean definition length so the
    layout below stays clean. NEVER squeeze the font to fit; ALWAYS
    enlarge the parchment.
  · 2–3 entries stack vertically, parchment grows in height proportionally.
  · 1–3 entries stacked with a thin horizontal divider between entries.

DEFINITION LAYOUT (CRITICAL — applies to every Korean definition that
contains a period):
  Korean definitions are written as "PRIMARY MEANING. SECONDARY
  EXPLANATION." (e.g., "현실적인. 자기 생각이 실제 현실과 일치한다고 믿는
  상태.").  Render the parchment text in this 3-tier stacked structure:

    Line 1   English word
    Line 2   Korean PRIMARY meaning (everything up to and including
             the first period — e.g. "현실적인.") on ITS OWN line
    Line 3+  Korean SECONDARY explanation (everything after the first
             period) on subsequent line(s), wrapping naturally at
             phrase boundaries if it doesn't fit one line

  The primary meaning ALWAYS gets its own dedicated line (never shares
  a line with secondary), and the secondary wraps freely below.
  Definitions WITHOUT a period (e.g. "불가능한", "팬층, 응원하는 사람들
  무리.") are short enough to stay on a single line below the English.

TYPOGRAPHY — minimum floors on the 768 × 1376 canvas. Same font face /
weight / slant / stroke style across every vocab tag in the book.
Vocab tag text is **smaller than narration body text** — sized like a
small footnote / glossary card, NOT like body copy:
  · English word on top, Korean definition stacked directly below.
  · BOTH the English word and the Korean definition are rendered in the
    standard warm sepia-brown ink of the book. NO character signature
    color, NO amber-gold, NO color tinting of any kind in the vocab
    clip. The clip is a quiet glossary note, not an emphasis element.
  · English word: bold italic hand-lettering, ≥ 40 px glyph height
    (slightly larger than the Korean def below it, but smaller than
    narration body text).
  · Korean definition: same hand-lettered face as narration plates,
    ≥ 32 px glyph height (small but fully readable).
  · NO separator between word and definition (no dash, em-dash, bullet,
    comma) — they read as a stacked label.
  · Plain text only — no labels ("English:", "Korean:"), no quotes, no
    markdown characters.
