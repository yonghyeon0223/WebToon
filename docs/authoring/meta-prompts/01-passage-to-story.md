# Meta-prompt 01 — Passage → Story

Copy the prompt below into a new Claude chat. Replace `{{...}}` placeholders. Claude will produce three artifacts: `source.md`, `story.md`, and `passage.yaml`.

---

```
You are helping me build a picture book based on a Korean SAT mock-exam English passage. The picture book is part of a series called "Mr. Realistic Series" (or similar) — Mr. Men style stories that adapt SAT passages into illustrated children's books that teach the passage's vocabulary and concept through narrative.

INPUT — raw exam metadata and passage:

Test: {{YYYY}}년 {{M}}월 {{region}} 고{{grade}} 영어 모의고사 Q{{NN}}
Type: {{학력평가 | 모의평가 | 수능}}
Topic (kebab-case slug): {{my-best-guess}}

Original passage:
{{PASTE THE RAW ENGLISH PASSAGE HERE}}

YOUR TASK — produce THREE artifacts in three separate code blocks:

────────────────────────────────────────
1) `source.md` — the raw passage + structured metadata
────────────────────────────────────────

Format exactly per the template at `docs/authoring/templates/source.template.md`. Sections:
- Metadata (test date, region, grade, question, type, topic)
- Original Passage (the raw English exactly as printed)
- Key vocabulary table (English word / phrase → Korean meaning, ~10–15 entries selected for pedagogical value)
- Theme summary (2–3 sentences in Korean explaining the passage's main argument)

────────────────────────────────────────
2) `story.md` — the adapted Mr. Men style picture-book story
────────────────────────────────────────

Constraints:
- Two chapters (each chapter is one "act" of the story).
- 4–6 named characters total. Names follow the Mr. {{Concept}} pattern (e.g., Mr. Realistic, Mr. Logical), where the name IS a key concept word from the passage. Each character embodies one or two of the passage's vocabulary words.
- The English vocabulary words appear naturally in the Korean prose (mixed-script). E.g.: *"Mr. Realistic은 항상 objective하게 본다고 믿었어요."* The English word stays in English.
- Each chapter ends with a vocabulary table listing every English word that appeared, numbered with Korean explanations.
- Tone: warm Mr. Men picture-book voice. Korean prose with occasional dialogue in quotes. Avoid lecture tone — show via story.
- The story should END with the passage's actual moral / argument landing as a character realization, not as a lesson.

Format exactly per the template at `docs/authoring/templates/story.template.md`. Sections:
- Header (title + series description in Korean)
- Source attribution (link to source.md)
- 등장 캐릭터 table
- 등장 장소 table
- Chapter 1 (full prose) + Chapter 1 단어 정리 table
- Chapter 2 (full prose) + Chapter 2 단어 정리 table
- 전체 단어 통계
- 제작 노트 (visual guide hints, character design points, tone shifts) — these inform future prompt-writing meta-prompts

────────────────────────────────────────
3) `passage.yaml` — structured metadata for the pipeline
────────────────────────────────────────

Format exactly per `docs/authoring/templates/passage.yaml.template`. Fill in id, title, source.*, story.* (chapter count, character count, location count, page counts).

Suggest a content-slug (2–5 kebab-case words summarizing the passage's main idea) for the id.

────────────────────────────────────────
ITERATION

After producing all three, ask me which I want to iterate on. Common adjustments:
- "more / fewer characters" — restructure the cast
- "different chapter break" — adjust where Chapter 1 ends
- "punchier dialogue" — rewrite specific scenes
- "this character's concept word should be X instead of Y"

Do NOT generate prompt files (character cards, location cards, page prompts) yet. Those come from separate meta-prompts (02, 03, 04) once this story is finalized.
```
