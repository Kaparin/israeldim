"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/i18n/context";
import { hasSession } from "@/lib/quiz-session";
import type { QuizWithMeta } from "@/types";

export function QuizCard({ quiz }: { quiz: QuizWithMeta }) {
  const { t } = useLocale();
  const [inProgress, setInProgress] = useState(false);

  useEffect(() => {
    setInProgress(hasSession(quiz.id));
  }, [quiz.id]);

  const scorePercent =
    quiz.completed && quiz.lastScore != null && quiz.lastTotal
      ? Math.round((quiz.lastScore / quiz.lastTotal) * 100)
      : null;

  const buttonLabel = inProgress
    ? t.dashboard.continue
    : quiz.completed
    ? t.dashboard.retry
    : t.dashboard.start;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate">
              {quiz.title}
            </h3>
            {quiz.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {quiz.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {inProgress && (
              <Badge variant="outline" className="text-primary border-primary">
                {t.dashboard.inProgress}
              </Badge>
            )}
            {quiz.completed && scorePercent != null && (
              <Badge
                variant={scorePercent >= 60 ? "default" : "destructive"}
              >
                {scorePercent}%
              </Badge>
            )}
          </div>
        </div>

        {quiz.completed && scorePercent != null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t.dashboard.bestScore}</span>
              <span>
                {quiz.lastScore}/{quiz.lastTotal}
              </span>
            </div>
            <Progress value={scorePercent} className="h-1.5" />
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-muted-foreground">
            {t.dashboard.questions(quiz.questionCount)}
          </span>
          <Button asChild size="sm" className="min-h-9">
            <Link href={`/quiz/${quiz.id}`}>
              {buttonLabel}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
