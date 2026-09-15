import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { appConfig, getSwaggerUrl } from '../../config'
import { createGoogleProvider, getFirebaseAuth } from '../../lib/firebase'
import { friendlyAuthError } from './auth-errors'
import './dev-token.css'

type Notice = { kind: 'success' | 'error' | 'info'; text: string }

function readSwaggerUrl(): { url: string | null; error: string | null } {
  try { return { url: getSwaggerUrl().toString(), error: null } }
  catch (error) { return { url: null, error: error instanceof Error ? error.message : 'Swagger URL chưa hợp lệ.' } }
}

function initializeFirebase() {
  try { return { auth: getFirebaseAuth(), error: null } }
  catch (error) { return { auth: null, error: error instanceof Error ? error.message : 'Firebase chưa được cấu hình.' } }
}

function DevTokenPage() {
  const [{ url: swaggerUrl, error: swaggerError }] = useState(readSwaggerUrl)
  const [{ auth, error: firebaseError }] = useState(initializeFirebase)
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!auth)
  const [busyAction, setBusyAction] = useState<'login' | 'copy' | 'logout' | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const configurationError = swaggerError ?? firebaseError

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthReady(true)
    })
  }, [auth])

  async function login() {
    setBusyAction('login'); setNotice(null)
    try {
      const result = await signInWithPopup(getFirebaseAuth(), createGoogleProvider())
      if (!result.user.emailVerified) {
        await signOut(getFirebaseAuth())
        setNotice({ kind: 'error', text: 'Email Google chưa được xác minh.' })
        return
      }
      setNotice({ kind: 'info', text: 'Đã đăng nhập Firebase. Quyền truy cập KBM vẫn do backend xác nhận.' })
    } catch (error) {
      setNotice({ kind: 'error', text: friendlyAuthError(error) })
    } finally { setBusyAction(null) }
  }

  async function copyToken() {
    setBusyAction('copy'); setNotice(null)
    try {
      const currentUser = getFirebaseAuth().currentUser
      if (!currentUser) throw new Error('signed-out')
      await navigator.clipboard.writeText(await currentUser.getIdToken())
      setNotice({ kind: 'success', text: 'Đã copy token. Không chia sẻ token hoặc chụp màn hình Curl/Authorization.' })
    } catch {
      setNotice({ kind: 'error', text: 'Không thể copy token. Hãy dùng HTTPS hoặc localhost, kiểm tra quyền clipboard rồi thử lại.' })
    } finally { setBusyAction(null) }
  }

  async function logout() {
    setBusyAction('logout'); setNotice(null)
    try {
      await signOut(getFirebaseAuth())
      setNotice({ kind: 'info', text: 'Đã đăng xuất. Token từng copy có thể còn hiệu lực; hãy Logout trong Swagger và thay nội dung clipboard.' })
    } catch {
      setNotice({ kind: 'error', text: 'Không thể đăng xuất. Vui lòng thử lại.' })
    } finally { setBusyAction(null) }
  }

  const disabled = Boolean(configurationError) || !authReady || busyAction !== null

  return (
    <main className="token-page">
      <section className="token-shell" aria-labelledby="page-title">
        <header className="token-header">
          <div>
            <span className="eyebrow">Developer utility</span>
            <h1 id="page-title">KBM — Token để test API</h1>
          </div>
          <dl className="environment">
            <div><dt>Môi trường</dt><dd>{appConfig.appEnvironment}</dd></div>
            <div><dt>Swagger</dt><dd>{swaggerUrl ?? 'Chưa cấu hình'}</dd></div>
          </dl>
        </header>

        {configurationError && (
          <div className="notice notice-error" role="alert">
            <strong>Chưa thể khởi tạo</strong><span>{configurationError}</span>
          </div>
        )}

        <div className="account-card">
          <div className="account-copy">
            <span className="status-dot" data-active={Boolean(user)} aria-hidden="true" />
            <div>
              <p className="account-label">Tài khoản Firebase</p>
              <p className="account-value">{!authReady ? 'Đang kiểm tra…' : user?.email ?? 'Chưa đăng nhập'}</p>
            </div>
          </div>

          <div className="actions">
            {!user ? (
              <button className="button button-primary" disabled={disabled} onClick={login}>
                {busyAction === 'login' ? 'Đang mở Google…' : 'Đăng nhập Google'}
              </button>
            ) : (
              <>
                <button className="button button-primary" disabled={disabled} onClick={copyToken}>
                  {busyAction === 'copy' ? 'Đang copy…' : 'Copy Firebase ID token'}
                </button>
                {swaggerUrl && <a className="button button-secondary" href={swaggerUrl} target="_blank" rel="noopener noreferrer">Mở Swagger</a>}
                <button className="button button-quiet" disabled={disabled} onClick={logout}>
                  {busyAction === 'logout' ? 'Đang đăng xuất…' : 'Đăng xuất'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="notice-region" aria-live="polite" aria-atomic="true">
          {notice && <div className={`notice notice-${notice.kind}`}>{notice.text}</div>}
        </div>

        <section className="instructions" aria-labelledby="instructions-title">
          <div><span className="step-number">01</span><h2 id="instructions-title">Authorize</h2><p>Mở Swagger, chọn Authorize và dán token thuần — không thêm chữ Bearer.</p></div>
          <div><span className="step-number">02</span><h2>Đăng nhập KBM</h2><p>Gọi <code>POST /api/v1/auth/google</code> trước để backend xác nhận quyền.</p></div>
          <div><span className="step-number">03</span><h2>Kiểm tra hồ sơ</h2><p>Sau khi đăng nhập KBM thành công, gọi <code>GET /api/v1/me</code>.</p></div>
        </section>

        <aside className="security-note">
          <strong>Token là thông tin đăng nhập tạm thời.</strong>
          <span>Không chia sẻ token, không chụp phần Curl/Authorization. Đăng nhập Firebase không đồng nghĩa tài khoản đã được cấp quyền nhân viên KBM.</span>
        </aside>
      </section>
    </main>
  )
}

export default DevTokenPage
