/**
 * Diagnostic: analyze PDF layout to understand image-to-question mapping.
 * Shows text items and image positions on a few sample pages.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function getObjAsync(objs: any, name: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const obj = objs.get(name);
      resolve(obj);
    } catch {
      objs.get(name, (data: any) => resolve(data));
      setTimeout(() => reject(new Error("timeout")), 5000);
    }
  });
}

interface PageElement {
  type: "text" | "image";
  y: number;         // vertical position (from top)
  x: number;
  content: string;   // text content or image dimensions
  width?: number;
  height?: number;
  pageHeight?: number;
}

async function analyzePage(
  pdfjsLib: any,
  doc: any,
  pageNum: number
): Promise<PageElement[]> {
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.0 });
  const pageHeight = viewport.height;

  const elements: PageElement[] = [];

  // 1) Get text items with positions
  const textContent = await page.getTextContent();
  for (const item of textContent.items) {
    if (!item.str || item.str.trim() === "") continue;
    // item.transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
    const tx = item.transform[4];
    const ty = item.transform[5];
    // PDF coords: origin at bottom-left. Convert to top-origin.
    const yFromTop = pageHeight - ty;
    elements.push({
      type: "text",
      y: yFromTop,
      x: tx,
      content: item.str.trim(),
    });
  }

  // 2) Get image positions via operator list + transform matrix
  const ops = await page.getOperatorList();
  // We need to track the current transform matrix (CTM)
  // paintImageXObject is preceded by a transform operation
  const matrixStack: number[][] = [[1, 0, 0, 1, 0, 0]]; // identity

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];

    if (fn === pdfjsLib.OPS.save) {
      matrixStack.push([...matrixStack[matrixStack.length - 1]]);
    } else if (fn === pdfjsLib.OPS.restore) {
      if (matrixStack.length > 1) matrixStack.pop();
    } else if (fn === pdfjsLib.OPS.transform) {
      const [a, b, c, d, e, f] = ops.argsArray[i];
      const current = matrixStack[matrixStack.length - 1];
      // Multiply matrices
      const newMatrix = [
        current[0] * a + current[2] * b,
        current[1] * a + current[3] * b,
        current[0] * c + current[2] * d,
        current[1] * c + current[3] * d,
        current[0] * e + current[2] * f + current[4],
        current[1] * e + current[3] * f + current[5],
      ];
      matrixStack[matrixStack.length - 1] = newMatrix;
    } else if (
      fn === pdfjsLib.OPS.paintImageXObject ||
      fn === pdfjsLib.OPS.paintImageXObjectRepeat
    ) {
      const imgName = ops.argsArray[i][0];
      if (typeof imgName !== "string") continue;

      let imgData: any = null;
      try {
        imgData = await getObjAsync(page.objs, imgName);
      } catch {
        continue;
      }
      if (!imgData || !imgData.width || !imgData.height) continue;

      const ctm = matrixStack[matrixStack.length - 1];
      // Image in PDF is drawn in a 1x1 unit space, scaled by the CTM
      // ctm[0] = width, ctm[3] = height (often negative = flip), ctm[4] = x, ctm[5] = y
      const imgWidth = Math.abs(ctm[0]);
      const imgHeight = Math.abs(ctm[3]);
      const imgX = ctm[4];
      const imgY = ctm[5];
      const yFromTop = pageHeight - imgY;

      // Skip tiny images
      if (imgData.width < 80 || imgData.height < 40) continue;

      elements.push({
        type: "image",
        y: yFromTop,
        x: imgX,
        content: `${imgData.width}x${imgData.height}px (rendered ${Math.round(imgWidth)}x${Math.round(imgHeight)}pt)`,
        width: imgData.width,
        height: imgData.height,
        pageHeight,
      });
    } else if (fn === pdfjsLib.OPS.paintInlineImageXObject) {
      const imgObj = ops.argsArray[i][0];
      if (!imgObj || !imgObj.width || !imgObj.height) continue;
      if (imgObj.width < 80 || imgObj.height < 40) continue;

      const ctm = matrixStack[matrixStack.length - 1];
      const imgX = ctm[4];
      const imgY = ctm[5];
      const yFromTop = pageHeight - imgY;

      elements.push({
        type: "image",
        y: yFromTop,
        x: imgX,
        content: `inline ${imgObj.width}x${imgObj.height}px`,
        width: imgObj.width,
        height: imgObj.height,
        pageHeight,
      });
    }
  }

  page.cleanup();

  // Sort by y position (top to bottom)
  elements.sort((a, b) => a.y - b.y);

  return elements;
}

async function main() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // --- QUESTIONS PDF ---
  console.log("=== QUESTIONS PDF: Layout Analysis ===\n");
  const qPath = path.join(ROOT, "docs_base/שאלות גרסא 7.pdf");
  const qData = new Uint8Array(fs.readFileSync(qPath));
  const qDoc = await pdfjsLib.getDocument({ data: qData, useSystemFonts: true }).promise;
  console.log(`Total pages: ${qDoc.numPages}\n`);

  // Analyze pages known to have images: 6, 7, 8, 9, 13, 14, 15, 111
  const qSamplePages = [6, 7, 8, 9, 13, 14, 15, 16, 17, 111];
  for (const p of qSamplePages) {
    if (p > qDoc.numPages) continue;
    console.log(`\n--- Questions PDF Page ${p} ---`);
    const elements = await analyzePage(pdfjsLib, qDoc, p);

    // Show question markers and images only
    let lastQNum: string | null = null;
    for (const el of elements) {
      if (el.type === "text") {
        const qMatch = el.content.match(/שאלה\s+(\d+)/);
        if (qMatch) {
          lastQNum = qMatch[1];
          console.log(`  [y=${Math.round(el.y)}] QUESTION #${lastQNum}`);
        }
      } else {
        console.log(`  [y=${Math.round(el.y)}] IMAGE: ${el.content} (after Q#${lastQNum || "?"})`);
      }
    }
  }
  await qDoc.destroy();

  // --- ANSWERS PDF (first file) ---
  console.log("\n\n=== ANSWERS PDF (1-526): Layout Analysis ===\n");
  const aPath = path.join(ROOT, "docs_base/תשובות  1-526 בגרסא 7.1.pdf");
  const aData = new Uint8Array(fs.readFileSync(aPath));
  const aDoc = await pdfjsLib.getDocument({ data: aData, useSystemFonts: true }).promise;
  console.log(`Total pages: ${aDoc.numPages}\n`);

  // Analyze first 15 pages of answers
  const aSamplePages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 21, 27, 30, 32];
  for (const p of aSamplePages) {
    if (p > aDoc.numPages) continue;
    console.log(`\n--- Answers PDF Page ${p} ---`);
    const elements = await analyzePage(pdfjsLib, aDoc, p);

    // Show answer markers and images
    let lastANum: string | null = null;
    for (const el of elements) {
      if (el.type === "text") {
        // Answers are typically "1." or "2." etc.
        const aMatch = el.content.match(/^(\d{1,4})\s*\./);
        if (aMatch) {
          const num = parseInt(aMatch[1]);
          if (num >= 1 && num <= 1000) {
            lastANum = aMatch[1];
            console.log(`  [y=${Math.round(el.y)}] ANSWER #${lastANum}`);
          }
        }
      } else {
        console.log(`  [y=${Math.round(el.y)}] IMAGE: ${el.content} (after A#${lastANum || "?"})`);
      }
    }
  }
  await aDoc.destroy();

  // --- Summary: images per page across all question pages ---
  console.log("\n\n=== IMAGE COUNT PER PAGE (Questions PDF) ===\n");
  const qDoc2 = await pdfjsLib.getDocument({ data: qData, useSystemFonts: true }).promise;
  const imgCounts: Record<number, number> = {};
  for (let p = 1; p <= qDoc2.numPages; p++) {
    const page = await qDoc2.getPage(p);
    const ops = await page.getOperatorList();
    let count = 0;
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (
        fn === pdfjsLib.OPS.paintImageXObject ||
        fn === pdfjsLib.OPS.paintImageXObjectRepeat ||
        fn === pdfjsLib.OPS.paintInlineImageXObject
      ) {
        // Check size
        let imgData: any = null;
        if (fn === pdfjsLib.OPS.paintInlineImageXObject) {
          imgData = ops.argsArray[i][0];
        } else {
          const imgName = ops.argsArray[i][0];
          if (typeof imgName === "string") {
            try { imgData = await getObjAsync(page.objs, imgName); } catch {}
          }
        }
        if (imgData && imgData.width >= 80 && imgData.height >= 40) {
          count++;
        }
      }
    }
    if (count > 0) imgCounts[p] = count;
    page.cleanup();
  }
  await qDoc2.destroy();

  const sorted = Object.entries(imgCounts).sort((a, b) => b[1] - a[1]);
  console.log(`Pages with images: ${sorted.length}`);
  console.log(`\nTop 20 pages by image count:`);
  for (const [page, count] of sorted.slice(0, 20)) {
    console.log(`  Page ${page}: ${count} images`);
  }
}

main().catch(console.error);
