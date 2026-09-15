const placeholders = new Set(['', 'REPLACE_WITH_FIREBASE_WEB_API_KEY'])
const value = (name: keyof ImportMetaEnv) => (import.meta.env[name] ?? '').trim()

function safeUrl(raw: string, label: string): URL {
  let url: URL
  try { url = new URL(raw) } catch { throw new Error(`${label} chưa được cấu hình bằng một URL hợp lệ.`) }
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error(`${label} chỉ chấp nhận HTTPS hoặc HTTP trên localhost.`)
  }
  return url
}

const appEnvironment = value('VITE_APP_ENV')
export const appConfig = {
  appEnvironment: appEnvironment || 'chưa cấu hình',
  apiBaseUrl: value('VITE_API_BASE_URL'),
  swaggerUrl: value('VITE_SWAGGER_URL'),
  tokenPageEnabled: value('VITE_ENABLE_DEV_TOKEN') === 'true' && ['development', 'staging'].includes(appEnvironment),
}

export type FirebaseWebConfig = { apiKey: string; authDomain: string; projectId: string; appId: string }

export function getFirebaseWebConfig(): FirebaseWebConfig {
  const config = {
    apiKey: value('VITE_FIREBASE_API_KEY'), authDomain: value('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: value('VITE_FIREBASE_PROJECT_ID'), appId: value('VITE_FIREBASE_APP_ID'),
  }
  const missing = Object.entries(config).filter(([, entry]) => placeholders.has(entry)).map(([key]) => key)
  if (missing.length) {
    throw new Error(`Thiếu Firebase Web config (${missing.join(', ')}). Hãy điền file .env.local rồi khởi động lại ứng dụng.`)
  }
  return config
}

export const getSwaggerUrl = () => safeUrl(appConfig.swaggerUrl, 'Swagger URL')
export const getApiBaseUrl = () => safeUrl(appConfig.apiBaseUrl, 'API base URL')
