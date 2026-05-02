import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const PASSAGE = '2025-06-busan-10th-Q24-open-to-interpretation';
const PROMPTS_DIR = path.join('passages', PASSAGE, 'prompts/pages');
const IMAGES_DIR = path.join('passages', PASSAGE, 'images/pages');
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

async function generatePage(pageId: string): Promise<void> {
  const outputPath = path.join(IMAGES_DIR, `${pageId}.png`);
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
  parts.push({ text: body });

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
  await fs.writeFile(outputPath, imageBuffer);
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

async function main(): Promise<void> {
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const explicit = args.filter((a) => !a.startsWith('--'));

  const allPageIds = await listPageIds();
  const targets = explicit.length > 0 ? explicit : allPageIds;

  for (const pageId of targets) {
    if (!allPageIds.includes(pageId)) {
      console.error(`Unknown page: ${pageId}`);
      continue;
    }

    const outputPath = path.join(IMAGES_DIR, `${pageId}.png`);
    if ((await fileExists(outputPath)) && !force) {
      console.log(`[${pageId}] skipped (exists; use --force to regenerate)`);
      continue;
    }

    await generatePage(pageId);
  }
}

main().catch((err) => {
  console.error(
    '\nFatal:',
    err instanceof Error ? err.stack ?? err.message : err,
  );
  process.exit(1);
});
