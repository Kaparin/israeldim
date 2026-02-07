import { PDFParse } from "pdf-parse";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const ROOT = process.cwd();

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter }) as any;

interface Answer {
  correctIndex: number;
  text: string;
}

interface ParsedQuestion {
  questionNum: number;
  text: string;
  options: string[];
}

// ─── Step 1: Parse correct answers from answer PDFs ──────────────────────────
async function parseAnswers(): Promise<Record<number, Answer>> {
  const answerFiles = [
    "docs_base/תשובות  1-526 בגרסא 7.1.pdf",
    "docs_base/תשובות 527-734 בגרסא 7.1.pdf",
    "docs_base/תשובות 735-1000 בגרסא 7.1.pdf",
  ];

  const answers: Record<number, Answer> = {};

  for (const file of answerFiles) {
    console.log(`Parsing answers: ${path.basename(file)}...`);
    const buf = fs.readFileSync(path.join(ROOT, file));
    const pdf = new PDFParse({ data: new Uint8Array(buf) });
    const result = await pdf.getText();
    const text = result.text;

    // Split by answer blocks
    const blocks = text.split(/\n(?=\d{1,4}\s*\.\s)/);

    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      const numMatch = trimmed.match(/^(\d{1,4})\s*\./);
      if (!numMatch) continue;

      const qNum = parseInt(numMatch[1]);
      if (qNum < 1 || qNum > 1000) continue;

      // Clean out header/footer text
      let cleaned = trimmed;
      cleaned = cleaned.replace(/ערך\s*:[\s\S]*?עבודות\s+חשמל\s*\./g, "");
      cleaned = cleaned.replace(/--\s*\d+\s*of\s*\d+\s*--/g, "");
      cleaned = cleaned.replace(/^\d+\s*\n/gm, ""); // standalone page numbers

      // Extract correct answer number (only 1-4, use LAST occurrence)
      const answerMatches = [...cleaned.matchAll(/ה?תשובה\s+(?:היא\s+)?([1-4])\s*\.?/g)];
      const answerMatch = answerMatches.length > 0 ? answerMatches[answerMatches.length - 1] : null;

      if (answerMatch) {
        const correctIndex = parseInt(answerMatch[1]) - 1;
        const explanationText = cleaned.replace(/^\d{1,4}\s*\.\s*/, "").trim();

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
async function parseQuestions(): Promise<ParsedQuestion[]> {
  console.log("Parsing questions...");
  const buf = fs.readFileSync(
    path.join(ROOT, "docs_base/שאלות גרסא 7.pdf")
  );
  const pdf = new PDFParse({ data: new Uint8Array(buf) });
  const result = await pdf.getText();
  const text = result.text;

  const questions: ParsedQuestion[] = [];

  // Split text into question blocks
  const blocks = text.split(/(?=שאלה\s+\d{1,4}\s*\n)/);

  for (const block of blocks) {
    const trimmed = block.trim();

    const headerMatch = trimmed.match(/^שאלה\s+(\d{1,4})/);
    if (!headerMatch) continue;

    const qNum = parseInt(headerMatch[1]);

    // Remove header and 5-digit ID
    let body = trimmed
      .replace(/^שאלה\s+\d{1,4}\s*\n/, "")
      .replace(/^\d{5}\s*\n/, "")
      .trim();

    // Remove page headers/footers
    body = body.replace(/אגף בכיר.*?פקס\s+[\d-]+/gs, "");
    body = body.replace(/גרסה[\s\S]*?מהנדסים\s*\n\s*\d+/g, "");
    body = body.replace(/--\s*\d+\s*of\s*\d+\s*--/g, "");

    // Extract options
    const optionPattern =
      /(?:^|\n)\s*([1-4])\s*\.\s+([\s\S]*?)(?=\n\s*[1-4]\s*\.\s|$)/g;
    const optMatches: { num: number; text: string; index: number }[] = [];
    let optMatch;

    while ((optMatch = optionPattern.exec(body)) !== null) {
      optMatches.push({
        num: parseInt(optMatch[1]),
        text: optMatch[2].trim().replace(/\s+/g, " "),
        index: optMatch.index,
      });
    }

    if (optMatches.length < 2) continue;

    const firstOptIndex = optMatches[0].index;
    const questionText = body
      .substring(0, firstOptIndex)
      .trim()
      .replace(/\s+/g, " ");

    if (!questionText) continue;

    const options = optMatches.map((o) => o.text);

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

// ─── Step 3: Insert into database ────────────────────────────────────────────
async function seedDatabase(
  questions: ParsedQuestion[],
  answers: Record<number, Answer>
) {
  console.log("\nSeeding database...");

  await prisma.testResult.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();

  const quizDefs = [
    { title: "שאלות 1-526", desc: "בחינות רישוי בחשמל - חלק 1", range: [1, 526] },
    { title: "שאלות 527-734", desc: "בחינות רישוי בחשמל - חלק 2", range: [527, 734] },
    { title: "שאלות 735-1000", desc: "בחינות רישוי בחשמל - חלק 3", range: [735, 1000] },
  ];

  for (const def of quizDefs) {
    const qs = questions.filter(
      (q) => q.questionNum >= def.range[0] && q.questionNum <= def.range[1]
    );

    console.log(`Creating "${def.title}" with ${qs.length} questions...`);

    const quiz = await prisma.quiz.create({
      data: { title: def.title, description: def.desc },
    });

    const BATCH = 50;
    for (let i = 0; i < qs.length; i += BATCH) {
      const batch = qs.slice(i, i + BATCH);
      await prisma.question.createMany({
        data: batch.map((q, idx) => {
          const ans = answers[q.questionNum];
          return {
            quizId: quiz.id,
            questionNum: q.questionNum,
            text: q.text,
            options: q.options,
            correctIndex: ans ? ans.correctIndex : 0,
            order: i + idx + 1,
            answerText: ans?.text || null,
          };
        }),
      });
    }
  }

  console.log("Database seeded!");
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Quiz Seed Script ===\n");

  const answers = await parseAnswers();
  const questions = await parseQuestions();

  // Log some stats
  const withAnswers = questions.filter((q) => answers[q.questionNum]).length;
  const withoutAnswers = questions.filter((q) => !answers[q.questionNum]).length;
  console.log(`Questions with matched answers: ${withAnswers}`);
  console.log(`Questions without answers: ${withoutAnswers}`);

  // Show sample
  const sample = questions[0];
  if (sample) {
    console.log(`\nSample question #${sample.questionNum}:`);
    console.log(`  Text: ${sample.text.substring(0, 80)}...`);
    console.log(`  Options: ${sample.options.length}`);
    const sampleAns = answers[sample.questionNum];
    if (sampleAns) {
      console.log(`  Correct: option ${sampleAns.correctIndex + 1}`);
      console.log(`  Answer: ${sampleAns.text.substring(0, 80)}...`);
    }
  }

  await seedDatabase(questions, answers);

  console.log(`\n=== Done! ===`);
  console.log(`Questions: ${questions.length}`);
  console.log(`Answers: ${Object.keys(answers).length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
