"use client";

import { Card, CardContent } from "@/components/ui/card";

interface QuestionViewProps {
  questionNum: number;
  text: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  answered: boolean;
  onSelect: (index: number) => void;
}

export function QuestionView({
  questionNum,
  text,
  options,
  selectedIndex,
  correctIndex,
  answered,
  onSelect,
}: QuestionViewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium leading-snug" dir="rtl">
        <span className="text-muted-foreground font-normal">
          {questionNum}.{" "}
        </span>
        {text}
      </h2>
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
              className={`cursor-pointer transition-all ${borderClass} ${bgClass} ${
                answered ? "cursor-default" : ""
              }`}
              onClick={() => !answered && onSelect(index)}
            >
              <CardContent className="flex items-center gap-3 py-3 px-4" dir="rtl">
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
