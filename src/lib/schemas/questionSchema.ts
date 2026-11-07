import { z } from "zod";

export const QuestionTypeSchema = z.enum([
  "multiple_choice",
  "true_false",
  "multi_select",
  "essay",
]);

export const BaseQuestionSchema = z.object({
  id: z.string().min(1),
  type: QuestionTypeSchema,
  prompt: z.string().min(1),
  explanation: z.string().optional(),
});

export const MultipleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("multiple_choice"),
  options: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().int().min(0),
});

export const TrueFalseQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("true_false"),
  correct: z.boolean(),
});

export const MultiSelectQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("multi_select"),
  options: z.array(z.string()).min(2).max(6),
  correctIndices: z.array(z.number().int().min(0)).min(1),
});

export const EssayQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("essay"),
  placeholder: z.string().optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
});

export const QuestionSchema = z.discriminatedUnion("type", [
  MultipleChoiceQuestionSchema,
  TrueFalseQuestionSchema,
  MultiSelectQuestionSchema,
  EssayQuestionSchema,
]);

export type Question = z.infer<typeof QuestionSchema>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
