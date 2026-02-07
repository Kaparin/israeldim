"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/progress-bar";
import { QuestionView } from "@/components/question-view";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QuestionData } from "@/types";

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
  const [answeredSet, setAnsweredSet] = useState<Set<string>>(new Set());
  const [showExplanation, setShowExplanation] = useState(false);
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
  const isAnswered = question ? answeredSet.has(question.id) : false;
  const selectedIndex = question ? (answers[question.id] ?? null) : null;
  const isCorrect =
    isAnswered && selectedIndex === question?.correctIndex;

  const correctCount = quiz.questions.filter(
    (q) => answeredSet.has(q.id) && answers[q.id] === q.correctIndex
  ).length;

  const handleSelect = (index: number) => {
    if (!question || isAnswered) return;
    setAnswers((prev) => ({ ...prev, [question.id]: index }));
    setAnsweredSet((prev) => new Set(prev).add(question.id));
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

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) throw new Error("Submit failed");

      const result = await res.json();
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
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" dir="rtl">
            {quiz.title}
          </h1>
          <span className="text-sm text-muted-foreground">
            {correctCount}/{answeredSet.size}
          </span>
        </div>
        <ProgressBar
          current={currentIndex + 1}
          total={quiz.questions.length}
        />
      </div>

      <div className="flex-1">
        {question && (
          <QuestionView
            questionNum={question.questionNum}
            text={question.text}
            options={question.options as string[]}
            selectedIndex={selectedIndex}
            correctIndex={question.correctIndex}
            answered={isAnswered}
            imageUrls={question.imageUrls as string[] | null}
            onSelect={handleSelect}
          />
        )}

        {/* Feedback section after answering */}
        {isAnswered && question && (
          <div className="mt-4 space-y-3">
            {isCorrect ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>תשובה נכונה!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span>תשובה לא נכונה</span>
              </div>
            )}
            {(question.answerText || (question.answerImageUrls as string[] | null)?.length) && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowExplanation(true)}
              >
                הצג הסבר לתשובה
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-6 pb-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={isFirst}
          className="flex-1"
        >
          הקודם
        </Button>
        {isLast && isAnswered ? (
          <Button
            onClick={handleFinish}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? "...שולח" : "סיום"}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!isAnswered}
            className="flex-1"
          >
            הבא
          </Button>
        )}
      </div>

      {/* Answer explanation modal */}
      {question && (
        <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle dir="rtl">
                הסבר לשאלה {question.questionNum}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4" dir="rtl">
              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                תשובה נכונה: {question.correctIndex + 1}.{" "}
                {(question.options as string[])[question.correctIndex]}
              </div>
              {question.answerText && (
                <div className="text-sm leading-relaxed whitespace-pre-wrap border-t pt-4">
                  {question.answerText}
                </div>
              )}
              {(question.answerImageUrls as string[] | null)?.map(
                (url: string, i: number) => (
                  <img
                    key={i}
                    src={url}
                    alt={`הסבר לשאלה ${question.questionNum}`}
                    className="w-full rounded-lg border bg-white"
                    loading="lazy"
                  />
                )
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
