import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const PASSAGE = '2025-06-busan-10th-Q24-open-to-interpretation';
const PASSAGE_DIR = path.join('passages', PASSAGE);
const PROMPTS_DIR = path.join(PASSAGE_DIR, 'prompts/pages');
const IMAGES_DIR = path.join(PASSAGE_DIR, 'images/pages');
const ARCHIVE_DIR = path.join(IMAGES_DIR, '_archive');
const GLOBAL_STYLE_PATH = path.join(PASSAGE_DIR, 'prompts/_global_style.md');
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3-pro-image-preview';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Missing GEMINI_API_KEY — set it in .env');
  process.exit(2);
}

const client = new GoogleGenAI({ apiKey });

interface PagePrompt {
  refs: string[];
  body: string;
}

function parseFrontmatter(content: string): PagePrompt {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { refs: [], body: content };

  const [, fmBlock, body] = match;
  const refsMatch = fmBlock!.match(/refs:\s*\[([^\]]*)\]/);
  const refs = refsMatch
    ? refsMatch[1]!
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return { refs, body: body!.trimStart() };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readPagePrompt(pageId: string): Promise<PagePrompt> {
  const filePath = path.join(PROMPTS_DIR, `${pageId}.md`);
  return parseFrontmatter(await fs.readFile(filePath, 'utf-8'));
}

function buildPromptText(
  pageBody: string,
  refs: string[],
  globalStyle: string,
): string {
  const refPreamble =
    refs.length === 0
      ? ''
      : `═══════════════════════════════════════════
REFERENCE IMAGES (attached in order before this prompt): ${refs.join(', ')}
═══════════════════════════════════════════
Use these as visual anchors. Match characters' likeness, scene composition,
lighting, narration plate / speech bubble / vocab clip styling, lettering,
and overall book vibe EXACTLY as established in these refs. The page prompt
below adds the new beat (action, expression, text content) on top of the
established visual world.

`;

  return `${refPreamble}${pageBody.trim()}\n\n${globalStyle.trim()}\n`;
}

function archiveTimestamp(): string {
  // Local time, filesystem-safe, sortable: 2025-05-03T153022
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function archiveExisting(
  outputPath: string,
  pageId: string,
): Promise<void> {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  const archivePath = path.join(
    ARCHIVE_DIR,
    `${pageId}_${archiveTimestamp()}.png`,
  );
  await fs.rename(outputPath, archivePath);
  console.log(`[${pageId}] archived previous → ${archivePath}`);
}

async function generatePage(
  pageId: string,
  globalStyle: string,
): Promise<void> {
  const outputPath = path.join(IMAGES_DIR, `${pageId}.png`);
  const tempPath = `${outputPath}.tmp`;
  const { refs, body } = await readPagePrompt(pageId);

  for (const refId of refs) {
    const refPath = path.join(IMAGES_DIR, `${refId}.png`);
    if (!(await fileExists(refPath))) {
      throw new Error(`Reference image ${refId}.png not found at ${refPath}`);
    }
  }

  type Part =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

  const parts: Part[] = [];
  for (const refId of refs) {
    const buf = await fs.readFile(path.join(IMAGES_DIR, `${refId}.png`));
    parts.push({
      inlineData: { mimeType: 'image/png', data: buf.toString('base64') },
    });
  }
  parts.push({ text: buildPromptText(body, refs, globalStyle) });

  console.log(
    `[${pageId}] generating  (refs: ${refs.length === 0 ? 'none' : refs.join(', ')})`,
  );

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE'] },
  });

  const responseParts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = responseParts.find(
    (p): p is { inlineData: { mimeType: string; data: string } } =>
      'inlineData' in p &&
      typeof (p as { inlineData?: { data?: unknown } }).inlineData?.data ===
        'string',
  );

  if (!imagePart) {
    throw new Error(
      `No image in response for ${pageId}. First 500 chars: ${JSON.stringify(response).slice(0, 500)}`,
    );
  }

  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

  // Atomic-ish write: temp first, archive existing, then rename temp to final.
  // Crash mid-step leaves recoverable state instead of a corrupt PNG.
  await fs.writeFile(tempPath, imageBuffer);
  if (await fileExists(outputPath)) {
    await archiveExisting(outputPath, pageId);
  }
  await fs.rename(tempPath, outputPath);

  console.log(
    `[${pageId}] -> ${outputPath} (${(imageBuffer.length / 1024).toFixed(1)} KB)`,
  );
}

async function listPageIds(): Promise<string[]> {
  const files = await fs.readdir(PROMPTS_DIR);
  return files
    .filter((f) => /^p\d+\.md$/.test(f))
    .sort()
    .map((f) => path.basename(f, '.md'));
}

function parseIntFlag(args: string[], name: string): number | null {
  const flag = args.find((a) => a.startsWith(`--${name}=`));
  if (!flag) return null;
  const raw = flag.split('=')[1];
  const n = raw === undefined ? NaN : parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`Invalid --${name} value: ${raw}`);
    process.exit(2);
  }
  return n;
}

function pageIdToNum(id: string): number {
  return parseInt(id.slice(1), 10);
}

async function main(): Promise<void> {
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const globalStyle = await fs.readFile(GLOBAL_STYLE_PATH, 'utf-8');

  const args = process.argv.slice(2);
  const start = parseIntFlag(args, 'start');
  const end = parseIntFlag(args, 'end');
  const positional = args.filter((a) => !a.startsWith('--'));
  const explicitMode = start !== null || end !== null || positional.length > 0;

  const allPageIds = await listPageIds();

  let targets: string[];
  if (start !== null || end !== null) {
    const allNums = allPageIds.map(pageIdToNum);
    const startN = start ?? Math.min(...allNums);
    const endN = end ?? Math.max(...allNums);
    if (startN > endN) {
      console.error(`Empty range: --start=${startN} > --end=${endN}`);
      process.exit(2);
    }
    targets = allPageIds.filter((id) => {
      const n = pageIdToNum(id);
      return n >= startN && n <= endN;
    });
    if (targets.length === 0) {
      console.error(`No pages match range [p${startN}, p${endN}].`);
      process.exit(2);
    }
  } else if (positional.length > 0) {
    targets = positional;
  } else {
    targets = allPageIds;
  }

  for (const pageId of targets) {
    if (!allPageIds.includes(pageId)) {
      console.error(`Unknown page: ${pageId}`);
      continue;
    }

    // No-args (catch-up mode) → skip already-generated pages so re-running
    // safely fills in gaps without burning API credits on existing work.
    // Explicit page targeting (range or positional) → always (re)generate;
    // any existing image is archived before being replaced.
    const outputPath = path.join(IMAGES_DIR, `${pageId}.png`);
    if (!explicitMode && (await fileExists(outputPath))) {
      console.log(
        `[${pageId}] skipped (exists; target it explicitly to regenerate)`,
      );
      continue;
    }

    await generatePage(pageId, globalStyle);
  }
}

main().catch((err) => {
  console.error(
    '\nFatal:',
    err instanceof Error ? err.stack ?? err.message : err,
  );
  process.exit(1);
});
