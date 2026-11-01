/**
 * Raised when the Payload data layer cannot be reached.
 *
 * Deliberately dependency-free: `handleApiError` needs to map this error
 * without importing Payload itself, because the Payload config is exactly
 * what may be unavailable. Importing it here would break every API route.
 */
export class StudyBackendUnavailableError extends Error {
  readonly status = 503

  constructor(message = 'Study backend unavailable', options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StudyBackendUnavailableError'
  }
}
