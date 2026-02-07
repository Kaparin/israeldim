"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreCircle } from "@/components/score-circle";
import { AppHeader } from "@/components/app-header";
import { useLocale } from "@/i18n/context";
import type { QuizResult } from "@/types";

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useLocale();
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`quiz-result-${id}`);
    if (stored) {
      setResult(JSON.parse(stored));
    } else {
      router.push("/dashboard");
    }
  }, [id, router]);

  if (!result) return null;

  const percentage = Math.round((result.score / result.totalCount) * 100);
  const passed = percentage >= 60;
  const incorrectCount = result.totalCount - result.score;

  const handleShare = async () => {
    const text = `${t.results.title}: ${percentage}% (${result.score}/${result.totalCount})`;
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader title={t.results.title} />

      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Score circle */}
        <div className="text-center mb-8 space-y-4">
          <ScoreCircle percentage={percentage} />
          <p className="text-muted-foreground">
            {t.results.score(result.score, result.totalCount)}
          </p>
          <Badge
            variant={passed ? "default" : "destructive"}
            className="text-sm px-4 py-1"
          >
            {passed ? t.results.passed : t.results.failed}
          </Badge>

          {/* Stats */}
          <div className="flex justify-center gap-6 pt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {result.score}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.results.correctLabel}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {incorrectCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.results.incorrectLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Question review */}
        <div className="space-y-3 mb-8">
          {result.questions.map((q, i) => {
            const isCorrect = q.selectedIndex === q.correctIndex;
            return (
              <Card
                key={q.id}
                className={
                  isCorrect
                    ? "border-green-500/50 bg-green-50 dark:bg-green-950/20"
                    : "border-red-500/50 bg-red-50 dark:bg-red-950/20"
                }
              >
                <CardContent className="py-3 px-4 space-y-2" dir="rtl">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      {i + 1}. {q.text}
                    </p>
                    <Badge
                      variant={isCorrect ? "default" : "destructive"}
                      className="shrink-0"
                    >
                      {isCorrect
                        ? t.results.correctLabel
                        : t.results.incorrectLabel}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    {!isCorrect && q.selectedIndex >= 0 && (
                      <p className="text-red-600 dark:text-red-400">
                        {t.results.yourAnswer}:{" "}
                        {(q.options as string[])[q.selectedIndex]}
                      </p>
                    )}
                    {!isCorrect && (
                      <p className="text-green-600 dark:text-green-400">
                        {t.results.correctAnswerLabel}:{" "}
                        {(q.options as string[])[q.correctIndex]}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pb-safe">
          <Button
            variant="outline"
            className="w-full min-h-11 gap-2"
            onClick={handleShare}
          >
            <Share2 className="size-4" />
            {t.results.share}
          </Button>
          <Button asChild className="w-full min-h-11">
            <Link href="/dashboard">{t.results.backToDashboard}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
