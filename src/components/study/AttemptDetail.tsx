import Link from 'next/link'

import { Icon } from '@/components/ui/Icon'
import { formatDateTime, formatDuration, scoreTone } from '@/lib/format'
import type { AttemptReview } from '@/lib/study/server-data'

function statusFor(question: { type: string; answered: boolean; isCorrect: boolean | null }) {
  if (question.type === 'essay') {
    return { label: 'Tự luận – chưa chấm tự động', classes: 'bg-amber-50 text-amber-800 ring-amber-200' }
  }
  if (!question.answered) {
    return { label: 'Chưa trả lời', classes: 'bg-slate-100 text-slate-700 ring-slate-200' }
  }
  if (question.isCorrect) {
    return { label: 'Trả lời đúng', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
  }
  return { label: 'Trả lời sai', classes: 'bg-rose-50 text-rose-700 ring-rose-200' }
}

export function AttemptDetail({ review }: { review: AttemptReview }) {
  const { attempt, result, message } = review
  const tone = scoreTone(attempt.totalScore)
  const scoreColor =
    tone === 'good' ? 'text-emerald-700' : tone === 'okay' ? 'text-amber-700' : 'text-rose-700'

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:text-brand-800"
            >
              <Icon name="arrowLeft" className="size-4" />
              Lịch sử làm bài
            </Link>
            <h1 className="mt-3 break-words text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {attempt.quizTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Nộp lúc {formatDateTime(attempt.completedAt ?? attempt.createdAt)} ·{' '}
              {attempt.mode === 'exam' ? 'Kiểm tra thật' : 'Học & sửa ngay'} ·{' '}
              {formatDuration(attempt.durationSeconds)}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-slate-50 px-5 py-4 text-center">
            <p className={`text-3xl font-bold ${scoreColor}`}>{attempt.totalScore}%</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">Điểm trắc nghiệm</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: 'Đúng', value: attempt.correctCount, tone: 'text-emerald-700' },
            { label: 'Sai', value: attempt.incorrectCount, tone: 'text-rose-700' },
            { label: 'Bỏ trống', value: attempt.unansweredCount, tone: 'text-amber-700' },
            {
              label: 'Tự luận',
              value: result
                ? `${result.answeredEssayCount}/${result.essayQuestionCount}`
                : String(attempt.essayQuestionCount),
              tone: 'text-slate-700',
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
              <p className={`text-xl font-bold ${item.tone}`}>{item.value}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-600">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {attempt.quizId ? (
            <Link
              href={`/quizzes/${attempt.quizId}?mode=learn`}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <Icon name="refresh" className="size-4" />
              Làm lại bài này
            </Link>
          ) : null}
          <Link
            href="/history"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            <Icon name="history" className="size-4" />
            Về lịch sử
          </Link>
        </div>
      </section>

      {message ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900" role="status">
          {message}
        </p>
      ) : null}

      {result ? (
        <div className="space-y-4">
          {result.questions.map((question, index) => {
            const status = statusFor(question)
            return (
              <article
                key={question.questionId}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="min-w-0 break-words font-bold leading-6 text-ink">
                        {question.question}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${status.classes}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                        Câu trả lời của bạn
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                        {question.userAnswer || 'Chưa trả lời'}
                      </p>
                    </div>

                    {question.type === 'multiple-choice' ? (
                      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                          Đáp án đúng
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold leading-6 text-emerald-900">
                          {question.correctAnswer}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
                          Đáp án tham khảo / rubric
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-amber-900">
                          {question.correctAnswer}
                        </p>
                        <p className="mt-2 text-xs font-medium text-amber-900">
                          Bài tự luận không được tính vào điểm tự động. Hãy nhờ giáo viên xác nhận.
                        </p>
                      </div>
                    )}

                    {question.explanation ? (
                      <div className="mt-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                          Giải thích
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                          {question.explanation}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
