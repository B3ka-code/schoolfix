import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLive } from '../lib/useLive'
import { formatDate } from '../lib/format'
import { CATEGORY_LABEL, STATUS_STYLE, isTriage, type Issue, type IssueStatus } from '../lib/types'
import { StatusBadge } from '../components/StatusBadge'

const FILTERS: (IssueStatus | 'all')[] = ['all', 'new', 'in_progress', 'resolved', 'rejected']

export default function IssuesPage() {
  const { profile } = useAuth()
  const triage = isTriage(profile?.role)
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<IssueStatus | 'all'>('all')

  const load = useCallback(async () => {
    const r = await api.listIssues()
    if (r.ok) { setIssues(r.data ?? []); setFailed(false) } else setFailed(true)
  }, [])
  useEffect(() => { void load() }, [load])
  useLive('issues', () => void load())

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: issues?.length ?? 0, new: 0, in_progress: 0, resolved: 0, rejected: 0 }
    issues?.forEach((i) => { c[i.status]++ })
    return c
  }, [issues])
  const list = useMemo(() => (issues ?? []).filter((i) => filter === 'all' || i.status === filter), [issues, filter])

  return (
    <div>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{triage ? 'Барлық өтінімдер' : 'Менің өтінімдерім'}</h1>
          <p className="mt-1 text-sm text-mute">
            {triage ? 'Мәртебені өзгертіп, өтінім ішінде пікір қалдыра аласыз' : 'Мұнда тек сіз жіберген өтінімдер ғана бар'}
          </p>
        </div>
        <Link to="/new" className="btn btn-primary shrink-0">Жаңа өтінім</Link>
      </header>

      <div className="mt-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Мәртебе бойынша сүзгі">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1.5 text-sm ${filter === f ? 'border-ink/40 bg-raised text-ink' : 'border-line text-mute hover:text-ink'}`}
          >
            {f === 'all' ? 'Барлығы' : STATUS_STYLE[f].label} <span className="ml-1 text-mute">{counts[f]}</span>
          </button>
        ))}
      </div>

      {failed && !issues && (
        <div className="card mt-4 p-6 text-sm">
          <p>Өтінімдерді жүктеу мүмкін болмады.</p>
          <button className="btn btn-ghost mt-3" onClick={() => void load()}>Қайталау</button>
        </div>
      )}
      {!failed && !issues && <p className="mt-6 text-sm text-mute">Жүктелуде…</p>}
      {issues && list.length === 0 && (
        <div className="card mt-4 p-6 text-sm text-mute">
          {issues.length === 0 ? 'Әзірге өтінім жоқ. Бірдеңе бұзылды ма — біріншісін жасаңыз.' : 'Бұл мәртебеде өтінім жоқ.'}
        </div>
      )}

      <ul className="mt-4 space-y-2.5">
        {list.map((i) => (
          <li key={i.id}>
            <Link to={`/issues/${i.id}`} className={`card block border-l-4 p-4 hover:bg-raised ${STATUS_STYLE[i.status].edge}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium">{i.title}</h2>
                <StatusBadge status={i.status} />
              </div>
              {i.description && <p className="mt-1 line-clamp-2 text-sm text-mute">{i.description}</p>}
              <p className="mt-2 text-xs text-mute">
                {CATEGORY_LABEL[i.category]}
                {i.location && ` · ${i.location}`}
                {triage && ` · ${i.author_name}`}
                {` · ${formatDate(i.created_at)}`}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
