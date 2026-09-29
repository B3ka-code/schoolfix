import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLive } from '../lib/useLive'
import { toast } from '../lib/toast'
import { formatDate } from '../lib/format'
import {
  CATEGORY_LABEL, ROLE_LABEL, STATUS_STYLE, isAdmin, isTriage,
  type Issue, type IssueComment, type IssueStatus,
} from '../lib/types'
import { StatusBadge } from '../components/StatusBadge'

const STATUSES: IssueStatus[] = ['new', 'in_progress', 'resolved', 'rejected']

export default function IssueDetailPage() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const nav = useNavigate()
  const triage = isTriage(profile?.role)
  const admin = isAdmin(profile?.role)
  const [issue, setIssue] = useState<Issue | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'failed'>('loading')
  const [comments, setComments] = useState<IssueComment[]>([])
  const [photo, setPhoto] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const loadIssue = useCallback(async () => {
    const r = await api.getIssue(id)
    if (!r.ok) { setState((s) => (s === 'ready' ? s : 'failed')); return }
    setIssue(r.data)
    setState(r.data ? 'ready' : 'missing')
  }, [id])

  const loadComments = useCallback(async () => {
    const r = await api.listComments(id)
    if (r.ok) setComments(r.data ?? [])
  }, [id])

  useEffect(() => { void loadIssue(); void loadComments() }, [loadIssue, loadComments])
  useLive('issues', () => void loadIssue(), { filter: `id=eq.${id}` })
  useLive('issue_comments', () => void loadComments(), { filter: `issue_id=eq.${id}` })

  const photoPath = issue?.photo_path
  useEffect(() => {
    setPhoto(null)
    if (!photoPath) return
    let alive = true
    void api.photoUrl(photoPath).then((r) => { if (alive && r.ok) setPhoto(r.data.signedUrl) })
    return () => { alive = false }
  }, [photoPath])

  async function changeStatus(s: IssueStatus) {
    if (!issue || s === issue.status) return
    const r = await api.setIssueStatus(issue.id, s)
    if (r.ok) { setIssue(r.data); toast.success(`Мәртебе: ${STATUS_STYLE[s].label}`) }
  }

  async function removeIssue() {
    if (!issue) return
    if (!window.confirm(`«${issue.title}» өтінімін толығымен жою керек пе? Бұл әрекетті болдырмау мүмкін емес.`)) return
    setDeleting(true)
    try {
      const r = await api.deleteIssue(issue.id)
      if (r.ok) { toast.success('Өтінім жойылды'); nav('/') }
    } finally {
      setDeleting(false)
    }
  }

  async function sendComment(e: FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value || !issue) return
    setBusy(true)
    try {
      const r = await api.addComment(issue.id, value)
      if (r.ok) { setText(''); await loadComments() }
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') return <p className="text-sm text-mute">Жүктелуде…</p>
  if (state === 'failed') return (
    <div className="card p-6 text-sm">
      <p>Өтінімді жүктеу мүмкін болмады.</p>
      <button className="btn btn-ghost mt-3" onClick={() => void loadIssue()}>Қайталау</button>
    </div>
  )
  if (state === 'missing' || !issue) return (
    <div>
      <p className="text-sm text-mute">Өтінім табылмады немесе сізде оған қол жеткізу құқығы жоқ.</p>
      <Link to="/" className="btn btn-ghost mt-3">Өтінімдер тізіміне оралу</Link>
    </div>
  )

  return (
    <div>
      <Link to="/" className="text-sm text-mute hover:text-ink">← Барлық өтінімдер</Link>
      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{issue.title}</h1>
          <p className="mt-1 text-xs text-mute">{issue.author_name} · {formatDate(issue.created_at)}</p>
          {issue.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{issue.description}</p>}
          {issue.photo_path && (
            <div className="mt-4">
              {photo
                ? <img src={photo} alt="Ақаудың суреті" className="max-h-96 rounded-lg border border-line object-contain" />
                : <p className="text-sm text-mute">Фото жүктелуде…</p>}
            </div>
          )}

          <section className="mt-8" aria-label="Пікірлер">
            <h2 className="text-base font-semibold">Пікірлер <span className="text-mute">{comments.length}</span></h2>
            <ul className="mt-3 divide-y divide-line">
              {comments.map((c) => (
                <li key={c.id} className="py-3">
                  <p className="text-sm">
                    <span className="font-medium">{c.author_name}</span>
                    {c.author_role && c.author_role !== 'student' && c.author_role !== 'teacher' && (
                      <span className="ml-2 rounded bg-raised px-1.5 py-0.5 text-xs text-mute">{ROLE_LABEL[c.author_role]}</span>
                    )}
                    <span className="ml-2 text-xs text-mute">{formatDate(c.created_at)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.text}</p>
                </li>
              ))}
              {comments.length === 0 && <li className="py-3 text-sm text-mute">Әзірге пікір жоқ.</li>}
            </ul>
            <form onSubmit={sendComment} className="mt-3 space-y-2">
              <label className="sr-only" htmlFor="comment">Жаңа пікір</label>
              <textarea id="comment" className="input min-h-20" maxLength={2000} placeholder="Пікір жазу" value={text} onChange={(e) => setText(e.target.value)} />
              <button className="btn btn-primary" disabled={busy || !text.trim()}>Жіберу</button>
            </form>
          </section>
        </div>

        <aside className="card h-fit space-y-4 p-4 text-sm">
          <div>
            <p className="text-mute">Мәртебе</p>
            {triage ? (
              <div className="mt-2 flex flex-col gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => void changeStatus(s)}
                    aria-pressed={issue.status === s}
                    className={`rounded-md border px-3 py-1.5 text-left ${issue.status === s ? `border-current ${STATUS_STYLE[s].text} ${STATUS_STYLE[s].bg}` : 'border-line text-mute hover:text-ink'}`}
                  >
                    {STATUS_STYLE[s].label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-2"><StatusBadge status={issue.status} /></div>
            )}
          </div>
          <div><p className="text-mute">Санат</p><p>{CATEGORY_LABEL[issue.category]}</p></div>
          {issue.location && <div><p className="text-mute">Қай жерде</p><p>{issue.location}</p></div>}
          <div><p className="text-mute">Жаңартылды</p><p>{formatDate(issue.updated_at)}</p></div>
          {admin && (
            <div className="border-t border-line pt-4">
              <button className="btn btn-danger w-full" disabled={deleting} onClick={() => void removeIssue()}>
                {deleting ? 'Жойылуда…' : 'Өтінімді жою'}
              </button>
              <p className="mt-1.5 text-xs text-mute">Мысалы, өтінім ережелерді бұзса. Болдырмау мүмкін емес.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
