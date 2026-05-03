import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';
import {
  GLOBAL_STYLE_PATH,
  IMAGES_DIR,
  MODEL_ALIASES,
  DEFAULT_MODEL,
  fileExists,
  generatePage,
  listPageIds,
} from './lib.js';

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

type ModelAlias = 'flash2' | 'pro';
type ConfirmResult =
  | { kind: 'continue' }
  | { kind: 'stop' }
  | { kind: 'regenerate'; model: ModelAlias };

function parseSeqInput(raw: string): ConfirmResult | { error: string } {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'next') return { kind: 'continue' };
  if (lower === 'stop') return { kind: 'stop' };
  if (lower === 'regenerate') return { kind: 'regenerate', model: 'flash2' };
  if (lower === 'regenerate with pro' || lower === 'regenerate pro') {
    return { kind: 'regenerate', model: 'pro' };
  }

  if (trimmed === '') {
    return { error: 'Empty input — type "next" to advance, or another option.' };
  }
  return { error: `Unrecognized input "${trimmed}".` };
}

async function confirmContinue(pageId: string): Promise<ConfirmResult> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    while (true) {
      const answer = await rl.question(
        `\n✓ ${pageId} done. Inspect, then type one of:\n` +
          `  next                       advance to the next page\n` +
          `  stop                       exit\n` +
          `  regenerate                 regenerate with flash2\n` +
          `  regenerate with pro        regenerate with pro\n` +
          `> `,
      );
      const parsed = parseSeqInput(answer);
      if ('error' in parsed) {
        console.log(`! ${parsed.error}`);
        continue;
      }
      return parsed;
    }
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
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

    const outputPath = path.join(IMAGES_DIR, `${pageId}.png`);
    if (!explicitMode && (await fileExists(outputPath))) {
      console.log(
        `[${pageId}] skipped (exists; target it explicitly to regenerate)`,
      );
      continue;
    }

    let currentModel = model;
    while (true) {
      console.log(`[${pageId}] generating  (model: ${currentModel})`);
      const result = await generatePage(pageId, globalStyle, currentModel);
      if (result.archivedPrev) {
        console.log(`[${pageId}] archived previous → ${result.archivedPrev}`);
      }
      console.log(
        `[${pageId}] -> ${outputPath} (${result.mime}, ${(result.bytes / 1024).toFixed(1)} KB)`,
      );

      if (!seq) break;

      const decision = await confirmContinue(pageId);
      if (decision.kind === 'continue') break;
      if (decision.kind === 'stop') {
        console.log('Stopped by user.');
        process.exit(0);
      }
      if (decision.kind === 'regenerate') {
        currentModel = MODEL_ALIASES[decision.model] ?? decision.model;
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
