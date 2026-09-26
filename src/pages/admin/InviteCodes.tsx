import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { useLive } from '../../lib/useLive'
import { toast } from '../../lib/toast'
import { formatDate } from '../../lib/format'
import { ROLE_LABEL, type InviteCode, type Role } from '../../lib/types'

function codeState(c: InviteCode): { text: string; cls: string } {
  if (c.used_count >= c.max_uses) return { text: 'Использован', cls: 'text-mute' }
  if (!c.is_active) return { text: 'Отключён', cls: 'text-st-rejected' }
  if (c.expires_at && new Date(c.expires_at) <= new Date()) return { text: 'Истёк', cls: 'text-st-rejected' }
  return { text: 'Активен', cls: 'text-st-resolved' }
}

export default function InviteCodes() {
  const [codes, setCodes] = useState<InviteCode[] | null>(null)
  const [role, setRole] = useState<Role>('teacher')
  const [maxUses, setMaxUses] = useState(1)
  const [days, setDays] = useState(7)
  const [note, setNote] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const r = await api.listCodes()
    if (r.ok) setCodes(r.data ?? [])
    else setCodes((prev) => prev ?? [])
  }, [])
  useEffect(() => { void load() }, [load])
  useLive('role_requests', () => void load()) // счётчик использований меняется, когда кто-то вводит код

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await api.createCode(role, maxUses, days, note.trim())
      if (r.ok) { setFresh(r.data); setNote(''); await load() }
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Код скопирован')
    } catch {
      toast.error('Не удалось скопировать — выделите код вручную')
    }
  }

  async function toggle(c: InviteCode) {
    const r = await api.setCodeActive(c.id, !c.is_active)
    if (r.ok) toast.success(c.is_active ? 'Код отключён' : 'Код включён')
    await load()
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="c-role">Для роли</label>
          <select id="c-role" className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="teacher">{ROLE_LABEL.teacher}</option>
            <option value="staff">{ROLE_LABEL.staff}</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="c-uses">Сколько раз можно</label>
          <input id="c-uses" type="number" min={1} max={100} className="input" value={maxUses} onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div>
          <label className="label" htmlFor="c-days">Действует</label>
          <select id="c-days" className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={1}>1 день</option><option value={7}>7 дней</option><option value={30}>30 дней</option><option value={90}>90 дней</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="c-note">Для кого (заметка)</label>
          <input id="c-note" className="input" maxLength={80} placeholder="Иванова, физика" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-4"><button className="btn btn-primary" disabled={busy}>Создать код</button></div>
      </form>

      {fresh && (
        <div className="card border-st-progress/50 p-4" role="alert">
          <p className="text-sm text-mute">Код показывается один раз — на сервере хранится только его хэш. Скопируйте сейчас.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-md bg-raised px-3 py-2 text-lg font-semibold tracking-wider">{fresh}</code>
            <button className="btn btn-ghost" onClick={() => void copy(fresh)}>Скопировать</button>
            <button className="btn btn-ghost" onClick={() => setFresh(null)}>Скрыть</button>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-base font-semibold">Созданные коды</h2>
        {!codes && <p className="mt-2 text-sm text-mute">Загрузка…</p>}
        {codes && codes.length === 0 && <p className="mt-2 text-sm text-mute">Кодов пока нет.</p>}
        {codes && codes.length > 0 && (
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-mute">
                <tr>
                  <th className="p-3 font-normal">Роль</th><th className="p-3 font-normal">Заметка</th><th className="p-3 font-normal">Использован</th>
                  <th className="p-3 font-normal">Истекает</th><th className="p-3 font-normal">Статус</th><th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {codes.map((c) => {
                  const s = codeState(c)
                  return (
                    <tr key={c.id}>
                      <td className="p-3">{ROLE_LABEL[c.role]}</td>
                      <td className="p-3 text-mute">{c.note ?? '—'}</td>
                      <td className="p-3">{c.used_count} из {c.max_uses}</td>
                      <td className="p-3 text-mute">{c.expires_at ? formatDate(c.expires_at) : 'Бессрочно'}</td>
                      <td className={`p-3 ${s.cls}`}>{s.text}</td>
                      <td className="p-3 text-right">
                        {c.used_count < c.max_uses && (
                          <button className="btn btn-ghost py-1" onClick={() => void toggle(c)}>{c.is_active ? 'Отключить' : 'Включить'}</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
