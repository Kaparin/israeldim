export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface QuizWithMeta {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  createdAt: string;
  completed?: boolean;
  lastScore?: number;
  lastTotal?: number;
}

export interface QuestionData {
  id: string;
  questionNum: number;
  text: string;
  options: string[];
  correctIndex: number;
  order: number;
  answerText: string | null;
}

export interface SubmitAnswers {
  answers: Record<string, number>;
}

export interface QuizResult {
  resultId: string;
  score: number;
  totalCount: number;
  questions: {
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
    selectedIndex: number;
  }[];
}
