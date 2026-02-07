"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/context";
import type { QuestionData } from "@/types";

interface QuestionNavigatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuestionData[];
  currentIndex: number;
  answers: Record<string, number>;
  answeredIds: Set<string>;
  onNavigate: (index: number) => void;
}

export function QuestionNavigator({
  open,
  onOpenChange,
  questions,
  currentIndex,
  answers,
  answeredIds,
  onNavigate,
}: QuestionNavigatorProps) {
  const { t } = useLocale();

  const handleClick = (index: number) => {
    onNavigate(index);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{t.quiz.navigator}</SheetTitle>
          <SheetDescription className="sr-only">
            {t.quiz.navigator}
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-5 gap-2 p-4">
          {questions.map((q, i) => {
            const isAnswered = answeredIds.has(q.id);
            const isCurrent = i === currentIndex;
            const isCorrect = isAnswered && answers[q.id] === q.correctIndex;
            const isIncorrect = isAnswered && answers[q.id] !== q.correctIndex;

            return (
              <button
                key={q.id}
                onClick={() => handleClick(i)}
                className={cn(
                  "flex items-center justify-center size-11 rounded-lg text-sm font-medium transition-colors",
                  isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  !isAnswered && "bg-muted text-muted-foreground hover:bg-muted/80",
                  isCorrect && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  isIncorrect && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
