import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useLive } from '../../lib/useLive'
import { toast } from '../../lib/toast'
import { ROLE_LABEL, isAdmin, type Profile, type Role } from '../../lib/types'

export default function UsersTable() {
  const { profile: me } = useAuth()
  const [users, setUsers] = useState<Profile[] | null>(null)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    const r = await api.listUsers()
    if (r.ok) setUsers(r.data ?? [])
    else setUsers((prev) => prev ?? [])
  }, [])
  useEffect(() => { void load() }, [load])
  useLive('profiles', () => void load())

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (users ?? []).filter((u) => !s || u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s))
  }, [users, q])

  if (!me) return null
  const superAdmin = me.role === 'super_admin'
  const assignable: Role[] = superAdmin ? ['student', 'teacher', 'staff', 'admin', 'super_admin'] : ['student', 'teacher', 'staff']
  const locked = (u: Profile) => u.id === me.id || (!superAdmin && isAdmin(u.role))

  async function changeRole(u: Profile, role: Role) {
    if (role === u.role) return
    if (!window.confirm(`«${u.full_name}» пайдаланушысының рөлін «${ROLE_LABEL[role]}» етіп өзгерту керек пе?`)) return
    const r = await api.setUserRole(u.id, role)
    if (r.ok) toast.success('Рөл өзгертілді')
    await load()
  }

  async function toggleActive(u: Profile) {
    if (u.is_active && !window.confirm(`«${u.full_name}» өшірілсін бе? Ол қолданбаға қол жеткізе алмай қалады.`)) return
    const r = await api.setUserActive(u.id, !u.is_active)
    if (r.ok) toast.success(u.is_active ? 'Аккаунт өшірілді' : 'Аккаунт қосылды')
    await load()
  }

  return (
    <div>
      <label className="sr-only" htmlFor="q">Пайдаланушыны іздеу</label>
      <input id="q" className="input max-w-xs" placeholder="Аты-жөні немесе пошта бойынша іздеу" value={q} onChange={(e) => setQ(e.target.value)} />
      {!users && <p className="mt-4 text-sm text-mute">Жүктелуде…</p>}
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-mute">
            <tr><th className="p-3 font-normal">Пайдаланушы</th><th className="p-3 font-normal">Рөлі</th><th className="p-3 font-normal">Қолжетімділік</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((u) => (
              <tr key={u.id} className={u.is_active ? '' : 'opacity-60'}>
                <td className="p-3"><p className="font-medium">{u.full_name}</p><p className="text-xs text-mute">{u.email}</p></td>
                <td className="p-3">
                  {locked(u) ? ROLE_LABEL[u.role] : (
                    <select aria-label={`Рөлі: ${u.full_name}`} className="input w-auto py-1" value={u.role} onChange={(e) => void changeRole(u, e.target.value as Role)}>
                      {assignable.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  )}
                </td>
                <td className="p-3">
                  {locked(u) ? (u.is_active ? 'Белсенді' : 'Өшірілген') : (
                    <button className={`btn ${u.is_active ? 'btn-danger' : 'btn-ghost'} py-1`} onClick={() => void toggleActive(u)}>
                      {u.is_active ? 'Өшіру' : 'Қосу'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users && shown.length === 0 && <tr><td className="p-3 text-mute" colSpan={3}>Ешкім табылмады.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
