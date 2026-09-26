import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLive } from '../lib/useLive'
import { toast } from '../lib/toast'
import { formatDate } from '../lib/format'
import { ROLE_LABEL, type RequestStatus, type RoleRequest } from '../lib/types'

const REQ_LABEL: Record<RequestStatus, { text: string; cls: string }> = {
  pending: { text: 'Ждёт подтверждения', cls: 'text-st-progress' },
  approved: { text: 'Подтверждена', cls: 'text-st-resolved' },
  rejected: { text: 'Отклонена', cls: 'text-st-rejected' },
}

export default function ProfilePage() {
  const { profile, refresh } = useAuth()
  const [requests, setRequests] = useState<RoleRequest[]>([])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const r = await api.myRoleRequests()
    if (r.ok) setRequests(r.data ?? [])
  }, [])
  useEffect(() => { void load(); void refresh() }, [load, refresh])
  useLive('role_requests', () => void load())

  if (!profile) return null
  const hasPending = requests.some((r) => r.status === 'pending')

  async function redeem(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await api.redeemCode(code)
      if (r.ok) {
        setCode('')
        toast.success('Код принят. Администратор подтвердит роль вручную')
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold">Профиль</h1>
      <div className="card mt-5 divide-y divide-line text-sm">
        <div className="flex justify-between p-4"><span className="text-mute">Имя</span><span>{profile.full_name}</span></div>
        <div className="flex justify-between p-4"><span className="text-mute">Почта</span><span>{profile.email}</span></div>
        <div className="flex justify-between p-4"><span className="text-mute">Роль</span><span>{ROLE_LABEL[profile.role]}</span></div>
      </div>

      {profile.role === 'student' && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">Вы учитель или сотрудник?</h2>
          <p className="mt-1 text-sm text-mute">Введите инвайт-код от администратора. Роль появится после его подтверждения.</p>
          <form onSubmit={redeem} className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor="code">Инвайт-код</label>
            <input id="code" className="input" placeholder="XXXX-XXXX-XXXX-XXXX" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} disabled={hasPending} />
            <button className="btn btn-primary shrink-0" disabled={busy || hasPending || !code.trim()}>Отправить</button>
          </form>
          {hasPending && <p className="mt-2 text-sm text-mute">Предыдущая заявка ещё на рассмотрении.</p>}
        </section>
      )}

      {requests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">Ваши заявки на роль</h2>
          <ul className="card mt-3 divide-y divide-line text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-4">
                <span>{ROLE_LABEL[r.requested_role]} <span className="text-xs text-mute">· {formatDate(r.created_at)}</span></span>
                <span className={REQ_LABEL[r.status].cls}>{REQ_LABEL[r.status].text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
