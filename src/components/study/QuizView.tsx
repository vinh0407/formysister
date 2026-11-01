'use client'

import { useCallback, useEffect, useState } from 'react'

import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Icon } from '@/components/ui/Icon'
import { useQuiz } from '@/hooks/useQuiz'
import { useQuizProgress } from '@/hooks/useQuizProgress'
import type { ClientQuiz, GradedResult } from '@/types/study'
import { QuestionCard } from './QuestionCard'
import { QuizResult } from './QuizResult'

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function QuizView({
  quiz: initialQuiz,
  onNewQuiz,
  onSubmitted,
}: {
  quiz: ClientQuiz
  onNewQuiz?: () => void
  onSubmitted?: (result: GradedResult) => void
}) {
  const {
    quiz,
    answers,
    submitted,
    submitting,
    result,
    error,
    regeneratingId,
    startedAt,
    locked,
    selectAnswer,
    revealEssay,
    submit,
    restart,
    regenerateQuestion,
    revealFor,
    setError,
  } = useQuiz(initialQuiz, { onSubmitted })

  const progress = useQuizProgress(quiz, answers, result)
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (quiz.mode !== 'exam' || submitted) return
    const update = () => setElapsed(Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [quiz.mode, startedAt, submitted])

  const goToQuestion = useCallback((index: number) => {
    setActiveQuestion(index)
    const question = quiz.questions[index]
    if (!question) return
    const element = document.getElementById(`question-${question.id}`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => element?.focus({ preventScroll: true }), 350)
  }, [quiz.questions])

  const handleRestart = () => {
    restart()
    setConfirming(false)
    setActiveQuestion(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-700">
              {quiz.mode === 'learn' ? 'Học & sửa ngay' : 'Kiểm tra thật'}
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">{quiz.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{quiz.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {quiz.mode === 'exam' && !submitted ? (
              <span
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
                aria-label={`Thời gian làm bài ${formatElapsed(elapsed)}`}
              >
                <Icon name="timer" className="size-4" />
                {formatElapsed(elapsed)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
            >
              <Icon name="refresh" className="size-4" />
              Làm lại
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="font-bold text-slate-800">
              Đã trả lời {progress.answered}/{progress.total} câu
            </p>
            <p className="text-xs font-medium text-slate-600">
              Trắc nghiệm {progress.objectiveAnswered}/{progress.objectiveTotal} · Tự luận{' '}
              {progress.essayAnswered}/{progress.essayTotal}
            </p>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Tiến độ trả lời câu hỏi"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.answered}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        <nav aria-label="Danh sách câu hỏi" className="mt-4 flex flex-wrap gap-2">
          {quiz.questions.map((question, index) => {
            const answered = Boolean((answers[question.id] ?? '').trim())
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => goToQuestion(index)}
                aria-label={`Đi tới câu ${index + 1}${answered ? ', đã trả lời' : ', chưa trả lời'}`}
                aria-current={activeQuestion === index ? 'step' : undefined}
                className={`relative flex size-9 items-center justify-center rounded-lg border text-sm font-bold transition ${
                  activeQuestion === index
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : answered
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                }`}
              >
                {index + 1}
              </button>
            )
          })}
        </nav>
      </section>

      <ErrorMessage message={error} onDismiss={() => setError(null)} />

      {result ? (
        <QuizResult result={result} onRestart={handleRestart} onNewQuiz={onNewQuiz} />
      ) : null}

      <div className="space-y-5">
        {quiz.questions.map((question, index) => {
          const revealed = revealFor(question.id)
          const isLocked = locked || (quiz.mode === 'learn' && Boolean(revealed))
          return (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              answer={answers[question.id] ?? ''}
              revealed={revealed}
              locked={isLocked}
              canRevealEssay={quiz.mode === 'learn' && !submitted && !revealed}
              submitted={submitted}
              regenerating={regeneratingId === question.id}
              onSelect={(answer) => selectAnswer(question.id, answer)}
              onEssayChange={(answer) => selectAnswer(question.id, answer)}
              onRevealEssay={() => revealEssay(question.id)}
              onRegenerate={() => void regenerateQuestion(question.id)}
            />
          )
        })}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {!quiz.quizId ? (
          <p className="text-sm font-medium text-amber-800" role="alert">
            Bài kiểm tra này chưa được lưu nên không thể nộp. Hãy tạo bài mới.
          </p>
        ) : submitted ? (
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold text-slate-800">Đã lưu kết quả vào lịch sử</p>
              <p className="text-sm text-slate-600">
                Bạn có thể xem lại giải thích hoặc làm lại bất cứ lúc nào.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <Icon name="refresh" className="size-4" />
              Làm lại
            </button>
          </div>
        ) : confirming ? (
          <div role="alert" className="rounded-2xl bg-amber-50 p-4">
            <p className="font-bold text-amber-900">Xác nhận nộp bài?</p>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              {progress.unanswered > 0
                ? `Bạn còn ${progress.unanswered} câu chưa trả lời. `
                : 'Bạn đã trả lời tất cả câu hỏi. '}
              Sau khi nộp, kết quả sẽ được lưu vào lịch sử học tập.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  void submit()
                }}
                disabled={submitting}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? 'Đang nộp…' : 'Nộp bài'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-100"
              >
                Tiếp tục làm
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold text-slate-800">
                {quiz.mode === 'learn'
                  ? 'Hoàn tất và lưu kết quả'
                  : 'Kiểm tra lại trước khi nộp bài'}
              </p>
              <p className="text-sm text-slate-600">
                {quiz.mode === 'learn'
                  ? 'Điểm trắc nghiệm được tính khi bạn nộp bài.'
                  : 'Đáp án và giải thích chỉ hiện sau khi nộp.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
            >
              <Icon name={submitting ? 'spinner' : 'check'} className={submitting ? 'size-4 animate-spin' : 'size-4'} />
              {submitting ? 'Đang nộp…' : 'Nộp bài & xem kết quả'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
