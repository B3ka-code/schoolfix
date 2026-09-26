import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function AuthPage() {
  const { session, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'in') await signIn(email.trim(), password)
      else await signUp(email.trim(), password, name.trim())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-semibold tracking-tight">SchoolFix</h1>
      <p className="mt-1 text-sm text-mute">Заявки на ремонт и проблемы в школе</p>

      <div className="mt-8 grid grid-cols-2 gap-1 rounded-md border border-line bg-panel p-1" role="tablist">
        {(['in', 'up'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded px-3 py-1.5 text-sm ${mode === m ? 'bg-raised text-ink' : 'text-mute hover:text-ink'}`}
          >
            {m === 'in' ? 'Вход' : 'Регистрация'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        {mode === 'up' && (
          <div>
            <label className="label" htmlFor="name">Имя и фамилия</label>
            <input id="name" className="input" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Почта</label>
          <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Пароль</label>
          <input id="password" type="password" className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>{mode === 'in' ? 'Войти' : 'Создать аккаунт'}</button>
      </form>

      {mode === 'up' && (
        <p className="mt-4 text-sm text-mute">
          Все начинают как ученики. Учителя и техперсонал вводят инвайт-код от администратора в разделе «Профиль».
        </p>
      )}
    </div>
  )
}
