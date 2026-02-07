"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TranslateButton } from "./translate-button";
import { useLocale } from "@/i18n/context";

interface QuestionCardProps {
  id: string;
  questionNum: number;
  text: string;
  options: string[];
  correctIndex: number;
  answerText: string | null;
  imageUrls: string[] | null;
  answerImageUrls: string[] | null;
  quizTitle: string;
}

export function QuestionCard({
  id,
  questionNum,
  text,
  options,
  correctIndex,
  answerText,
  imageUrls,
  answerImageUrls,
  quizTitle,
}: QuestionCardProps) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-start p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs shrink-0">
                #{questionNum}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">
                {quizTitle}
              </span>
            </div>
            <p className="text-sm line-clamp-2" dir="rtl">
              {text}
            </p>
          </div>
          <ChevronDown
            className={`size-4 text-muted-foreground shrink-0 mt-1 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t space-y-4">
          {/* Full question text */}
          <div className="pt-3 space-y-2">
            <p className="text-sm whitespace-pre-wrap" dir="rtl">
              {text}
            </p>
            <TranslateButton
              text={text}
              sourceId={`${id}-question`}
              type="question"
            />
          </div>

          {/* Question images */}
          {imageUrls?.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Question ${questionNum} image ${i + 1}`}
              className="w-full rounded-lg border bg-white"
              loading="lazy"
            />
          ))}

          {/* Options */}
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                  i === correctIndex
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="font-medium shrink-0">{i + 1}.</span>
                <span dir="rtl">{opt}</span>
                {i === correctIndex && (
                  <Badge className="ms-auto shrink-0 text-xs" variant="default">
                    {t.questionDb.correctAnswer}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Explanation */}
          {answerText && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="rtl">
                {answerText}
              </p>
              <TranslateButton
                text={answerText}
                sourceId={`${id}-explanation`}
                type="explanation"
              />
            </div>
          )}

          {/* Answer images */}
          {answerImageUrls?.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Answer ${questionNum} image ${i + 1}`}
              className="w-full rounded-lg border bg-white"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </Card>
  );
}
