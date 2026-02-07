import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const quizzes = await prisma.quiz.findMany({
      include: {
        _count: { select: { questions: true } },
        testResults: {
          where: { userId: session.userId },
          orderBy: { completedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questionCount: quiz._count.questions,
      createdAt: quiz.createdAt.toISOString(),
      completed: quiz.testResults.length > 0,
      lastScore: quiz.testResults[0]?.score,
      lastTotal: quiz.testResults[0]?.totalCount,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get quizzes error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
