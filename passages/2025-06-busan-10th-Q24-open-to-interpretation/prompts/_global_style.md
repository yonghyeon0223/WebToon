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

PIXAR craft: subtle volumetric shading, soft ambient occlusion, real
materials (brass, leather, fabric, wood, glass), warm cinematic golden
lighting, polished studio finish.

Avoid: pure flat 2D, pure 3D CGI, razor-sharp edges, photorealistic clutter.

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

FONT SIZE — pixel targets on the 768 × 1376 canvas (Nano Banana Pro at 1K
+ 9:16). Strict consistency across the whole book:
  · Narration plate Korean text  →  ~55 px glyph height (every plate)
  · Dialogue bubble Korean text  →  ~55 px glyph height (every bubble)
  · Narration size = dialogue size (no perceptible difference)
  · Inner thought / italicized   →  ~55 px (same as body, italic-light)
  · SFX / kinetic shouting       →  ~80–110 px glyph height + bolder

FLOOR — no Korean glyph below 50 px tall in narration or dialogue. If a
long line doesn't fit at the ~55 px target, ENLARGE the plate / bubble;
never shrink the font.

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
  · Rectangular sepia parchment, slightly curled at one corner, painterly
    imperfect edges, soft painted drop shadow.
  · A small brass paper-clip pinning it to the page.
  · Always in the bottom-right corner of the page.
  · Sits ON TOP of the illustration; doesn't cover faces or key props.

SIZE — generous so the text is easy to read on a phone:
  · For one entry, parchment ≈ 1/4 of page width (LARGER than before).
  · 2–3 entries stack vertically, parchment grows in height proportionally.
  · 1–3 entries stacked with a thin horizontal divider between entries.

TYPOGRAPHY — pixel targets on the 768 × 1376 canvas. Strict consistency
across every vocab tag in the book:
  · English word on top, Korean definition stacked directly below.
  · English word: bold italic hand-lettering, ~85 px glyph height
    (notably larger than narration body).
  · Korean definition: same hand-lettered face as narration plates,
    ~60 px glyph height (slightly larger than narration body, fully
    readable).
  · Same font face / weight / slant / stroke style across every vocab
    tag in the book.
  · NO separator between word and definition (no dash, em-dash, bullet,
    comma) — they read as a stacked label.
  · Plain text only — no labels ("English:", "Korean:"), no quotes, no
    markdown characters.
