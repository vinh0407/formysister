import React, { useState } from 'react'
import { Textarea } from '@/components/ui/Textarea' // Giả sử có component Textarea hoặc dùng input chuẩn
import { Button } from '@/components/ui/Button'

interface EssayQuestionProps {
  question: any
  onSubmit: (answer: string) => void
}

export const EssayQuestion = ({ question, onSubmit }: EssayQuestionProps) => {
  const [answer, setAnswer] = useState('')

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-ink mb-2 line-clamp-2">
        {question.text}
      </p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Viết câu trả lời hoặc giải thích của bạn ở đây..."
        className="w-full px-4 py-3 rounded-md border border-border focus:ring-2 focus:ring-brand-500 focus:outline-none resize-min h-[120px] text-ink"
        rows={3}
      />

      <Button
        variant="primary"
        onClick={() => onSubmit(answer)}
        className="w-full mt-2"
        disabled={!answer.trim()}
      >
        Gửi câu trả lời
      </Button>
    </div>
  )
}
