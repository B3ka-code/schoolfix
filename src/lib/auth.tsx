import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { api } from './api'
import { toast } from './toast'
import { humanizeError } from './errors'
import { useLive } from './useLive'
import type { Profile } from './types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  profileFailed: boolean
  refresh: () => Promise<void>
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth вне AuthProvider')
  return v
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [booting, setBooting] = useState(true)
  const [profileFailed, setProfileFailed] = useState(false)
  const uid = session?.user.id

  useEffect(() => {
    let alive = true
    supabase.auth.getSession()
      .then(({ data }) => { if (alive) setSession(data.session) })
      .catch((e) => toast.error(`Не удалось восстановить сессию. ${humanizeError(e)}`))
      .finally(() => { if (alive) setBooting(false) })
    // в колбэке только setState: await supabase.* внутри него может подвесить клиент
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s))
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  const refresh = useCallback(async () => {
    if (!uid) return
    const r = await api.getMyProfile(uid)
    if (r.ok) { setProfile(r.data); setProfileFailed(false) } else setProfileFailed(true)
  }, [uid])

  useEffect(() => {
    setProfile(null)
    setProfileFailed(false)
    if (uid) void refresh()
  }, [uid, refresh])

  // Админ подтвердил роль / отключил аккаунт — интерфейс подхватывает без перезагрузки.
  useLive('profiles', () => void refresh(), { filter: uid ? `id=eq.${uid}` : undefined, enabled: Boolean(uid) })

  const value = useMemo<AuthState>(() => ({
    session,
    profile,
    loading: booting || (Boolean(uid) && profile === null && !profileFailed),
    profileFailed,
    refresh,
    async signIn(email, password) {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return true
      } catch (e) {
        toast.error(humanizeError(e))
        return false
      }
    },
    async signUp(email, password, fullName) {
      try {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
        if (error) throw error
        if (!data.session) toast.info('Мы отправили письмо — подтвердите почту, потом войдите')
        return true
      } catch (e) {
        toast.error(humanizeError(e))
        return false
      }
    },
    async signOut() {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      } catch (e) {
        toast.error(`Не удалось выйти. ${humanizeError(e)}`)
      }
    },
  }), [session, profile, booting, uid, profileFailed, refresh])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
