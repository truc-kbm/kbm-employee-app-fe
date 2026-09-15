import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { appConfig } from './config.ts'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Không tìm thấy root element của ứng dụng')

const root = createRoot(rootElement)
const render = (content: ReactNode) => root.render(<StrictMode>{content}</StrictMode>)

if (window.location.pathname === '/dev/token' && appConfig.tokenPageEnabled) {
  void import('./features/dev-token/DevTokenPage.tsx').then(({ default: DevTokenPage }) => {
    render(<DevTokenPage />)
  })
} else {
  render(<App />)
}
