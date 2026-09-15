import { getApiBaseUrl } from '../config'
import { getFirebaseAuth } from './firebase'

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId?: string

  constructor(message: string, code: string, status: number, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.requestId = requestId
  }
}

type ErrorEnvelope = { error?: { code?: string; message?: string; requestId?: string } }

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T | undefined> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new ApiError('Bạn cần đăng nhập lại.', 'LOGIN_REQUIRED', 401)
  const token = await user.getIdToken()
  const baseUrl = getApiBaseUrl().toString().replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/${path.replace(/^\//, '')}`, {
    ...init,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  if (response.status === 204) return undefined
  if (!response.ok) {
    let body: ErrorEnvelope = {}
    try { body = (await response.json()) as ErrorEnvelope } catch { /* Infrastructure errors may not use the KBM envelope. */ }
    throw new ApiError(
      body.error?.message ?? 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.',
      body.error?.code ?? 'REQUEST_FAILED', response.status,
      body.error?.requestId ?? response.headers.get('X-Request-ID') ?? undefined,
    )
  }
  return (await response.json()) as T
}
