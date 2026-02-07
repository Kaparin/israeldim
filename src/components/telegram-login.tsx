"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/context";

type Status = "idle" | "loading" | "waiting" | "confirmed" | "expired" | "error";

export function TelegramLogin() {
  const router = useRouter();
  const { t } = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [deepLink, setDeepLink] = useState("");
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
      setStatus("waiting");

      window.open(data.deepLink, "_blank");

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
        <Button
          onClick={startLogin}
          size="lg"
          className="w-full min-h-12 text-base gap-2"
        >
          <Send className="size-5" />
          {t.landing.login}
        </Button>
      )}

      {status === "loading" && (
        <Button disabled size="lg" className="w-full min-h-12 text-base">
          {t.landing.loginLoading}
        </Button>
      )}

      {status === "waiting" && (
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">
              {t.landing.loginWaiting}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {t.landing.loginWaitingHint}
          </p>

          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary underline"
          >
            {t.landing.loginOpenBot}
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
              {t.landing.loginCancel}
            </Button>
          </div>
        </div>
      )}

      {status === "confirmed" && (
        <p className="text-center text-sm text-green-600">
          {t.landing.loginConfirmed}
        </p>
      )}

      {status === "expired" && (
        <div className="space-y-2 text-center">
          <p className="text-sm text-destructive">
            {t.landing.loginExpired}
          </p>
          <Button onClick={startLogin} variant="outline" size="sm">
            {t.landing.loginRetry}
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-2 text-center">
          <p className="text-sm text-destructive">
            {t.landing.loginError}
          </p>
          <Button onClick={startLogin} variant="outline" size="sm">
            {t.landing.loginRetry}
          </Button>
        </div>
      )}
    </div>
  );
}
