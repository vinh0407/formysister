import TrueFalseQuestion from "./TrueFalseQuestion";
import MultiSelectQuestion from "./MultiSelectQuestion";

export type QuestionType = "true_false" | "multi_select";

export interface QuestionCardQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: { id: string; label: string }[];
  correct?: boolean;
  correctIds?: string[];
  explanation?: string;
}

export interface QuestionCardProps {
  question: QuestionCardQuestion;
  disabled?: boolean;
  onAnswer?: (id: string, answer: unknown) => void;
  className?: string;
}

/**
 * Server Component: KHÔNG chứa event handlers.
 * Chỉ nhận prop `type` và render client component tương ứng.
 */
export default function QuestionCard({ question, disabled, onAnswer, className }: QuestionCardProps) {
  const { id, type, prompt, options, correct, correctIds, explanation } = question;

  if (type === "true_false") {
    return (
      <TrueFalseQuestion
        id={id}
        prompt={prompt}
        correct={correct}
        explanation={explanation}
        disabled={disabled}
        onAnswer={onAnswer as (id: string, value: "true" | "false") => void}
        className={className}
      />
    );
  }

  if (type === "multi_select") {
    return (
      <MultiSelectQuestion
        id={id}
        prompt={prompt}
        options={options ?? []}
        correctIds={correctIds}
        explanation={explanation}
        disabled={disabled}
        onAnswer={onAnswer as (id: string, selectedIds: string[]) => void}
        className={className}
      />
    );
  }

  return (
    <div
      role="alert"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
    >
      Loại câu hỏi không được hỗ trợ: {type}
    </div>
  );
}
