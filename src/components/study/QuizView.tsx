"use client";

import { useState, useCallback } from "react";
import QuestionCard, { QuestionCardQuestion } from "./QuestionCard";

export interface QuizViewProps {
  questions: QuestionCardQuestion[];
  className?: string;
}

export default function QuizView({ questions, className = "" }: QuizViewProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [finished, setFinished] = useState(false);

  const current = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;

  const handleAnswer = useCallback((id: string, answer: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: answer }));
  }, []);

  const goNext = useCallback(() => {
    if (isLast) setFinished(true);
    else setIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, total]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const restart = useCallback(() => {
    setAnswers({});
    setIndex(0);
    setFinished(false);
  }, []);

  if (total === 0) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
      >
        Chưa có câu hỏi nào.
      </div>
    );
  }

  if (finished) {
    const score = Object.keys(answers).length;
    return (
      <section
        aria-labelledby="quiz-result"
        className={`rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}
      >
        <h2 id="quiz-result" className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
          Hoàn thành bài quiz
        </h2>
        <p className="mb-6 text-slate-600 dark:text-slate-300">
          Bạn đã trả lời {score}/{total} câu.
        </p>
        <button
          type="button"
          onClick={restart}
          aria-label="Làm lại bài quiz"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Làm lại
        </button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="quiz-progress"
      className={`space-y-6 ${className}`}
    >
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
        <span id="quiz-progress">
          Câu {index + 1} / {total}
        </span>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
            role="progressbar"
            aria-valuenow={index + 1}
            aria-valuemin={1}
            aria-valuemax={total}
          />
        </div>
      </div>

      <QuestionCard
        question={current}
        disabled={false}
        onAnswer={handleAnswer}
      />

      <div className="flex justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Câu trước"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          ← Trước
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label={isLast ? "Hoàn thành" : "Câu tiếp theo"}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          {isLast ? "Hoàn thành" : "Tiếp →"}
        </button>
      </div>
    </section>
  );
}
