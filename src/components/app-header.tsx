"use client";

import Image from "next/image";
import { LanguageSwitcher } from "./language-switcher";

interface AppHeaderProps {
  title?: string;
  trailing?: React.ReactNode;
}

export function AppHeader({ title, trailing }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
      <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="ישראלדים"
            width={32}
            height={32}
            className="rounded-lg"
          />
          {title && (
            <span className="font-semibold text-sm truncate">{title}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          {trailing}
        </div>
      </div>
    </header>
  );
}
