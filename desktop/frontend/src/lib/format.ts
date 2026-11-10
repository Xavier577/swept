export function bytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const index = Math.min(4, Math.floor(Math.log(value) / Math.log(1024)))
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: index > 1 ? 1 : 0 }).format(value / 1024 ** index)} ${['B', 'KiB', 'MiB', 'GiB', 'TiB'][index]}`
}
export function date(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
export function shortPath(path: string, home: string): string {
  return path === home ? '~' : path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path
}
