import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

// Подписка на изменения таблицы (Supabase Realtime, RLS применяется).
// Данные не подставляем из события, а просто перечитываем — так надёжнее.
export function useLive(table: string, onChange: () => void, opts: { filter?: string; enabled?: boolean } = {}) {
  const cb = useRef(onChange)
  cb.current = onChange
  const { filter, enabled = true } = opts

  useEffect(() => {
    if (!enabled) return
    const channel = supabase
      .channel(`live:${table}:${filter ?? 'all'}:${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => cb.current())
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [table, filter, enabled])
}
