import React from 'react'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { useQuizAttempts } from '@/hooks/useQuizProgress'

interface AttemptDetailProps {
  onClose: () => void
}

export const AttemptDetail = ({ onClose }: AttemptDetailProps) => {
  const { attempts, loading, error } = useQuizAttempts()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="animate-spin size-8 border-2 border-brand-200 rounded-full"></span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-brand-50 border border-brand-200 text-brand-600">
        <p className="font-medium">{error}</p>
        <Button onClick={onClose} className="mt-2">Quay lại</Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <header className="mb-6 border-b border-border pb-4">
        <h2 className="text-2xl font-bold text-ink">
          Chi tiết lượt làm bài
        </h2>
      </header>

      {attempts.length === 0 && (
        <p className="text-slate-500">
          Chưa có lượt nộp bài nào. Hãy tạo bài kiểm tra và bắt đầu làm.
        </p>
      )}

      <ul className="space-y-4">
        {attempts.map((attempt) => (
          <li
            key={attempt.id}
            className="p-4 rounded-lg bg-brand-50 border border-border hover:bg-brand-100 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <span className="font-medium text-ink">
                {attempt.quizTitle}
              </span>
              <span className="text-sm text-slate-500">
                {attempt.score}% - {attempt.date}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {attempt.totalQuestions} câu · {attempt.correctAnswers} chính xác
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}