import React from "react";
import { Question } from "@/lib/schemas/questionSchema";

export interface TrueFalseQuestionProps {
  question: Extract<Question, { type: "true_false" }>;
  value?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}

export function TrueFalseQuestion({
  question,
  value,
  onChange,
  disabled = false,
}: TrueFalseQuestionProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="font-medium text-gray-900">{question.prompt}</legend>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={question.id}
            checked={value === true}
            onChange={() => onChange?.(true)}
            className="h-4 w-4"
          />
          <span>Đúng</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={question.id}
            checked={value === false}
            onChange={() => onChange?.(false)}
            className="h-4 w-4"
          />
          <span>Sai</span>
        </label>
      </div>
    </fieldset>
  );
}
