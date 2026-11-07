import React from "react";
import { Question } from "@/lib/schemas/questionSchema";

export interface EssayQuestionProps {
  question: Extract<Question, { type: "essay" }>;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function EssayQuestion({
  question,
  value = "",
  onChange,
  disabled = false,
}: EssayQuestionProps) {
  return (
    <div className="space-y-2">
      <label className="font-medium text-gray-900" htmlFor={question.id}>
        {question.prompt}
      </label>
      <textarea
        id={question.id}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        placeholder={question.placeholder ?? "Nhập câu trả lời..."}
        minLength={question.minLength}
        maxLength={question.maxLength}
        className="w-full min-h-[120px] rounded-md border border-gray-300 p-3 text-sm"
      />
    </div>
  );
}
