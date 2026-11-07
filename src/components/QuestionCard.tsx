'use client';

import React from 'react';
import type { Question } from '@/lib/ai/prompts';

export interface QuestionCardProps {
  question: Question;
  index?: number;
  showAnswer?: boolean;
}

export function QuestionCard({ question, index, showAnswer = false }: QuestionCardProps) {
  const label = typeof index === 'number' ? `Q${index + 1}.` : '';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-500">{label}</span>
        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          {question.type}
        </span>
      </div>

      <p className="mb-3 text-base font-medium text-gray-900">{question.question}</p>

      {question.type === 'multiple_choice' && (
        <ul className="space-y-1">
          {question.options.map((opt, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-500">{String.fromCharCode(65 + i)}.</span>
              <span>{opt}</span>
              {showAnswer && opt === question.answer && (
                <span className="ml-auto text-xs font-semibold text-green-600">✓ Correct</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {question.type === 'true_false' && (
        <div className="flex gap-4">
          <span className={showAnswer && question.answer === true ? 'font-bold text-green-600' : ''}>True</span>
          <span className={showAnswer && question.answer === false ? 'font-bold text-green-600' : ''}>False</span>
        </div>
      )}

      {question.type === 'multi_select' && (
        <ul className="space-y-1">
          {question.options.map((opt, i) => (
            <li key={i} className="flex items-center gap-2">
              <input type="checkbox" readOnly checked={showAnswer && question.answers.includes(opt)} />
              <span>{opt}</span>
            </li>
          ))}
        </ul>
      )}

      {question.type === 'essay' && (
        <div className="space-y-2">
          {question.rubric && question.rubric.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700">Rubric:</p>
              <ul className="list-disc pl-5 text-sm text-gray-600">
                {question.rubric.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {showAnswer && question.sampleAnswer && (
            <div className="rounded bg-gray-50 p-2 text-sm text-gray-700">
              <span className="font-semibold">Sample answer: </span>
              {question.sampleAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QuestionCard;
