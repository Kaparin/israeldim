import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const results = await prisma.testResult.findMany({
      where: { userId: session.userId },
      include: {
        quiz: {
          select: { id: true, title: true },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    const totalAttempts = results.length;
    const totalQuestions = results.reduce((sum, r) => sum + r.totalCount, 0);
    const totalCorrect = results.reduce((sum, r) => sum + r.score, 0);
    const averageScore =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

    // Build per-quiz stats
    const quizMap = new Map<
      string,
      {
        quizId: string;
        quizTitle: string;
        attempts: number;
        bestScore: number;
        bestTotal: number;
        lastScore: number;
        lastTotal: number;
      }
    >();

    for (const r of results) {
      const existing = quizMap.get(r.quizId);
      if (!existing) {
        quizMap.set(r.quizId, {
          quizId: r.quizId,
          quizTitle: r.quiz.title,
          attempts: 1,
          bestScore: r.score,
          bestTotal: r.totalCount,
          lastScore: r.score,
          lastTotal: r.totalCount,
        });
      } else {
        existing.attempts++;
        if (
          r.score / r.totalCount >
          existing.bestScore / existing.bestTotal
        ) {
          existing.bestScore = r.score;
          existing.bestTotal = r.totalCount;
        }
      }
    }

    // Find weak questions (answered incorrectly more than once across all attempts)
    const questionErrors = new Map<
      string,
      { questionId: string; errorCount: number; totalAttempts: number }
    >();

    for (const r of results) {
      const answersObj = r.answers as Record<string, number>;
      // We need to load question data for this result
      const questions = await prisma.question.findMany({
        where: { quizId: r.quizId },
        select: { id: true, questionNum: true, text: true, correctIndex: true, quiz: { select: { title: true } } },
      });

      for (const q of questions) {
        const selected = answersObj[q.id];
        if (selected === undefined) continue;
        const entry = questionErrors.get(q.id) ?? {
          questionId: q.id,
          errorCount: 0,
          totalAttempts: 0,
        };
        entry.totalAttempts++;
        if (selected !== q.correctIndex) {
          entry.errorCount++;
        }
        questionErrors.set(q.id, entry);
      }
    }

    // Filter questions with >1 error and get their details
    const weakQuestionIds = Array.from(questionErrors.entries())
      .filter(([, v]) => v.errorCount > 1)
      .sort((a, b) => b[1].errorCount - a[1].errorCount)
      .slice(0, 20)
      .map(([id]) => id);

    const weakQuestionDetails = weakQuestionIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: weakQuestionIds } },
          select: {
            id: true,
            questionNum: true,
            text: true,
            correctIndex: true,
            options: true,
            quiz: { select: { title: true } },
          },
        })
      : [];

    const weakQuestions = weakQuestionDetails
      .map((q) => {
        const stats = questionErrors.get(q.id)!;
        return {
          questionId: q.id,
          questionNum: q.questionNum,
          text: q.text,
          quizTitle: q.quiz.title,
          errorCount: stats.errorCount,
          totalAttempts: stats.totalAttempts,
          correctIndex: q.correctIndex,
          options: q.options,
        };
      })
      .sort((a, b) => b.errorCount - a.errorCount);

    return NextResponse.json({
      totalAttempts,
      totalQuestions,
      totalCorrect,
      averageScore,
      quizStats: Array.from(quizMap.values()),
      weakQuestions,
      history: results.map((r) => ({
        id: r.id,
        quizTitle: r.quiz.title,
        score: r.score,
        totalCount: r.totalCount,
        completedAt: r.completedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
