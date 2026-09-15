import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createGoogleProvider, getFirebaseAuth } from './lib/firebase'
import { friendlyAuthError } from './features/dev-token/auth-errors'
import './App.css'

type Lang = 'en' | 'vi'
type AppRoute = '/login' | '/welcome' | '/sops-chat'
type IconName = 'alert' | 'arrow' | 'check' | 'chevron' | 'collapse' | 'doc' | 'grid' | 'logout' | 'menu' | 'message' | 'mic' | 'send'
type Citation = { title: string; meta: string; url: string }
type Message = { id: number; role: 'user' | 'bot'; text: string; citations?: Citation[] }
type AppUser = Pick<FirebaseUser, 'displayName' | 'email'>

const copy = {
  en: {
    signTitle: 'Employee Portal', signSub: 'Sign in with your King Bánh Mì Google account to reach your tools.', signBtn: 'Continue with Google', signOther: 'Use another account', signFoot: 'Only @kingbanhmi.net accounts have access.',
    denyTitle: 'Account not allowed', denySub: "This Google account isn't on the King Bánh Mì team directory.", denyBtn: 'Try a different account', denyHelp: 'Need access? Ask your store manager.',
    date: 'Wednesday, Sep 9', greet: 'Chào', shift: "Today's shift", shiftRole: 'Line · Sandwich', tools: 'Your tools', tileSop: 'Ask anything about prep, cleaning, register or opening steps.', tileVoice: 'Voice Assistant', soon: 'Coming soon', soonTag: 'Soon',
    status: 'Answers from 42 published SOPs', sources: 'Sources', placeholder: 'Ask about an SOP…', voiceSoon: "Voice chat isn't live yet — shipping in a future release.", portal: 'Employee Portal', workspace: 'Workspace', home: 'Welcome', signOut: 'Sign out', send: 'Send', collapse: 'Collapse',
    cats: ['All', 'Opening', 'Food prep', 'Cleaning', 'Register', 'Closing'], topHomeSub: 'Your shift and tools', topChatSub: 'Answers cite the published SOP',
    hello: 'Hi Frank — ask me anything from the SOP library. I’ll answer from published procedures and show you exactly where the information came from.', sampleUser: 'What temperature should the chicken reach?', sampleBot: 'Chicken must reach an internal temperature of 165°F (74°C). Check the thickest part with a sanitized probe and record the reading before service.', response: 'Based on the current SOP, complete the safety check, record the result on the shift log, and tell your manager right away if anything is outside the approved range.', authError: 'Unable to sign in. Check the Firebase settings and try again.',
  },
  vi: {
    signTitle: 'Cổng Nhân Viên', signSub: 'Đăng nhập bằng tài khoản Google King Bánh Mì để vào công cụ của bạn.', signBtn: 'Tiếp tục với Google', signOther: 'Dùng tài khoản khác', signFoot: 'Chỉ tài khoản @kingbanhmi.net được truy cập.',
    denyTitle: 'Tài khoản không hợp lệ', denySub: 'Tài khoản Google này không có trong danh bạ nhân viên King Bánh Mì.', denyBtn: 'Thử tài khoản khác', denyHelp: 'Cần quyền truy cập? Hỏi quản lý cửa hàng.',
    date: 'Thứ Tư, 9 Th9', greet: 'Chào', shift: 'Ca hôm nay', shiftRole: 'Quầy · Bánh mì', tools: 'Công cụ của bạn', tileSop: 'Hỏi bất cứ điều gì về sơ chế, vệ sinh, thu ngân hay mở ca.', tileVoice: 'Trợ lý giọng nói', soon: 'Sắp ra mắt', soonTag: 'Sắp có',
    status: 'Trả lời từ 42 SOP đã ban hành', sources: 'Nguồn', placeholder: 'Hỏi về một SOP…', voiceSoon: 'Trò chuyện bằng giọng nói chưa hoạt động — sẽ ra mắt ở bản sau.', portal: 'Cổng Nhân Viên', workspace: 'Không gian làm việc', home: 'Trang chào', signOut: 'Đăng xuất', send: 'Gửi', collapse: 'Thu gọn',
    cats: ['Tất cả', 'Mở ca', 'Sơ chế', 'Vệ sinh', 'Thu ngân', 'Đóng ca'], topHomeSub: 'Ca làm và công cụ của bạn', topChatSub: 'Câu trả lời dẫn nguồn SOP đã ban hành',
    hello: 'Chào Frank — hãy hỏi tôi bất cứ điều gì trong thư viện SOP. Tôi sẽ trả lời từ quy trình đã ban hành và chỉ rõ nguồn thông tin.', sampleUser: 'Nhiệt độ bên trong của gà phải đạt bao nhiêu?', sampleBot: 'Thịt gà phải đạt nhiệt độ bên trong 165°F (74°C). Đo ở phần dày nhất bằng que đo đã khử trùng và ghi lại kết quả trước khi phục vụ.', response: 'Theo SOP hiện hành, hãy hoàn tất bước kiểm tra an toàn, ghi kết quả vào nhật ký ca và báo ngay cho quản lý nếu có chỉ số nằm ngoài phạm vi cho phép.', authError: 'Không thể đăng nhập. Hãy kiểm tra cấu hình Firebase và thử lại.',
  },
} as const

const counts = [42, 6, 14, 9, 7, 6]
const source: Citation = { title: 'Chicken Cooking & Holding', meta: 'Section 3.2 · updated Aug 2026', url: '/sops/docs/chicken-cooking?section=3.2' }

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    alert: <><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></>, arrow: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>, check: <path d="M20 6 9 17l-5-5"/>, chevron: <path d="m9 18 6-6-6-6"/>, collapse: <path d="m15 18-6-6 6-6"/>,
    doc: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></>, grid: <><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>, menu: <><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h11"/></>, message: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>, mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></>, send: <><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></>,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function readRoute(): AppRoute { return window.location.pathname === '/welcome' || window.location.pathname === '/sops-chat' ? window.location.pathname : '/login' }
function navigate(route: AppRoute, replace = false) { window.history[replace ? 'replaceState' : 'pushState']({}, '', route); window.dispatchEvent(new PopStateEvent('popstate')) }
function initials(name: string) { return name.split(/\s+/).map(value => value[0]).slice(0, 2).join('').toUpperCase() }

function LanguageToggle({ lang, onChange, dark = false }: { lang: Lang; onChange: (lang: Lang) => void; dark?: boolean }) {
  return <div className={`lang-toggle${dark ? ' lang-toggle-dark' : ''}`} aria-label="Language">{(['en', 'vi'] as const).map(value => <button key={value} className={lang === value ? 'active' : ''} onClick={() => onChange(value)} aria-pressed={lang === value}>{value.toUpperCase()}</button>)}</div>
}

function Login({ lang, setLang, deniedEmail, onLogin, busy, error }: { lang: Lang; setLang: (value: Lang) => void; deniedEmail: string | null; onLogin: () => void; busy: boolean; error: string | null }) {
  const t = copy[lang]
  if (deniedEmail) return <main className="auth-page denied-page"><div className="auth-lang"><LanguageToggle lang={lang} onChange={setLang} dark /></div><section className="denied-card" aria-labelledby="denied-title"><div className="denied-head"><span className="kicker">Access</span><h1 id="denied-title">{t.denyTitle}</h1><p>{t.denySub}</p></div><div className="denied-body"><div className="denied-email"><Icon name="alert" size={22}/><span>{deniedEmail}</span></div><button className="gold-button" onClick={() => navigate('/login')}>{t.denyBtn}</button><p>{t.denyHelp}</p></div></section></main>
  return <main className="auth-page"><div className="auth-lang"><LanguageToggle lang={lang} onChange={setLang} dark /></div><section className="brand-panel"><div className="brand-lockup"><img src="/logo-mark.png" alt=""/><img src="/logo-wordmark.png" alt="King Bánh Mì"/></div><div className="brand-message"><h1>{t.signTitle}</h1><p>{t.signSub}</p></div><p className="auth-foot">{t.signFoot}</p></section><section className="signin-panel"><div className="signin-card"><span className="kicker">{lang === 'vi' ? 'Chào mừng trở lại' : 'Welcome back'}</span><h2>{lang === 'vi' ? 'Đăng nhập' : 'Sign in'}</h2><p>{lang === 'vi' ? 'Dùng tài khoản Google quản lý đã cấp cho bạn.' : 'Use the Google account your manager set up for you.'}</p><button className="google-button" onClick={onLogin} disabled={busy}><span className="google-g">G</span>{busy ? 'Google…' : t.signBtn}</button><button className="other-button" onClick={onLogin} disabled={busy}>{t.signOther}</button>{error && <div className="auth-error" role="alert">{error}</div>}</div></section></main>
}

function Sidebar({ lang, route, expanded, drawerOpen, workspaceOpen, userName, userEmail, onNavigate, onClose, onToggleExpanded, onToggleWorkspace, onSignOut }: { lang: Lang; route: AppRoute; expanded: boolean; drawerOpen: boolean; workspaceOpen: boolean; userName: string; userEmail: string; onNavigate: (route: AppRoute) => void; onClose: () => void; onToggleExpanded: () => void; onToggleWorkspace: () => void; onSignOut: () => void }) {
  const t = copy[lang]
  const content = <aside className={`sidebar ${expanded ? '' : 'collapsed'}`} aria-label="Primary navigation"><div className="side-brand"><img src="/logo-mark.png" alt=""/><div className="side-brand-copy"><img src="/logo-wordmark.png" alt="King Bánh Mì"/><span>{t.portal}</span></div></div><div className="workspace-wrap"><span className="side-kicker">{t.workspace}</span><button className="workspace-button" aria-expanded={workspaceOpen} onClick={onToggleWorkspace}><Icon name="message" size={18}/><b>SOPs Chat Bot</b><span className={`turn ${workspaceOpen ? 'open' : ''}`}><Icon name="chevron" size={16}/></span></button>{workspaceOpen && <div className="workspace-menu" role="menu"><button role="menuitem" onClick={() => onNavigate('/sops-chat')}><Icon name="message" size={16}/>SOPs Chat Bot<span><Icon name="check" size={16}/></span></button><div><Icon name="mic" size={16}/>{t.tileVoice}<em>{t.soonTag}</em></div></div>}</div><nav className="side-nav"><button className={route === '/welcome' ? 'active' : ''} onClick={() => onNavigate('/welcome')} title={t.home}><Icon name="grid"/><span>{t.home}</span></button><button className={route === '/sops-chat' ? 'active' : ''} onClick={() => onNavigate('/sops-chat')} title="SOPs Chat Bot"><Icon name="message"/><span>SOPs Chat Bot</span></button></nav><div className="side-spacer"/><div className="side-user"><span className="avatar small">{initials(userName)}</span><span className="user-copy"><b>{userName}</b><small>{userEmail}</small></span><button className="logout-icon" onClick={onSignOut} aria-label={t.signOut}><Icon name="logout" size={17}/></button></div><button className="mobile-signout" onClick={onSignOut}><Icon name="logout" size={16}/>{t.signOut}</button><button className="collapse-button" onClick={onToggleExpanded} title={t.collapse}><span className={expanded ? '' : 'flipped'}><Icon name="collapse" size={16}/></span><span>{t.collapse}</span></button></aside>
  return <><div className="desktop-sidebar">{content}</div>{drawerOpen && <div className="drawer-layer"><button className="drawer-scrim" onClick={onClose} aria-label="Close menu"/>{content}</div>}</>
}

function AppHeader({ lang, route, name, role, onMenu }: { lang: Lang; route: AppRoute; name: string; role: string; onMenu: () => void }) {
  const t = copy[lang]
  return <header className="app-header"><button className="hamburger" onClick={onMenu} aria-label="Open menu"><Icon name="menu"/></button><div className="header-title"><b>{route === '/welcome' ? t.home : 'SOPs Chat Bot'}</b><span>{route === '/welcome' ? t.topHomeSub : t.topChatSub}</span></div><div className="header-user"><span><b>{name}</b><small>{role} · Bellaire 02</small></span><div className="avatar">{initials(name)}</div></div></header>
}

function Welcome({ lang, firstName, onOpenChat }: { lang: Lang; firstName: string; onOpenChat: () => void }) {
  const t = copy[lang]
  return <div className="welcome-content"><div className="welcome-title"><span className="kicker">{t.date}</span><h1>{t.greet} {firstName}</h1></div><section className="shift-card"><span className="kicker">{t.shift}</span><strong>10:30 — 6:30 PM</strong><div><span>{t.shiftRole}</span><span>Bellaire · Store 02</span></div></section><section className="tools"><span className="kicker">{t.tools}</span><button className="tool-card" onClick={onOpenChat}><span className="tool-icon"><Icon name="message" size={28}/></span><span><b>SOPs Chat Bot</b><small>{t.tileSop}</small></span><Icon name="arrow" size={24}/></button><div className="tool-card disabled"><span className="tool-icon"><Icon name="mic" size={28}/></span><span><b>{t.tileVoice}</b><small>{t.soon}</small></span></div></section></div>
}

function MessageBubble({ message, sourceLabel }: { message: Message; sourceLabel: string }) {
  return <div className={`message-row ${message.role}`}><div className="bubble">{message.text}</div>{message.citations && <div className="citations"><span className="kicker">{sourceLabel}</span><div className="citation-grid">{message.citations.map(citation => <a key={citation.title} href={citation.url}><span className="doc-icon"><Icon name="doc" size={16}/></span><span><b>{citation.title}</b><small>{citation.meta}</small></span><Icon name="chevron" size={16}/></a>)}</div></div>}</div>
}

function Chat({ lang }: { lang: Lang }) {
  const t = copy[lang]
  const initialMessages = useMemo<Message[]>(() => [{ id: 1, role: 'bot', text: t.hello }, { id: 2, role: 'user', text: t.sampleUser }, { id: 3, role: 'bot', text: t.sampleBot, citations: [source] }], [t])
  const [messages, setMessages] = useState(initialMessages), [category, setCategory] = useState(0), [input, setInput] = useState(''), [pending, setPending] = useState(false), [toast, setToast] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, pending])
  function showVoice() { setToast(true); window.setTimeout(() => setToast(false), 3000) }
  function send(event: FormEvent) { event.preventDefault(); const value = input.trim(); if (!value || pending) return; setMessages(old => [...old, { id: Date.now(), role: 'user', text: value }]); setInput(''); setPending(true); window.setTimeout(() => { setMessages(old => [...old, { id: Date.now() + 1, role: 'bot', text: t.response, citations: [source] }]); setPending(false) }, 850) }
  return <div className="chat-shell"><div className="category-mobile">{t.cats.map((cat, index) => <button className={category === index ? 'active' : ''} key={cat} onClick={() => setCategory(index)}>{cat}</button>)}</div><div className="chat-main"><div className="messages" aria-live="polite">{messages.map(message => <MessageBubble key={message.id} message={message} sourceLabel={t.sources}/>)}{pending && <div className="message-row bot"><div className="bubble typing"><i/><i/><i/></div></div>}<div ref={endRef}/></div><form className="composer" onSubmit={send}><input value={input} onChange={event => setInput(event.target.value)} placeholder={t.placeholder} aria-label={t.placeholder}/><button type="button" className="mic-button" onClick={showVoice} aria-label={t.tileVoice}><Icon name="mic"/></button><button className="send-button" disabled={!input.trim() || pending}><span>{t.send}</span><Icon name="send"/></button></form></div><aside className="category-panel"><span className="kicker">{lang === 'vi' ? 'Danh mục SOP' : 'SOP categories'}</span>{t.cats.map((cat, index) => <button className={category === index ? 'active' : ''} key={cat} onClick={() => setCategory(index)}><span>{cat}</span><b>{counts[index]}</b></button>)}</aside>{toast && <div className="toast" role="status">{t.voiceSoon}</div>}</div>
}

function App() {
  const params = new URLSearchParams(window.location.search), preview = import.meta.env.DEV && params.get('preview') === '1'
  const [lang, setLangState] = useState<Lang>(() => localStorage.getItem('kbm-lang') === 'en' ? 'en' : 'vi'), [route, setRoute] = useState<AppRoute>(readRoute), [user, setUser] = useState<AppUser | null>(() => preview ? { displayName: 'Frank Nguyễn', email: 'frank@kingbanhmi.net' } : null), [authReady, setAuthReady] = useState(preview), [authError, setAuthError] = useState<string | null>(null), [busy, setBusy] = useState(false), [drawerOpen, setDrawerOpen] = useState(false), [workspaceOpen, setWorkspaceOpen] = useState(false), [expanded, setExpanded] = useState(() => localStorage.getItem('kbm-sidebar') !== 'collapsed')
  const deniedEmail = params.get('email') ?? (params.get('error') === 'domain' ? 'frank.nguyen@gmail.com' : null)
  useEffect(() => { const handler = () => setRoute(readRoute()); window.addEventListener('popstate', handler); return () => window.removeEventListener('popstate', handler) }, [])
  // Auth state is an external subscription; the fallback resolves immediately when Firebase is absent.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { if (preview) return; try { return onAuthStateChanged(getFirebaseAuth(), value => { setUser(value); setAuthReady(true); if (!value && readRoute() !== '/login') navigate('/login', true) }) } catch { setAuthReady(true) } }, [preview])
  useEffect(() => { if (!drawerOpen) return; const close = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [drawerOpen])
  function setLang(value: Lang) { setLangState(value); localStorage.setItem('kbm-lang', value); document.documentElement.lang = value }
  function go(next: AppRoute) { navigate(next); setDrawerOpen(false); setWorkspaceOpen(false) }
  async function login() { setBusy(true); setAuthError(null); try { const result = await signInWithPopup(getFirebaseAuth(), createGoogleProvider()); const email = result.user.email ?? ''; if (!email.toLowerCase().endsWith('@kingbanhmi.net')) { await signOut(getFirebaseAuth()); window.history.replaceState({}, '', `/login?error=domain&email=${encodeURIComponent(email)}`); window.location.reload(); return } setUser(result.user); navigate('/welcome') } catch (error) { setAuthError(friendlyAuthError(error) || copy[lang].authError) } finally { setBusy(false) } }
  async function logout() { try { await signOut(getFirebaseAuth()) } finally { setUser(null); navigate('/login') } }
  function toggleExpanded() { setExpanded(old => { localStorage.setItem('kbm-sidebar', old ? 'collapsed' : 'expanded'); return !old }) }
  if (route === '/login') return <Login lang={lang} setLang={setLang} deniedEmail={deniedEmail} onLogin={login} busy={busy} error={authError}/>
  if (!authReady) return <div className="loading"><img src="/logo-mark.png" alt="King Bánh Mì"/></div>
  if (!user) return null
  const userName = user.displayName || 'Frank Nguyễn', firstName = userName.split(/\s+/)[0]
  return <div className={`app-frame ${expanded ? '' : 'sidebar-collapsed'}`}><Sidebar lang={lang} route={route} expanded={expanded} drawerOpen={drawerOpen} workspaceOpen={workspaceOpen} userName={userName} userEmail={user.email ?? 'frank@kingbanhmi.net'} onNavigate={go} onClose={() => setDrawerOpen(false)} onToggleExpanded={toggleExpanded} onToggleWorkspace={() => setWorkspaceOpen(old => !old)} onSignOut={logout}/><main className="app-main"><AppHeader lang={lang} route={route} name={userName} role={copy[lang].shiftRole} onMenu={() => setDrawerOpen(true)}/><div className="app-toolbar"><LanguageToggle lang={lang} onChange={setLang}/></div>{route === '/welcome' ? <Welcome lang={lang} firstName={firstName} onOpenChat={() => go('/sops-chat')}/> : <Chat key={lang} lang={lang}/>}</main></div>
}

export default App
