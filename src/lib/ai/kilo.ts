import { AIError } from '@/lib/ai/ai-errors'
import {
  buildImagePrompt,
  buildQuizRepairPrompt,
  buildQuizSystemPrompt,
  buildQuizUserPrompt,
  buildRegenerateQuestionPrompt,
} from '@/lib/ai/prompts'
import type { AIUsageStatus } from '@/types/study'
import type {
  AIProvider,
  AnalyzeImageInput,
  AnalyzeTextInput,
  HealthCheckOutput,
  QuizGenerationInput,
  QuizGenerationOutput,
  RegenerateQuestionInput,
} from '@/lib/ai/cloudflare'

const DEFAULT_KILO_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbnYiOiJwcm9kdWN0aW9uIiwia2lsb1VzZXJJZCI6ImRiYWNlOTk1LTY2OTctNDNlNi05NWYxLTRmYzg0ZjJmODA4MSIsImFwaVRva2VuUGVwcGVyIjpudWxsLCJ2ZXJzaW9uIjozLCJpYXQiOjE3OTM1NzY4NTksImV4cCI6MTk1MTI1Njg1OX0.90NYri-Hytt8PpcX3utxyx77qNgWvDQs7tn3N8UymKc'

export function kiloApiKey(): string {
  return process.env.KILO_API_KEY || DEFAULT_KILO_KEY
}

export function kiloBaseUrl(): string {
  return process.env.KILO_BASE_URL || 'https://ai-gateway.kilo.ai/api/v1'
}

export const FAST_FREE_MODELS = [
  'kilo-auto/free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
] as const

export function kiloTextModel(): string {
  return process.env.KILO_TEXT_MODEL || 'kilo-auto/free'
}

export function kiloVisionModel(): string {
  return process.env.KILO_VISION_MODEL || 'nvidia/nemotron-3.5-super-vl:free'
}

export function isKiloConfigured(): boolean {
  return Boolean(kiloApiKey())
}

export class KiloAIProvider implements AIProvider {
  readonly name = 'cloudflare-workers-ai' as const
  private customModel?: string

  constructor(model?: string) {
    this.customModel = model
  }

  private getActiveModel(): string {
    return this.customModel || kiloTextModel()
  }

  private async chat(options: {
    model: string
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: unknown }>
    jsonFormat?: boolean
    maxTokens?: number
    temperature?: number
    signal?: AbortSignal
  }): Promise<string> {
    const key = kiloApiKey()
    if (!key) {
      throw new AIError('Chưa cấu hình Kilo API Token.', { code: 'NOT_CONFIGURED', status: 503 })
    }

    const endpoint = `${kiloBaseUrl().replace(/\/+$/, '')}/chat/completions`

    const body: Record<string, unknown> = {
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
    }

    if (options.jsonFormat) {
      body.response_format = { type: 'json_object' }
    }
    if (options.maxTokens) {
      body.max_tokens = options.maxTokens
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 90_000)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: options.signal
          ? AbortSignal.any([options.signal, controller.signal])
          : controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new AIError(`Lỗi Kilo AI (${response.status}): ${errorText.slice(0, 300)}`, {
          code: 'UPSTREAM',
          status: response.status,
        })
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const text = data.choices?.[0]?.message?.content?.trim()
      if (!text) {
        throw new AIError('Kilo AI trả về phản hồi rỗng.', { code: 'INVALID_RESPONSE', status: 502 })
      }
      return text
    } catch (err: unknown) {
      if (err instanceof AIError) throw err
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        throw new AIError('Kilo AI phản hồi quá thời gian quy định. Vui lòng thử lại.', {
          code: 'TIMEOUT',
          status: 504,
        })
      }
      throw new AIError(
        err instanceof Error ? err.message : 'Không thể kết nối đến Kilo AI Gateway.',
        { code: 'UPSTREAM', status: 502 },
      )
    } finally {
      clearTimeout(timer)
    }
  }

  async generateQuiz(input: QuizGenerationInput): Promise<QuizGenerationOutput> {
    const userPrompt = input.repair
      ? buildQuizRepairPrompt({
          raw: input.repair.raw,
          error: input.repair.error,
          objectiveCount: input.objectiveCount,
          essayCount: input.essayCount,
          contentType: input.contentType,
        })
      : buildQuizUserPrompt({
          text: input.text,
          objectiveCount: input.objectiveCount,
          essayCount: input.essayCount,
          difficulty: input.difficulty,
          contentType: input.contentType,
        })

    const model = this.getActiveModel()
    const raw = await this.chat({
      model,
      messages: [
        { role: 'system', content: buildQuizSystemPrompt() },
        { role: 'user', content: userPrompt },
      ],
      jsonFormat: true,
      maxTokens: input.contentType === 'existing-questions' ? 14000 : 10000,
      temperature: 0.2,
      signal: input.signal,
    })

    return { raw, model }
  }

  async regenerateQuestion(input: RegenerateQuestionInput): Promise<QuizGenerationOutput> {
    const model = this.getActiveModel()
    const raw = await this.chat({
      model,
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
      jsonFormat: true,
      maxTokens: 3000,
      temperature: 0.3,
      signal: input.signal,
    })

    return { raw, model }
  }

  async analyzeImage(input: AnalyzeImageInput): Promise<QuizGenerationOutput> {
    const raw = await this.chat({
      model: kiloVisionModel(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildImagePrompt() },
            { type: 'image_url', image_url: { url: input.dataUrl } },
          ],
        },
      ],
      maxTokens: 4000,
      temperature: 0.1,
      signal: input.signal,
    })

    return { raw, model: kiloVisionModel() }
  }

  async analyzeText(input: AnalyzeTextInput): Promise<QuizGenerationOutput> {
    const model = this.getActiveModel()
    const raw = await this.chat({
      model,
      messages: [
        { role: 'system', content: input.prompt },
        { role: 'user', content: input.text },
      ],
      maxTokens: 4000,
      temperature: 0.2,
      signal: input.signal,
    })

    return { raw, model }
  }

  async healthCheck(): Promise<HealthCheckOutput> {
    const model = this.getActiveModel()
    try {
      const response = await this.chat({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 10,
      })
      return {
        ok: Boolean(response),
        configured: isKiloConfigured(),
        provider: 'cloudflare-workers-ai',
        message: 'Kilo AI (NVIDIA Nemotron free) hoạt động bình thường.',
        usage: await this.getUsageStatus(),
      }
    } catch (err: unknown) {
      return {
        ok: false,
        configured: isKiloConfigured(),
        provider: 'cloudflare-workers-ai',
        message: err instanceof Error ? err.message : 'Kilo AI Gateway không phản hồi.',
        usage: await this.getUsageStatus(),
      }
    }
  }

  async getUsageStatus(): Promise<AIUsageStatus> {
    return {
      configured: isKiloConfigured(),
      day: new Date().toISOString().slice(0, 10),
      neuronsUsed: 0,
      neuronBudget: 100_000,
      remaining: 100_000,
      budgetExhausted: false,
      textModel: kiloTextModel(),
      visionModel: kiloVisionModel(),
    }
  }
}
