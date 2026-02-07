"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Target, BookCheck, Percent, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { useLocale } from "@/i18n/context";

interface StatsData {
  totalAttempts: number;
  totalQuestions: number;
  totalCorrect: number;
  averageScore: number;
  quizStats: {
    quizId: string;
    quizTitle: string;
    attempts: number;
    bestScore: number;
    bestTotal: number;
    lastScore: number;
    lastTotal: number;
  }[];
  weakQuestions: {
    questionId: string;
    questionNum: number;
    text: string;
    quizTitle: string;
    errorCount: number;
    totalAttempts: number;
    correctIndex: number;
    options: string[];
  }[];
  history: {
    id: string;
    quizTitle: string;
    score: number;
    totalCount: number;
    completedAt: string;
  }[];
}

export default function StatsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setData)
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !data) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b h-14" />
        <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        title={t.stats.title}
        trailing={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
          </Button>
        }
      />

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 shrink-0">
                <Target className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums">{data.totalAttempts}</p>
                <p className="text-xs text-muted-foreground truncate">{t.stats.totalAttempts}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 shrink-0">
                <BookCheck className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums">{data.totalCorrect}/{data.totalQuestions}</p>
                <p className="text-xs text-muted-foreground truncate">{t.stats.totalQuestions}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 shrink-0">
                <Percent className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums">{data.averageScore}%</p>
                <p className="text-xs text-muted-foreground">{t.stats.averageScore}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weak questions */}
        {data.weakQuestions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="size-4" />
              {t.stats.needsReview}
            </h2>
            {data.weakQuestions.map((q) => {
              const isExpanded = expandedId === q.questionId;
              return (
                <Card key={q.questionId} className="overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : q.questionId)
                    }
                    className="w-full text-start p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground mb-1">
                          {q.quizTitle} — #{q.questionNum}
                        </p>
                        <p className="text-sm line-clamp-2" dir="rtl">
                          {q.text}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="destructive" className="text-xs">
                          {t.stats.errorCount(q.errorCount)}
                        </Badge>
                        <ChevronDown
                          className={`size-4 text-muted-foreground transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t space-y-2">
                      <p className="text-sm whitespace-pre-wrap pt-3" dir="rtl">
                        {q.text}
                      </p>
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                        {t.questionDb.correctAnswer}: {q.correctIndex + 1}.{" "}
                        {(q.options as string[])[q.correctIndex]}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {data.weakQuestions.length === 0 && data.totalAttempts > 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t.stats.noWeakQuestions}
          </p>
        )}

        {/* History */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{t.stats.history}</h2>
          {data.history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.stats.noHistory}
            </p>
          ) : (
            data.history.map((h) => {
              const pct = Math.round((h.score / h.totalCount) * 100);
              return (
                <Card key={h.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{h.quizTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={pct >= 60 ? "default" : "destructive"}>
                      {h.score}/{h.totalCount} ({pct}%)
                    </Badge>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
