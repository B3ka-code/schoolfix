import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useLive } from '../lib/useLive'
import type { RoleRequest } from '../lib/types'
import RoleRequests from './admin/RoleRequests'
import UsersTable from './admin/UsersTable'
import InviteCodes from './admin/InviteCodes'

type Tab = 'requests' | 'users' | 'codes'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('requests')
  const [requests, setRequests] = useState<RoleRequest[]>([])
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    const r = await api.listRoleRequests()
    if (r.ok) { setRequests(r.data ?? []); setFailed(false) } else setFailed(true)
  }, [])
  useEffect(() => { void load() }, [load])
  useLive('role_requests', () => void load())

  const pending = requests.filter((r) => r.status === 'pending').length
  const tabs: { id: Tab; label: string }[] = [
    { id: 'requests', label: pending ? `Рөлге өтінімдер (${pending})` : 'Рөлге өтінімдер' },
    { id: 'users', label: 'Пайдаланушылар' },
    { id: 'codes', label: 'Кодтар' },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold">Басқару</h1>
      <div className="mt-4 flex gap-1 border-b border-line" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t.id ? 'border-ink text-ink' : 'border-transparent text-mute hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === 'requests' && <RoleRequests items={requests} failed={failed} onChanged={load} />}
        {tab === 'users' && <UsersTable />}
        {tab === 'codes' && <InviteCodes />}
      </div>
    </div>
  )
}
