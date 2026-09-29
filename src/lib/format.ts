export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('kk-KZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
