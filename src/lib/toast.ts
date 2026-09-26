import { useSyncExternalStore } from 'react'

export interface ToastItem {
  id: number
  kind: 'error' | 'success' | 'info'
  text: string
}

let items: ToastItem[] = []
let nextId = 1
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

function push(kind: ToastItem['kind'], text: string) {
  const id = nextId++
  items = [...items.slice(-3), { id, kind, text }]
  emit()
  setTimeout(() => dismissToast(id), kind === 'error' ? 7000 : 3500)
}

export const toast = {
  error: (t: string) => push('error', t),
  success: (t: string) => push('success', t),
  info: (t: string) => push('info', t),
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb) } },
    () => items,
  )
}
