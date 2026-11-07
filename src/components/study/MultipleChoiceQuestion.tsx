import React from 'react'
import { Button } from '@/components/ui/Button'

interface MultipleChoiceQuestionProps {
  question: any
  onAnswer: (isCorrect: boolean) => void
  isLast?: boolean
}

export const MultipleChoiceQuestion = ({
  question,
  onAnswer,
  isLast = false
}: MultipleChoiceQuestionProps) => {
  const handleSelect = (isCorrect: boolean) => {
    onAnswer(isCorrect)
    // Tự động chuyển câu hỏi nếu không phải câu cuối hoặc có thể thêm logic next
    if (!isLast) {
      // Tạm thời gọi onAnswer, component cha có thể xử lý navigation
    }
  }

  if (!question || !question.options) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-lg font-medium text-ink mb-4 line-clamp-3">
        {question.text}
      </p>

      {question.options.map((option: any) => (
        <Button
          key={option.id}
          variant="outline"
          onClick={() => handleSelect(option.isCorrect)}
          className="w-full justify-start px-4 py-2 rounded-md text-left border border-border hover:bg-brand-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-full {option.isCorrect ? 'bg-brand-600' : 'bg-transparent'} mr-2">
              {/* Icon check hoặc circle */}
            </span>
            {option.text}
          </span>
        </Button>
      ))}

      {isLast && (
        <Button
          variant="primary"
          onClick={() => {}}
          className="w-full mt-4"
          disabled={/* loading state */}
        >
          Hoàn thành bài kiểm tra
        </Button>
      )}
    </div>
  )
}
