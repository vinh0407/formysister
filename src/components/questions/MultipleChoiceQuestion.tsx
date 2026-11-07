import React from "react";
import { Question } from "@/lib/schemas/questionSchema";

export interface MultipleChoiceQuestionProps {
  question: Extract<Question, { type: "multiple_choice" }>;
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}

export function MultipleChoiceQuestion({
  question,
  value,
  onChange,
  disabled = false,
}: MultipleChoiceQuestionProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="font-medium text-gray-900">{question.prompt}</legend>
      {question.options.map((option, index) => (
        <label key={index} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={question.id}
            value={index}
            checked={value === index}
            onChange={() => onChange?.(index)}
            className="h-4 w-4"
          />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}
