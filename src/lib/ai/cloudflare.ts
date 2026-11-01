import { randomUUID } from 'node:crypto'

import {
  AIError,
  classifyCloudflareError,
  isAbortError,
} from '@/lib/ai/ai-errors'
import {
  assertNeuronBudget,
  getAIUsageStatus,
  isAIConfigured,
  recordAIUsage,
  textModel,
  visionModel,
} from '@/lib/ai/ai-usage'
import {
  buildImagePrompt,
  buildQuizRepairPrompt,
  buildQuizSystemPrompt,
  buildQuizUserPrompt,
  buildRegenerateQuestionPrompt,
} from '@/lib/ai/prompts'
import type { AIUsageStatus, QuestionDifficulty, QuestionType } from '@/types/study'

export type QuizGenerationInput = {
  text: string
  objectiveCount: number
  essayCount: number
  difficulty?: QuestionDifficulty
  repair?: { raw: string; error: string }
  signal?: AbortSignal
}

export type QuizGenerationOutput = {
  raw: string
  model: string
}

export type AnalyzeImageInput = {
  dataUrl: string
  signal?: AbortSignal
}

export type AnalyzeTextInput = {
  text: string
  prompt: string
  signal?: AbortSignal
}

export type RegenerateQuestionInput = {
  text: string
  type: QuestionType
  previousQuestion: string
  difficulty: QuestionDifficulty
  signal?: AbortSignal
}

export type HealthCheckOutput = {
  ok: boolean
  configured: boolean
  provider: 'cloudflare-workers-ai'
  message: string
  modelCount?: number
  usage: AIUsageStatus
}

export interface AIProvider {
  readonly name: 'cloudflare-workers-ai'
  generateQuiz(input: QuizGenerationInput): Promise<QuizGenerationOutput>
  regenerateQuestion(input: RegenerateQuestionInput): Promise<QuizGenerationOutput>
  analyzeImage(input: AnalyzeImageInput): Promise<QuizGenerationOutput>
  analyzeText(input: AnalyzeTextInput): Promise<QuizGenerationOutput>
  healthCheck(): Promise<HealthCheckOutput>
  getUsageStatus(): Promise<AIUsageStatus>
}

type ChatPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

type ChatMessage = {
  role: 'system' | 'user'
  content: string | ChatPart[]
}

type ChatOptions = {
  model: string
  messages: ChatMessage[]
  maxTokens: number
  temperature: number
  signal?: AbortSignal
  purpose: string
}

function timeoutMs(): number {
  const parsed = Number(process.env.AI_TIMEOUT_MS)
  if (!Number.isFinite(parsed) || parsed <= 0) return 60_000
  return Math.min(Math.max(Math.floor(parsed), 5_000), 120_000)
}

function maxRetries(): number {
  const parsed = Number(process.env.AI_MAX_RETRIES)
  if (!Number.isFinite(parsed) || parsed < 0) return 1
  return Math.min(Math.floor(parsed), 1)
}

/**
 * Qwen3 models reason by default, which burns the whole output budget on
 * hidden reasoning: a 10-question quiz took ~95s and often returned an empty
 * `content` field. Cloudflare accepts `chat_template_kwargs` for these models;
 * disabling thinking cuts the request to a few seconds and keeps the JSON
 * output intact.
 */
function supportsThinkingToggle(model: string): boolean {
  return /qwen3/i.test(model)
}

function contentText(content: unknown): string {
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text
          return typeof text === 'string' ? text : ''
        }
        return ''
      })
      .join('\n')
      .trim()
  }
  return ''
}

export class CloudflareAIProvider implements AIProvider {
  readonly name = 'cloudflare-workers-ai' as const

  private config() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiToken = process.env.CLOUDFLARE_API_TOKEN
    if (!accountId || !apiToken) {
      throw new AIError('Cloudflare Workers AI chưa được cấu hình trên máy chủ.', {
        code: 'NOT_CONFIGURED',
        status: 503,
      })
    }
    return { accountId, apiToken }
  }

  private endpoint(): string {
    const { accountId } = this.config()
    return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`
  }

  private async chat(options: ChatOptions): Promise<QuizGenerationOutput> {
    const { apiToken } = this.config()
    await assertNeuronBudget()

    let lastError: unknown
    for (let attempt = 0; attempt <= maxRetries(); attempt += 1) {
      if (options.signal?.aborted) {
        throw new AIError('Yêu cầu đã bị huỷ.', { code: 'CANCELLED', status: 499 })
      }

      const controller = new AbortController()
      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, timeoutMs())
      const onAbort = () => controller.abort()
      options.signal?.addEventListener('abort', onAbort, { once: true })

      try {
        const response = await fetch(this.endpoint(), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages,
            max_tokens: options.maxTokens,
            temperature: options.temperature,
            ...(supportsThinkingToggle(options.model)
              ? { chat_template_kwargs: { enable_thinking: false } }
              : {}),
          }),
          signal: controller.signal,
          cache: 'no-store',
        })

        const rawBody = await response.text()
        if (!response.ok) {
          throw classifyCloudflareError(response.status, rawBody)
        }

        let parsed: unknown
        try {
          parsed = JSON.parse(rawBody)
        } catch {
          throw new AIError('AI trả về dữ liệu không phải JSON hợp lệ.', {
            code: 'INVALID_RESPONSE',
            status: 502,
            details: rawBody.slice(0, 500),
          })
        }

        const data = parsed as {
          choices?: Array<{ message?: { content?: unknown; reasoning?: unknown } }>
          usage?: { neurons?: number }
          result?: { usage?: { neurons?: number } }
        }
        const content = contentText(data.choices?.[0]?.message?.content)
        const neurons = Number(data.usage?.neurons ?? data.result?.usage?.neurons ?? 0)
        await recordAIUsage({ model: options.model, neurons, requestId: randomUUID() })

        if (!content) {
          const reason = data.choices?.[0]?.message?.reasoning
          throw new AIError(
            'AI không trả về nội dung hoàn chỉnh (có thể đã hết token đầu ra). Vui lòng thử lại.',
            {
              code: 'INVALID_RESPONSE',
              status: 502,
              details:
                typeof reason === 'string'
                  ? `Model chỉ trả về reasoning (${reason.length} ký tự).`
                  : 'Nội dung rỗng.',
            },
          )
        }

        return { raw: content, model: options.model }
      } catch (error) {
        lastError = error
        if (error instanceof AIError && !error.retryable) throw error
        if (options.signal?.aborted) {
          throw new AIError('Yêu cầu đã bị huỷ.', { code: 'CANCELLED', status: 499 })
        }
        if (timedOut || isAbortError(error)) {
          lastError = new AIError(
            `AI phản hồi quá chậm (quá ${Math.round(timeoutMs() / 1000)} giây). Vui lòng thử lại.`,
            {
              code: 'TIMEOUT',
              status: 504,
              retryable: true,
            },
          )
        } else if (!(error instanceof AIError)) {
          lastError = new AIError('Không kết nối được dịch vụ AI. Vui lòng kiểm tra mạng và thử lại.', {
            code: 'UPSTREAM',
            status: 502,
            retryable: true,
            details: error instanceof Error ? error.message : String(error),
          })
        }

        if (attempt < maxRetries()) {
          await new Promise((resolve) => setTimeout(resolve, 600))
          continue
        }
        throw lastError
      } finally {
        clearTimeout(timer)
        options.signal?.removeEventListener('abort', onAbort)
      }
    }

    throw lastError instanceof AIError
      ? lastError
      : new AIError('Không thể gọi dịch vụ AI.', { code: 'UPSTREAM', status: 502 })
  }

  async generateQuiz(input: QuizGenerationInput): Promise<QuizGenerationOutput> {
    const messages: ChatMessage[] = [
      { role: 'system', content: buildQuizSystemPrompt() },
      {
        role: 'user',
        content: input.repair
          ? buildQuizRepairPrompt({
              raw: input.repair.raw,
              error: input.repair.error,
              objectiveCount: input.objectiveCount,
              essayCount: input.essayCount,
            })
          : buildQuizUserPrompt({
              text: input.text,
              objectiveCount: input.objectiveCount,
              essayCount: input.essayCount,
              difficulty: input.difficulty,
            }),
      },
    ]

    const maxTokens = Math.min(
      6000,
      Math.max(3200, input.objectiveCount * 230 + input.essayCount * 480 + 900),
    )

    return this.chat({
      model: textModel(),
      messages,
      maxTokens,
      temperature: 0.2,
      signal: input.signal,
      purpose: 'generate-quiz',
    })
  }

  async regenerateQuestion(input: RegenerateQuestionInput): Promise<QuizGenerationOutput> {
    return this.chat({
      model: textModel(),
      messages: [
        { role: 'system', content: buildQuizSystemPrompt() },
        {
          role: 'user',
          content: buildRegenerateQuestionPrompt({
            text: input.text,
            type: input.type,
            previousQuestion: input.previousQuestion,
            difficulty: input.difficulty,
          }),
        },
      ],
      maxTokens: input.type === 'essay' ? 3600 : 3200,
      temperature: 0.35,
      signal: input.signal,
      purpose: 'regenerate-question',
    })
  }

  async analyzeImage(input: AnalyzeImageInput): Promise<QuizGenerationOutput> {
    return this.chat({
      model: visionModel(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildImagePrompt() },
            { type: 'image_url', image_url: { url: input.dataUrl } },
          ],
        },
      ],
      maxTokens: 3000,
      temperature: 0.1,
      signal: input.signal,
      purpose: 'analyze-image',
    })
  }

  async analyzeText(input: AnalyzeTextInput): Promise<QuizGenerationOutput> {
    return this.chat({
      model: textModel(),
      messages: [
        { role: 'system', content: buildQuizSystemPrompt() },
        { role: 'user', content: `${input.prompt}\n\n${input.text.slice(0, 16_000)}` },
      ],
      maxTokens: 3200,
      temperature: 0.1,
      signal: input.signal,
      purpose: 'analyze-text',
    })
  }

  async healthCheck(): Promise<HealthCheckOutput> {
    const usage = await getAIUsageStatus()
    if (!isAIConfigured()) {
      return {
        ok: false,
        configured: false,
        provider: this.name,
        message: 'Chưa cấu hình CLOUDFLARE_ACCOUNT_ID và CLOUDFLARE_API_TOKEN.',
        usage,
      }
    }

    const { accountId, apiToken } = this.config()
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?per_page=1`,
        {
          headers: { Authorization: `Bearer ${apiToken}` },
          signal: AbortSignal.timeout(15_000),
          cache: 'no-store',
        },
      )
      if (!response.ok) {
        return {
          ok: false,
          configured: true,
          provider: this.name,
          message: `Cloudflare trả về HTTP ${response.status}. Kiểm tra quyền Workers AI của token.`,
          usage,
        }
      }
      const data = (await response.json()) as { result?: unknown[] }
      return {
        ok: true,
        configured: true,
        provider: this.name,
        message: 'Cloudflare Workers AI sẵn sàng.',
        modelCount: Array.isArray(data.result) ? data.result.length : undefined,
        usage,
      }
    } catch (error) {
      return {
        ok: false,
        configured: true,
        provider: this.name,
        message:
          error instanceof Error
            ? `Không kiểm tra được Workers AI: ${error.message}`
            : 'Không kiểm tra được Workers AI.',
        usage,
      }
    }
  }

  getUsageStatus(): Promise<AIUsageStatus> {
    return getAIUsageStatus()
  }
}

let provider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (!provider) provider = new CloudflareAIProvider()
  return provider
}
