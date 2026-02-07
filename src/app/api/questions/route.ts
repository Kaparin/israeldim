import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const quizId = searchParams.get("quizId") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (q.trim()) {
      where.text = { contains: q.trim(), mode: "insensitive" };
    }

    if (quizId) {
      where.quizId = quizId;
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          quiz: { select: { title: true } },
        },
        orderBy: [{ quizId: "asc" }, { order: "asc" }],
        skip,
        take: limit,
      }),
      prisma.question.count({ where }),
    ]);

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        questionNum: q.questionNum,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        answerText: q.answerText,
        imageUrls: q.imageUrls,
        answerImageUrls: q.answerImageUrls,
        quizTitle: q.quiz.title,
        quizId: q.quizId,
      })),
      total,
      page,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("Questions API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
