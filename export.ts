import { PDFDocument } from 'pdf-lib';
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

  for (const fname of pageFiles) {
    const bytes = await fs.readFile(path.join(IMAGES_DIR, fname));
    const image = await pdf.embedPng(bytes);
    const page = pdf.addPage([PAGE_W, PAGE_H]);

    // Fit image into page preserving aspect; center if any letterboxing.
    const scale = Math.min(PAGE_W / image.width, PAGE_H / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, {
      x: (PAGE_W - w) / 2,
      y: (PAGE_H - h) / 2,
      width: w,
      height: h,
    });
    process.stdout.write(`  + ${fname.replace('.png', '')}\n`);
  }

  const pdfBytes = await pdf.save();
  await fs.writeFile(OUTPUT_PATH, pdfBytes);

  const sizeMB = (pdfBytes.length / 1024 / 1024).toFixed(1);
  console.log(`\n✓ ${OUTPUT_PATH}  (${pageFiles.length} pages, ${sizeMB} MB)`);
}

main().catch((err) => {
  console.error(
    'Fatal:',
    err instanceof Error ? err.stack ?? err.message : err,
  );
  process.exit(1);
});
