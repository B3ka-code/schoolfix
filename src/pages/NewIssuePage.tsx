import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { toast } from '../lib/toast'
import { CATEGORY_LABEL, type IssueCategory } from '../lib/types'

export default function NewIssuePage() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<IssueCategory>('equipment')
  const [location, setLocation] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setBusy(true)
    try {
      const r = await api.createIssue(
        { title: title.trim(), description: description.trim(), category, location: location.trim() },
        profile.id,
        file,
      )
      if (r.ok) {
        toast.success('Өтінім жіберілді')
        nav(`/issues/${r.data.id}`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold">Жаңа өтінім</h1>
      <p className="mt-1 text-sm text-mute">Не бұзылғанын және қай жерде екенін жазыңыз — шебер мәселені тезірек табады.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="title">Не болды</label>
          <input id="title" className="input" required minLength={3} maxLength={120} placeholder="Мысалы: проектор істемейді" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cat">Санат</label>
            <select id="cat" className="input" value={category} onChange={(e) => setCategory(e.target.value as IssueCategory)}>
              {(Object.keys(CATEGORY_LABEL) as IssueCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="loc">Қай жерде</label>
            <input id="loc" className="input" maxLength={120} placeholder="214-кабинет, 2-қабат" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="desc">Толығырақ</label>
          <textarea id="desc" className="input min-h-28" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="photo">Фото (JPG, PNG немесе WebP, 5 МБ дейін)</label>
          <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm text-mute file:mr-3 file:rounded-md file:border file:border-line file:bg-raised file:px-3 file:py-1.5 file:text-sm file:text-ink" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Жіберілуде…' : 'Өтінімді жіберу'}</button>
      </form>
    </div>
  )
}
