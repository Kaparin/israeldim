"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export function TelegramLogin() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleAuth = useCallback(
    async (user: unknown) => {
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });

        if (res.ok) {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Login error:", error);
      }
    },
    [router]
  );

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;
    if (!botUsername || !containerRef.current) return;

    // Set callback on window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).onTelegramAuth = handleAuth;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(script);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).onTelegramAuth;
    };
  }, [handleAuth]);

  return <div ref={containerRef} className="flex justify-center" />;
}
