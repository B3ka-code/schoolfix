import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ROLE_LABEL, isAdmin, isTriage } from '../lib/types'

export default function Layout() {
  const { profile, signOut } = useAuth()
  if (!profile) return null

  const items = [
    { to: '/', label: isTriage(profile.role) ? 'Барлық өтінімдер' : 'Менің өтінімдерім', end: true },
    { to: '/new', label: 'Жаңа өтінім', end: false },
    ...(isAdmin(profile.role) ? [{ to: '/admin', label: 'Басқару', end: false }] : []),
    { to: '/profile', label: 'Профиль', end: false },
  ]

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line bg-panel md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:px-5 md:py-5">
          <span className="text-base font-semibold tracking-tight">SchoolFix</span>
          <button className="btn btn-ghost md:hidden" onClick={() => void signOut()}>Шығу</button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:flex-1 md:flex-col md:overflow-visible md:pb-0" aria-label="Бөлімдер">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-sm ${isActive ? 'bg-raised text-ink' : 'text-mute hover:text-ink'}`}
            >
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-line p-4 md:block">
          <p className="truncate text-sm font-medium">{profile.full_name}</p>
          <p className="text-xs text-mute">{ROLE_LABEL[profile.role]}</p>
          <button className="btn btn-ghost mt-3 w-full" onClick={() => void signOut()}>Шығу</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-4xl"><Outlet /></div>
      </main>
    </div>
  )
}
