import React from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface QuizResultProps {
  score: number
  total: number
  onRestart: () => void
  onBack: () => void
}

export const QuizResult = ({ score, total, onRestart, onBack }: QuizResultProps) => {
  const percentage = Math.round((score / total) * 100)
  const statusClass = percentage >= 80 ? 'text-brand-600' : percentage >= 60 ? 'text-brand-500' : 'text-red-500'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 bg-canvas text-ink">
      <div className="bg-brand-50 p-8 rounded-2xl border border-brand-200 max-w-md w-full text-center shadow-lg">
        <Icon name="check-circle" className="size-12 text-brand-400 mb-4" />
        
        <h2 className="text-3xl font-bold text-ink mb-2">
          Kết quả bài kiểm tra
        </h2>
        
        <p className="text-5xl font-extrabold {statusClass} mb-4">
          {percentage}%
        </p>

        <p className="text-base text-slate-500 mb-6">
          {score} câu đúng trên {total} câu
        </p>

        <div className="progress-bar bg-brand-100 rounded-full h-2 mb-4">
          <div
            className="h-full rounded-full bg-brand-600 transition-width"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="text-sm text-slate-500 mb-6">
          {percentage >= 80 ? 'Xuất sắc!' : percentage >= 60 ? 'Tốt!' : 'Cần cải thiện'}
        </p>

        <div className="flex gap-3">
          <Button onClick={onRestart} className="flex-1">
            Làm lại bài
          </Button>
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            Quay lại bài kiểm tra
          </Button>
        </div>
      </div>
    </div>
  )
}
