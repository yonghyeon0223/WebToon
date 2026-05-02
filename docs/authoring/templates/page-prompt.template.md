# P{{NN}} — {{Page Title}}

> **첨부 reference images**: `{{character_id}}.png`, `{{location_id}}.png`
> **저장 경로**: `images/pages/p{{NN}}.png`

Pages are flat-numbered (p01, p02, ..., pNN) regardless of how many narrative
chapters / acts / scenes the story has. The `story.md` may organize content
into chapters or scenes, but the file system is flat.

When Sprint 2 lands, this file will use YAML frontmatter:
```yaml
---
id: p{{NN}}
output: pages/p{{NN}}.png
references:
  characters: [{{01_realistic}}, {{02_logical}}]
  locations: [{{02_living_room}}]
---
```

For now (pre-Sprint-2), the references are listed in the markdown header above
and the pipeline will be updated to read frontmatter once it exists.

---

## Prompt — Gemini에 그대로 복붙

```
PICTURE BOOK PAGE — AS IF PIXAR PUBLISHED A MR. MEN PICTURE BOOK.

Aspect ratio 9:16 vertical (mobile picture-book format).

═══════════════════════════════════════════
⚠ CRITICAL — REFERENCE IMAGES ARE AUTHORITATIVE
═══════════════════════════════════════════

The attached reference images define how the named characters and locations
must look. Reproduce them EXACTLY: same colors, same proportions, same details,
same architectural features, same character design. Treat the references as
authoritative templates that must be matched precisely. Do NOT reinterpret,
redesign, or "improve" them.

This page composes EXISTING designs into a new scene — it is NOT redesigning them.

═══════════════════════════════════════════
SCENE — what is happening on this specific page
═══════════════════════════════════════════

{{1–2 sentence beat description: who, where, what action, what mood.}}

═══════════════════════════════════════════
COMPOSITION
═══════════════════════════════════════════

{{Camera angle (low / high / eye-level / over-the-shoulder / dutch / etc.).
 Where each character / object sits in the frame. Sky/background layout.}}

═══════════════════════════════════════════
LIGHTING & MOOD
═══════════════════════════════════════════

{{Warm golden hour / cool TV glow / dramatic spotlight / etc.
 Per-page mood that supports the story beat. PIXAR storybook quality.}}

═══════════════════════════════════════════
TEXT RENDERING — PIXAR STORYBOOK TYPOGRAPHY
═══════════════════════════════════════════

{{Per-page text:

 1. NARRATION PLATE in {{position}} of the frame:
    Soft cream rectangular plate with hand-painted imperfect edges, painterly
    soft drop shadow.
    Korean text in warm sepia-brown hand-lettered designed typography:
    "{{narration text}}"
    English vocabulary in {{character-thematic color}} (e.g., terracotta-orange
    for Mr. Realistic-related words), slightly bolder.

 2. SPEECH BUBBLE from {{speaker}}:
    Hand-drawn imperfect speech bubble outline (slightly wobbly, charming —
    NOT a perfect digital oval), soft white wash interior, painterly drop
    shadow, tail pointing to {{speaker}}'s mouth.
    Korean text inside in {{matching tone — calm / agitated / etc.}} hand-lettering:
    "{{dialogue text}}"

 (Add more bubbles or omit narration plate as the page demands.)
}}

NO OTHER TEXT in the image — only the elements above.
```

## Page intent

{{What this page accomplishes in the story arc — context for future iteration.}}
