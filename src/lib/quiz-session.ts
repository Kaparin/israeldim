export interface QuizSession {
  quizId: string;
  currentIndex: number;
  answers: Record<string, number>; // questionId → selectedIndex
  answeredIds: string[];
  startedAt: number; // timestamp
}

const PREFIX = "quiz-session-";

export function getSession(quizId: string): QuizSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + quizId);
    if (!raw) return null;
    return JSON.parse(raw) as QuizSession;
  } catch {
    return null;
  }
}

export function saveSession(session: QuizSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + session.quizId, JSON.stringify(session));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearSession(quizId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREFIX + quizId);
  } catch {
    // ignore
  }
}

export function getAllSessions(): QuizSession[] {
  if (typeof window === "undefined") return [];
  const sessions: QuizSession[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          sessions.push(JSON.parse(raw) as QuizSession);
        }
      }
    }
  } catch {
    // ignore
  }
  return sessions;
}

export function hasSession(quizId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREFIX + quizId) !== null;
}
