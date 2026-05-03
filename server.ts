import express from 'express';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  ARCHIVE_DIR,
  DEFAULT_MODEL,
  GLOBAL_STYLE_PATH,
  IMAGES_DIR,
  MODEL_ALIASES,
  PASSAGE,
  generatePage,
  listArchivesForPage,
  listPageIds,
  pageHasImage,
  readPagePrompt,
} from './lib.js';

const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Static image hosting. Both the current outputs and archives are under
// IMAGES_DIR; serve the whole tree so paths like /images/p05.png and
// /images/_archive/p05_xxx.png both work.
app.use('/images', express.static(IMAGES_DIR));

// Per-process default model. Frontend can swap via /api/model.
let currentModel = DEFAULT_MODEL;

app.get('/api/status', async (_req, res) => {
  try {
    const ids = await listPageIds();
    const pages = await Promise.all(
      ids.map(async (id) => ({
        id,
        hasImage: await pageHasImage(id),
        archiveCount: (await listArchivesForPage(id)).length,
      })),
    );
    res.json({
      passage: PASSAGE,
      model: currentModel,
      modelAliases: MODEL_ALIASES,
      pages,
    });
  } catch (err) {
    res.status(500).json({ error: errMsg(err) });
  }
});

app.get('/api/pages/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { refs, body } = await readPagePrompt(id);
    const hasImage = await pageHasImage(id);
    const archives = await listArchivesForPage(id);
    res.json({ id, refs, body, hasImage, archives });
  } catch (err) {
    res.status(404).json({ error: errMsg(err) });
  }
});

app.post('/api/pages/:id/generate', async (req, res) => {
  const id = req.params.id;
  const requested =
    typeof req.body?.model === 'string' && req.body.model.length > 0
      ? req.body.model
      : currentModel;
  const model = MODEL_ALIASES[requested] ?? requested;
  try {
    const globalStyle = await fs.readFile(GLOBAL_STYLE_PATH, 'utf-8');
    console.log(`[${id}] generating  (model: ${model})`);
    const result = await generatePage(id, globalStyle, model);
    if (result.archivedPrev) {
      console.log(`[${id}] archived previous → ${result.archivedPrev}`);
    }
    console.log(
      `[${id}] -> done (${result.mime}, ${(result.bytes / 1024).toFixed(1)} KB)`,
    );
    res.json({
      ok: true,
      model,
      bytes: result.bytes,
      mime: result.mime,
      archivedPrev: result.archivedPrev
        ? path.basename(result.archivedPrev)
        : null,
    });
  } catch (err) {
    console.error(`[${id}] FAILED:`, errMsg(err));
    res.status(500).json({ error: errMsg(err) });
  }
});

app.post('/api/model', (req, res) => {
  const m = req.body?.model;
  if (typeof m !== 'string' || m.length === 0) {
    res.status(400).json({ error: 'Missing model' });
    return;
  }
  currentModel = MODEL_ALIASES[m] ?? m;
  res.json({ ok: true, model: currentModel });
});

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

void fs.mkdir(IMAGES_DIR, { recursive: true });
void fs.mkdir(ARCHIVE_DIR, { recursive: true });

app.listen(PORT, () => {
  console.log(`\n  ╭──────────────────────────────────────────╮`);
  console.log(`  │  WebToon GUI                              │`);
  console.log(`  │  http://localhost:${String(PORT).padEnd(5)}                   │`);
  console.log(`  │  passage: ${PASSAGE.slice(0, 31).padEnd(31)} │`);
  console.log(`  │  model:   ${MODEL_ALIASES_REVERSE(currentModel).padEnd(31)} │`);
  console.log(`  ╰──────────────────────────────────────────╯\n`);
});

function MODEL_ALIASES_REVERSE(full: string): string {
  for (const [alias, id] of Object.entries(MODEL_ALIASES)) {
    if (id === full) return `${alias} (${full})`;
  }
  return full;
}
