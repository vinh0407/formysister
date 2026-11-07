import { z } from 'zod';
import type { QuestionDifficulty } from '@/types/study';

/**
 * Zod schemas discriminated by question type.
 * IMPORTANT: type literals MUST match Frontend enum exactly.
 * Standardized on 'multiple_choice' (not 'mcq').
 */
export const MultipleChoiceSchema = z.object({
  type: z.literal('multiple_choice'),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  answer: z.string().min(1),
  explanation: z.string().optional(),
});

export const TrueFalseSchema = z.object({
  type: z.literal('true_false'),
  question: z.string().min(1),
  answer: z.boolean(),
  explanation: z.string().optional(),
});

export const MultiSelectSchema = z.object({
  type: z.literal('multi_select'),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answers: z.array(z.string().min(1)).min(1),
  explanation: z.string().optional(),
});

export const EssaySchema = z.object({
  type: z.literal('essay'),
  question: z.string().min(1),
  rubric: z.array(z.string().min(1)).optional(),
  sampleAnswer: z.string().optional(),
});

export const QuestionSchema = z.discriminatedUnion('type', [
  MultipleChoiceSchema,
  TrueFalseSchema,
  MultiSelectSchema,
  EssaySchema,
]);

export type Question = z.infer<typeof QuestionSchema>;
export type QuestionType = 'multiple_choice' | 'true_false' | 'multi_select' | 'essay';

/**
 * Wrapper schema for LLM output. LLM must return { questions: [...] }.
 */
export const QuestionsArraySchema = z.object({
  questions: z.array(QuestionSchema).min(1),
});

export type QuestionsArray = z.infer<typeof QuestionsArraySchema>;

/**
 * Build a prompt for quiz generation from text content.
 * The LLM must return valid JSON matching QuestionsArraySchema.
 * Note: We use string concatenation instead of template literals to avoid
 * TypeScript parsing issues with multi-line strings containing Vietnamese text.
 *
 * @param content The source material/content to generate questions from
 * @param objectiveCount Number of multiple-choice questions to generate
 * @param essayCount Number of essay questions to generate
 * @param difficulty Question difficulty: 'easy', 'medium', or 'hard'
 * @param contentType Optional context: 'lesson' or 'existing-questions'
 * @returns A formatted prompt string for the LLM
 */
export function buildQuizPrompt(
  content: string,
  objectiveCount: number,
  essayCount: number,
  difficulty: QuestionDifficulty,
  contentType?: 'lesson' | 'existing-questions'
): string {
  // Build the base instruction part
  const baseLines: string[] = [];
  baseLines.push('Bạn là giáo viên giàu kinh nghiệm tại Việt Nam. Hãy tạo bài kiểm tra chính xác dựa trên nội dung bên dưới.');
  baseLines.push('QUAN TRỌC - Quy tắc bắt buộc:');
  baseLines.push('1. Trả về duy nhất JSON hợp lệ, không bao bao gồm markdown, code fences (```), hoặc texto nào khác ngoài chính JSON.');
  baseLines.push('2. Cấu trúc JSON phải là: {"title":"...","summary":"...","questions":[...]}.');
  baseLines.push('3. Mỗi câu trắc nghiệm (multiple-choice) phải có từ 2 đến 4 lựa chọn A, B, C, D và chính xác 1 đáp án đúng trùng 1 lựa chọn.');
  baseLines.push('4. Mỗi câu tự luận (essay) phải có đáp án tham khảo hoặc rubric chấm.');
  baseLines.push('5. Không bao giờ trả lời bên ngoài nội dung đã cho.');
  baseLines.push('6. Ngôn ngữ: Tiếng Việt.');

  // Build the objective questions part
  const objectiveLines: string[] = [];
  objectiveLines.push('Tạo đúng ' + objectiveCount + ' câu trắc nghiệm.');
  objectiveLines.push('Mỗi câu:');
  objectiveLines.push('- Câu hỏi tiếng Việt.');
  objectiveLines.push('- 4 lựa chọn: A, B, C, D (tất cả phải khác nhau).');
  objectiveLines.push('- 1 đáp án đúng trùng chính xác 1 trong 4 lựa chọn.');
  objectiveLines.push('- Giải thích ngắn gọn tại sao đáp án đúng.');

  // Build the essay questions part
  const essayLines: string[] = [];
  if (essayCount > 0) {
    essayLines.push('Tạo đúng ' + essayCount + ' câu tự luận.');
    essayLines.push('Mỗi câu:');
    essayLines.push('- Câu hỏi tiếng Việt.');
    essayLines.push('- Đáp án tham khảo (nội dung chiêu cần có).');
    essayLines.push('- Giải thích ý chính để chấm.');
  }

  // Combine all parts with NEWLINE PLACEHOLDERS
  // We use \n\n as separators and then replace a marker for the content
  const marker = '[[CONTENT]]';
  const fullPrompt =
    baseLines.join('\n') +
    '\n\n' +
    objectiveLines.join('\n') +
    (essayCount > 0 ? '\n\n' + essayLines.join('\n') : '') +
    '\n\n' + marker;

  // Replace the content marker with actual content
  return fullPrompt.replace(marker, content);
}

/**
 * Get the Zod schema for quiz question validation.
 * All question types share the same discriminated union; the LLM decides the type per item.
 * @returns The QuestionsArraySchema for validating LLM output
 */
export function getSchemaForKind() {
  // All kinds share the same discriminated union; the LLM decides type per item.
  return QuestionsArraySchema
}