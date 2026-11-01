'use client'

import { Icon } from '@/components/ui/Icon'
import type { QuizQuestion } from '@/types/study'

export function MultipleChoiceQuestion({
  question,
  selected,
  revealed,
  locked,
  onSelect,
}: {
  question: QuizQuestion
  selected: string
  revealed: { answer?: string; isCorrect?: boolean | null } | null
  locked: boolean
  onSelect: (answer: string) => void
}) {
  const options = question.options ?? []

  return (
    <div role="group" aria-labelledby={`question-${question.id}-text`} className="grid gap-2 sm:grid-cols-2">
      {options.map((option, optionIndex) => {
        const isSelected = selected === option
        const isCorrect = revealed ? option === revealed.answer : false
        const isWrong = Boolean(revealed && isSelected && !isCorrect)
        return (
          <button
            key={`${question.id}-${optionIndex}`}
            type="button"
            onClick={() => onSelect(option)}
            disabled={locked}
            aria-pressed={isSelected}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed ${
              isCorrect
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : isWrong
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : isSelected
                    ? 'border-brand-500 bg-brand-50 text-brand-900'
                    : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-slate-50'
            }`}
          >
            <span
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                isCorrect
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : isWrong
                    ? 'border-rose-600 bg-rose-600 text-white'
                    : 'border-slate-300 text-slate-600'
              }`}
              aria-hidden="true"
            >
              {isCorrect ? (
                <Icon name="check" className="size-3.5" />
              ) : (
                String.fromCharCode(65 + optionIndex)
              )}
            </span>
            <span className="min-w-0 flex-1 leading-6">{option}</span>
            {isCorrect ? <span className="sr-only">Đáp án đúng</span> : null}
            {isWrong ? <span className="sr-only">Đáp án bạn chọn chưa đúng</span> : null}
          </button>
        )
      })}
    </div>
  )
}
