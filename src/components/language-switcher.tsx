"use client";

import { useLocale } from "@/i18n/context";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "he" ? "ru" : "he")}
      className="gap-1.5 text-muted-foreground"
    >
      <Globe className="size-4" />
      <span className="text-xs font-medium">
        {locale === "he" ? "RU" : "עב"}
      </span>
    </Button>
  );
}
