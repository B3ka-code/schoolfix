import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isAdmin } from '../lib/types'

function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6 text-center text-sm text-mute">{children}</div>
}

// Это только удобство интерфейса. Реальная защита — RLS/RPC в Postgres.
export function RequireAuth() {
  const { session, profile, loading, refresh, signOut } = useAuth()
  const loc = useLocation()

  if (loading) return <Screen>Жүктелуде…</Screen>
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (!profile) {
    return (
      <Screen>
        <p>Профильді жүктеу мүмкін болмады.</p>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => void refresh()}>Қайталау</button>
          <button className="btn btn-ghost" onClick={() => void signOut()}>Шығу</button>
        </div>
      </Screen>
    )
  }
  if (!profile.is_active) {
    return (
      <Screen>
        <p className="text-ink">Аккаунт өшірілген.</p>
        <p>Мектеп әкімшісіне хабарласыңыз.</p>
        <button className="btn btn-ghost" onClick={() => void signOut()}>Шығу</button>
      </Screen>
    )
  }
  return <Outlet />
}

export function RequireRole({ admin }: { admin: boolean }) {
  const { profile } = useAuth()
  if (admin && !isAdmin(profile?.role)) return <Navigate to="/" replace />
  return <Outlet />
}
