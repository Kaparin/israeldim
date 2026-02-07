"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/progress-bar";
import { QuestionView } from "@/components/question-view";
import type { QuestionData, QuizResult } from "@/types";

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  questions: QuestionData[];
}

export default function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quiz/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load quiz");
        return res.json();
      })
      .then((data) => setQuiz(data))
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !quiz) {
    return (
      <div className="min-h-screen px-4 py-6 max-w-lg mx-auto space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === quiz.questions.length - 1;
  const hasAnswer = question && answers[question.id] !== undefined;

  const handleSelect = (index: number) => {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: index }));
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) throw new Error("Submit failed");

      const result: QuizResult = await res.json();

      // Store result in sessionStorage for the results page
      sessionStorage.setItem(`quiz-result-${id}`, JSON.stringify(result));
      router.push(`/quiz/${id}/result`);
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto flex flex-col">
      <div className="mb-6 space-y-4">
        <h1 className="text-xl font-bold">{quiz.title}</h1>
        <ProgressBar
          current={currentIndex + 1}
          total={quiz.questions.length}
        />
      </div>

      <div className="flex-1">
        {question && (
          <QuestionView
            text={question.text}
            options={question.options as string[]}
            selectedIndex={answers[question.id] ?? null}
            onSelect={handleSelect}
          />
        )}
      </div>

      <div className="flex gap-3 pt-6 pb-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={isFirst}
          className="flex-1"
        >
          Назад
        </Button>
        {isLast ? (
          <Button
            onClick={handleSubmit}
            disabled={!hasAnswer || submitting}
            className="flex-1"
          >
            {submitting ? "Отправка..." : "Завершить"}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!hasAnswer}
            className="flex-1"
          >
            Далее
          </Button>
        )}
      </div>
    </div>
  );
}
