"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Status = "idle" | "loading" | "waiting" | "confirmed" | "expired" | "error";

export function TelegramLogin() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [deepLink, setDeepLink] = useState("");
  const [token, setToken] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startLogin = async () => {
    setStatus("loading");
    cleanup();

    try {
      const res = await fetch("/api/auth/token", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create token");

      const data = await res.json();
      setDeepLink(data.deepLink);
      setToken(data.token);
      setStatus("waiting");

      // Open bot in new tab
      window.open(data.deepLink, "_blank");

      // Start polling
      intervalRef.current = setInterval(async () => {
        try {
          const checkRes = await fetch(`/api/auth/check?token=${data.token}`);
          const checkData = await checkRes.json();

          if (checkData.confirmed) {
            cleanup();
            setStatus("confirmed");
            router.push("/dashboard");
          } else if (checkData.error === "expired") {
            cleanup();
            setStatus("expired");
          }
        } catch {
          // Silently continue polling
        }
      }, 2000);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="space-y-4">
      {status === "idle" && (
        <Button onClick={startLogin} size="lg" className="w-full">
          Войти через Telegram
        </Button>
      )}

      {status === "loading" && (
        <Button disabled size="lg" className="w-full">
          Подготовка...
        </Button>
      )}

      {status === "waiting" && (
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">
              Ожидаю подтверждение в Telegram...
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Откройте бота и нажмите Start
          </p>

          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary underline"
          >
            Открыть бота ещё раз
          </a>

          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                cleanup();
                setStatus("idle");
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}

      {status === "confirmed" && (
        <p className="text-center text-sm text-green-600">
          Авторизация подтверждена! Перенаправляю...
        </p>
      )}

      {status === "expired" && (
        <div className="space-y-2 text-center">
          <p className="text-sm text-destructive">
            Время ожидания истекло
          </p>
          <Button onClick={startLogin} variant="outline" size="sm">
            Попробовать снова
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-2 text-center">
          <p className="text-sm text-destructive">
            Произошла ошибка
          </p>
          <Button onClick={startLogin} variant="outline" size="sm">
            Попробовать снова
          </Button>
        </div>
      )}
    </div>
  );
}
