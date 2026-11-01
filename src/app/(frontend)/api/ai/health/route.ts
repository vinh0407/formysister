import { getAIProvider } from '@/lib/ai/ai-provider'
import { handleApiError, json } from '@/lib/api/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const provider = getAIProvider()
    const health = await provider.healthCheck()
    return json({
      ...health,
      turnstileConfigured: Boolean(process.env.TURNSTILE_SECRET_KEY),
      // Site keys are intentionally public; the secret is never returned.
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null,
    })
  } catch (error) {
    return handleApiError(error, 'Không kiểm tra được trạng thái AI.')
  }
}
