import { CloudflareAIProvider, type AIProvider } from './cloudflare'
import { isAIConfigured as isCloudflareConfigured } from './ai-usage'

export type {
  AIProvider,
} from './cloudflare'

export { CloudflareAIProvider } from './cloudflare'
export { AIError, type AIErrorCode } from './ai-errors'

let cloudflareInstance: AIProvider | null = null

export function getAIProvider(preferred?: 'kilo' | 'cloudflare' | string): AIProvider {
  // Cloudflare Workers AI là provider MẪU THEO DÕI (free tier).
  // Kilo chỉ được phép fallback nếu Cloudflare hết quota.
  if (preferred === 'cloudflare') {
    if (!cloudflareInstance) cloudflareInstance = new CloudflareAIProvider()
    return cloudflareInstance
  }

  // Kilo không còn là provider mặc định.
  // Nếu người dùng yêu cầu Kilo nhưng không có cấu hình, rơi về Cloudflare.
  if (preferred?.startsWith('kilo:') || preferred === 'kilo') {
    // Kilo không được cấu hình hoặc không sẵn có - fall back to Cloudflare
    if (!cloudflareInstance) cloudflareInstance = new CloudflareAIProvider()
    return cloudflareInstance
  }

  // Mặc định: Cloudflare Workers AI (free tier).
  if (!cloudflareInstance) cloudflareInstance = new CloudflareAIProvider()
  return cloudflareInstance
}