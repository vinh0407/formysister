import { z } from "zod";

import type { Question } from "@/lib/schemas/questionSchema";

import { QuestionSchema } from "@/lib/schemas/questionSchema";

/**
 * Schema for parsing an array of questions from LLM output.
 * The LLM must return JSON matching: { questions: [...] }
 */
export const QuestionsArraySchema = z.object({
  questions: z.array(QuestionSchema).min(1),
});

/**
 * Parse raw AI response string into an array of Question objects.
 * Strips code fences, validates JSON structure, extracts questions.
 * @param raw Raw string from AI, may contain code fences
 * @returns Array of Question objects, or empty array if parsing fails
 */
export function parseQuestions(raw: string): Question[] {
  // Loại bỏ code fence nếu có
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = QuestionsArraySchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) return [];

  // Type-safe mapping
  const questions: Question[] = (parsed.data.questions as any[]).map(
    (question): Question => ({
      id: question.id,
      type: question.type,
      question: question.prompt,
      options: question.options ?? [],
      answer:
        question.correctIndex !== undefined
          ? question.options?.[question.correctIndex]
          : question.answer,
      explanation: question.explanation,
    })
  );
  return questions;
}