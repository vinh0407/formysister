import React from "react";
import { Question } from "@/lib/schemas/questionSchema";

export interface MultiSelectQuestionProps {
  question: Extract<Question, { type: "multi_select" }>;
  value?: number[];
  onChange?: (value: number[]) => void;
  disabled?: boolean;
}

export function MultiSelectQuestion({
  question,
  value = [],
  onChange,
  disabled = false,
}: MultiSelectQuestionProps) {
  const toggle = (index: number) => {
    const next = value.includes(index)
      ? value.filter((item) => item !== index)
      : [...value, index];
    onChange?.(next);
  };

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="font-medium text-gray-900">{question.prompt}</legend>
      {question.options.map((option, index) => (
        <label key={index} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(index)}
            onChange={() => toggle(index)}
            className="h-4 w-4"
          />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}
