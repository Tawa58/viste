import 'server-only'

export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function unauthorized(message = 'Authentication required') {
  return new AppError(401, 'UNAUTHORIZED', message)
}

export function forbidden(message = 'Insufficient permissions') {
  return new AppError(403, 'FORBIDDEN', message)
}

export function notFound(message = 'Resource not found') {
  return new AppError(404, 'NOT_FOUND', message)
}

export function badRequest(message: string, details?: unknown) {
  return new AppError(400, 'BAD_REQUEST', message, details)
}

export function conflict(message: string, details?: unknown) {
  return new AppError(409, 'CONFLICT', message, details)
}

export function tooManyRequests(message = 'Too many requests') {
  return new AppError(429, 'RATE_LIMITED', message)
}

export function serviceUnavailable(message: string) {
  return new AppError(503, 'SERVICE_UNAVAILABLE', message)
}

export type ErrorResponseBody = {
  error: {
    code: string
    message: string
    requestId?: string
    details?: unknown
  }
}

/**
 * Maps any thrown value to a safe JSON error body.
 * Never includes stack traces in production.
 */
export function toErrorResponse(
  err: unknown,
  requestId?: string,
): { status: number; body: ErrorResponseBody } {
  if (err instanceof AppError) {
    const body: ErrorResponseBody = {
      error: {
        code: err.code,
        message: err.message,
        ...(requestId ? { requestId } : {}),
      },
    }
    if (process.env.NODE_ENV !== 'production' && err.details !== undefined) {
      body.error.details = err.details
    }
    return { status: err.statusCode, body }
  }

  console.error('[api]', requestId ?? '-', err)
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err instanceof Error
              ? err.message
              : 'An unexpected error occurred',
        ...(requestId ? { requestId } : {}),
      },
    },
  }
}

/** @deprecated Prefer toErrorResponse */
export function toErrorBody(err: unknown, requestId: string) {
  return toErrorResponse(err, requestId)
}
