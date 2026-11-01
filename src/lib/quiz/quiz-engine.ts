import type {
  ClientQuiz,
  InternalQuiz,
  InternalQuizQuestion,
  QuizDoc,
  QuestionDifficulty,
  QuestionType,
  QuizQuestion,
  StudyMode,
} from '@/types/study'

function difficultyOf(value: unknown): QuestionDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard' ? value : 'medium'
}

function typeOf(value: unknown): QuestionType {
  return value === 'essay' ? 'essay' : 'multiple-choice'
}

export function fromQuizDoc(doc: QuizDoc): InternalQuiz {
  const questions: InternalQuizQuestion[] = (doc.questions ?? []).map((question, index) => ({
    id: question.questionId || `q${index + 1}`,
    type: typeOf(question.type),
    question: question.prompt,
    options: (question.options ?? [])
      .map((option) => (typeof option === 'string' ? option : option.text))
      .filter((option): option is string => typeof option === 'string' && option.length > 0),
    answer: question.answer,
    explanation: question.explanation ?? '',
    difficulty: difficultyOf(question.difficulty),
  }))

  return {
    title: doc.title,
    summary: doc.summary ?? '',
    difficulty: difficultyOf(doc.difficulty),
    model: doc.model ?? undefined,
    questions,
  }
}

export function toPayloadQuestions(quiz: InternalQuiz): Array<Record<string, unknown>> {
  return quiz.questions.map((question) => ({
    questionId: question.id,
    type: question.type,
    prompt: question.question,
    options: question.options.map((text) => ({ text })),
    answer: question.answer,
    explanation: question.explanation,
    difficulty: question.difficulty,
  }))
}

export function toClientQuestion(
  question: InternalQuizQuestion,
  reveal: boolean,
): QuizQuestion {
  return {
    id: question.id,
    type: question.type,
    question: question.question,
    options: question.type === 'multiple-choice' ? question.options : undefined,
    answer: reveal ? question.answer : undefined,
    explanation: reveal ? question.explanation : undefined,
    difficulty: question.difficulty,
  }
}

/**
 * Convert an internal quiz to the browser shape.
 *
 * In exam mode `reveal` must be false before submission: answers and
 * explanations are omitted from the JSON payload, not merely hidden in CSS.
 */
export function toClientQuiz(
  quiz: InternalQuiz,
  options: {
    quizId?: string
    mode: StudyMode
    reveal: boolean
    sourceMaterialId?: string
  },
): ClientQuiz {
  return {
    quizId: options.quizId,
    title: quiz.title,
    summary: quiz.summary,
    questions: quiz.questions.map((question) => toClientQuestion(question, options.reveal)),
    difficulty: quiz.difficulty,
    questionCount: quiz.questions.filter((question) => question.type === 'multiple-choice').length,
    essayCount: quiz.questions.filter((question) => question.type === 'essay').length,
    mode: options.mode,
    sourceMaterialId: options.sourceMaterialId,
  }
}

export function countQuestionTypes(quiz: InternalQuiz): {
  objectiveCount: number
  essayCount: number
} {
  return {
    objectiveCount: quiz.questions.filter((question) => question.type === 'multiple-choice').length,
    essayCount: quiz.questions.filter((question) => question.type === 'essay').length,
  }
}
