/**
 * Sleeper API data access (free, public, no key required).
 *
 * Endpoints used:
 *  - /v1/state/nfl                        → current season + week (live)
 *  - /v1/players/nfl                      → every player's bio (~5MB blob)
 *  - /v1/stats/nfl/regular/{year}/{week}  → weekly stats keyed by player_id
 *
 * Unlike nflverse (which publishes a season only after it is processed and
 * lags weeks behind), Sleeper exposes real in-season data within minutes of
 * each game, so it is the source of truth for the current 2026 season.
 */

const BASE = "https://api.sleeper.app/v1"

export interface SleeperState {
  season: number
  week: number
  seasonType: string
}

export interface SleeperPlayer {
  player_id: string
  full_name?: string
  first_name?: string
  last_name?: string
  position?: string
  team?: string | null
  height?: string
  weight?: string
  birth_date?: string
  college?: string
  years_exp?: number
  status?: string
  depth_chart_position?: string
  number?: number
}

/** A weekly stat row is a flat map of stat key → value. */
export type SleeperStats = Record<string, number>

async function getJSON(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } })
  if (!res.ok) throw new Error(`Sleeper ${url}: ${res.status}`)
  return res.json()
}

export async function fetchState(): Promise<SleeperState> {
  const d = (await getJSON(`${BASE}/state/nfl`)) as Record<string, unknown>
  return {
    season: Number(d.season) || new Date().getFullYear(),
    week: Number(d.week) || 0,
    seasonType: String(d.season_type ?? "regular"),
  }
}

export async function fetchPlayers(): Promise<Record<string, SleeperPlayer>> {
  return getJSON(`${BASE}/players/nfl`) as Promise<Record<string, SleeperPlayer>>
}

/** Weekly stats for every player. Returns {} for a week with no data yet. */
export async function fetchWeekStats(year: number, week: number): Promise<Record<string, SleeperStats>> {
  try {
    const res = await fetch(`${BASE}/stats/nfl/regular/${year}/${week}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return {}
    const d = await res.json()
    return d && typeof d === "object" ? (d as Record<string, SleeperStats>) : {}
  } catch {
    return {}
  }
}

/** Sleeper headshot CDN (falls back gracefully to a broken-image handler in UI). */
export function headshotUrl(playerId: string): string {
  return `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`
}

export const n = (v: number | undefined | null): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0
