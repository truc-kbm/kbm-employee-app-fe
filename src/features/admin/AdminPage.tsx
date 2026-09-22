import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { ApiError, apiRequest, type ApiEnvelope } from '../../lib/api'
import './admin.css'

type Lang = 'en' | 'vi'
type Status = 'active' | 'blocked'
type AdminSection = 'users' | 'roles' | 'permissions'
type AdminUser = { id: string; user_id: string | null; email: string; display_name: string | null; avatar_url: string | null; role: string; status: Status; created_at: string; updated_at: string; last_login_at: string | null }
type AdminRole = { id: string; key: string; name: string; description: string | null; is_system: boolean; permission_keys: string[]; user_count: number; created_at: string; updated_at: string }
type AdminPermission = { id: string; key: string; name: string; description: string | null; sop_collection_key: string | null; is_system: boolean; role_count: number; created_at: string; updated_at: string }

const labels = {
  en: {
    users: 'Users', roles: 'Roles', permissions: 'Permissions', usersTitle: 'User management', usersSub: 'Control employee access and assign roles.', rolesTitle: 'Role management', rolesSub: 'Create roles and choose the permissions available to each role.', permissionsTitle: 'Permission library', permissionsSub: 'Define access capabilities and prepare each one for a private SOP collection.', addUser: 'Add user', email: 'Work email', role: 'Role', status: 'Status', user: 'User', active: 'Active', blocked: 'Blocked', never: 'Not signed in yet', lastLogin: 'Last login', search: 'Search by name or email…', emptyUsers: 'No users found.', loading: 'Loading admin data…', adding: 'Adding…', retry: 'Try again', userAdded: 'User added successfully.', key: 'Key', name: 'Name', description: 'Description', createRole: 'Create role', createPermission: 'Create permission', save: 'Save changes', saving: 'Saving…', delete: 'Delete', system: 'System', usersCount: 'users', rolesCount: 'roles', assignedPermissions: 'Assigned permissions', noPermissions: 'No permissions created yet.', noRoles: 'No roles created yet.', sopCollection: 'SOP collection key', sopHelp: 'Optional for now. This will identify the private SOP document collection later.', saved: 'Changes saved.', created: 'Created successfully.', deleted: 'Deleted successfully.', confirmDelete: 'Delete this item? This cannot be undone.', keyHelp: 'Lowercase letters, numbers, dots, hyphens or underscores.',
  },
  vi: {
    users: 'Người dùng', roles: 'Vai trò', permissions: 'Quyền hạn', usersTitle: 'Quản lý người dùng', usersSub: 'Quản lý quyền truy cập và gán vai trò cho nhân viên.', rolesTitle: 'Quản lý vai trò', rolesSub: 'Tạo vai trò và chọn các quyền được cấp cho từng vai trò.', permissionsTitle: 'Danh mục quyền hạn', permissionsSub: 'Khai báo quyền truy cập và chuẩn bị liên kết tới từng bộ tài liệu SOP riêng.', addUser: 'Thêm người dùng', email: 'Email công việc', role: 'Vai trò', status: 'Trạng thái', user: 'Người dùng', active: 'Đang hoạt động', blocked: 'Đã khóa', never: 'Chưa đăng nhập', lastLogin: 'Đăng nhập gần nhất', search: 'Tìm theo tên hoặc email…', emptyUsers: 'Không tìm thấy người dùng.', loading: 'Đang tải dữ liệu quản trị…', adding: 'Đang thêm…', retry: 'Thử lại', userAdded: 'Đã thêm người dùng.', key: 'Mã định danh', name: 'Tên', description: 'Mô tả', createRole: 'Tạo vai trò', createPermission: 'Tạo quyền hạn', save: 'Lưu thay đổi', saving: 'Đang lưu…', delete: 'Xóa', system: 'Hệ thống', usersCount: 'người dùng', rolesCount: 'vai trò', assignedPermissions: 'Quyền được gán', noPermissions: 'Chưa có quyền hạn nào.', noRoles: 'Chưa có vai trò nào.', sopCollection: 'Mã bộ tài liệu SOP', sopHelp: 'Hiện tại có thể để trống. Sau này mã này sẽ xác định bộ tài liệu SOP riêng.', saved: 'Đã lưu thay đổi.', created: 'Đã tạo thành công.', deleted: 'Đã xóa thành công.', confirmDelete: 'Xóa mục này? Thao tác này không thể hoàn tác.', keyHelp: 'Chỉ dùng chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.',
  },
} as const
type Labels = typeof labels.en | typeof labels.vi

function errorMessage(error: unknown) { return error instanceof ApiError ? error.message : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.' }

export function AdminPage({ lang }: { lang: Lang }) {
  const t = labels[lang]
  const [section, setSection] = useState<AdminSection>('users')
  const [users, setUsers] = useState<AdminUser[]>([]), [roles, setRoles] = useState<AdminRole[]>([]), [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [search, setSearch] = useState(''), [email, setEmail] = useState(''), [newUserRole, setNewUserRole] = useState('user')
  const [roleDraft, setRoleDraft] = useState({ key: '', name: '', description: '' })
  const [permissionDraft, setPermissionDraft] = useState({ key: '', name: '', description: '', sop_collection_key: '' })
  const [loading, setLoading] = useState(true), [busyId, setBusyId] = useState<string | null>(null), [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const query = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''
      const [userResult, roleResult, permissionResult] = await Promise.all([
        apiRequest<ApiEnvelope<AdminUser[]>>(`admin/users?limit=100&offset=0${query}`), apiRequest<ApiEnvelope<AdminRole[]>>('admin/roles'), apiRequest<ApiEnvelope<AdminPermission[]>>('admin/permissions'),
      ])
      const loadedRoles = roleResult?.data ?? []
      setUsers(userResult?.data ?? []); setRoles(loadedRoles); setPermissions(permissionResult?.data ?? [])
      setNewUserRole(current => loadedRoles.some(role => role.key === current) ? current : loadedRoles[0]?.key ?? 'user')
    } catch (loadError) { setError(errorMessage(loadError)) } finally { setLoading(false) }
  }, [search])
  useEffect(() => { const timer = window.setTimeout(() => void loadData(), 250); return () => window.clearTimeout(timer) }, [loadData])
  function startAction(id: string | null = null) { setBusyId(id); setAdding(id === null); setError(null); setNotice(null) }
  function endAction() { setBusyId(null); setAdding(false) }

  async function addUser(event: FormEvent) {
    event.preventDefault(); if (!email.trim() || adding) return; startAction()
    try { const result = await apiRequest<ApiEnvelope<AdminUser>>('admin/users', { method: 'POST', body: JSON.stringify({ email: email.trim(), role: newUserRole }) }); if (result) setUsers(current => [result.data, ...current]); setEmail(''); setNotice(t.userAdded) }
    catch (actionError) { setError(errorMessage(actionError)) } finally { endAction() }
  }
  async function updateUser(user: AdminUser, change: { role?: string; status?: Status }) {
    startAction(user.id)
    try { const result = await apiRequest<ApiEnvelope<AdminUser>>(`admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(change) }); if (result) setUsers(current => current.map(item => item.id === user.id ? result.data : item)) }
    catch (actionError) { setError(errorMessage(actionError)) } finally { endAction() }
  }
  async function createRole(event: FormEvent) {
    event.preventDefault(); if (!roleDraft.key || !roleDraft.name) return; startAction()
    try { const result = await apiRequest<ApiEnvelope<AdminRole>>('admin/roles', { method: 'POST', body: JSON.stringify({ ...roleDraft, permission_keys: [] }) }); if (result) setRoles(current => [...current, result.data]); setRoleDraft({ key: '', name: '', description: '' }); setNotice(t.created) }
    catch (actionError) { setError(errorMessage(actionError)) } finally { endAction() }
  }
  async function saveRole(role: AdminRole) {
    startAction(role.id)
    try { const result = await apiRequest<ApiEnvelope<AdminRole>>(`admin/roles/${role.id}`, { method: 'PATCH', body: JSON.stringify({ name: role.name, description: role.description, permission_keys: role.permission_keys }) }); if (result) setRoles(current => current.map(item => item.id === role.id ? result.data : item)); setNotice(t.saved) }
    catch (actionError) { setError(errorMessage(actionError)) } finally { endAction() }
  }
  async function createPermission(event: FormEvent) {
    event.preventDefault(); if (!permissionDraft.key || !permissionDraft.name) return; startAction()
    try { const body = { ...permissionDraft, sop_collection_key: permissionDraft.sop_collection_key || null }; const result = await apiRequest<ApiEnvelope<AdminPermission>>('admin/permissions', { method: 'POST', body: JSON.stringify(body) }); if (result) setPermissions(current => [...current, result.data]); setPermissionDraft({ key: '', name: '', description: '', sop_collection_key: '' }); setNotice(t.created) }
    catch (actionError) { setError(errorMessage(actionError)) } finally { endAction() }
  }
  async function savePermission(permission: AdminPermission) {
    startAction(permission.id)
    try { const result = await apiRequest<ApiEnvelope<AdminPermission>>(`admin/permissions/${permission.id}`, { method: 'PATCH', body: JSON.stringify({ name: permission.name, description: permission.description, sop_collection_key: permission.sop_collection_key }) }); if (result) setPermissions(current => current.map(item => item.id === permission.id ? result.data : item)); setNotice(t.saved) }
    catch (actionError) { setError(errorMessage(actionError)) } finally { endAction() }
  }
  async function remove(kind: 'roles' | 'permissions', id: string) {
    if (!window.confirm(t.confirmDelete)) return; startAction(id)
    try { await apiRequest(`admin/${kind}/${id}`, { method: 'DELETE' }); if (kind === 'roles') setRoles(current => current.filter(item => item.id !== id)); else setPermissions(current => current.filter(item => item.id !== id)); setNotice(t.deleted) }
    catch (actionError) { setError(errorMessage(actionError)) } finally { endAction() }
  }

  const headings = { users: [t.usersTitle, t.usersSub], roles: [t.rolesTitle, t.rolesSub], permissions: [t.permissionsTitle, t.permissionsSub] }
  return <div className="admin-page">
    <nav className="admin-tabs" aria-label="Admin dashboards">{(['users', 'roles', 'permissions'] as const).map(value => <button key={value} className={section === value ? 'active' : ''} onClick={() => { setSection(value); setError(null); setNotice(null) }}><b>{t[value]}</b><span>{value === 'users' ? users.length : value === 'roles' ? roles.length : permissions.length}</span></button>)}</nav>
    <section className="admin-heading"><div><span className="kicker">Admin</span><h1>{headings[section][0]}</h1><p>{headings[section][1]}</p></div>{section === 'users' && <label className="admin-search"><span aria-hidden="true">⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t.search}/></label>}</section>
    {error && <div className="admin-alert error" role="alert"><span>{error}</span><button onClick={() => void loadData()}>{t.retry}</button></div>}{notice && <div className="admin-alert success" role="status">{notice}</div>}
    {loading ? <div className="admin-loading">{t.loading}</div> : section === 'users' ? <UsersDashboard t={t} lang={lang} users={users} roles={roles} email={email} setEmail={setEmail} newRole={newUserRole} setNewRole={setNewUserRole} adding={adding} busyId={busyId} addUser={addUser} updateUser={updateUser}/> : section === 'roles' ? <RolesDashboard t={t} roles={roles} permissions={permissions} draft={roleDraft} setDraft={setRoleDraft} busyId={busyId} adding={adding} createRole={createRole} setRoles={setRoles} saveRole={saveRole} remove={id => void remove('roles', id)}/> : <PermissionsDashboard t={t} permissions={permissions} draft={permissionDraft} setDraft={setPermissionDraft} busyId={busyId} adding={adding} createPermission={createPermission} setPermissions={setPermissions} savePermission={savePermission} remove={id => void remove('permissions', id)}/>}
  </div>
}

function UsersDashboard({ t, lang, users, roles, email, setEmail, newRole, setNewRole, adding, busyId, addUser, updateUser }: { t: Labels; lang: Lang; users: AdminUser[]; roles: AdminRole[]; email: string; setEmail: (value: string) => void; newRole: string; setNewRole: (value: string) => void; adding: boolean; busyId: string | null; addUser: (event: FormEvent) => void; updateUser: (user: AdminUser, change: { role?: string; status?: Status }) => Promise<void> }) {
  return <><form className="admin-add" onSubmit={addUser}><label><span>{t.email}</span><input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com"/></label><label><span>{t.role}</span><select value={newRole} onChange={event => setNewRole(event.target.value)}>{roles.map(role => <option key={role.id} value={role.key}>{role.name}</option>)}</select></label><button disabled={adding || !email.trim()}>{adding ? t.adding : t.addUser}</button></form><section className="admin-list"><div className="admin-list-head"><span>{t.user}</span><span>{t.role}</span><span>{t.status}</span><span>{t.lastLogin}</span></div>{users.length === 0 ? <div className="admin-empty">{t.emptyUsers}</div> : users.map(user => { const busy = busyId === user.id; return <article className="admin-user-row" key={user.id}><div className="admin-user-identity"><span className="admin-user-avatar">{(user.display_name ?? user.email).slice(0, 1).toUpperCase()}</span><span><b>{user.display_name ?? user.email}</b>{user.display_name && <small>{user.email}</small>}</span></div><select aria-label={`${t.role}: ${user.email}`} value={user.role} disabled={busy} onChange={event => void updateUser(user, { role: event.target.value })}>{roles.map(role => <option key={role.id} value={role.key}>{role.name}</option>)}</select><button className={`admin-status ${user.status}`} disabled={busy} onClick={() => void updateUser(user, { status: user.status === 'active' ? 'blocked' : 'active' })}><span/>{user.status === 'active' ? t.active : t.blocked}</button><time dateTime={user.last_login_at ?? undefined}>{user.last_login_at ? new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(user.last_login_at)) : t.never}</time></article>})}</section></>
}

function RolesDashboard({ t, roles, permissions, draft, setDraft, busyId, adding, createRole, setRoles, saveRole, remove }: { t: Labels; roles: AdminRole[]; permissions: AdminPermission[]; draft: { key: string; name: string; description: string }; setDraft: (value: { key: string; name: string; description: string }) => void; busyId: string | null; adding: boolean; createRole: (event: FormEvent) => void; setRoles: Dispatch<SetStateAction<AdminRole[]>>; saveRole: (role: AdminRole) => Promise<void>; remove: (id: string) => void }) {
  const patchRole = (id: string, change: Partial<AdminRole>) => setRoles(current => current.map(item => item.id === id ? { ...item, ...change } : item))
  return <><form className="admin-create-form" onSubmit={createRole}><div className="admin-form-title"><h2>{t.createRole}</h2><p>{t.keyHelp}</p></div><label><span>{t.key}</span><input required pattern="[a-z][a-z0-9_-]+" value={draft.key} onChange={event => setDraft({ ...draft, key: event.target.value })} placeholder="store_manager"/></label><label><span>{t.name}</span><input required value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Store Manager"/></label><label className="wide"><span>{t.description}</span><input value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })}/></label><button disabled={adding}>{adding ? t.adding : t.createRole}</button></form><section className="admin-card-grid">{roles.length === 0 ? <div className="admin-empty">{t.noRoles}</div> : roles.map(role => <article className="admin-config-card" key={role.id}><header><div><span className="admin-key">{role.key}</span>{role.is_system && <em>{t.system}</em>}<h2>{role.name}</h2><small>{role.user_count} {t.usersCount}</small></div></header><label><span>{t.name}</span><input value={role.name} onChange={event => patchRole(role.id, { name: event.target.value })}/></label><label><span>{t.description}</span><textarea rows={2} value={role.description ?? ''} onChange={event => patchRole(role.id, { description: event.target.value || null })}/></label><fieldset><legend>{t.assignedPermissions}</legend>{permissions.map(permission => <label className="permission-check" key={permission.id}><input type="checkbox" checked={role.permission_keys.includes(permission.key)} onChange={() => patchRole(role.id, { permission_keys: role.permission_keys.includes(permission.key) ? role.permission_keys.filter(key => key !== permission.key) : [...role.permission_keys, permission.key] })}/><span><b>{permission.name}</b><small>{permission.key}</small></span></label>)}</fieldset><footer><button className="primary" disabled={busyId === role.id} onClick={() => void saveRole(role)}>{busyId === role.id ? t.saving : t.save}</button>{!role.is_system && <button className="danger" disabled={busyId === role.id || role.user_count > 0} onClick={() => remove(role.id)}>{t.delete}</button>}</footer></article>)}</section></>
}

function PermissionsDashboard({ t, permissions, draft, setDraft, busyId, adding, createPermission, setPermissions, savePermission, remove }: { t: Labels; permissions: AdminPermission[]; draft: { key: string; name: string; description: string; sop_collection_key: string }; setDraft: (value: { key: string; name: string; description: string; sop_collection_key: string }) => void; busyId: string | null; adding: boolean; createPermission: (event: FormEvent) => void; setPermissions: Dispatch<SetStateAction<AdminPermission[]>>; savePermission: (permission: AdminPermission) => Promise<void>; remove: (id: string) => void }) {
  const patchPermission = (id: string, change: Partial<AdminPermission>) => setPermissions(current => current.map(item => item.id === id ? { ...item, ...change } : item))
  return <><form className="admin-create-form permission-form" onSubmit={createPermission}><div className="admin-form-title"><h2>{t.createPermission}</h2><p>{t.keyHelp}</p></div><label><span>{t.key}</span><input required pattern="[a-z][a-z0-9_.-]+" value={draft.key} onChange={event => setDraft({ ...draft, key: event.target.value })} placeholder="sop.opening.access"/></label><label><span>{t.name}</span><input required value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label><label><span>{t.sopCollection}</span><input value={draft.sop_collection_key} onChange={event => setDraft({ ...draft, sop_collection_key: event.target.value })} placeholder="opening-sops"/></label><label className="wide"><span>{t.description}</span><input value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })}/></label><button disabled={adding}>{adding ? t.adding : t.createPermission}</button></form><p className="admin-sop-note">{t.sopHelp}</p><section className="admin-card-grid permissions-grid">{permissions.length === 0 ? <div className="admin-empty">{t.noPermissions}</div> : permissions.map(permission => <article className="admin-config-card" key={permission.id}><header><div><span className="admin-key">{permission.key}</span>{permission.is_system && <em>{t.system}</em>}<h2>{permission.name}</h2><small>{permission.role_count} {t.rolesCount}</small></div></header><label><span>{t.name}</span><input value={permission.name} onChange={event => patchPermission(permission.id, { name: event.target.value })}/></label><label><span>{t.description}</span><textarea rows={2} value={permission.description ?? ''} onChange={event => patchPermission(permission.id, { description: event.target.value || null })}/></label><label><span>{t.sopCollection}</span><input value={permission.sop_collection_key ?? ''} onChange={event => patchPermission(permission.id, { sop_collection_key: event.target.value || null })} placeholder="—"/></label><footer><button className="primary" disabled={busyId === permission.id} onClick={() => void savePermission(permission)}>{busyId === permission.id ? t.saving : t.save}</button>{!permission.is_system && <button className="danger" disabled={busyId === permission.id || permission.role_count > 0} onClick={() => remove(permission.id)}>{t.delete}</button>}</footer></article>)}</section></>
}
