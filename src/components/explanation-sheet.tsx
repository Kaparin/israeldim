"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[100dvh] flex flex-col rounded-none p-0"
      >
        {/* Fixed header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <SheetHeader className="p-0">
            <SheetTitle className="text-base">
              {t.quiz.explanationTitle(questionNum)}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t.quiz.explanationTitle(questionNum)}
            </SheetDescription>
          </SheetHeader>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground shrink-0"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Correct answer */}
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              {t.quiz.correctAnswer}
            </p>
            <p className="text-sm mt-1 text-green-800 dark:text-green-300" dir="rtl">
              {correctIndex + 1}. {options[correctIndex]}
            </p>
          </div>

          {/* Explanation text + translate */}
          {answerText && (
            <div className="space-y-3">
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

          {/* Answer images */}
          {answerImageUrls && answerImageUrls.length > 0 && (
            <div className="space-y-3">
              {answerImageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${t.quiz.explanationTitle(questionNum)} ${i + 1}`}
                  className="w-full rounded-lg border bg-white"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
