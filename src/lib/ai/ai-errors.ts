export type AIErrorCode =
  | 'NOT_CONFIGURED'
  | 'AUTH'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'MODEL_LICENSE'
  | 'INVALID_RESPONSE'
  | 'UPSTREAM'
  | 'STORAGE'

export class AIError extends Error {
  readonly code: AIErrorCode
  readonly status: number
  readonly retryable: boolean
  readonly details?: string

  constructor(
    message: string,
    options: { code: AIErrorCode; status: number; retryable?: boolean; details?: string },
  ) {
    super(message)
    this.name = 'AIError'
    this.code = options.code
    this.status = options.status
    this.retryable = options.retryable ?? false
    this.details = options.details
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'))
  )
}

export function classifyCloudflareError(status: number, body: string): AIError {
  const details = body.slice(0, 800)
  if (status === 401 || status === 403) {
    return new AIError('Cloudflare AI chưa được cấu hình hoặc token không có quyền Workers AI.', {
      code: 'AUTH',
      status: 503,
      details,
    })
  }
  if (status === 429) {
    return new AIError('Cloudflare AI đang giới hạn tần suất. Vui lòng thử lại sau ít phút.', {
      code: 'RATE_LIMITED',
      status: 429,
      retryable: true,
      details,
    })
  }
  if (
    status === 5016 ||
    /model agreement|submit the prompt ['"]?agree|license/i.test(details)
  ) {
    return new AIError(
      'Mô hình AI đang yêu cầu chấp nhận giấy phép trên tài khoản Cloudflare. Hãy dùng mô hình vision khác hoặc chấp nhận giấy phép trong dashboard Cloudflare.',
      { code: 'MODEL_LICENSE', status: 503, details },
    )
  }
  if (status === 400 || status === 404 || status === 422) {
    return new AIError('Mô hình AI không khả dụng hoặc từ chối yêu cầu này.', {
      code: 'UPSTREAM',
      status: 502,
      details,
    })
  }
  if (status >= 500) {
    return new AIError('Máy chủ AI tạm thời gặp sự cố. Vui lòng thử lại.', {
      code: 'UPSTREAM',
      status: 502,
      retryable: true,
      details,
    })
  }
  return new AIError('Không thể gọi dịch vụ AI lúc này.', {
    code: 'UPSTREAM',
    status: 502,
    details,
  })
}
