"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TranslateButton } from "./translate-button";

interface QuestionViewProps {
  questionId: string;
  questionNum: number;
  text: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  answered: boolean;
  imageUrls?: string[] | null;
  onSelect: (index: number) => void;
}

export function QuestionView({
  questionId,
  questionNum,
  text,
  options,
  selectedIndex,
  correctIndex,
  answered,
  imageUrls,
  onSelect,
}: QuestionViewProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-medium leading-snug" dir="rtl">
          <span className="text-muted-foreground font-normal">
            {questionNum}.{" "}
          </span>
          {text}
        </h2>
        <TranslateButton
          text={text}
          sourceId={`${questionId}-question`}
          type="question"
        />
      </div>

      {imageUrls && imageUrls.length > 0 && (
        <div className="space-y-2">
          {imageUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${questionNum} - ${i + 1}`}
              className="w-full rounded-lg border bg-white"
              loading="lazy"
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {options.map((option, index) => {
          let borderClass = "border-border hover:bg-muted/50";
          let bgClass = "";

          if (answered) {
            if (index === correctIndex) {
              borderClass = "border-green-500";
              bgClass = "bg-green-50 dark:bg-green-950/30";
            } else if (index === selectedIndex && index !== correctIndex) {
              borderClass = "border-red-500";
              bgClass = "bg-red-50 dark:bg-red-950/30";
            } else {
              borderClass = "border-border opacity-50";
            }
          } else if (index === selectedIndex) {
            borderClass = "border-primary";
            bgClass = "bg-primary/5";
          }

          return (
            <Card
              key={index}
              className={`transition-all active:scale-[0.98] ${borderClass} ${bgClass} ${
                answered ? "pointer-events-none" : "cursor-pointer"
              }`}
              onClick={() => !answered && onSelect(index)}
            >
              <CardContent className="flex items-center gap-3 py-3 px-4 min-h-12" dir="rtl">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium shrink-0 border ${
                    answered && index === correctIndex
                      ? "bg-green-500 text-white border-green-500"
                      : answered && index === selectedIndex && index !== correctIndex
                      ? "bg-red-500 text-white border-red-500"
                      : index === selectedIndex
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {index + 1}
                </div>
                <span className="flex-1 text-sm">{option}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
