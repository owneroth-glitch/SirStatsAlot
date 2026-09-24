import { sql } from "./db"
import type { GameLogEntry, IngestMeta, Player, SeasonStats, StatLine } from "./types"
import { addLine, deriveAdvanced, emptyLine, scoreLine } from "./scoring"
import { computeRatings } from "./rating"
import { POSITION_ORDER, TEAM_NAMES } from "./teams"

export const CURRENT_YEAR = 2026

interface PlayerRow {
  gsis_id: string
  name: string
  position: string
  team: string
  jersey_number: number | null
  height_in: number | null
  weight_lb: number | null
  birth_date: string | null
  college: string | null
  years_exp: number | null
  rookie_season: number | null
  draft_year: number | null
  draft_round: number | null
  draft_pick: number | null
  roster_status: string | null
  depth_position: string | null
  headshot: string | null
}

interface LogRow {
  player_id: string
  season: number
  week: number
  season_type: string
  team: string
  opponent: string
  stats: Partial<StatLine>
}

function ageFromBirth(birth: string | null): number {
  if (!birth) return 0
  const b = new Date(birth).getTime()
  if (Number.isNaN(b)) return 0
  const years = (Date.now() - b) / (365.25 * 24 * 60 * 60 * 1000)
  return Math.round(years * 10) / 10
}

function normalize(stats: Partial<StatLine>): StatLine {
  return { ...emptyLine(), ...stats }
}

function buildSeason(year: number, rows: LogRow[], fallbackTeam: string): SeasonStats {
  const games: GameLogEntry[] = rows
    .filter((r) => r.season_type === "REG")
    .sort((a, b) => a.week - b.week)
    .map((r) => {
      const s = normalize(r.stats)
      return {
        week: r.week,
        opp: r.opponent || "",
        home: true,
        seasonType: r.season_type,
        stats: s,
        std: scoreLine(s, "standard"),
        half: scoreLine(s, "half"),
        ppr: scoreLine(s, "ppr"),
      }
    })

  const totals = games.reduce((acc, g) => addLine(acc, g.stats), emptyLine())
  const team = games.length ? rows[rows.length - 1].team || fallbackTeam : fallbackTeam
  return { year, team, gp: games.length, totals, games }
}

/**
 * Read the full stat sheet from Neon and assemble typed Player objects with
 * derived advanced stats and ratings. Current season = CURRENT_YEAR; older
 * seasons become the player's history.
 */
export async function getStatSheet(): Promise<{
  players: Player[]
  positionOptions: { value: string; label: string }[]
  teamOptions: { value: string; label: string; hint?: string }[]
  meta: IngestMeta
}> {
  const [playerRows, logRows, metaRows] = await Promise.all([
    sql`SELECT gsis_id, name, position, team, jersey_number, height_in, weight_lb, birth_date,
               college, years_exp, rookie_season, draft_year, draft_round, draft_pick,
               roster_status, depth_position, headshot
        FROM nfl_players` as unknown as Promise<PlayerRow[]>,
    sql`SELECT player_id, season, week, season_type, team, opponent, stats
        FROM nfl_game_logs
        ORDER BY season DESC, week ASC` as unknown as Promise<LogRow[]>,
    sql`SELECT last_updated, current_season, current_week, player_count, game_count, status
        FROM nfl_ingest_meta WHERE id = 1`,
  ])

  const logsByPlayer = new Map<string, LogRow[]>()
  for (const r of logRows) {
    const arr = logsByPlayer.get(r.player_id)
    if (arr) arr.push(r)
    else logsByPlayer.set(r.player_id, [r])
  }

  // The "current" season shown in the stat sheet is the most recent season that
  // actually has data. nflverse publishes a season only once it is underway, so
  // before 2026 games exist this resolves to the latest completed season (e.g.
  // 2024). A refresh promotes newer seasons automatically as they publish.
  const displaySeason = logRows.length
    ? Math.max(...logRows.map((r) => r.season))
    : CURRENT_YEAR

  const players: Player[] = playerRows.map((row) => {
    const logs = logsByPlayer.get(row.gsis_id) ?? []
    const bySeason = new Map<number, LogRow[]>()
    for (const l of logs) {
      const arr = bySeason.get(l.season)
      if (arr) arr.push(l)
      else bySeason.set(l.season, [l])
    }

    const currentRows = bySeason.get(displaySeason) ?? []
    const season = buildSeason(displaySeason, currentRows, row.team)

    const history = [...bySeason.keys()]
      .filter((y) => y !== displaySeason)
      .sort((a, b) => b - a)
      .map((y) => buildSeason(y, bySeason.get(y)!, row.team))

    return {
      id: row.gsis_id,
      name: row.name,
      team: row.team,
      position: row.position,
      number: row.jersey_number ?? 0,
      heightIn: row.height_in ?? 0,
      weightLb: row.weight_lb ?? 0,
      age: ageFromBirth(row.birth_date),
      college: row.college ?? "—",
      experience: row.years_exp ?? 0,
      rookieSeason: row.rookie_season ?? 0,
      draftYear: row.draft_year ?? 0,
      draftRound: row.draft_round ?? 0,
      draftPick: row.draft_pick ?? 0,
      rosterStatus: row.roster_status ?? "",
      headshot: row.headshot ?? "",
      season,
      history,
      advanced: deriveAdvanced(season),
      ratings: {
        overall: 0,
        positionRank: 0,
        tradeValue: 0,
        tier: 0,
        consistency: 0,
        boomRate: 0,
        bustRate: 0,
        ppgPPR: 0,
      },
    }
  })

  computeRatings(players)

  const positions = [...new Set(players.map((p) => p.position).filter(Boolean))].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a)
    const ib = POSITION_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  const teams = [...new Set(players.map((p) => p.team).filter(Boolean))].sort()

  const displayWeek = logRows
    .filter((r) => r.season === displaySeason && r.season_type === "REG")
    .reduce((mx, r) => Math.max(mx, r.week), 0)

  const m = metaRows[0]
  const meta: IngestMeta = {
    lastUpdated: m?.last_updated ?? null,
    currentSeason: logRows.length ? displaySeason : (m?.current_season ?? null),
    currentWeek: logRows.length ? displayWeek : (m?.current_week ?? null),
    playerCount: Number(m?.player_count ?? players.length),
    gameCount: Number(m?.game_count ?? 0),
    status: m?.status ?? "idle",
  }

  return {
    players,
    positionOptions: positions.map((p) => ({ value: p, label: p })),
    teamOptions: teams.map((t) => ({ value: t, label: t, hint: TEAM_NAMES[t]?.split(" ").pop() })),
    meta,
  }
}
