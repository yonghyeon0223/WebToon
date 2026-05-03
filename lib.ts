import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export const PASSAGE = '2025-06-busan-10th-Q24-open-to-interpretation';
export const PASSAGE_DIR = path.join('passages', PASSAGE);
export const PROMPTS_DIR = path.join(PASSAGE_DIR, 'prompts/pages');
export const IMAGES_DIR = path.join(PASSAGE_DIR, 'images/pages');
export const ARCHIVE_DIR = path.join(IMAGES_DIR, '_archive');
export const GLOBAL_STYLE_PATH = path.join(
  PASSAGE_DIR,
  'prompts/_global_style.md',
);

export const MODEL_ALIASES: Record<string, string> = {
  flash: 'gemini-2.5-flash-image',
  flash2: 'gemini-3.1-flash-image-preview',
  pro: 'gemini-3-pro-image-preview',
};
// Default to flash2 for cheaper iteration. Use pro for finals.
export const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Missing GEMINI_API_KEY — set it in .env');
  process.exit(2);
}

const client = new GoogleGenAI({ apiKey });

export interface PagePrompt {
  refs: string[];
  body: string;
}

export function parseFrontmatter(content: string): PagePrompt {
  // Normalize CRLF → LF so Windows-saved files parse correctly.
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { refs: [], body: normalized };

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

export async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function readPagePrompt(pageId: string): Promise<PagePrompt> {
  const filePath = path.join(PROMPTS_DIR, `${pageId}.md`);
  return parseFrontmatter(await fs.readFile(filePath, 'utf-8'));
}

export function buildPromptText(
  pageBody: string,
  refs: string[],
  globalStyle: string,
): string {
  const refPreamble =
    refs.length === 0
      ? ''
      : `═══════════════════════════════════════════
REFERENCE IMAGES — ${refs.length} attached, in order
═══════════════════════════════════════════
${refs.length} reference image(s) are attached BEFORE this text in this
exact order. The page prompt's "## Refs" section below refers to them
positionally — "First", "Second", "Third", etc. — matching the
attachment order. Each entry includes a short description of what that
image shows for extra clarity.

General buckets used in the ## Refs section:
  · Anchor → reproduce the named character / location EXACTLY.
  · New character or location → design FRESH from the prompt body, no
    inheritance from refs.
  · Vibe / style ref → match book tone, lettering, page furniture; do
    NOT copy specific characters or locations.

Do not inherit visible elements from refs unless the prompt body
explicitly anchors them to this scene. Do not introduce visual elements
not described in the prompt body. Do not drift to a different art style.

`;

  return `${refPreamble}${pageBody.trim()}\n\n${globalStyle.trim()}\n`;
}

function archiveTimestamp(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

export async function archiveExisting(
  outputPath: string,
  pageId: string,
): Promise<string> {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  const archivePath = path.join(
    ARCHIVE_DIR,
    `${pageId}_${archiveTimestamp()}.png`,
  );
  await fs.rename(outputPath, archivePath);
  return archivePath;
}

export interface GenerateResult {
  mime: string;
  bytes: number;
  archivedPrev: string | null;
}

export async function generatePage(
  pageId: string,
  globalStyle: string,
  model: string,
): Promise<GenerateResult> {
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

  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: '9:16' },
    },
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
  const mime = imagePart.inlineData.mimeType ?? 'unknown';

  // Atomic-ish write: temp first, archive existing, then rename temp to final.
  await fs.writeFile(tempPath, imageBuffer);
  let archivedPrev: string | null = null;
  if (await fileExists(outputPath)) {
    archivedPrev = await archiveExisting(outputPath, pageId);
  }
  await fs.rename(tempPath, outputPath);

  return { mime, bytes: imageBuffer.length, archivedPrev };
}

export async function listPageIds(): Promise<string[]> {
  const files = await fs.readdir(PROMPTS_DIR);
  return files
    .filter((f) => /^p\d+\.md$/.test(f))
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
    .map((f) => path.basename(f, '.md'));
}

export async function pageHasImage(pageId: string): Promise<boolean> {
  return fileExists(path.join(IMAGES_DIR, `${pageId}.png`));
}

export async function listArchivesForPage(pageId: string): Promise<string[]> {
  try {
    const files = await fs.readdir(ARCHIVE_DIR);
    return files
      .filter((f) => f.startsWith(`${pageId}_`) && f.endsWith('.png'))
      .sort()
      .reverse(); // newest first
  } catch {
    return [];
  }
}
