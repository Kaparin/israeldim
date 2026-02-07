"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, BarChart3, BookOpen } from "lucide-react";
import { QuizCard } from "@/components/quiz-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { useLocale } from "@/i18n/context";
import type { QuizWithMeta } from "@/types";

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<QuizWithMeta[]>([]);
  const [user, setUser] = useState<{
    firstName: string;
    lastName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    async function load() {
      try {
        const [quizzesRes, userRes] = await Promise.all([
          fetch("/api/quizzes"),
          fetch("/api/auth/me"),
        ]);

        if (!quizzesRes.ok || !userRes.ok) {
          router.push("/");
          return;
        }

        setQuizzes(await quizzesRes.json());
        setUser(await userRes.json());
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const handleLogout = async () => {
    document.cookie =
      "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b h-14" />
        <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        title={t.dashboard.title}
        trailing={
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push("/questions")}
              className="text-muted-foreground"
              title={t.dashboard.questionDb}
            >
              <BookOpen className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push("/stats")}
              className="text-muted-foreground"
              title={t.dashboard.stats}
            >
              <BarChart3 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              className="text-muted-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        }
      />

      <div className="px-4 py-6 max-w-lg mx-auto">
        {user && (
          <p className="text-sm text-muted-foreground mb-4">
            {t.dashboard.greeting(
              `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
            )}
          </p>
        )}

        {quizzes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">{t.dashboard.noQuizzes}</p>
            <p className="text-sm mt-1">{t.dashboard.noQuizzesHint}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
