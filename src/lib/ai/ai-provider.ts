import { CloudflareAIProvider, type AIProvider } from './cloudflare'
import { KiloAIProvider, isKiloConfigured } from './kilo'
import { isAIConfigured as isCloudflareConfigured } from './ai-usage'

export type {
  AIProvider,
  AnalyzeImageInput,
  AnalyzeTextInput,
  HealthCheckOutput,
  QuizGenerationInput,
  QuizGenerationOutput,
  RegenerateQuestionInput,
} from './cloudflare'

export { CloudflareAIProvider } from './cloudflare'
export { KiloAIProvider } from './kilo'
export { AIError, type AIErrorCode } from './ai-errors'

let cloudflareInstance: AIProvider | null = null
let kiloInstance: AIProvider | null = null

export function getAIProvider(preferred?: 'kilo' | 'cloudflare' | string): AIProvider {
  if (preferred === 'cloudflare') {
    if (!cloudflareInstance) cloudflareInstance = new CloudflareAIProvider()
    return cloudflareInstance
  }

  if (preferred === 'kilo') {
    if (!kiloInstance) kiloInstance = new KiloAIProvider()
    return kiloInstance
  }

  // Ưu tiên Kilo (NVIDIA Nemotron siêu nhanh & free) nếu có cấu hình
  if (isKiloConfigured()) {
    if (!kiloInstance) kiloInstance = new KiloAIProvider()
    return kiloInstance
  }

  if (!cloudflareInstance) cloudflareInstance = new CloudflareAIProvider()
  return cloudflareInstance
}
