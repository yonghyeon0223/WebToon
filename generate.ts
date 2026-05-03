import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';

const PASSAGE = '2025-06-busan-10th-Q24-open-to-interpretation';
const PASSAGE_DIR = path.join('passages', PASSAGE);
const PROMPTS_DIR = path.join(PASSAGE_DIR, 'prompts/pages');
const IMAGES_DIR = path.join(PASSAGE_DIR, 'images/pages');
const ARCHIVE_DIR = path.join(IMAGES_DIR, '_archive');
const GLOBAL_STYLE_PATH = path.join(PASSAGE_DIR, 'prompts/_global_style.md');

const MODEL_ALIASES: Record<string, string> = {
  flash: 'gemini-2.5-flash-image',
  flash2: 'gemini-3.1-flash-image-preview',
  pro: 'gemini-3-pro-image-preview',
};
const DEFAULT_MODEL = 'gemini-3-pro-image-preview';

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
  feedback?: string,
): string {
  const feedbackPreamble = !feedback
    ? ''
    : `═══════════════════════════════════════════
⚠ FEEDBACK ITERATION — MODIFY THE LAST ATTACHED IMAGE
═══════════════════════════════════════════
The LAST image attached (after the listed reference images below) is the
CURRENT generated attempt for this page. Modify it according to the
feedback below; preserve everything that's already correct.

Feedback from the user:
${feedback}

═══════════════════════════════════════════

`;

  const refPreamble =
    refs.length === 0
      ? ''
      : `═══════════════════════════════════════════
⚠ CRITICAL — REFERENCE IMAGES ATTACHED (in order): ${refs.join(', ')}
═══════════════════════════════════════════
The attached images are the VISUAL CONTRACT for this page. They are
authoritative. Anything that appears in them must be reproduced EXACTLY
in the new image — never reinterpreted, redesigned, or "improved."

CHARACTER LIKENESS (highest priority):
  • Match each named character's body shape, proportions, exact body
    color, eye style, mitten hand style, foot/shoe style EXACTLY as
    shown in the refs.
  • Reproduce signature props (magnifying glass, slate + chalk, mortarboard
    cap, leather notebook, brass balance scale, etc.) IDENTICALLY — same
    shape, same color, same materials, same proportions to the body, same
    placement (held in mitten / on cord around neck / etc.) as in the refs.
  • A viewer flipping between a ref and this new page must see no redesign
    of the character. Instant recognizability is the bar.

SETTING / LOCATION:
  • Match architecture, palette, lighting temperature, signature elements
    (door color, awning pattern, window shape, props in the scene).
  • Camera angle and composition can change for the new beat, but the
    setting itself must be recognizably the same place from the refs.

PAGE FURNITURE (narration plates, speech bubbles, vocab clip parchment,
lettering hand, drop shadow, paper texture, color palette of the typography):
  • Reproduce the exact same visual treatment seen in the refs. Same
    parchment color, same painterly imperfect edge style, same wobbly
    bubble outline, same Korean lettering hand, same sepia ink tone.
  • Do NOT redesign any of these elements. Same rendering family
    throughout the book.

THE PROMPT BELOW describes only the NEW BEAT for this page (the action,
expression, text content that's different from the refs). The refs supply
the EXISTING WORLD (who, where, how everything looks). Your job is to
combine: existing world from refs + new beat from prompt.

DO NOT redesign anything visible in the refs.
DO NOT introduce visual elements not described in the prompt and not in
the refs.
DO NOT drift to a different art style than what the refs establish.

`;

  return `${feedbackPreamble}${refPreamble}${pageBody.trim()}\n\n${globalStyle.trim()}\n`;
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
  model: string,
  feedback?: string,
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

  // For feedback iterations, attach the current attempt as the LAST ref so
  // the model knows what to modify. The text prompt's feedback section
  // explicitly references "the LAST attached image".
  const useCurrentAsRef = !!feedback && (await fileExists(outputPath));
  if (useCurrentAsRef) {
    const buf = await fs.readFile(outputPath);
    parts.push({
      inlineData: { mimeType: 'image/png', data: buf.toString('base64') },
    });
  }

  parts.push({ text: buildPromptText(body, refs, globalStyle, feedback) });

  const refSummary = [
    ...refs,
    ...(useCurrentAsRef ? ['(current attempt)'] : []),
  ];
  const tag = feedback ? `revising` : `generating`;
  console.log(
    `[${pageId}] ${tag}  (refs: ${refSummary.length === 0 ? 'none' : refSummary.join(', ')})`,
  );

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
  // Crash mid-step leaves recoverable state instead of a corrupt PNG.
  await fs.writeFile(tempPath, imageBuffer);
  if (await fileExists(outputPath)) {
    await archiveExisting(outputPath, pageId);
  }
  await fs.rename(tempPath, outputPath);

  console.log(
    `[${pageId}] -> ${outputPath} (${mime}, ${(imageBuffer.length / 1024).toFixed(1)} KB)`,
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

type ConfirmResult =
  | { kind: 'continue' }
  | { kind: 'stop' }
  | { kind: 'regenerate' }
  | { kind: 'feedback'; text: string };

async function confirmContinue(justFinished: string): Promise<ConfirmResult> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(
    `\n✓ ${justFinished} done. Inspect, then choose:\n` +
      `  [Enter]      → next page\n` +
      `  stop         → exit\n` +
      `  regenerate   → redo this page (no changes)\n` +
      `  <anything>   → use as feedback (revises this page using the current image as ref)\n` +
      `> `,
  );
  rl.close();
  const trimmed = answer.trim();
  if (trimmed === '') return { kind: 'continue' };
  if (trimmed.toLowerCase() === 'stop') return { kind: 'stop' };
  if (trimmed.toLowerCase() === 'regenerate') return { kind: 'regenerate' };
  return { kind: 'feedback', text: trimmed };
}

async function main(): Promise<void> {
  // Graceful shutdown on Ctrl+C — don't print a stack trace, just exit 0.
  process.on('SIGINT', () => {
    console.log('\nStopped by user (SIGINT).');
    process.exit(0);
  });

  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const globalStyle = await fs.readFile(GLOBAL_STYLE_PATH, 'utf-8');

  const args = process.argv.slice(2);
  const start = parseIntFlag(args, 'start');
  const end = parseIntFlag(args, 'end');
  const seq = args.includes('--seq');
  const positional = args.filter((a) => !a.startsWith('--'));
  const explicitMode = start !== null || end !== null || positional.length > 0;

  // Resolve model: --model=<alias|full-id> > GEMINI_IMAGE_MODEL env > default
  const modelArg = args
    .find((a) => a.startsWith('--model='))
    ?.split('=')[1];
  const model =
    (modelArg !== undefined && modelArg !== ''
      ? (MODEL_ALIASES[modelArg] ?? modelArg)
      : process.env.GEMINI_IMAGE_MODEL) ?? DEFAULT_MODEL;
  console.log(`Model: ${model}`);

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

  for (let i = 0; i < targets.length; i++) {
    const pageId = targets[i]!;
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

    // Generate. In --seq mode, after each generation pause for user input:
    //   Enter      → advance to next page
    //   stop       → graceful exit
    //   regenerate → redo this page (no extras)
    //   <text>     → use as feedback; current image attached as ref
    let feedback: string | undefined = undefined;
    while (true) {
      await generatePage(pageId, globalStyle, model, feedback);
      feedback = undefined;

      if (!seq) break;

      const result = await confirmContinue(pageId);
      if (result.kind === 'continue') break;
      if (result.kind === 'stop') {
        console.log('Stopped by user.');
        process.exit(0);
      }
      if (result.kind === 'regenerate') continue;
      if (result.kind === 'feedback') {
        feedback = result.text;
        continue;
      }
    }
  }
}

main().catch((err) => {
  console.error(
    '\nFatal:',
    err instanceof Error ? err.stack ?? err.message : err,
  );
  process.exit(1);
});
