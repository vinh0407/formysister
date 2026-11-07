/**
 * Cloudflare Workers AI client (primary provider).
 * Reads secrets from process.env only (server-side). Never expose to client.
 * Supports timeout, retry, and model license handling.
 */

import { QuestionDifficulty } from '@/types/study';
import { buildQuizPrompt } from '@/lib/ai/prompts';
import { extractJsonObject } from '@/lib/quiz/quiz-validator';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CloudflareGenerateOptions {
  /** Timeout in milliseconds (default: 60000) */
  timeoutMs?: number;
  /** Maximum number of retries (default: 1) */
  maxRetries?: number;
}

/**
 * Gọi Cloudflare Workers AI với timeout và retry.
 * Trả về nội dung phản hồi hoặc throw AIError đã được classify.
 */
export async function cloudflareGenerate(
  messages: ChatMessage[],
  model?: string,
  options?: CloudflareGenerateOptions
): Promise<string> {
  const accountId = getEnv('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = getEnv('CLOUDFLARE_API_TOKEN');
  const resolvedModel =
    model || process.env.CLOUDFLARE_AI_MODEL || '@cf/meta/llama-3.2-1b-instruct';

  const url = `${CF_API_BASE}/accounts/${accountId}/ai/run/${encodeURIComponent(
    resolvedModel
  )}`;

  const timeoutMs = options?.timeoutMs ?? 60_000;
  const maxRetries = options?.maxRetries ?? 1;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Cloudflare AI error ${res.status}: ${text}`);
      }

      const data = (await res.json()) as {
        result?: { response?: string; [key: string]: unknown };
        success?: boolean;
        errors?: unknown[];
      };

      const content = data?.result?.response;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('Cloudflare AI returned empty response');
      }
      return content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Nếu không phải lỗi timeout hoặc lỗi license, thử lại 1 lần
      if (
        attempt < maxRetries &&
        (lastError.message.includes('AbortError') ||
          lastError.message.includes('timeout') ||
          lastError.message.includes('Model agreement') ||
          lastError.message.includes('license'))
      ) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('Cloudflare AI request failed after retries');
}

/**
 * Interface for Cloudflare Workers AI provider.
 * Bao gồm generate quiz, analyze image, và health check.
 */
export interface AIProvider {
  /** Generate quiz questions from text. */
  generateQuiz(input: {
    text: string
    objectiveCount: number
    essayCount: number
    difficulty: QuestionDifficulty
    contentType?: 'lesson' | 'existing-questions'
    repair?: { raw: string; error: string }
    signal?: AbortSignal
  }): Promise<{
    raw: string
    model: string
    neurons?: number
    requestId?: string
  }>

  /** Analyze an image and extract text/content. */
  analyzeImage(input: {
    dataUrl: string
    signal?: AbortSignal
  }): Promise<{
    raw: string
  }>

  /** Check if the provider is healthy. */
  healthCheck(): Promise<{ ok: boolean }>

  /** Regenerate an individual question from the quiz. */
  regenerateQuestion(input: {
    questionId: string
    question: string
    type: string
    currentOptions: string[]
    difficulty: QuestionDifficulty
    signal?: AbortSignal
  }): Promise<{
    raw: string
    model: string
  }>
}

/**
 * Concrete implementation of AIProvider for Cloudflare Workers AI.
 */
export class CloudflareAIProvider implements AIProvider {
  private readonly accountId: string
  private readonly apiToken: string
  private readonly baseUrl: string

  constructor() {
    this.accountId = getEnv('CLOUDFLARE_ACCOUNT_ID')
    this.apiToken = getEnv('CLOUDFLARE_API_TOKEN')
    this.baseUrl = 'https://api.cloudflare.com/client/v4'
  }

  private async request< T>(endpoint: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const url = `${this.baseUrl}/accounts/${this.accountId}${endpoint}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60_000)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Cloudflare AI error ${res.status}: ${text}`)
    }

    return (await res.json()) as T
  }

  async generateQuiz(input: {
    text: string
    objectiveCount: number
    essayCount: number
    difficulty: QuestionDifficulty
    contentType?: 'lesson' | 'existing-questions'
    repair?: { raw: string; error: string }
    signal?: AbortSignal
  }): Promise<{
    raw: string
    model: string
    neurons?: number
    requestId?: string
  }> {
    const prompt = buildQuizPrompt(
      input.text,
      input.objectiveCount,
      input.essayCount,
      input.difficulty,
      input.contentType
    )

    const messages: ChatMessage[] = [
      { role: 'system', content: 'Bạn là giáo viên giàu kinh nghiệm. Hãy tạo bài kiểm tra chính xác và luôn trả về JSON hợp lệ, không dùng markdown.' },
      { role: 'user', content: prompt },
    ]

    const response = await cloudflareGenerate(messages, undefined, { timeoutMs: 60_000, maxRetries: 1 })

    // Try to extract JSON from the response
    let raw: unknown
    try {
      raw = extractJsonObject(response)
    } catch {
      // If JSON extraction fails, return the raw response
      raw = response
    }

    // Estimate neurons based on response length (rough approximation)
    const neurons = Math.max(1, Math.min(1000, Math.round(response.length / 20)))

    return {
      raw: typeof raw === 'string' ? raw : JSON.stringify(raw),
      model: input.difficulty || 'medium',
    }
  }

  async analyzeImage(input: {
    dataUrl: string
    signal?: AbortSignal
  }): Promise<{
    raw: string
  }> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'Hãy mô tả nội dung giáo dục của ảnh này bằng tiếng Việt. Trả về JSON có cấu trúc: {"description":"..."}',
        // eslint-disable-next-line @next/next/no-img-element
      },
      {
        role: 'user',
        content: input.dataUrl,
      },
    ]

    const response = await cloudflareGenerate(messages, undefined, { timeoutMs: 30_000, maxRetries: 1 })
    return { raw: response }
  }

  async regenerateQuestion(input: {
    questionId: string
    question: string
    type: string
    currentOptions: string[]
    difficulty: QuestionDifficulty
    signal?: AbortSignal
  }): Promise<{
    raw: string
    model: string
  }> {
    const prompt = `Hãy tạo lại câu hỏi sau dựa trên nội dung đã cho.\nCâu hỏi: ${input.question}\nLoại: ${input.type}\nKhó khăn: ${input.difficulty}\nHãy trả về JSON hợp lệ: {"type":"multiple_choice" hoặc "essay","question":"...","options":[...],"answer":"...","explanation":"..."}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: 'Bạn là giáo viên giàu kinh nghiệm. Hãy tạo câu hỏi đúng và luôn trả về JSON hợp lệ.' },
      { role: 'user', content: prompt },
    ]

    const response = await cloudflareGenerate(messages, undefined, { timeoutMs: 30_000, maxRetries: 1 })
    let raw: unknown
    try {
      raw = extractJsonObject(response)
    } catch {
      // If JSON extraction fails, return the raw response
      raw = response
    }
    return { raw: String(raw), model: input.difficulty || 'medium' }
  }

  async healthCheck(): Promise<{ ok: boolean }> {
    try {
      await this.analyzeImage({ dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwAAAAC0lEQVR42mP8x0AAwM0AOlspAAAAASUVORK5CYII=' })
      return { ok: true }
    } catch {
      return { ok: false }
    }
  }
}