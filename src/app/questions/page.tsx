"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { QuestionCard } from "@/components/question-card";
import { useLocale } from "@/i18n/context";

interface QuestionItem {
  id: string;
  questionNum: number;
  text: string;
  options: string[];
  correctIndex: number;
  answerText: string | null;
  imageUrls: string[] | null;
  answerImageUrls: string[] | null;
  quizTitle: string;
  quizId: string;
}

interface QuizOption {
  id: string;
  title: string;
}

export default function QuestionsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchQuestions = useCallback(
    async (p: number, append: boolean, q: string, quizId: string) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (quizId) params.set("quizId", quizId);
        params.set("page", String(p));
        params.set("limit", "20");

        const res = await fetch(`/api/questions?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (append) {
          setQuestions((prev) => [...prev, ...data.questions]);
        } else {
          setQuestions(data.questions);
        }
        setHasMore(data.hasMore);
        setPage(p);
      } catch {
        if (!append) setQuestions([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Load quizzes for filter
  useEffect(() => {
    fetch("/api/quizzes")
      .then((res) => res.json())
      .then((data) =>
        setQuizzes(
          data.map((q: { id: string; title: string }) => ({
            id: q.id,
            title: q.title,
          }))
        )
      )
      .catch(() => {});
  }, []);

  // Initial load
  useEffect(() => {
    fetchQuestions(1, false, "", "");
  }, [fetchQuestions]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchQuestions(1, false, value, selectedQuizId);
    }, 300);
  };

  const handleQuizFilter = (quizId: string) => {
    setSelectedQuizId(quizId);
    fetchQuestions(1, false, search, quizId);
  };

  const handleLoadMore = () => {
    fetchQuestions(page + 1, true, search, selectedQuizId);
  };

  return (
    <div className="min-h-screen">
      <AppHeader
        title={t.questionDb.title}
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

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Search & filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t.questionDb.searchPlaceholder}
              className="ps-9"
            />
          </div>
          <select
            value={selectedQuizId}
            onChange={(e) => handleQuizFilter(e.target.value)}
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">{t.questionDb.allQuizzes}</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        </div>

        {/* Questions list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t.questionDb.noResults}
          </p>
        ) : (
          <div className="space-y-3">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                id={q.id}
                questionNum={q.questionNum}
                text={q.text}
                options={q.options as string[]}
                correctIndex={q.correctIndex}
                answerText={q.answerText}
                imageUrls={q.imageUrls as string[] | null}
                answerImageUrls={q.answerImageUrls as string[] | null}
                quizTitle={q.quizTitle}
              />
            ))}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t.common.loading : t.questionDb.loadMore}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
