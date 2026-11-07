"use client";

import { useState, useCallback, KeyboardEvent } from "react";

export type TrueFalseValue = "true" | "false";

export interface TrueFalseQuestionProps {
  id: string;
  prompt: string;
  explanation?: string;
  correct?: boolean;
  disabled?: boolean;
  onAnswer?: (id: string, value: TrueFalseValue) => void;
  className?: string;
}

const OPTIONS: { value: TrueFalseValue; label: string }[] = [
  { value: "true", label: "Đúng" },
  { value: "false", label: "Sai" },
];

export default function TrueFalseQuestion({
  id,
  prompt,
  explanation,
  correct,
  disabled = false,
  onAnswer,
  className = "",
}: TrueFalseQuestionProps) {
  const [selected, setSelected] = useState<TrueFalseValue | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = useCallback(
    (value: TrueFalseValue) => {
      if (disabled || submitted) return;
      setSelected(value);
      onAnswer?.(id, value);
      setSubmitted(true);
    },
    [disabled, submitted, id, onAnswer]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, value: TrueFalseValue) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(value);
      }
    },
    [handleSelect]
  );

  const isCorrect = submitted && selected !== null && correct !== undefined && selected === (correct ? "true" : "false");

  return (
    <fieldset
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}
      aria-labelledby={`${id}-prompt`}
    >
      <legend id={`${id}-prompt`} className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
        {prompt}
      </legend>

      <div role="radiogroup" aria-label="Chọn Đúng hoặc Sai" className="flex gap-3">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          const showResult = submitted && correct !== undefined;
          const isRight = showResult && opt.value === (correct ? "true" : "false");

          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={opt.label}
              tabIndex={0}
              disabled={disabled || submitted}
              onClick={() => handleSelect(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, opt.value)}
              className={[
                "flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                disabled || submitted ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                isSelected
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-200"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500",
                showResult && isRight
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-200"
                  : "",
                showResult && isSelected && !isRight
                  ? "border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-400 dark:bg-rose-950 dark:text-rose-200"
                  : "",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {submitted && explanation && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-4 text-sm ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
        >
          {explanation}
        </p>
      )}
    </fieldset>
  );
}
