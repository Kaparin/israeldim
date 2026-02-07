import { PDFParse } from "pdf-parse";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("../src/generated/prisma/client.ts") ? {} : {};
const { PrismaNeon } = require("@prisma/adapter-neon");
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// ─── Step 1: Parse correct answers from answer PDFs ──────────────────────────
async function parseAnswers() {
  const answerFiles = [
    "docs_base/תשובות  1-526 בגרסא 7.1.pdf",
    "docs_base/תשובות 527-734 בגרסא 7.1.pdf",
    "docs_base/תשובות 735-1000 בגרסא 7.1.pdf",
  ];

  const answers = {}; // { questionNum: { correctIndex, text, pages } }

  for (const file of answerFiles) {
    console.log(`Parsing answers: ${path.basename(file)}...`);
    const buf = fs.readFileSync(path.join(ROOT, file));
    const pdf = new PDFParse({ data: new Uint8Array(buf) });
    const result = await pdf.getText();
    const text = result.text;

    // Split by answer blocks. Answers start with a number followed by a dot.
    // Pattern: line starts with number, tab/space, dot
    const blocks = text.split(
      /\n(?=\d{1,4}\s*\.\s)/
    );

    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      // Extract question number
      const numMatch = trimmed.match(/^(\d{1,4})\s*\./);
      if (!numMatch) continue;

      const qNum = parseInt(numMatch[1]);
      if (qNum < 1 || qNum > 1000) continue;

      // Extract correct answer: "התשובה היא X" or "תשובה היא X" or "התשובה X"
      const answerMatch = trimmed.match(
        /ה?תשובה\s+(?:היא\s+)?(\d)/
      );

      if (answerMatch) {
        const correctAnswer = parseInt(answerMatch[1]);
        // Convert 1-based to 0-based index
        const correctIndex = correctAnswer - 1;

        // Get explanation text (everything after the question number)
        const explanationText = trimmed
          .replace(/^\d{1,4}\s*\.\s*/, "")
          .trim();

        answers[qNum] = {
          correctIndex,
          text: explanationText,
        };
      }
    }

    await pdf.destroy();
  }

  console.log(`Parsed ${Object.keys(answers).length} answers`);
  return answers;
}

// ─── Step 2: Parse questions from questions PDF ──────────────────────────────
async function parseQuestions() {
  console.log("Parsing questions...");
  const buf = fs.readFileSync(
    path.join(ROOT, "docs_base/שאלות גרסא 7.pdf")
  );
  const pdf = new PDFParse({ data: new Uint8Array(buf) });
  const result = await pdf.getText();
  const text = result.text;

  const questions = [];

  // Split text into question blocks using "שאלה\tN" pattern
  const blocks = text.split(/(?=שאלה\s+\d{1,4}\s*\n)/);

  for (const block of blocks) {
    const trimmed = block.trim();

    // Match question header
    const headerMatch = trimmed.match(/^שאלה\s+(\d{1,4})/);
    if (!headerMatch) continue;

    const qNum = parseInt(headerMatch[1]);

    // Remove the "שאלה N" header and the 5-digit ID line
    let body = trimmed
      .replace(/^שאלה\s+\d{1,4}\s*\n/, "")
      .replace(/^\d{5}\s*\n/, "")
      .trim();

    // Remove page headers/footers
    body = body.replace(
      /אגף בכיר.*?פקס\s+\d[\d-]+/gs,
      ""
    );
    body = body.replace(
      /גרסה.*?מהנדסים\s*\n\s*\d+/gs,
      ""
    );
    body = body.replace(/--\s*\d+\s*of\s*\d+\s*--/g, "");

    // Extract options (1. ... 2. ... 3. ... 4. ...)
    const optionPattern =
      /(?:^|\n)\s*([1-4])\s*\.\s+([\s\S]*?)(?=\n\s*[1-4]\s*\.\s|$)/g;
    const options = [];
    let optMatch;
    let lastOptEnd = 0;

    // Find all options
    const optMatches = [];
    while ((optMatch = optionPattern.exec(body)) !== null) {
      optMatches.push({
        num: parseInt(optMatch[1]),
        text: optMatch[2].trim().replace(/\s+/g, " "),
        index: optMatch.index,
      });
    }

    if (optMatches.length < 2) continue;

    // Get question text (everything before first option)
    const firstOptIndex = optMatches[0].index;
    const questionText = body
      .substring(0, firstOptIndex)
      .trim()
      .replace(/\s+/g, " ");

    if (!questionText) continue;

    // Collect options in order
    for (const opt of optMatches) {
      options.push(opt.text);
    }

    questions.push({
      questionNum: qNum,
      text: questionText,
      options,
    });
  }

  await pdf.destroy();
  console.log(`Parsed ${questions.length} questions`);
  return questions;
}

// ─── Step 3: Extract images from questions PDF ───────────────────────────────
async function extractQuestionImages(questions) {
  console.log("Extracting question images...");
  const buf = fs.readFileSync(
    path.join(ROOT, "docs_base/שאלות גרסא 7.pdf")
  );
  const pdf = new PDFParse({ data: new Uint8Array(buf) });

  // First, get text per page to map questions to pages
  const textResult = await pdf.getText();
  const pageTexts = textResult.pages || [];

  // Map question numbers to pages
  const questionPages = {};
  for (let i = 0; i < pageTexts.length; i++) {
    const pageText = pageTexts[i]?.text || "";
    const matches = pageText.matchAll(/שאלה\s+(\d{1,4})/g);
    for (const m of matches) {
      const qNum = parseInt(m[1]);
      if (!questionPages[qNum]) questionPages[qNum] = [];
      questionPages[qNum].push(i + 1); // 1-based page numbers
    }
  }

  // Extract images page by page (skip first 2 pages - cover/TOC)
  const BATCH_SIZE = 50;
  const totalPages = pageTexts.length;
  const pageImages = {}; // pageNum -> [image paths]

  for (let start = 3; start <= totalPages; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, totalPages);
    console.log(`  Extracting images pages ${start}-${end}...`);

    try {
      const imgResult = await pdf.getImage({
        firstPage: start,
        lastPage: end,
        imageBuffer: true,
      });

      for (const page of imgResult.pages) {
        const validImages = page.images.filter(
          (img) => img.width >= 100 && img.height >= 80 && img.data
        );

        if (validImages.length === 0) continue;

        pageImages[page.pageNumber] = [];

        for (let j = 0; j < validImages.length; j++) {
          const img = validImages[j];
          const filename = `q_p${page.pageNumber}_${j}.png`;
          const filepath = path.join(ROOT, "public/images/q", filename);

          try {
            const channels = img.kind === 1 ? 1 : img.kind === 2 ? 3 : 4;
            let inputData = img.data;

            // Handle 1BPP grayscale - expand bits to bytes
            if (img.kind === 1) {
              const expanded = new Uint8Array(img.width * img.height);
              for (let p = 0; p < img.width * img.height; p++) {
                const byteIdx = Math.floor(p / 8);
                const bitIdx = 7 - (p % 8);
                expanded[p] =
                  (inputData[byteIdx] >> bitIdx) & 1 ? 255 : 0;
              }
              inputData = expanded;
            }

            await sharp(Buffer.from(inputData), {
              raw: {
                width: img.width,
                height: img.height,
                channels,
              },
            })
              .png({ quality: 80 })
              .toFile(filepath);

            pageImages[page.pageNumber].push(`/images/q/${filename}`);
          } catch (err) {
            console.warn(
              `  Warning: failed to save image p${page.pageNumber}_${j}:`,
              err.message
            );
          }
        }
      }
    } catch (err) {
      console.warn(`  Warning: image extraction failed for pages ${start}-${end}:`, err.message);
    }
  }

  // Assign images to questions
  for (const q of questions) {
    const pages = questionPages[q.questionNum] || [];
    const imgs = [];
    for (const p of pages) {
      if (pageImages[p]) {
        imgs.push(...pageImages[p]);
      }
    }
    q.imageUrls = imgs.length > 0 ? imgs : null;
  }

  await pdf.destroy();
  console.log(
    `Extracted images for ${questions.filter((q) => q.imageUrls).length} questions`
  );
}

// ─── Step 4: Extract images from answer PDFs ─────────────────────────────────
async function extractAnswerImages(answers) {
  const answerFiles = [
    { file: "docs_base/תשובות  1-526 בגרסא 7.1.pdf", prefix: "a1" },
    { file: "docs_base/תשובות 527-734 בגרסא 7.1.pdf", prefix: "a2" },
    { file: "docs_base/תשובות 735-1000 בגרסא 7.1.pdf", prefix: "a3" },
  ];

  for (const { file, prefix } of answerFiles) {
    console.log(`Extracting answer images: ${path.basename(file)}...`);
    const buf = fs.readFileSync(path.join(ROOT, file));
    const pdf = new PDFParse({ data: new Uint8Array(buf) });

    // Get text per page to map answers to pages
    const textResult = await pdf.getText();
    const pageTexts = textResult.pages || [];

    // Map question numbers to answer pages
    const answerPages = {};
    for (let i = 0; i < pageTexts.length; i++) {
      const pageText = pageTexts[i]?.text || "";
      // Answer blocks start with "N." where N is 1-1000
      const matches = pageText.matchAll(
        /(?:^|\n)\s*(\d{1,4})\s*\.\s/g
      );
      for (const m of matches) {
        const qNum = parseInt(m[1]);
        if (qNum >= 1 && qNum <= 1000) {
          if (!answerPages[qNum]) answerPages[qNum] = [];
          answerPages[qNum].push(i + 1);
        }
      }
    }

    // Extract images
    const BATCH_SIZE = 50;
    const totalPages = pageTexts.length;
    const pageImages = {};

    for (let start = 1; start <= totalPages; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, totalPages);
      console.log(`  Extracting images pages ${start}-${end}...`);

      try {
        const imgResult = await pdf.getImage({
          firstPage: start,
          lastPage: end,
          imageBuffer: true,
        });

        for (const page of imgResult.pages) {
          const validImages = page.images.filter(
            (img) => img.width >= 80 && img.height >= 60 && img.data
          );

          if (validImages.length === 0) continue;
          pageImages[page.pageNumber] = [];

          for (let j = 0; j < validImages.length; j++) {
            const img = validImages[j];
            const filename = `${prefix}_p${page.pageNumber}_${j}.png`;
            const filepath = path.join(ROOT, "public/images/a", filename);

            try {
              const channels = img.kind === 1 ? 1 : img.kind === 2 ? 3 : 4;
              let inputData = img.data;

              if (img.kind === 1) {
                const expanded = new Uint8Array(img.width * img.height);
                for (let p = 0; p < img.width * img.height; p++) {
                  const byteIdx = Math.floor(p / 8);
                  const bitIdx = 7 - (p % 8);
                  expanded[p] =
                    (inputData[byteIdx] >> bitIdx) & 1 ? 255 : 0;
                }
                inputData = expanded;
              }

              await sharp(Buffer.from(inputData), {
                raw: {
                  width: img.width,
                  height: img.height,
                  channels,
                },
              })
                .png({ quality: 80 })
                .toFile(filepath);

              pageImages[page.pageNumber].push(`/images/a/${filename}`);
            } catch (err) {
              console.warn(
                `  Warning: failed to save answer image:`,
                err.message
              );
            }
          }
        }
      } catch (err) {
        console.warn(`  Warning: answer image extraction failed:`, err.message);
      }
    }

    // Assign answer images to questions
    for (const qNumStr of Object.keys(answerPages)) {
      const qNum = parseInt(qNumStr);
      if (!answers[qNum]) continue;

      const pages = answerPages[qNum];
      const imgs = [];
      for (const p of pages) {
        if (pageImages[p]) {
          imgs.push(...pageImages[p]);
        }
      }
      if (imgs.length > 0) {
        answers[qNum].imageUrls = imgs;
      }
    }

    await pdf.destroy();
  }
}

// ─── Step 5: Insert into database ────────────────────────────────────────────
async function seedDatabase(questions, answers) {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.testResult.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();

  // Create quizzes split by answer PDF ranges
  const quizzes = [
    {
      title: "שאלות 1-526",
      description: "בחינות רישוי בחשמל - חלק 1",
      range: [1, 526],
    },
    {
      title: "שאלות 527-734",
      description: "בחינות רישוי בחשמל - חלק 2",
      range: [527, 734],
    },
    {
      title: "שאלות 735-1000",
      description: "בחינות רישוי בחשמל - חלק 3",
      range: [735, 1000],
    },
  ];

  for (const quizDef of quizzes) {
    const quizQuestions = questions.filter(
      (q) =>
        q.questionNum >= quizDef.range[0] &&
        q.questionNum <= quizDef.range[1]
    );

    console.log(
      `Creating quiz "${quizDef.title}" with ${quizQuestions.length} questions...`
    );

    const quiz = await prisma.quiz.create({
      data: {
        title: quizDef.title,
        description: quizDef.description,
      },
    });

    // Insert questions in batches
    const BATCH = 50;
    for (let i = 0; i < quizQuestions.length; i += BATCH) {
      const batch = quizQuestions.slice(i, i + BATCH);
      await prisma.question.createMany({
        data: batch.map((q, idx) => {
          const answer = answers[q.questionNum];
          return {
            quizId: quiz.id,
            questionNum: q.questionNum,
            text: q.text,
            options: q.options,
            correctIndex: answer ? answer.correctIndex : 0,
            order: i + idx + 1,
            imageUrls: q.imageUrls || undefined,
            answerText: answer?.text || null,
            answerImageUrls: answer?.imageUrls || undefined,
          };
        }),
      });
    }
  }

  console.log("Database seeded successfully!");
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  try {
    console.log("=== Quiz Seed Script ===\n");

    const answers = await parseAnswers();
    const questions = await parseQuestions();

    await extractQuestionImages(questions);
    await extractAnswerImages(answers);

    await seedDatabase(questions, answers);

    console.log("\n=== Done! ===");
    console.log(`Total questions: ${questions.length}`);
    console.log(`Total answers: ${Object.keys(answers).length}`);
    console.log(
      `Questions with images: ${questions.filter((q) => q.imageUrls).length}`
    );
    console.log(
      `Answers with images: ${Object.values(answers).filter((a) => a.imageUrls).length}`
    );
  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
