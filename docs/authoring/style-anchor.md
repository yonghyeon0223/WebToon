# Visual Style Anchor — PIXAR × Mr. Men

This is the **locked visual style** for the entire WebToon project. Every passage's character/location/page prompts must embed (parts of) this brief. The anchor is what makes the series visually coherent — story varies per passage, style does not.

The pipeline currently relies on each prompt repeating the relevant style language. A future enhancement will let the pipeline inject this anchor automatically; until then, copy from this document into prompts.

---

## The hybrid in one sentence

**As if PIXAR published a Roger Hargreaves Mr. Men picture book** — iconic flat Mr. Men silhouettes preserved exactly, but rendered with PIXAR animation studio craft (subtle volumetric shading, real-feeling materials, warm cinematic lighting, polished page-level composition).

NOT a 3D animation still. NOT a flat 2D crude doodle. The medium is **a published illustrated picture book page**.

---

## What to PRESERVE (Mr. Men identity)

These are non-negotiable. Without them, the work loses its Mr. Men recognition.

- **Iconic body silhouettes**: round / square / rectangle / oval geometric shapes (Roger Hargreaves heritage)
- **Stick-thin arms** ending in **white mitten hands**
- **Stubby legs with simple shoes**
- **Big simple expressive faces** with **dot eyes** and clear mouths
- **Bold black character outlines** (preserved as a stylistic touchstone — soft hand-drawn feel, not razor-sharp 3D edges)
- **Signature character props** that visually embody each character's concept word (magnifying glass for "observer", chalkboard for "logical", balance scale for "rational", tinted sunglasses for "biased", etc.)

## What to ADD (PIXAR rendering quality)

These elevate the work from crude doodle to professional picture book.

- **Subtle volumetric shading** on character bodies (soft form light from upper-left, gentle underside shadow). NOT heavy 3D shading — just enough to give the flat shape life.
- **Soft ambient occlusion** in crevices (under arms, between body and legs, beneath shoes, under furniture).
- **Hint of subsurface scattering** on body surfaces — warm material glow at the edges suggesting depth.
- **Real-feeling materials**: brass with metallic sheen + specular highlights, glass with catchlights, leather with grain, fabric with texture and folds, knitted items with knit pattern, felt with soft surface, wood with grain hint.
- **Warm cinematic lighting** — PIXAR's signature golden-hour bath. Soft warm key light from upper-left, gentle fill, subtle rim light defining edges.
- **Soft contact shadows** beneath characters on the ground.
- **Polished animation studio finish** — every element looks designed, intentional, not slapdash. "Casual but high quality."

## What to AVOID

- ❌ Pure flat 2D with no shading at all (reads as crude / amateur)
- ❌ Pure 3D PIXAR with no Mr. Men silhouette identity (loses the recognition)
- ❌ Razor-sharp CGI edges (kills the hand-drawn warmth)
- ❌ Cluttered detailed backgrounds competing with characters (anchor backgrounds in Mr. Men architectural simplicity)
- ❌ A single tacked-on icon to "represent" a character motif (integrate the motif into the design — porthole window IS a magnifying glass, not just a sticker above the door)
- ❌ Photorealistic textures (concrete bricks, photographic skies, realistic fabric weave)
- ❌ Cinematic atmospheric particles overdone (light beams, dust motes, lens flares — sparingly only)

---

## Backgrounds

**Architectural foundation = Mr. Men simplicity.** Houses are rectangles + triangular roofs. Trees are lollipop circles on sticks. Paths are simple cobblestone. **NO** detailed brickwork, no roof tiles, no realistic perspective.

**Materials and lighting = PIXAR craft.** The simple geometric house has warm afternoon light catching its top, soft cast shadow, suggested wood grain on the door, brass on the door knocker.

**Per-passage village color palette** is fine and encouraged. Each passage may have its own dominant tones (e.g., warm beige + dusty pink + sage green + butter yellow + soft terracotta for the realistic-judgment passage). Different passages CAN look different in palette — but always Mr. Men + PIXAR craft, never one or the other extreme.

---

## Text rendering — webtoon storybook conventions

Inspired by modern Korean webtoons (화산귀환, 외모지상주의) but applied to a published picture book context.

- **Narration** → soft cream rectangular **plate** with hand-painted imperfect edges and a subtle painterly drop shadow. Korean Hangul in warm dark-brown hand-lettered designed typography (NOT system font). English vocabulary in deep terracotta-orange (or character-thematic color), slightly bolder.
- **Dialogue** → classic round **speech bubble** with hand-drawn imperfect outline (slightly wobbly, charming — NOT a digital perfect oval), soft white wash interior, painterly drop shadow, tail pointing to the speaker's mouth.
- **Inner thought** → cloud-shaped or dashed-outline bubble (when this comes up).
- **Sound effects** → kinetic shaky lettering integrated into the scene (sparingly; e.g., 호루라기 "삐익!").
- **All text feels PAINTED INTO the illustration**, not a digital sticker stamped on top. The text element is a designed page element, not an overlay.

The visual style is PIXAR × Mr. Men; the text style is **published storybook typography**, designed and integrated.

---

## Aspect ratio

**9:16 vertical** (mobile picture book scroll format). Fixed across all character cards, location cards, and pages.

---

## Typical prompt embedding

A character / location / page prompt should embed at minimum:
- The "PIXAR × Mr. Men" framing line
- The PRESERVE list (so the model holds the silhouette)
- The ADD list (so the model uses real materials and warm light)
- A reminder of what to AVOID (especially "razor-sharp 3D" and "crude flat")
- Aspect ratio
- Text rendering instructions for that specific element (caption plates / speech bubbles for pages; just character name for cards)

The meta-prompts in `meta-prompts/` already embed this anchor when generating prompts. If you write a prompt by hand, copy the relevant chunks from this document.

---

## Concept-word integration (character design philosophy)

For named characters whose name IS a concept word (Mr. Realistic, Mr. Logical, Mr. Bias, etc.):

- Every visual element — body shape, color, signature prop, stance — should visibly embody the concept.
- Generic "round body + smile + accessory" without a concept hook gets rejected.
- The motif should appear in MULTIPLE creative integrated ways throughout the design, not as a single tacked-on icon.

Examples of good concept integration:
- Mr. Realistic → magnifying glass (observer); planted wide stance (grounded in reality); terracotta color (earth)
- Mr. Bias → 30° tilted body; mismatched shadow that tilts at a different angle (distorted perception); cloak hiding hands/feet
- Mr. Red / Mr. Blue (paired partisan fans) → tinted aviator/round sunglasses (literally see through colored lens); face paint stripes; team-colored props
- Mr. Realistic's house → terracotta door + circular porthole "lens" window + brass magnifying-glass door knocker + small lens-shape peephole + decorative circles on window frames + magnifying-glass painted on the hanging sign — five integrations of the same motif

A character design without this depth feels lazy. Take the time.
