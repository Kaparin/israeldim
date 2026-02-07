"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TranslateButton } from "./translate-button";
import { useLocale } from "@/i18n/context";

interface ExplanationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  questionNum: number;
  correctIndex: number;
  options: string[];
  answerText: string | null;
  answerImageUrls: string[] | null;
}

export function ExplanationSheet({
  open,
  onOpenChange,
  questionId,
  questionNum,
  correctIndex,
  options,
  answerText,
  answerImageUrls,
}: ExplanationSheetProps) {
  const { t } = useLocale();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{t.quiz.explanationTitle(questionNum)}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pt-4">
          <div className="text-sm font-medium text-green-600 dark:text-green-400">
            {t.quiz.correctAnswer}: {correctIndex + 1}. {options[correctIndex]}
          </div>

          {answerText && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="rtl">
                {answerText}
              </p>
              <TranslateButton
                text={answerText}
                sourceId={`${questionId}-explanation`}
                type="explanation"
              />
            </div>
          )}

          {answerImageUrls?.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${t.quiz.explanationTitle(questionNum)} ${i + 1}`}
              className="w-full rounded-lg border bg-white"
              loading="lazy"
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
