import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const ROOT = process.cwd();
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter }) as any;

let pdfjsLib: any = null;
async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsLib;
}

function getObjAsync(objs: any, name: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const obj = objs.get(name);
      resolve(obj);
    } catch {
      objs.get(name, (data: any) => resolve(data));
      setTimeout(() => reject(new Error("timeout")), 10000);
    }
  });
}

// ─── Extract images from a PDF with strict filters ──────────────────────────

async function extractImagesFromPdf(
  pdfPath: string,
  outDir: string,
  prefix: string,
  subDir: string,
  skipPages: number = 0
): Promise<Record<number, string[]>> {
  const pdfjs = await getPdfjs();

  console.log(`\nExtracting images: ${path.basename(pdfPath)}...`);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pageImages: Record<number, string[]> = {};
  let totalImages = 0;
  let imgCounter = 0;
  let skippedRendered = 0;
  let skippedAspect = 0;

  for (let pageNum = skipPages + 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;
    const ops = await page.getOperatorList();
    const pageImgs: string[] = [];

    // Track CTM for rendered size calculation
    const matrixStack: number[][] = [[1, 0, 0, 1, 0, 0]];

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];

      if (fn === pdfjs.OPS.save) {
        matrixStack.push([...matrixStack[matrixStack.length - 1]]);
      } else if (fn === pdfjs.OPS.restore) {
        if (matrixStack.length > 1) matrixStack.pop();
      } else if (fn === pdfjs.OPS.transform) {
        const [a, b, c, d, e, f] = ops.argsArray[i];
        const cur = matrixStack[matrixStack.length - 1];
        matrixStack[matrixStack.length - 1] = [
          cur[0] * a + cur[2] * b,
          cur[1] * a + cur[3] * b,
          cur[0] * c + cur[2] * d,
          cur[1] * c + cur[3] * d,
          cur[0] * e + cur[2] * f + cur[4],
          cur[1] * e + cur[3] * f + cur[5],
        ];
        continue;
      }

      if (
        fn !== pdfjs.OPS.paintImageXObject &&
        fn !== pdfjs.OPS.paintImageXObjectRepeat &&
        fn !== pdfjs.OPS.paintInlineImageXObject
      ) {
        continue;
      }

      let imgData: any = null;

      if (fn === pdfjs.OPS.paintInlineImageXObject) {
        imgData = ops.argsArray[i][0];
      } else {
        const imgName = ops.argsArray[i][0];
        if (typeof imgName !== "string") continue;
        try {
          imgData = await getObjAsync(page.objs, imgName);
        } catch {
          continue;
        }
      }

      if (!imgData || !imgData.data || !imgData.width || !imgData.height) continue;

      const { width, height, data: pixels, kind } = imgData;

      // Filter 1: Skip tiny pixel-size images (icons, bullets)
      if (width < 80 || height < 40) continue;

      // Filter 2: Check RENDERED size via CTM
      // This catches table cells rendered at 26pt height despite being 64px raw
      const ctm = matrixStack[matrixStack.length - 1];
      const renderedWidth = Math.abs(ctm[0]);
      const renderedHeight = Math.abs(ctm[3]);

      if (renderedWidth < 50 || renderedHeight < 50) {
        skippedRendered++;
        continue;
      }

      // Filter 3: Skip images with extreme aspect ratios (text bars, table headers)
      const aspect = width / height;
      if (aspect > 5) {
        skippedAspect++;
        continue;
      }

      const channels = kind === 1 ? 1 : kind === 2 ? 3 : 4;
      const filename = `${prefix}_p${pageNum}_${imgCounter}.png`;
      const filepath = path.join(outDir, filename);
      const urlPath = `/images/${subDir}/${filename}`;

      try {
        await sharp(Buffer.from(pixels), {
          raw: { width, height, channels },
        })
          .png()
          .toFile(filepath);

        pageImgs.push(urlPath);
        imgCounter++;
        totalImages++;
      } catch {
        // Skip images that can't be converted
      }
    }

    if (pageImgs.length > 0) {
      pageImages[pageNum] = pageImgs;
    }

    page.cleanup();

    if (pageNum % 50 === 0 || pageNum === doc.numPages) {
      process.stdout.write(`  Page ${pageNum}/${doc.numPages} (${totalImages} images so far)\n`);
    }
  }

  await doc.destroy();
  console.log(`  Total: ${totalImages} images from ${Object.keys(pageImages).length} pages`);
  console.log(`  Skipped: ${skippedRendered} (rendered too small), ${skippedAspect} (bad aspect ratio)`);
  return pageImages;
}

// ─── Get page texts with question/answer number detection ───────────────────

async function getPageTexts(pdfPath: string): Promise<string[]> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item: any) => item.str !== undefined)
      .map((item: any) => item.str)
      .join(" ");
    texts.push(text);
    page.cleanup();
  }

  await doc.destroy();
  return texts;
}

// ─── Map question numbers to PDF pages ──────────────────────────────────────

async function getQuestionPageMap(
  pdfPath: string
): Promise<Record<number, number[]>> {
  const pageTexts = await getPageTexts(pdfPath);
  const qPages: Record<number, number[]> = {};

  for (let i = 0; i < pageTexts.length; i++) {
    const matches = pageTexts[i].matchAll(/שאלה\s+(\d{1,4})/g);
    for (const m of matches) {
      const qNum = parseInt(m[1]);
      if (qNum >= 1 && qNum <= 1000) {
        if (!qPages[qNum]) qPages[qNum] = [];
        qPages[qNum].push(i + 1);
      }
    }
  }

  return qPages;
}

// ─── Map answer numbers to PDF pages ────────────────────────────────────────
// Sequential validation: answer numbers must appear in roughly ascending order.
// This eliminates false positives like "1." appearing as list items on page 100.

async function getAnswerPageMap(
  pdfPath: string,
  rangeMin: number,
  rangeMax: number
): Promise<Record<number, number[]>> {
  const pageTexts = await getPageTexts(pdfPath);

  // Phase 1: collect all candidate answer numbers per page
  const candidates: { pageNum: number; qNum: number }[] = [];
  for (let i = 0; i < pageTexts.length; i++) {
    const text = pageTexts[i];
    const pageNum = i + 1;

    const matches = text.matchAll(/(?:^|\s)(\d{1,4})\s*\.\s/g);
    for (const m of matches) {
      const qNum = parseInt(m[1]);
      if (qNum >= rangeMin && qNum <= rangeMax) {
        candidates.push({ pageNum, qNum });
      }
    }
  }

  // Phase 2: keep only candidates that fit a roughly ascending sequence.
  // Track the highest "confirmed" answer number. A new candidate is valid
  // only if it's >= the last confirmed OR within a small backward tolerance.
  // This eliminates "1." appearing on page 50 when we've already seen "100." on page 20.
  const aPages: Record<number, number[]> = {};
  let maxConfirmed = rangeMin - 1;

  // Sort by page then by number
  candidates.sort((a, b) => a.pageNum - b.pageNum || a.qNum - b.qNum);

  for (const { pageNum, qNum } of candidates) {
    // Accept if this number is >= maxConfirmed - 5 (small tolerance for re-mentions)
    // This rejects "1." on page 50 when maxConfirmed is already 200
    if (qNum >= maxConfirmed - 5) {
      if (!aPages[qNum]) aPages[qNum] = [];
      if (!aPages[qNum].includes(pageNum)) {
        aPages[qNum].push(pageNum);
      }
      if (qNum > maxConfirmed) {
        maxConfirmed = qNum;
      }
    }
  }

  return aPages;
}

// ─── Build question→images map with single-question-per-page preference ─────
// maxGap: only look back this many pages for a matching question.
// Prevents cascading all orphan images to one distant question.

function buildQuestionImageMap(
  pageMap: Record<number, number[]>,
  pageImages: Record<number, string[]>,
  maxGap: number = 2
): Record<number, string[]> {
  // Invert: page → questions on that page
  const pageToQuestions: Record<number, number[]> = {};
  for (const [qNumStr, pages] of Object.entries(pageMap)) {
    const qNum = parseInt(qNumStr);
    for (const p of pages) {
      if (!pageToQuestions[p]) pageToQuestions[p] = [];
      pageToQuestions[p].push(qNum);
    }
  }

  const result: Record<number, string[]> = {};

  for (const [pageStr, imgs] of Object.entries(pageImages)) {
    const page = parseInt(pageStr);
    const questions = pageToQuestions[page];

    if (!questions || questions.length === 0) {
      // No question mapped to this page — look back at most maxGap pages
      let nearestQ: number | null = null;
      for (let p = page - 1; p >= Math.max(1, page - maxGap); p--) {
        if (pageToQuestions[p]?.length) {
          const sorted = [...pageToQuestions[p]].sort((a, b) => a - b);
          nearestQ = sorted[sorted.length - 1];
          break;
        }
      }
      if (nearestQ !== null) {
        if (!result[nearestQ]) result[nearestQ] = [];
        result[nearestQ].push(...imgs);
      }
      // else: skip — image is too far from any known question
      continue;
    }

    if (questions.length === 1) {
      const qNum = questions[0];
      if (!result[qNum]) result[qNum] = [];
      result[qNum].push(...imgs);
    } else {
      // Multiple questions on page — assign to first question
      const sorted = [...questions].sort((a, b) => a - b);
      const qNum = sorted[0];
      if (!result[qNum]) result[qNum] = [];
      result[qNum].push(...imgs);
    }
  }

  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Image Extraction Script (v2 — improved filters) ===\n");

  // 1. Extract question images
  const qImgDir = path.join(ROOT, "public/images/q");
  fs.mkdirSync(qImgDir, { recursive: true });
  for (const f of fs.readdirSync(qImgDir)) {
    fs.unlinkSync(path.join(qImgDir, f));
  }

  const qPdfPath = path.join(ROOT, "docs_base/שאלות גרסא 7.pdf");
  const qPageImages = await extractImagesFromPdf(qPdfPath, qImgDir, "q", "q", 2);

  // Map question numbers to pages
  console.log("\nMapping questions to pages...");
  const qPageMap = await getQuestionPageMap(qPdfPath);
  console.log(`  Mapped ${Object.keys(qPageMap).length} questions to pages`);

  // Build question → images with improved logic
  const questionImages = buildQuestionImageMap(qPageMap, qPageImages);
  console.log(`  Questions with images: ${Object.keys(questionImages).length}`);

  // 2. Extract answer images
  const aImgDir = path.join(ROOT, "public/images/a");
  fs.mkdirSync(aImgDir, { recursive: true });
  for (const f of fs.readdirSync(aImgDir)) {
    fs.unlinkSync(path.join(aImgDir, f));
  }

  const answerFiles = [
    { file: "docs_base/תשובות  1-526 בגרסא 7.1.pdf", prefix: "a1", min: 1, max: 526 },
    { file: "docs_base/תשובות 527-734 בגרסא 7.1.pdf", prefix: "a2", min: 527, max: 734 },
    { file: "docs_base/תשובות 735-1000 בגרסא 7.1.pdf", prefix: "a3", min: 735, max: 1000 },
  ];

  const allAnswerImages: Record<number, string[]> = {};

  for (const { file, prefix, min, max } of answerFiles) {
    const fullPath = path.join(ROOT, file);
    const aPageImages = await extractImagesFromPdf(fullPath, aImgDir, prefix, "a");

    // Map answer numbers to pages (constrained to file's range)
    const aPageMap = await getAnswerPageMap(fullPath, min, max);

    const aImgs = buildQuestionImageMap(aPageMap, aPageImages);
    for (const [qNumStr, imgs] of Object.entries(aImgs)) {
      const qNum = parseInt(qNumStr);
      if (!allAnswerImages[qNum]) allAnswerImages[qNum] = [];
      allAnswerImages[qNum].push(...imgs);
    }
  }

  console.log(`\nAnswers with images: ${Object.keys(allAnswerImages).length}`);

  // 3. Update database
  console.log("\nUpdating database...");

  // Clear ALL existing image data first
  await prisma.question.updateMany({
    data: {
      imageUrls: null,
      answerImageUrls: null,
    },
  });
  console.log("  Cleared all existing image mappings");

  const questions = await prisma.question.findMany({
    select: { id: true, questionNum: true },
  });

  let qUpdated = 0;
  let aUpdated = 0;

  for (const q of questions) {
    const qImgs = questionImages[q.questionNum];
    const aImgs = allAnswerImages[q.questionNum];

    if (qImgs || aImgs) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          ...(qImgs ? { imageUrls: qImgs } : {}),
          ...(aImgs ? { answerImageUrls: aImgs } : {}),
        },
      });

      if (qImgs) qUpdated++;
      if (aImgs) aUpdated++;
    }
  }

  console.log(`  Updated ${qUpdated} questions with images`);
  console.log(`  Updated ${aUpdated} answers with images`);

  // 4. Sanity check
  console.log("\n=== Sanity check: questions with many images ===");
  let suspicious = 0;
  for (const [qNum, imgs] of Object.entries(questionImages)) {
    if (imgs.length > 3) {
      console.log(`  Q#${qNum}: ${imgs.length} question images`);
      suspicious++;
    }
  }
  for (const [qNum, imgs] of Object.entries(allAnswerImages)) {
    if (imgs.length > 3) {
      console.log(`  A#${qNum}: ${imgs.length} answer images`);
      suspicious++;
    }
  }
  if (suspicious === 0) {
    console.log("  All clean — no suspicious image counts!");
  }

  console.log("\n=== Done! ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
