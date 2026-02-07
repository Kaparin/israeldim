import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { parsePdfQuestions } from "@/lib/pdf-parser";

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const preview = formData.get("preview") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const questions = await parsePdfQuestions(buffer);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No questions found in PDF" },
        { status: 400 }
      );
    }

    // If preview mode, just return parsed questions without saving
    if (preview === "true") {
      return NextResponse.json({ questions });
    }

    // Save to database
    const quiz = await prisma.quiz.create({
      data: {
        title: title || file.name.replace(".pdf", ""),
        questions: {
          create: questions.map((q, i) => ({
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            order: i + 1,
          })),
        },
      },
      include: { _count: { select: { questions: true } } },
    });

    return NextResponse.json({
      quizId: quiz.id,
      title: quiz.title,
      questionCount: quiz._count.questions,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}
