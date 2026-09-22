import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, apiRequest, type ApiEnvelope } from '../../lib/api'
import './admin.css'

type Lang = 'en' | 'vi'
type Role = 'user' | 'admin'
type Status = 'active' | 'blocked'

type AdminUser = {
  id: string
  user_id: string | null
  email: string
  display_name: string | null
  avatar_url: string | null
  role: Role
  status: Status
  created_at: string
  updated_at: string
  last_login_at: string | null
}

const labels = {
  en: {
    title: 'User management', subtitle: 'Control employee access and administrator roles.',
    add: 'Add user', email: 'Work email', role: 'Role', status: 'Status', user: 'User',
    active: 'Active', blocked: 'Blocked', admin: 'Admin', employee: 'Employee', never: 'Not signed in yet',
    lastLogin: 'Last login', search: 'Search by name or email…', empty: 'No users found.',
    loading: 'Loading users…', adding: 'Adding…', retry: 'Try again', added: 'User added successfully.',
  },
  vi: {
    title: 'Quản lý người dùng', subtitle: 'Quản lý quyền truy cập và vai trò quản trị viên.',
    add: 'Thêm người dùng', email: 'Email công việc', role: 'Vai trò', status: 'Trạng thái', user: 'Người dùng',
    active: 'Đang hoạt động', blocked: 'Đã khóa', admin: 'Quản trị viên', employee: 'Nhân viên', never: 'Chưa đăng nhập',
    lastLogin: 'Đăng nhập gần nhất', search: 'Tìm theo tên hoặc email…', empty: 'Không tìm thấy người dùng.',
    loading: 'Đang tải người dùng…', adding: 'Đang thêm…', retry: 'Thử lại', added: 'Đã thêm người dùng.',
  },
} as const

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.'
}

export function AdminPage({ lang }: { lang: Lang }) {
  const t = labels[lang]
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [email, setEmail] = useState('')
  const [newRole, setNewRole] = useState<Role>('user')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''
      const result = await apiRequest<ApiEnvelope<AdminUser[]>>(`admin/users?limit=100&offset=0${query}`)
      setUsers(result?.data ?? [])
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(), 250)
    return () => window.clearTimeout(timer)
  }, [loadUsers])

  async function addUser(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || adding) return
    setAdding(true)
    setError(null)
    setNotice(null)
    try {
      const result = await apiRequest<ApiEnvelope<AdminUser>>('admin/users', {
        method: 'POST', body: JSON.stringify({ email: email.trim(), role: newRole }),
      })
      if (result) setUsers(current => [result.data, ...current])
      setEmail('')
      setNewRole('user')
      setNotice(t.added)
    } catch (addError) {
      setError(errorMessage(addError))
    } finally {
      setAdding(false)
    }
  }

  async function updateUser(user: AdminUser, change: { role?: Role; status?: Status }) {
    setUpdatingId(user.id)
    setError(null)
    setNotice(null)
    try {
      const result = await apiRequest<ApiEnvelope<AdminUser>>(`admin/users/${user.id}`, {
        method: 'PATCH', body: JSON.stringify(change),
      })
      if (result) setUsers(current => current.map(item => item.id === user.id ? result.data : item))
    } catch (updateError) {
      setError(errorMessage(updateError))
    } finally {
      setUpdatingId(null)
    }
  }

  return <div className="admin-page">
    <section className="admin-heading">
      <div><span className="kicker">Admin</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <label className="admin-search"><span aria-hidden="true">⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t.search}/></label>
    </section>

    <form className="admin-add" onSubmit={addUser}>
      <label><span>{t.email}</span><input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="name@kingbanhmi.net"/></label>
      <label><span>{t.role}</span><select value={newRole} onChange={event => setNewRole(event.target.value as Role)}><option value="user">{t.employee}</option><option value="admin">{t.admin}</option></select></label>
      <button disabled={adding || !email.trim()}>{adding ? t.adding : t.add}</button>
    </form>

    {error && <div className="admin-alert error" role="alert"><span>{error}</span><button onClick={() => void loadUsers()}>{t.retry}</button></div>}
    {notice && <div className="admin-alert success" role="status">{notice}</div>}

    <section className="admin-list" aria-busy={loading}>
      <div className="admin-list-head"><span>{t.user}</span><span>{t.role}</span><span>{t.status}</span><span>{t.lastLogin}</span></div>
      {loading ? <div className="admin-empty">{t.loading}</div> : users.length === 0 ? <div className="admin-empty">{t.empty}</div> : users.map(user => {
        const busy = updatingId === user.id
        return <article className="admin-user-row" key={user.id}>
          <div className="admin-user-identity"><span className="admin-user-avatar">{(user.display_name ?? user.email).slice(0, 1).toUpperCase()}</span><span><b>{user.display_name ?? user.email}</b>{user.display_name && <small>{user.email}</small>}</span></div>
          <select aria-label={`${t.role}: ${user.email}`} value={user.role} disabled={busy} onChange={event => void updateUser(user, { role: event.target.value as Role })}><option value="user">{t.employee}</option><option value="admin">{t.admin}</option></select>
          <button className={`admin-status ${user.status}`} disabled={busy} onClick={() => void updateUser(user, { status: user.status === 'active' ? 'blocked' : 'active' })}><span/>{user.status === 'active' ? t.active : t.blocked}</button>
          <time dateTime={user.last_login_at ?? undefined}>{user.last_login_at ? new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(user.last_login_at)) : t.never}</time>
        </article>
      })}
    </section>
  </div>
}
