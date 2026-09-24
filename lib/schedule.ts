/**
 * NFL schedule access via the public ESPN scoreboard API.
 *
 * Sleeper (our stats source) does not expose a schedule or kickoff times, so we
 * use ESPN purely for fixtures: who plays whom each week and when. This powers
 * "next opponent", kickoff times, and the strength-of-matchup rankings (which
 * need to know which defense a player faced/will face each week).
 */

const ESPN =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"

const MAX_WEEK = 18

export interface ScheduleGame {
  week: number
  home: string
  away: string
  kickoff: string | null // ISO timestamp
}

/** ESPN uses a few team abbreviations that differ from Sleeper's. */
const TEAM_FIX: Record<string, string> = {
  WSH: "WAS",
  LAR: "LA",
}

function fixTeam(abbr: string): string {
  const up = (abbr || "").toUpperCase()
  return TEAM_FIX[up] ?? up
}

async function fetchWeek(season: number, week: number): Promise<ScheduleGame[]> {
  try {
    const res = await fetch(`${ESPN}?dates=${season}&seasontype=2&week=${week}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      events?: {
        date?: string
        competitions?: {
          competitors?: { homeAway?: string; team?: { abbreviation?: string } }[]
        }[]
      }[]
    }
    const games: ScheduleGame[] = []
    for (const ev of data.events ?? []) {
      const comp = ev.competitions?.[0]
      const competitors = comp?.competitors ?? []
      const home = competitors.find((c) => c.homeAway === "home")?.team?.abbreviation
      const away = competitors.find((c) => c.homeAway === "away")?.team?.abbreviation
      if (!home || !away) continue
      games.push({
        week,
        home: fixTeam(home),
        away: fixTeam(away),
        kickoff: ev.date ?? null,
      })
    }
    return games
  } catch {
    return []
  }
}

/** Fetch the full regular-season schedule for a season (weeks 1-18). */
export async function fetchSchedule(season: number): Promise<ScheduleGame[]> {
  const weeks = Array.from({ length: MAX_WEEK }, (_, i) => i + 1)
  const perWeek = await Promise.all(weeks.map((w) => fetchWeek(season, w)))
  return perWeek.flat()
}
