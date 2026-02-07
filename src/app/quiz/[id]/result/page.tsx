"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QuizResult } from "@/types";

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
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

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      <div className="text-center mb-8 space-y-3">
        <h1 className="text-2xl font-bold">Результат</h1>
        <div className="text-5xl font-bold">{percentage}%</div>
        <p className="text-muted-foreground">
          {result.score} из {result.totalCount} правильных ответов
        </p>
      </div>

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
              <CardContent className="py-3 px-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    {i + 1}. {q.text}
                  </p>
                  <Badge
                    variant={isCorrect ? "default" : "destructive"}
                    className="shrink-0"
                  >
                    {isCorrect ? "Верно" : "Неверно"}
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  {!isCorrect && q.selectedIndex >= 0 && (
                    <p className="text-red-600 dark:text-red-400">
                      Ваш ответ: {q.options[q.selectedIndex]}
                    </p>
                  )}
                  {!isCorrect && (
                    <p className="text-green-600 dark:text-green-400">
                      Правильный: {q.options[q.correctIndex]}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button asChild className="w-full">
        <Link href="/dashboard">Вернуться к тестам</Link>
      </Button>
    </div>
  );
}
