"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Locale, Dictionary } from "./types";
import { he } from "./dictionaries/he";
import { ru } from "./dictionaries/ru";

const dictionaries: Record<Locale, Dictionary> = { he, ru };

interface LocaleContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "he";
  // Check cookie first
  const match = document.cookie.match(/(?:^|;\s*)locale=(\w+)/);
  if (match && (match[1] === "he" || match[1] === "ru")) return match[1] as Locale;
  // Then localStorage
  const stored = localStorage.getItem("locale");
  if (stored === "he" || stored === "ru") return stored;
  return "he";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem("locale", next);
    document.cookie = `locale=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
  }, []);

  // Sync <html> lang and dir
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, t: dictionaries[locale], setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
