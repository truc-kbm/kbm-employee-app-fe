import { getApiBaseUrl } from '../config'
import { ApiError } from './api'
import { getFirebaseAuth } from './firebase'

export type ChatStreamEvent = 'message_start' | 'message_delta' | 'message_replace' | 'message_end' | 'error'
export type ChatStreamPayload = {
  conversation_id?: string
  user_message_id?: string
  message_id?: string
  requestId?: string
  text?: string
  status?: string
  code?: string
  message?: string
}

type StreamChatOptions = {
  conversationId: string
  query: string
  inputs?: Record<string, string | number | boolean | null>
  signal?: AbortSignal
  onEvent: (event: ChatStreamEvent, payload: ChatStreamPayload) => void
}

function nextBlock(buffer: string): { block: string; rest: string } | null {
  const boundary = /\r?\n\r?\n/.exec(buffer)
  if (!boundary || boundary.index === undefined) return null
  return {
    block: buffer.slice(0, boundary.index),
    rest: buffer.slice(boundary.index + boundary[0].length),
  }
}

export async function streamChat({ conversationId, query, inputs = {}, signal, onEvent }: StreamChatOptions): Promise<void> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new ApiError('Bạn cần đăng nhập lại.', 'LOGIN_REQUIRED', 401)
  const token = await user.getIdToken()
  const baseUrl = getApiBaseUrl().toString().replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/conversations/${conversationId}/messages/stream`, {
    method: 'POST',
    headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, inputs }),
    signal,
  })

  if (!response.ok) {
    let body: { error?: { code?: string; message?: string; requestId?: string } } = {}
    try { body = await response.json() as typeof body } catch { /* Infrastructure responses may not be JSON. */ }
    throw new ApiError(
      body.error?.message ?? 'Không thể gửi câu hỏi. Vui lòng thử lại.',
      body.error?.code ?? 'REQUEST_FAILED',
      response.status,
      body.error?.requestId ?? response.headers.get('X-Request-ID') ?? undefined,
    )
  }
  if (!response.body) throw new ApiError('Trình duyệt không nhận được luồng trả lời.', 'STREAM_UNAVAILABLE', 502)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let terminal = false
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let parsed = nextBlock(buffer)
      while (parsed) {
        buffer = parsed.rest
        const lines = parsed.block.split(/\r?\n/)
        const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim() as ChatStreamEvent | undefined
        const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
        if (event && data) {
          const payload = JSON.parse(data) as ChatStreamPayload
          onEvent(event, payload)
          if (event === 'message_end') terminal = true
          if (event === 'error') {
            terminal = true
            throw new ApiError(payload.message ?? 'AI không thể hoàn tất câu trả lời.', payload.code ?? 'AI_PROVIDER_ERROR', 502, payload.requestId)
          }
        }
        parsed = nextBlock(buffer)
      }
    }
    if (!terminal) throw new ApiError('Kết nối bị ngắt trước khi câu trả lời hoàn tất. Hãy tải lại lịch sử.', 'STREAM_INTERRUPTED', 502)
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
