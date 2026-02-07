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

// ─── Extract images from a PDF using pdfjs-dist ─────────────────────────────
async function extractImagesFromPdf(
  pdfPath: string,
  outDir: string,
  prefix: string,
  skipPages: number = 0
): Promise<Record<number, string[]>> {
  const pdfjs = await getPdfjs();

  console.log(`\nExtracting images: ${path.basename(pdfPath)}...`);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pageImages: Record<number, string[]> = {};
  let totalImages = 0;
  let imgCounter = 0;

  for (let pageNum = skipPages + 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const ops = await page.getOperatorList();
    const pageImgs: string[] = [];

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];

      let imgData: any = null;

      if (
        fn === pdfjs.OPS.paintImageXObject ||
        fn === pdfjs.OPS.paintImageXObjectRepeat
      ) {
        const imgName = ops.argsArray[i][0];
        if (typeof imgName !== "string") continue;
        try {
          imgData = await getObjAsync(page.objs, imgName);
        } catch {
          continue;
        }
      } else if (fn === pdfjs.OPS.paintInlineImageXObject) {
        imgData = ops.argsArray[i][0];
      }

      if (!imgData || !imgData.data || !imgData.width || !imgData.height) continue;

      const { width, height, data: pixels, kind } = imgData;

      // Skip tiny images (icons, decorations)
      if (width < 80 || height < 40) continue;

      const channels = kind === 1 ? 1 : kind === 2 ? 3 : 4;
      const filename = `${prefix}_p${pageNum}_${imgCounter}.png`;
      const filepath = path.join(outDir, filename);
      const urlPath = `/images/${prefix.startsWith("a") ? "a" : "q"}/${filename}`;

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

    // Progress
    if (pageNum % 50 === 0 || pageNum === doc.numPages) {
      process.stdout.write(`  Page ${pageNum}/${doc.numPages} (${totalImages} images so far)\n`);
    }
  }

  await doc.destroy();
  console.log(`  Total: ${totalImages} images from ${Object.keys(pageImages).length} pages`);
  return pageImages;
}

// ─── Extract text per page using pdfjs-dist ─────────────────────────────────
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

// ─── Map answer question numbers to PDF pages ──────────────────────────────
async function getAnswerPageMap(
  pdfPath: string
): Promise<Record<number, number[]>> {
  const pageTexts = await getPageTexts(pdfPath);
  const aPages: Record<number, number[]> = {};

  for (let i = 0; i < pageTexts.length; i++) {
    const matches = pageTexts[i].matchAll(/(?:^|\s)(\d{1,4})\s*\.\s/g);
    for (const m of matches) {
      const qNum = parseInt(m[1]);
      if (qNum >= 1 && qNum <= 1000) {
        if (!aPages[qNum]) aPages[qNum] = [];
        if (!aPages[qNum].includes(i + 1)) {
          aPages[qNum].push(i + 1);
        }
      }
    }
  }

  return aPages;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Image Extraction Script ===");

  // 1. Extract question images
  const qImgDir = path.join(ROOT, "public/images/q");
  fs.mkdirSync(qImgDir, { recursive: true });
  // Clear old images
  for (const f of fs.readdirSync(qImgDir)) {
    fs.unlinkSync(path.join(qImgDir, f));
  }

  const qPdfPath = path.join(ROOT, "docs_base/שאלות גרסא 7.pdf");
  const qPageImages = await extractImagesFromPdf(qPdfPath, qImgDir, "q", 2);

  // Map question numbers to pages
  console.log("\nMapping questions to pages...");
  const qPageMap = await getQuestionPageMap(qPdfPath);
  console.log(`  Mapped ${Object.keys(qPageMap).length} questions to pages`);

  // Build question -> images mapping
  const questionImages: Record<number, string[]> = {};
  for (const [qNumStr, pages] of Object.entries(qPageMap)) {
    const qNum = parseInt(qNumStr);
    const imgs: string[] = [];
    for (const p of pages) {
      if (qPageImages[p]) imgs.push(...qPageImages[p]);
    }
    if (imgs.length > 0) {
      questionImages[qNum] = imgs;
    }
  }
  console.log(`  Questions with images: ${Object.keys(questionImages).length}`);

  // 2. Extract answer images
  const aImgDir = path.join(ROOT, "public/images/a");
  fs.mkdirSync(aImgDir, { recursive: true });
  for (const f of fs.readdirSync(aImgDir)) {
    fs.unlinkSync(path.join(aImgDir, f));
  }

  const answerFiles = [
    { file: "docs_base/תשובות  1-526 בגרסא 7.1.pdf", prefix: "a1" },
    { file: "docs_base/תשובות 527-734 בגרסא 7.1.pdf", prefix: "a2" },
    { file: "docs_base/תשובות 735-1000 בגרסא 7.1.pdf", prefix: "a3" },
  ];

  const answerImages: Record<number, string[]> = {};

  for (const { file, prefix } of answerFiles) {
    const fullPath = path.join(ROOT, file);
    const aPageImages = await extractImagesFromPdf(fullPath, aImgDir, prefix);

    // Map answer numbers to pages
    const aPageMap = await getAnswerPageMap(fullPath);

    for (const [qNumStr, pages] of Object.entries(aPageMap)) {
      const qNum = parseInt(qNumStr);
      const imgs: string[] = [];
      for (const p of pages) {
        if (aPageImages[p]) imgs.push(...aPageImages[p]);
      }
      if (imgs.length > 0) {
        if (!answerImages[qNum]) answerImages[qNum] = [];
        answerImages[qNum].push(...imgs);
      }
    }
  }
  console.log(`\nAnswers with images: ${Object.keys(answerImages).length}`);

  // 3. Update database
  console.log("\nUpdating database...");
  const questions = await prisma.question.findMany({
    select: { id: true, questionNum: true },
  });

  let qUpdated = 0;
  let aUpdated = 0;

  for (const q of questions) {
    const qImgs = questionImages[q.questionNum];
    const aImgs = answerImages[q.questionNum];

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
  console.log("\n=== Done! ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
