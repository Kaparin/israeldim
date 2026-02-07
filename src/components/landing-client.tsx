"use client";

import Image from "next/image";
import { useLocale } from "@/i18n/context";
import { LanguageSwitcher } from "./language-switcher";
import { TelegramLogin } from "./telegram-login";

export function LandingClient() {
  const { t } = useLocale();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 relative">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-4">
          <Image
            src="/logo.png"
            alt="ישראלדים"
            width={160}
            height={160}
            className="mx-auto"
            priority
          />
          <p className="text-xl font-bold tracking-wide text-primary" dir="rtl">
            ישראלדים
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {t.landing.title}
            </h1>
            <p className="text-muted-foreground">
              {t.landing.subtitle}
            </p>
          </div>
        </div>
        <TelegramLogin />
      </div>
    </main>
  );
}
