import { useState } from 'react'
import { api } from '../../lib/api'
import { toast } from '../../lib/toast'
import { formatDate } from '../../lib/format'
import { ROLE_LABEL, type RoleRequest } from '../../lib/types'

interface Props { items: RoleRequest[]; failed: boolean; onChanged: () => Promise<void> }

export default function RoleRequests({ items, failed, onChanged }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const pending = items.filter((r) => r.status === 'pending')
  const done = items.filter((r) => r.status !== 'pending').slice(0, 10)

  async function review(r: RoleRequest, approve: boolean) {
    setBusyId(r.id)
    try {
      const res = await api.reviewRequest(r.id, approve)
      if (res.ok) toast.success(approve ? 'Рөл расталды' : 'Өтінім қабылданбады')
      await onChanged() // перечитываем и при ошибке: заявку могли обработать в другой вкладке
    } finally {
      setBusyId(null)
    }
  }

  if (failed && items.length === 0) {
    return <div className="text-sm">Өтінімдерді жүктеу мүмкін болмады. <button className="underline" onClick={() => void onChanged()}>Қайталау</button></div>
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold">Шешімді күтуде</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-mute">Жаңа өтінім жоқ.</p>
        ) : (
          <ul className="card mt-3 divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{r.profiles?.full_name ?? 'Аты-жөні жоқ'} <span className="font-normal text-mute">→ {ROLE_LABEL[r.requested_role]}</span></p>
                  <p className="text-xs text-mute">{r.profiles?.email} · {formatDate(r.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary" disabled={busyId === r.id} onClick={() => void review(r, true)}>Растау</button>
                  <button className="btn btn-danger" disabled={busyId === r.id} onClick={() => void review(r, false)}>Қабылдамау</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="text-base font-semibold">Жақында өңделген</h2>
          <ul className="card mt-3 divide-y divide-line text-sm">
            {done.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-3">
                <span>{r.profiles?.full_name} <span className="text-mute">→ {ROLE_LABEL[r.requested_role]}</span></span>
                <span className={r.status === 'approved' ? 'text-st-resolved' : 'text-st-rejected'}>{r.status === 'approved' ? 'Расталды' : 'Қабылданбады'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
