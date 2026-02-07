"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QuizWithMeta } from "@/types";

export function QuizCard({ quiz }: { quiz: QuizWithMeta }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{quiz.title}</CardTitle>
          {quiz.completed && (
            <Badge variant="secondary" className="shrink-0">
              {quiz.lastScore}/{quiz.lastTotal}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {quiz.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {quiz.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {quiz.questionCount} вопросов
          </span>
          <Button asChild size="sm">
            <Link href={`/quiz/${quiz.id}`}>
              {quiz.completed ? "Пройти снова" : "Начать"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
