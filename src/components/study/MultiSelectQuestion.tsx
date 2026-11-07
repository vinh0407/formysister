"use client";

import { useState, useCallback, KeyboardEvent } from "react";

export interface MultiSelectOption {
  id: string;
  label: string;
}

export interface MultiSelectQuestionProps {
  id: string;
  prompt: string;
  options: MultiSelectOption[];
  correctIds?: string[];
  explanation?: string;
  disabled?: boolean;
  onAnswer?: (id: string, selectedIds: string[]) => void;
  className?: string;
}

export default function MultiSelectQuestion({
  id,
  prompt,
  options,
  correctIds = [],
  explanation,
  disabled = false,
  onAnswer,
  className = "",
}: MultiSelectQuestionProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggle = useCallback((optionId: string) => {
    if (disabled || submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  }, [disabled, submitted]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, optionId: string) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle(optionId);
      }
    },
    [toggle]
  );

  const handleSubmit = useCallback(() => {
    if (disabled || submitted) return;
    const arr = Array.from(selected);
    onAnswer?.(id, arr);
    setSubmitted(true);
  }, [disabled, submitted, id, selected, onAnswer]);

  const allCorrect =
    submitted &&
    correctIds.length > 0 &&
    selected.size === correctIds.length &&
    correctIds.every((c) => selected.has(c));

  return (
    <fieldset
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}
      aria-labelledby={`${id}-prompt`}
    >
      <legend id={`${id}-prompt`} className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
        {prompt}
      </legend>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Chọn tất cả đáp án đúng (có thể chọn nhiều).
      </p>

      <ul role="group" aria-label="Danh sách đáp án" className="space-y-2">
        {options.map((opt) => {
          const isChecked = selected.has(opt.id);
          const isCorrectOpt = correctIds.includes(opt.id);
          const showResult = submitted && correctIds.length > 0;

          return (
            <li key={opt.id}>
              <label
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                  "focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2",
                  disabled || submitted ? "cursor-not-allowed opacity-60" : "",
                  isChecked
                    ? "border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950"
                    : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500",
                  showResult && isCorrectOpt
                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950"
                    : "",
                  showResult && isChecked && !isCorrectOpt
                    ? "border-rose-500 bg-rose-50 dark:border-rose-400 dark:bg-rose-950"
                    : "",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={disabled || submitted}
                  onChange={() => toggle(opt.id)}
                  onKeyDown={(e) => handleKeyDown(e, opt.id)}
                  aria-label={opt.label}
                  aria-checked={isChecked}
                  tabIndex={0}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                />
                <span className="text-sm text-slate-800 dark:text-slate-100">{opt.label}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || submitted || selected.size === 0}
          aria-label="Nộp đáp án"
          className={[
            "rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors",
            "hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
            disabled || submitted || selected.size === 0 ? "cursor-not-allowed opacity-50" : "",
          ].join(" ")}
        >
          {submitted ? "Đã nộp" : "Nộp đáp án"}
        </button>

        {submitted && explanation && (
          <p
            role="status"
            aria-live="polite"
            className={`text-sm ${allCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {explanation}
          </p>
        )}
      </div>
    </fieldset>
  );
}
