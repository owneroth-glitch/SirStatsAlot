/**
 * nflverse data access. Pulls open CSV releases from the nflverse-data
 * GitHub releases (free, public) and parses them into typed rows.
 *
 * Release assets used:
 *  - players.csv                  → bios (birth date, height, weight, draft)
 *  - weekly_rosters/roster_weekly_YYYY.csv → active/practice-squad universe
 *  - player_stats/stats_player_week_YYYY.csv → weekly stat lines
 */

const BASE = "https://github.com/nflverse/nflverse-data/releases/download"

export const PLAYERS_URL = `${BASE}/players/players.csv`
export const rosterUrl = (year: number) => `${BASE}/weekly_rosters/roster_weekly_${year}.csv`
export const statsUrl = (year: number) => `${BASE}/player_stats/stats_player_week_${year}.csv`

/** Minimal RFC-4180 CSV parser (handles quoted fields, commas, newlines). */
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (c === "\r") {
      // ignore, handled by \n
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  if (rows.length === 0) return []
  const header = rows[0]
  const out: Record<string, string>[] = []
  for (let r = 1; r < rows.length; r++) {
    if (rows[r].length === 1 && rows[r][0] === "") continue
    const obj: Record<string, string> = {}
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = rows[r][c] ?? ""
    }
    out.push(obj)
  }
  return out
}

export async function fetchCSV(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url, {
    headers: { Accept: "text/csv,*/*" },
    cache: "no-store",
  })
  if (!res.ok) {
    if (res.status === 404) return [] // season/file not published yet
    throw new Error(`Failed to fetch ${url}: ${res.status}`)
  }
  const text = await res.text()
  return parseCSV(text)
}

export const num = (v: string | undefined): number => {
  if (v === undefined || v === "" || v === "NA") return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
