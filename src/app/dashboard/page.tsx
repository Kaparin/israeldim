"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuizCard } from "@/components/quiz-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { QuizWithMeta } from "@/types";

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<QuizWithMeta[]>([]);
  const [user, setUser] = useState<{
    firstName: string;
    lastName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
      <div className="min-h-screen px-4 py-6 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3 pt-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Тесты</h1>
          {user && (
            <p className="text-sm text-muted-foreground">
              Привет, {user.firstName}
              {user.lastName ? ` ${user.lastName}` : ""}!
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Выйти
        </Button>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Пока нет доступных тестов</p>
          <p className="text-sm mt-1">Загляните позже</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
}
