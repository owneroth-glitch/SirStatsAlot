export function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12)
  const inch = inches % 12
  return `${ft}'${inch}"`
}

export function formatAge(age: number): string {
  return age.toFixed(1)
}

export function num(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function pct(n: number): string {
  return `${n.toFixed(1)}%`
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * Format an ISO kickoff time in US Eastern (the league's reference zone) so the
 * server and client always render identical text — avoiding hydration
 * mismatches from the viewer's local timezone. e.g. "Sun 1:00 PM ET".
 */
export function formatKickoff(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(d)
  return `${parts} ET`
}
