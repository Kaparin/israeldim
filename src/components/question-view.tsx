"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";

interface QuestionViewProps {
  text: string;
  options: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function QuestionView({
  text,
  options,
  selectedIndex,
  onSelect,
}: QuestionViewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium leading-snug">{text}</h2>
      <RadioGroup
        value={selectedIndex !== null ? String(selectedIndex) : undefined}
        onValueChange={(value) => onSelect(Number(value))}
      >
        <div className="space-y-2">
          {options.map((option, index) => (
            <Card
              key={index}
              className={`cursor-pointer transition-colors ${
                selectedIndex === index
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => onSelect(index)}
            >
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <RadioGroupItem
                  value={String(index)}
                  id={`option-${index}`}
                />
                <Label
                  htmlFor={`option-${index}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {option}
                </Label>
              </CardContent>
            </Card>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
