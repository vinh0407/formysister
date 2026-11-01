'use client'

import { Icon } from '@/components/ui/Icon'
import type { QuizQuestion } from '@/types/study'

export function EssayQuestion({
  question,
  value,
  revealedAnswer,
  revealedRubric,
  locked,
  canReveal,
  onReveal,
  onChange,
}: {
  question: QuizQuestion
  value: string
  revealedAnswer?: string
  revealedRubric?: string
  locked: boolean
  canReveal: boolean
  onReveal: () => void
  onChange: (value: string) => void
}) {
  const revealed = Boolean(revealedAnswer)
  const id = `essay-${question.id}`

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-slate-700">
        Câu trả lời của bạn
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={locked}
        maxLength={5000}
        placeholder="Viết câu trả lời của bạn…"
        className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-80"
        aria-describedby={`${id}-help`}
      />
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
        <span id={`${id}-help`} className="text-xs text-slate-600">
          {locked
            ? 'Câu trả lời đã được khoá.'
            : 'Bài tự luận không được chấm tự động; phần chấm là tham khảo cho giáo viên.'}
        </span>
        <span className="text-xs font-medium text-slate-500">{value.length}/5.000 ký tự</span>
      </div>

      {!revealed && canReveal ? (
        <button
          type="button"
          onClick={onReveal}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-800 transition hover:bg-brand-100"
        >
          <Icon name="eye" className="size-4" />
          Xem đáp án tham khảo (sẽ khoá câu trả lời)
        </button>
      ) : null}

      {revealed ? (
        <div
          className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4"
          aria-live="polite"
        >
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <Icon name="check" className="size-4" />
            Đáp án tham khảo / rubric
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {revealedAnswer}
          </p>
          {revealedRubric ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {revealedRubric}
            </p>
          ) : null}
          <p className="mt-3 text-xs font-medium text-emerald-900">
            Kết quả này chưa được giáo viên xác nhận.
          </p>
        </div>
      ) : null}
    </div>
  )
}
