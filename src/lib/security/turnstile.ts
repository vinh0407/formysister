type TurnstileVerification = {
  configured: boolean
  ok: boolean
  message?: string
}

/**
 * Verify a Cloudflare Turnstile token when TURNSTILE_SECRET_KEY is configured.
 *
 * Without a secret the app still enforces persistent IP/session limits, but we
 * report `configured: false` so operators know bot verification is not active.
 */
export async function verifyTurnstile(
  token: string | null,
  remoteIp?: string,
): Promise<TurnstileVerification> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return { configured: false, ok: true }
  if (!token) {
    return { configured: true, ok: false, message: 'Vui lòng hoàn tất bước xác minh bảo mật.' }
  }

  try {
    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', token)
    if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp)

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    const result = (await response.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (result.success) return { configured: true, ok: true }
    return {
      configured: true,
      ok: false,
      message: 'Xác minh bảo mật không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
    }
  } catch (error) {
    console.error('Turnstile verification failed', error)
    return {
      configured: true,
      ok: false,
      message: 'Không thể xác minh bảo mật lúc này. Vui lòng thử lại.',
    }
  }
}
