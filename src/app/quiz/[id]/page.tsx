"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { X, Check, XIcon, ChevronLeft, ChevronRight, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { QuestionView } from "@/components/question-view";
import { ExplanationSheet } from "@/components/explanation-sheet";
import { QuestionNavigator } from "@/components/question-navigator";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLocale } from "@/i18n/context";
import { getSession, saveSession, clearSession } from "@/lib/quiz-session";
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
  const { t, locale } = useLocale();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [answeredSet, setAnsweredSet] = useState<Set<string>>(new Set());
  const [showExplanation, setShowExplanation] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const prevIndexRef = useRef(0);
  const sessionRestoredRef = useRef(false);

  // Persist session on every change
  const persistSession = useCallback(
    (idx: number, ans: Record<string, number>, ids: string[]) => {
      if (!id) return;
      saveSession({
        quizId: id,
        currentIndex: idx,
        answers: ans,
        answeredIds: ids,
        startedAt: Date.now(),
      });
    },
    [id]
  );

  useEffect(() => {
    fetch(`/api/quiz/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load quiz");
        return res.json();
      })
      .then((data: QuizData) => {
        setQuiz(data);

        // Restore session if available
        if (!sessionRestoredRef.current) {
          sessionRestoredRef.current = true;
          const saved = getSession(id);
          if (saved) {
            setCurrentIndex(saved.currentIndex);
            setAnswers(saved.answers);
            setAnsweredSet(new Set(saved.answeredIds));
          }
        }
      })
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading || !quiz) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b h-14" />
        <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === quiz.questions.length - 1;
  const isAnswered = question ? answeredSet.has(question.id) : false;
  const selectedIndex = question ? (answers[question.id] ?? null) : null;
  const isCorrect = isAnswered && selectedIndex === question?.correctIndex;

  const correctCount = quiz.questions.filter(
    (q) => answeredSet.has(q.id) && answers[q.id] === q.correctIndex
  ).length;

  const progressPercent = Math.round(
    (answeredSet.size / quiz.questions.length) * 100
  );

  // All questions must be answered before finish is enabled
  const allAnswered = answeredSet.size === quiz.questions.length;

  const handleSelect = (index: number) => {
    if (!question || isAnswered) return;
    const newAnswers = { ...answers, [question.id]: index };
    const newIds = [...Array.from(answeredSet), question.id];
    setAnswers(newAnswers);
    setAnsweredSet(new Set(newIds));
    persistSession(currentIndex, newAnswers, newIds);
  };

  const handleNext = () => {
    if (!isLast) {
      setSlideDir("right");
      prevIndexRef.current = currentIndex;
      const next = currentIndex + 1;
      setCurrentIndex(next);
      persistSession(next, answers, Array.from(answeredSet));
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setSlideDir("left");
      prevIndexRef.current = currentIndex;
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      persistSession(prev, answers, Array.from(answeredSet));
    }
  };

  const handleNavigate = (index: number) => {
    setSlideDir(index > currentIndex ? "right" : "left");
    prevIndexRef.current = currentIndex;
    setCurrentIndex(index);
    persistSession(index, answers, Array.from(answeredSet));
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
      clearSession(id);
      sessionStorage.setItem(`quiz-result-${id}`, JSON.stringify(result));
      router.push(`/quiz/${id}/result`);
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitting(false);
    }
  };

  // Determine animation class based on slide direction and locale
  const slideClass =
    slideDir === "right"
      ? locale === "he"
        ? "animate-slide-in-left"
        : "animate-slide-in-right"
      : locale === "he"
      ? "animate-slide-in-right"
      : "animate-slide-in-left";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground"
          >
            <X className="size-5" />
          </Button>

          {/* Navigator trigger — question counter */}
          <button
            onClick={() => setShowNavigator(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors"
          >
            <Grid3X3 className="size-3.5 text-muted-foreground" />
            <span className="font-semibold text-sm tabular-nums">
              {currentIndex + 1}/{quiz.questions.length}
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {correctCount}/{answeredSet.size}
            </span>
            <LanguageSwitcher />
          </div>
        </div>
        <Progress value={progressPercent} className="h-1 rounded-none" />
      </header>

      {/* Question content */}
      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <div key={currentIndex} className={slideClass}>
          {question && (
            <QuestionView
              questionId={question.id}
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

          {/* Feedback */}
          {isAnswered && question && (
            <div className="mt-4 space-y-3 animate-fade-in-up">
              {isCorrect ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                  <Check className="size-5" />
                  <span>{t.quiz.correct}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                  <XIcon className="size-5" />
                  <span>{t.quiz.incorrect}</span>
                </div>
              )}
              {(question.answerText ||
                (question.answerImageUrls as string[] | null)?.length) && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowExplanation(true)}
                >
                  {t.quiz.showExplanation}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom navigation */}
      <div className="sticky bottom-0 z-40 bg-background/80 backdrop-blur-md border-t pb-safe">
        <div className="flex gap-3 px-4 py-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={isFirst}
            className="flex-1 min-h-11 gap-1"
          >
            <ChevronLeft className="size-4" />
            {t.quiz.prev}
          </Button>
          {isLast ? (
            <Button
              onClick={handleFinish}
              disabled={submitting || !allAnswered}
              className="flex-1 min-h-11"
            >
              {submitting ? t.quiz.submitting : t.quiz.finish}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="flex-1 min-h-11 gap-1"
            >
              {t.quiz.next}
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Question navigator sheet */}
      <QuestionNavigator
        open={showNavigator}
        onOpenChange={setShowNavigator}
        questions={quiz.questions}
        currentIndex={currentIndex}
        answers={answers}
        answeredIds={answeredSet}
        onNavigate={handleNavigate}
      />

      {/* Explanation bottom sheet */}
      {question && (
        <ExplanationSheet
          open={showExplanation}
          onOpenChange={setShowExplanation}
          questionId={question.id}
          questionNum={question.questionNum}
          correctIndex={question.correctIndex}
          options={question.options as string[]}
          answerText={question.answerText}
          answerImageUrls={question.answerImageUrls as string[] | null}
        />
      )}
    </div>
  );
}
