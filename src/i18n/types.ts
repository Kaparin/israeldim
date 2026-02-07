export type Locale = "he" | "ru";

export interface Dictionary {
  // Landing
  landing: {
    title: string;
    subtitle: string;
    login: string;
    loginLoading: string;
    loginWaiting: string;
    loginWaitingHint: string;
    loginOpenBot: string;
    loginCancel: string;
    loginConfirmed: string;
    loginExpired: string;
    loginError: string;
    loginRetry: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    greeting: (name: string) => string;
    logout: string;
    noQuizzes: string;
    noQuizzesHint: string;
    questions: (count: number) => string;
    start: string;
    retry: string;
    bestScore: string;
    continue: string;
    stats: string;
    questionDb: string;
    inProgress: string;
  };

  // Quiz
  quiz: {
    question: (current: number, total: number) => string;
    correct: string;
    incorrect: string;
    showExplanation: string;
    explanationTitle: (num: number) => string;
    correctAnswer: string;
    prev: string;
    next: string;
    finish: string;
    submitting: string;
    close: string;
    navigator: string;
    resumeQuiz: string;
  };

  // Results
  results: {
    title: string;
    score: (correct: number, total: number) => string;
    passed: string;
    failed: string;
    correctLabel: string;
    incorrectLabel: string;
    yourAnswer: string;
    correctAnswerLabel: string;
    backToDashboard: string;
    share: string;
  };

  // Stats
  stats: {
    title: string;
    totalAttempts: string;
    totalQuestions: string;
    averageScore: string;
    overallProgress: string;
    needsReview: string;
    noWeakQuestions: string;
    errorCount: (n: number) => string;
    history: string;
    noHistory: string;
  };

  // Question database
  questionDb: {
    title: string;
    search: string;
    searchPlaceholder: string;
    allQuizzes: string;
    noResults: string;
    loadMore: string;
    showAnswer: string;
    correctAnswer: string;
  };

  // Common
  common: {
    translate: string;
    translating: string;
    translation: string;
    loading: string;
  };
}
