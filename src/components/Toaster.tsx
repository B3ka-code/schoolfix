import { dismissToast, useToasts } from '../lib/toast'

const TONE = {
  error: 'border-st-rejected/50 text-st-rejected',
  success: 'border-st-resolved/50 text-st-resolved',
  info: 'border-line text-ink',
} as const

export function Toaster() {
  const toasts = useToasts()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-md border bg-raised px-4 py-3 text-sm shadow-lg ${TONE[t.kind]}`}>
          <span className="flex-1 text-ink">{t.text}</span>
          <button className="text-mute hover:text-ink" onClick={() => dismissToast(t.id)} aria-label="Закрыть">×</button>
        </div>
      ))}
    </div>
  )
}
