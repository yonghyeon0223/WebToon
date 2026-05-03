import { PDFDocument, PDFName } from 'pdf-lib';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const PASSAGE = '2025-06-busan-10th-Q24-open-to-interpretation';
const PASSAGE_DIR = path.join('passages', PASSAGE);
const IMAGES_DIR = path.join(PASSAGE_DIR, 'images/pages');
const OUTPUT_PATH = path.join(PASSAGE_DIR, `${PASSAGE}.pdf`);

// Page size in PDF points (72 dpi). 9:16 aspect ratio. Higher = larger file
// but better print quality. 720 × 1280 = web-resolution mobile, ~10MB for 30
// pages.
const PAGE_W = 720;
const PAGE_H = 1280;

async function main(): Promise<void> {
  let files: string[];
  try {
    files = await fs.readdir(IMAGES_DIR);
  } catch {
    console.error(`Image directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }

  const pageFiles = files
    .filter((f) => /^p\d+\.png$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.slice(1), 10);
      const nb = parseInt(b.slice(1), 10);
      return na - nb;
    });

  if (pageFiles.length === 0) {
    console.error(`No page images in ${IMAGES_DIR}. Run 'npm run generate' first.`);
    process.exit(1);
  }

  console.log(`Found ${pageFiles.length} page(s). Building PDF...`);

  const pdf = await PDFDocument.create();
  pdf.setTitle('Mr. Realistic 시리즈');
  pdf.setSubject('Korean SAT mock-exam picture book — Open to Interpretation');
  pdf.setCreator('WebToon (https://github.com/yonghyeon0223/WebToon)');

  function detectImageType(b: Buffer): 'png' | 'jpg' | 'unknown' {
    if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
    return 'unknown';
  }

  let added = 0;
  for (const fname of pageFiles) {
    const stem = fname.replace('.png', '');
    const bytes = await fs.readFile(path.join(IMAGES_DIR, fname));
    const type = detectImageType(bytes);

    if (type === 'unknown') {
      const head = bytes.subarray(0, 8).toString('hex');
      console.warn(`  ! ${stem} — unknown image format (head: ${head}); skipping`);
      continue;
    }

    try {
      const image =
        type === 'png'
          ? await pdf.embedPng(bytes)
          : await pdf.embedJpg(bytes);
      const page = pdf.addPage([PAGE_W, PAGE_H]);
      const scale = Math.min(PAGE_W / image.width, PAGE_H / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      page.drawImage(image, {
        x: (PAGE_W - w) / 2,
        y: (PAGE_H - h) / 2,
        width: w,
        height: h,
      });
      added++;
      process.stdout.write(
        `  + ${stem}  (${type}, ${image.width}×${image.height})\n`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ! ${stem} — embed failed: ${msg}; skipping`);
    }
  }

  if (added === 0) {
    console.error('No pages embedded successfully.');
    process.exit(1);
  }

  // Add invisible link annotations: tap left half → previous page, tap right
  // half → next page. Mirrors the cuttoon viewer's tap-zone navigation.
  const fit = PDFName.of('Fit');
  const pdfPages = pdf.getPages();
  for (let i = 0; i < pdfPages.length; i++) {
    const page = pdfPages[i]!;
    const annots = [];

    if (i > 0) {
      annots.push(
        pdf.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [0, 0, PAGE_W / 2, PAGE_H],
          Border: [0, 0, 0],
          A: {
            Type: 'Action',
            S: 'GoTo',
            D: [pdfPages[i - 1]!.ref, fit],
          },
        }),
      );
    }

    if (i < pdfPages.length - 1) {
      annots.push(
        pdf.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [PAGE_W / 2, 0, PAGE_W, PAGE_H],
          Border: [0, 0, 0],
          A: {
            Type: 'Action',
            S: 'GoTo',
            D: [pdfPages[i + 1]!.ref, fit],
          },
        }),
      );
    }

    if (annots.length > 0) {
      page.node.set(PDFName.of('Annots'), pdf.context.obj(annots));
    }
  }

  const pdfBytes = await pdf.save();
  await fs.writeFile(OUTPUT_PATH, pdfBytes);

  const sizeMB = (pdfBytes.length / 1024 / 1024).toFixed(1);
  console.log(`\n✓ ${OUTPUT_PATH}  (${added} pages, ${sizeMB} MB)`);
}

main().catch((err) => {
  console.error(
    'Fatal:',
    err instanceof Error ? err.stack ?? err.message : err,
  );
  process.exit(1);
});
