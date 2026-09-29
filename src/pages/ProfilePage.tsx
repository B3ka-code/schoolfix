import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLive } from '../lib/useLive'
import { toast } from '../lib/toast'
import { formatDate } from '../lib/format'
import { ROLE_LABEL, type RequestStatus, type RoleRequest } from '../lib/types'

const REQ_LABEL: Record<RequestStatus, { text: string; cls: string }> = {
  pending: { text: 'Растауды күтуде', cls: 'text-st-progress' },
  approved: { text: 'Расталды', cls: 'text-st-resolved' },
  rejected: { text: 'Қабылданбады', cls: 'text-st-rejected' },
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
        toast.success('Код қабылданды. Әкімші рөлді қолмен растайды')
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
        <div className="flex justify-between p-4"><span className="text-mute">Аты-жөні</span><span>{profile.full_name}</span></div>
        <div className="flex justify-between p-4"><span className="text-mute">Пошта</span><span>{profile.email}</span></div>
        <div className="flex justify-between p-4"><span className="text-mute">Рөлі</span><span>{ROLE_LABEL[profile.role]}</span></div>
      </div>

      {profile.role === 'student' && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">Сіз мұғалімсіз бе немесе қызметкерсіз бе?</h2>
          <p className="mt-1 text-sm text-mute">Әкімшіден алған кодты енгізіңіз. Рөл ол растағаннан кейін пайда болады.</p>
          <form onSubmit={redeem} className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor="code">Код</label>
            <input id="code" className="input" placeholder="XXXX-XXXX-XXXX-XXXX" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} disabled={hasPending} />
            <button className="btn btn-primary shrink-0" disabled={busy || hasPending || !code.trim()}>Жіберу</button>
          </form>
          {hasPending && <p className="mt-2 text-sm text-mute">Алдыңғы өтінім әлі қаралуда.</p>}
        </section>
      )}

      {requests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">Рөлге сіздің өтінімдеріңіз</h2>
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
