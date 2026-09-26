import { STATUS_STYLE, type IssueStatus } from '../lib/types'

export function StatusBadge({ status }: { status: IssueStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.text} ${s.bg}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}
