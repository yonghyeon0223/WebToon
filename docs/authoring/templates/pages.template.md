# {{Series Name}} — Page Generation Master

**How to use:** For each page, paste the GLOBAL STYLE block below followed by the page section. Attach the listed reference images to the Gemini conversation. Gemini handles composition and rendering — we just give it the story text and the visual world.

---

## 🎨 GLOBAL STYLE — paste this with every page

```
PICTURE BOOK PAGE — AS IF PIXAR PUBLISHED A MR. MEN PICTURE BOOK.
Aspect ratio 9:16 vertical (mobile picture-book format).

[Embed the FULL style block from docs/authoring/style-anchor.md:
 - CRITICAL reference-images-are-authoritative section
 - PRESERVE Mr. Men identity (silhouettes, mittens, dot eyes, bold outlines, props)
 - ADD PIXAR craft (volumetric shading, real materials, warm cinematic lighting)
 - AVOID list (pure flat 2D, pure 3D, razor-sharp CGI, etc.)
 - TEXT RENDERING (cream narration plates + hand-drawn imperfect speech bubbles + sepia-brown Korean lettering + character-thematic colors for English vocabulary)]
```

---

## 📚 REFERENCE GLOSSARY

When a page lists references, attach the matching image files. Names in **bold** are how they're referenced in the page sections.

### Character cards (1:1)
| Reference name | File | Quick description |
|---|---|---|
| **{{Character Name}}** | `images/characters/{{NN_name}}.png` | {{One-line visual identifier — color, signature prop, distinctive feature}} |
| {{...one row per character...}} | | |

### Location cards (1:1)
| Reference name | File | Quick description |
|---|---|---|
| **{{Location Name}}** | `images/locations/{{NN_name}}.png` | {{Quick visual identifier — building color, signature feature, prominent contents}} |
| {{...one row per location...}} | | |

### Cross-page references (use generated page images for scene continuity)

When a later page reuses the same setting, attach the EARLIER page's generated image as an additional reference. This anchors continuity (same camera angle, same lighting, same character placement) better than only the static location card.

For example: "Page 18 (sofa setup with everyone watching TV)" can serve as a continuity reference for pages 19–25 since they all share that TV-watching arrangement.

---

## 📑 Pages ({{N}})

> Format per page: **Refs** = images to attach. **Show on page** = exactly the text Gemini should render (narration plates and speech bubbles per global style). **Scene note** = brief context only when non-obvious.

---

### P{{NN}} — {{Page Title}}

**Refs:** {{Character Name}}, {{Location Name}}, {{optional: Page N for continuity}}

**Anonymous in scene:** {{Optional — describe any anonymous Mr. Men characters that should appear (color, body shape, expression, action). Skip this section if none.}}

**Show on page:**
- Narration plate: "{{Korean narration text}}"
- Speech bubble ({{Speaker name}}, {{tone descriptor}}): "{{Korean dialogue text}}"
- {{...repeat as needed; multiple plates and bubbles allowed}}

**Scene note:** {{Optional — one line of camera/composition/mood guidance only when the default would be unclear. Skip if Gemini can infer from text + refs.}}

---

### P{{NN+1}} — ...
