import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const { answers } = (await request.json()) as {
      answers: Record<string, number>;
    };

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    let score = 0;
    for (const question of quiz.questions) {
      if (answers[question.id] === question.correctIndex) {
        score++;
      }
    }

    const result = await prisma.testResult.create({
      data: {
        userId: session.userId,
        quizId: id,
        score,
        totalCount: quiz.questions.length,
        answers,
      },
    });

    return NextResponse.json({
      resultId: result.id,
      score,
      totalCount: quiz.questions.length,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        selectedIndex: answers[q.id] ?? -1,
      })),
    });
  } catch (error) {
    console.error("Submit quiz error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
