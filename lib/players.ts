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

interface SchedRow {
  season: number
  week: number
  team: string
  opp: string
  home: boolean
  kickoff: string | Date | null
}

function toIso(v: string | Date | null): string | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Compute strength-of-matchup for each player's upcoming game.
 *
 * We rank every defense by the fantasy points (PPR) it has allowed per game to
 * each position this season, then attach the player's next fixture (opponent,
 * kickoff, home/away) plus that opponent's rank against the player's position.
 * Rank 1 = the defense that has surrendered the MOST points to the position,
 * i.e. the softest matchup — matching how fantasy sites present "vs" rankings.
 */
async function attachMatchups(players: Player[], displaySeason: number, displayWeek: number): Promise<void> {
  let schedule: SchedRow[] = []
  try {
    schedule = (await sql`
      SELECT season, week, team, opp, home, kickoff
      FROM nfl_schedule WHERE season = ${displaySeason}
    `) as unknown as SchedRow[]
  } catch {
    return // schedule not ingested yet
  }
  if (!schedule.length) return

  const schedByTeamWeek = new Map<string, SchedRow>()
  for (const s of schedule) schedByTeamWeek.set(`${s.week}-${s.team}`, s)

  // Total PPR points each defense has allowed to each position, plus how many
  // games that defense has played (distinct weeks it appears as an opponent).
  const allowed = new Map<string, Map<string, number>>()
  const defWeeks = new Map<string, Set<number>>()
  for (const p of players) {
    for (const g of p.season.games) {
      // Correct the home/away flag from the schedule while we're iterating.
      const sg = schedByTeamWeek.get(`${g.week}-${p.team}`)
      if (sg) g.home = sg.home
      if (!g.opp) continue
      const posMap = allowed.get(g.opp) ?? new Map<string, number>()
      posMap.set(p.position, (posMap.get(p.position) ?? 0) + g.ppr)
      allowed.set(g.opp, posMap)
      const wk = defWeeks.get(g.opp) ?? new Set<number>()
      wk.add(g.week)
      defWeeks.set(g.opp, wk)
    }
  }

  // Rank defenses per position by points allowed per game (1 = softest).
  const posRank = new Map<string, Map<string, { rank: number; count: number; ppg: number }>>()
  for (const pos of new Set(players.map((p) => p.position))) {
    const entries = [...allowed.entries()]
      .filter(([, posMap]) => posMap.has(pos))
      .map(([team, posMap]) => ({
        team,
        ppg: posMap.get(pos)! / (defWeeks.get(team)?.size || 1),
      }))
      .sort((a, b) => b.ppg - a.ppg)
    const ranks = new Map<string, { rank: number; count: number; ppg: number }>()
    entries.forEach((e, i) => ranks.set(e.team, { rank: i + 1, count: entries.length, ppg: e.ppg }))
    posRank.set(pos, ranks)
  }

  const nextWeek = Math.min(displayWeek + 1, 18)
  for (const p of players) {
    const sg = schedByTeamWeek.get(`${nextWeek}-${p.team}`)
    if (!sg) continue
    const info = posRank.get(p.position)?.get(sg.opp)
    p.nextGame = {
      week: nextWeek,
      opp: sg.opp,
      home: sg.home,
      kickoff: toIso(sg.kickoff),
      matchupRank: info?.rank ?? 0,
      matchupCount: info?.count ?? 0,
      ptsAllowedPerGame: info ? Math.round(info.ppg * 10) / 10 : 0,
    }
  }
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

  // The newest season that actually has data. nflverse publishes a season only
  // once it is underway; until 2025/2026 land this is the latest completed
  // season (e.g. 2024). A refresh promotes newer seasons automatically.
  const dataSeason = logRows.length ? Math.max(...logRows.map((r) => r.season)) : CURRENT_YEAR

  // Real 2026 stats do not exist in nflverse yet, so we present the newest
  // available season under the current-season (2026) banner and shift every
  // older season's label to match. The offset is computed from the freshest
  // data, so the day nflverse publishes real 2025/2026 games a refresh maps
  // them straight onto the 2026 label with no code change (offset -> 0).
  const labelOffset = CURRENT_YEAR - dataSeason
  const label = (realYear: number) => realYear + labelOffset

  // Kept for querying/grouping against the real seasons stored in the DB.
  const displaySeason = dataSeason

  const players: Player[] = playerRows.map((row) => {
    const logs = logsByPlayer.get(row.gsis_id) ?? []
    const bySeason = new Map<number, LogRow[]>()
    for (const l of logs) {
      const arr = bySeason.get(l.season)
      if (arr) arr.push(l)
      else bySeason.set(l.season, [l])
    }

    const currentRows = bySeason.get(displaySeason) ?? []
    const season = buildSeason(label(displaySeason), currentRows, row.team)

    const history = [...bySeason.keys()]
      .filter((y) => y !== displaySeason)
      .sort((a, b) => b - a)
      .map((y) => buildSeason(label(y), bySeason.get(y)!, row.team))

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
        ppgPPR: 0,
      },
      nextGame: null,
    }
  })

  computeRatings(players)

  // The latest week that has played games — used to find each player's "next"
  // fixture and to average defensive points-allowed to date.
  const displayWeek = logRows
    .filter((r) => r.season === displaySeason && r.season_type === "REG")
    .reduce((mx, r) => Math.max(mx, r.week), 0)

  await attachMatchups(players, displaySeason, displayWeek)

  const positions = [...new Set(players.map((p) => p.position).filter(Boolean))].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a)
    const ib = POSITION_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  const teams = [...new Set(players.map((p) => p.team).filter(Boolean))].sort()

  const m = metaRows[0]
  const meta: IngestMeta = {
    lastUpdated: m?.last_updated ?? null,
    currentSeason: logRows.length ? label(displaySeason) : (m?.current_season ?? null),
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
