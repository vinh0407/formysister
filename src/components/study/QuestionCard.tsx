'use client'

import { Icon } from '@/components/ui/Icon'
import { LoadingState } from '@/components/ui/LoadingState'
import type { QuizQuestion } from '@/types/study'
import { EssayQuestion } from './EssayQuestion'
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion'

export type RevealedQuestion = {
  answer?: string
  explanation?: string
  isCorrect?: boolean | null
} | null

export function QuestionCard({
  question,
  index,
  answer,
  revealed,
  locked,
  canRevealEssay,
  submitted,
  regenerating,
  onSelect,
  onEssayChange,
  onRevealEssay,
  onRegenerate,
}: {
  question: QuizQuestion
  index: number
  answer: string
  revealed: RevealedQuestion
  locked: boolean
  canRevealEssay: boolean
  submitted: boolean
  regenerating: boolean
  onSelect: (answer: string) => void
  onEssayChange: (answer: string) => void
  onRevealEssay: () => void
  onRegenerate: () => void
}) {
  const isObjective = question.type === 'multiple-choice'
  const isCorrect = revealed?.isCorrect
  const showReveal = Boolean(revealed)

  return (
    <article
      id={`question-${question.id}`}
      tabIndex={-1}
      className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:p-6"
      aria-labelledby={`question-${question.id}-text`}
    >
      <div className="flex gap-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <h3
              id={`question-${question.id}-text`}
              className="max-w-3xl font-bold leading-6 text-ink"
            >
              {question.question}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {question.difficulty ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {question.difficulty === 'easy'
                    ? 'Dễ'
                    : question.difficulty === 'hard'
                      ? 'Khó'
                      : 'Trung bình'}
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                {isObjective ? 'Trắc nghiệm' : 'Tự luận'}
              </span>
            </div>
          </div>

          {isObjective ? (
            <MultipleChoiceQuestion
              question={question}
              selected={answer}
              revealed={revealed}
              locked={locked}
              onSelect={onSelect}
            />
          ) : (
            <EssayQuestion
              question={question}
              value={answer}
              revealedAnswer={revealed?.answer}
              revealedRubric={revealed?.explanation}
              locked={locked}
              canReveal={canRevealEssay}
              onReveal={onRevealEssay}
              onChange={onEssayChange}
            />
          )}

          {showReveal && isObjective ? (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                isCorrect === true
                  ? 'border-emerald-100 bg-emerald-50/70'
                  : 'border-amber-200 bg-amber-50'
              }`}
              aria-live="polite"
            >
              <p
                className={`flex items-center gap-2 text-sm font-bold ${
                  isCorrect === true ? 'text-emerald-800' : 'text-amber-900'
                }`}
              >
                <Icon name={isCorrect === true ? 'check' : 'brain'} className="size-4" />
                {isCorrect === true
                  ? 'Chính xác!'
                  : `Đáp án đúng: ${revealed?.answer ?? question.answer ?? ''}`}
              </p>
              {revealed?.explanation ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {revealed.explanation}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {!submitted && question.type === 'multiple-choice' && revealed ? (
              <span className="text-xs font-medium text-slate-600">
                Câu trả lời đã được khoá sau khi xem đáp án.
              </span>
            ) : null}
            {!submitted ? (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={regenerating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-60"
              >
                <Icon
                  name={regenerating ? 'spinner' : 'refresh'}
                  className={regenerating ? 'size-3.5 animate-spin' : 'size-3.5'}
                />
                {regenerating ? 'Đang tạo lại…' : 'Tạo lại câu này'}
              </button>
            ) : null}
          </div>

          {regenerating ? <LoadingState compact label="AI đang tạo câu hỏi mới…" /> : null}
        </div>
      </div>
    </article>
  )
}
