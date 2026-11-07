import { describe, it, expect } from 'vitest';
import {
  QuestionSchema,
  QuestionsArraySchema,
  buildPrompt,
  type Question,
} from '../prompts';

describe('prompts schema', () => {
  it('accepts multiple_choice (standardized literal)', () => {
    const q = {
      type: 'multiple_choice',
      question: 'What is 2+2?',
      options: ['3', '4', '5', '6'],
      answer: '4',
    };
    expect(QuestionSchema.parse(q).type).toBe('multiple_choice');
  });

  it('rejects legacy "mcq" literal', () => {
    const q = { type: 'mcq', question: 'x', options: ['a', 'b', 'c', 'd'], answer: 'a' };
    expect(() => QuestionSchema.parse(q)).toThrow();
  });

  it('validates essay type', () => {
    const q = { type: 'essay', question: 'Explain X', rubric: ['clarity'] };
    expect(QuestionSchema.parse(q).type).toBe('essay');
  });

  it('validates QuestionsArraySchema wrapper', () => {
    const out = { questions: [{ type: 'true_false', question: 'q', answer: true }] };
    const res = QuestionsArraySchema.parse(out);
    expect(res.questions).toHaveLength(1);
  });

  it('buildPrompt injects content and count', () => {
    const p = buildPrompt('multiple_choice', 'HELLO', 3);
    expect(p).toContain('HELLO');
    expect(p).toContain('3');
  });
});
