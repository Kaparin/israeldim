"use client";

import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/context";

interface TranslateButtonProps {
  text: string;
  sourceId: string;
  type: "question" | "explanation";
}

export function TranslateButton({ text, sourceId, type }: TranslateButtonProps) {
  const { t } = useLocale();
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleTranslate = async () => {
    if (translation || loading) return;
    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceId, type }),
      });

      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      setTranslation(data.translation);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {!translation && (
        <Button
          variant="ghost"
          size="xs"
          onClick={handleTranslate}
          disabled={loading}
          className="text-muted-foreground gap-1.5"
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Languages className="size-3" />
          )}
          <span>{loading ? t.common.translating : t.common.translate}</span>
        </Button>
      )}

      {translation && (
        <div className="animate-fade-in-up border-s-2 border-primary/40 ps-3 py-1">
          <p className="text-xs font-medium text-primary/70 mb-1">
            {t.common.translation}
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="ltr">
            {translation}
          </p>
        </div>
      )}

      {error && (
        <Button
          variant="ghost"
          size="xs"
          onClick={handleTranslate}
          className="text-destructive gap-1.5"
        >
          <Languages className="size-3" />
          <span>{t.common.translate}</span>
        </Button>
      )}
    </div>
  );
}
