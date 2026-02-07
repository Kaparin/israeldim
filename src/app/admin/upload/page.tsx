"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ParsedQuestion } from "@/lib/pdf-parser";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    setError("");
    setQuestions([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("preview", "true");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to parse PDF");
        return;
      }

      setQuestions(data.questions);
      if (!title) {
        setTitle(file.name.replace(".pdf", ""));
      }
    } catch {
      setError("Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!file || questions.length === 0) return;

    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save quiz");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Загрузка теста из PDF</h1>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">PDF файл</label>
          <Input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setQuestions([]);
              setError("");
            }}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Название теста</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название теста"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={handlePreview}
          disabled={!file || loading}
          className="w-full"
          variant="outline"
        >
          {loading ? "Парсинг..." : "Предпросмотр"}
        </Button>

        {questions.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Найдено вопросов: {questions.length}
              </h2>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Сохранение..." : "Сохранить тест"}
              </Button>
            </div>

            <div className="space-y-3">
              {questions.map((q, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {i + 1}. {q.text}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {q.options.map((option, j) => (
                      <div
                        key={j}
                        className={`text-sm py-1 px-2 rounded ${
                          j === q.correctIndex
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                            : ""
                        }`}
                      >
                        {String.fromCharCode(65 + j)}. {option}
                        {j === q.correctIndex && (
                          <Badge variant="default" className="ml-2 text-xs">
                            Верно
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
