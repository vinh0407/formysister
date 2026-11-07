import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIProvider } from '@/lib/ai/ai-provider';
import { parseQuizResponse, QuestionsArraySchema, type QuestionDifficulty } from '@/lib/ai/prompts';
import { parseQuestions } from '@/lib/ai/parseQuestions';

const RequestSchema = z.object({
  content: z.string().min(1, 'content is required'),
  count: z.number().int().min(1).max(50).default(5),
  kind: z.enum(['multiple_choice', 'true_false', 'multi_select', 'essay', 'mixed']).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { content, count, kind } = parsed.data;

  // Use Cloudflare Workers AI as the primary provider (free tier)
  const provider = getAIProvider('cloudflare');

  try {
    // Generate quiz questions using the Cloudflare provider
    const generation = await provider.generateQuiz({
      text: content,
      objectiveCount: count,
      essayCount: 0,
      difficulty: 'medium' as QuestionDifficulty,
      contentType: 'lesson',
    });

    // Parse the AI response using parseQuestions
    const questions = parseQuestions(generation.raw);
    if (questions.length === 0) {
      // Try with parseQuizResponse as fallback
      return NextResponse.json(
        { error: 'Không thể phân tích câu hỏi từ phản hồi AI. Vui lòng thử lại.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ questions }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: 'Generation failed', details: msg }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/materials/extract' });
}