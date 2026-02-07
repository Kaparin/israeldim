import { PDFParse } from "pdf-parse";

export interface ParsedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

export async function parsePdfQuestions(
  buffer: Buffer
): Promise<ParsedQuestion[]> {
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await pdf.getText();
  const text = textResult.text;
  await pdf.destroy();

  return extractQuestions(text);
}

function extractQuestions(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  // Normalize text
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Pattern: numbered questions like "1. Question text" or "1) Question text"
  const questionBlocks = normalized.split(/\n\s*(?=\d+[\.\)]\s)/);

  for (const block of questionBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Match question number and text
    const questionMatch = trimmed.match(
      /^\d+[\.\)]\s*(.*?)(?=\n\s*[A-Da-d][\.\)])/s
    );
    if (!questionMatch) continue;

    const questionText = questionMatch[1].trim();
    if (!questionText) continue;

    // Extract options A-D
    const optionPattern =
      /[A-Da-d][\.\)]\s*(.*?)(?=\n\s*[A-Da-d][\.\)]|\n\s*(?:Ответ|Answer|Правильный|Correct|\*)|$)/gs;
    const options: string[] = [];
    let optionMatch;

    while ((optionMatch = optionPattern.exec(trimmed)) !== null) {
      const optionText = optionMatch[1].trim();
      if (optionText) {
        options.push(optionText);
      }
    }

    if (options.length < 2) continue;

    // Find correct answer
    let correctIndex = 0;

    // Pattern 1: "Ответ: A" or "Answer: B" or "Правильный ответ: C"
    const answerMatch = trimmed.match(
      /(?:Ответ|Answer|Правильный\s*ответ|Correct\s*answer)\s*[:=]\s*([A-Da-d])/i
    );
    if (answerMatch) {
      const letter = answerMatch[1].toUpperCase();
      correctIndex = letter.charCodeAt(0) - "A".charCodeAt(0);
    }

    // Pattern 2: asterisk (*) before correct option
    if (!answerMatch) {
      const asteriskMatch = trimmed.match(/\*\s*([A-Da-d])[\.\)]/);
      if (asteriskMatch) {
        const letter = asteriskMatch[1].toUpperCase();
        correctIndex = letter.charCodeAt(0) - "A".charCodeAt(0);
      }
    }

    // Pattern 3: "+" before correct option
    if (!answerMatch) {
      const plusMatch = trimmed.match(/\+\s*([A-Da-d])[\.\)]/);
      if (plusMatch) {
        const letter = plusMatch[1].toUpperCase();
        correctIndex = letter.charCodeAt(0) - "A".charCodeAt(0);
      }
    }

    // Ensure correctIndex is valid
    if (correctIndex < 0 || correctIndex >= options.length) {
      correctIndex = 0;
    }

    questions.push({
      text: questionText,
      options,
      correctIndex,
    });
  }

  return questions;
}
