export type QuestionType = 'multiple-choice' | 'essay'
export type QuestionDifficulty = 'easy' | 'medium' | 'hard'
export type StudyMode = 'learn' | 'exam'
export type ProcessingStatus = 'pending' | 'ready' | 'failed'
export type GradingStatus = 'not-graded' | 'ai-assisted' | 'teacher-verified'

export type QuizQuestion = {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  answer?: string
  explanation?: string
  difficulty?: QuestionDifficulty
}

export type Quiz = {
  id?: string
  title: string
  summary: string
  questions: QuizQuestion[]
  difficulty?: QuestionDifficulty
  questionCount?: number
  essayCount?: number
  mode?: StudyMode
}

/** Question as stored in Payload, including the grading answer. */
export type InternalQuizQuestion = {
  id: string
  type: QuestionType
  question: string
  options: string[]
  answer: string
  explanation: string
  difficulty: QuestionDifficulty
}

/** Quiz with answers. Never send this object to an exam-mode client before submission. */
export type InternalQuiz = {
  title: string
  summary: string
  questions: InternalQuizQuestion[]
  difficulty: QuestionDifficulty
  model?: string
}

/** Sanitized quiz shape returned to the browser. */
export type ClientQuiz = {
  quizId?: string
  title: string
  summary: string
  questions: QuizQuestion[]
  difficulty?: QuestionDifficulty
  questionCount: number
  essayCount: number
  mode: StudyMode
  sourceMaterialId?: string
}

export type GradedQuestion = {
  id: string
  questionId: string
  question: string
  type: QuestionType
  options: string[]
  correctAnswer: string
  explanation: string
  userAnswer: string
  isCorrect: boolean | null
  answered: boolean
  difficulty: QuestionDifficulty
}

export type GradedResult = {
  attemptId?: string
  quizId: string
  quizTitle: string
  objectiveScore: number
  essayScore: number
  totalScore: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  objectiveQuestionCount: number
  essayQuestionCount: number
  answeredObjectiveCount: number
  answeredEssayCount: number
  gradingStatus: GradingStatus
  questions: GradedQuestion[]
  durationSeconds?: number | null
  completedAt?: string | null
  mode?: StudyMode
}

export type StudyStatsData = {
  totalQuizzes: number
  totalQuestions: number
  totalCorrectAnswers: number
  accuracy: number
  currentStreak: number
  longestStreak: number
  weeklyActivity: Array<{ date: string; quizzes: number; questions: number; correct: number }>
  monthlyActivity: Array<{
    month: string
    quizzes: number
    questions: number
    correct: number
    accuracy: number
  }>
  materialPerformance: Array<{
    title: string
    attempts: number
    accuracy: number
  }>
}

export type StudySessionDoc = {
  id: string
  tokenHash: string
  expiresAt: string
  lastSeenAt?: string | null
  createdAt: string
  updatedAt: string
}

export type StudyFileDoc = {
  id: string
  filename?: string | null
  mimeType?: string | null
  filesize?: number | null
  url?: string | null
  sessionHash?: string | null
  owner?: string | number | { id: string } | null
  createdAt: string
  updatedAt: string
}

export type StudyMaterialDoc = {
  id: string
  title: string
  description?: string | null
  originalFilename?: string | null
  file?: string | StudyFileDoc | null
  extractedText?: string | null
  mimeType?: string | null
  fileSize?: number | null
  processingStatus: ProcessingStatus
  sourceType: 'text' | 'image' | 'pdf' | 'docx' | 'txt'
  pageCount?: number | null
  errorMessage?: string | null
  sessionHash?: string | null
  owner?: string | number | { id: string } | null
  createdAt: string
  updatedAt: string
}

export type QuizQuestionDoc = {
  id?: string
  questionId: string
  type: QuestionType
  prompt: string
  options?: Array<{ text: string; id?: string }>
  answer: string
  explanation?: string | null
  difficulty?: QuestionDifficulty
}

export type QuizDoc = {
  id: string
  title: string
  summary?: string | null
  sourceMaterial?: string | StudyMaterialDoc | null
  questions: QuizQuestionDoc[]
  difficulty?: QuestionDifficulty
  questionCount?: number | null
  essayCount?: number | null
  model?: string | null
  visibility?: 'private' | 'public'
  sessionHash?: string | null
  owner?: string | number | { id: string } | null
  createdAt: string
  updatedAt: string
}

export type AttemptAnswerDoc = {
  questionId: string
  questionType: QuestionType
  answer?: string | null
  isCorrect?: boolean | null
  points?: number | null
}

export type QuizAttemptDoc = {
  id: string
  quiz: string | QuizDoc
  quizTitle: string
  sessionHash?: string | null
  owner?: string | number | { id: string } | null
  answers: AttemptAnswerDoc[]
  objectiveScore: number
  essayScore: number
  totalScore: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  objectiveQuestionCount: number
  essayQuestionCount: number
  answeredObjectiveCount: number
  answeredEssayCount: number
  gradingStatus: GradingStatus
  mode: StudyMode
  answersHash?: string | null
  startedAt?: string | null
  completedAt?: string | null
  durationSeconds?: number | null
  createdAt: string
  updatedAt: string
}

export type UserProgressDoc = {
  id: string
  progressKey: string
  sessionHash?: string | null
  owner?: string | number | { id: string } | null
  totalQuizzes: number
  totalQuestions: number
  totalCorrectAnswers: number
  accuracy: number
  currentStreak: number
  longestStreak: number
  lastStudyDate?: string | null
  weeklyActivity?: Array<{ date: string; quizzes: number; questions: number; correct: number }>
  monthlyActivity?: Array<{
    month: string
    quizzes: number
    questions: number
    correct: number
    accuracy: number
  }>
  subjectPerformance?: Array<{ title: string; attempts: number; accuracy: number }>
  createdAt: string
  updatedAt: string
}

export type UserDoc = {
  id: string
  name: string
  email: string
  role: 'student' | 'admin'
  avatar?: string | { id: string } | null
  createdAt: string
  updatedAt: string
}

export type AiUsageDoc = {
  id: string
  day: string
  model: string
  neurons: number
  requests: number
  requestId: string
  createdAt: string
  updatedAt: string
}

export type AIUsageStatus = {
  configured: boolean
  day: string
  neuronsUsed: number
  neuronBudget: number
  remaining: number
  budgetExhausted: boolean
  textModel: string
  visionModel: string
}

export type AttemptSummary = {
  id: string
  quizId: string
  quizTitle: string
  mode: StudyMode
  totalScore: number
  objectiveScore: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  objectiveQuestionCount: number
  essayQuestionCount: number
  durationSeconds: number | null
  completedAt: string | null
  createdAt: string
}
