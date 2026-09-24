import { sql } from "./db"
import { fetchPlayers, fetchState, fetchWeekStats, headshotUrl, n, type SleeperStats } from "./sleeper"

// The current season is whatever Sleeper reports as live. We keep the three
// prior seasons as each player's history/career.
export const HISTORY_COUNT = 3
const MAX_WEEK = 18

/** Build the JSONB stat blob stored per game from a Sleeper weekly stat row. */
function statBlob(s: SleeperStats) {
  return {
    // Passing
    cmp: n(s.pass_cmp),
    att: n(s.pass_att),
    passYds: n(s.pass_yd),
    passTD: n(s.pass_td),
    int: n(s.pass_int),
    sacks: n(s.pass_sack),
    passAirYds: n(s.pass_air_yd),
    passYAC: 0,
    passFirstDowns: n(s.pass_fd),
    // Rushing
    rushAtt: n(s.rush_att),
    rushYds: n(s.rush_yd),
    rushTD: n(s.rush_td),
    rushFirstDowns: n(s.rush_fd),
    // Receiving
    tgt: n(s.rec_tgt),
    rec: n(s.rec),
    recYds: n(s.rec_yd),
    recTD: n(s.rec_td),
    recAirYds: n(s.rec_air_yd),
    recYAC: n(s.rec_yar), // receiving yards after the catch (recYds = recAirYds + rec_yar)
    recFirstDowns: n(s.rec_fd),
    // Misc
    fumbles: n(s.fum_lost),
    twoPt: n(s.pass_2pt) + n(s.rush_2pt) + n(s.rec_2pt),
    // Kicking
    fgMade: n(s.fgm),
    fgAtt: n(s.fgm) + n(s.fgmiss),
    patMade: n(s.xpm),
    patAtt: n(s.xpm) + n(s.xpmiss),
    fgLong: n(s.fgm_lng),
    // Sleeper-native advanced
    rushYAContact: n(s.rush_yac),
    brokenTackles: n(s.rush_btkl),
    offSnaps: n(s.off_snp),
    teamSnaps: n(s.tm_off_snp),
  }
}

/** Whether a weekly row represents a game the player was active for. */
function played(s: SleeperStats): boolean {
  return n(s.gp) >= 1 || n(s.off_snp) > 0 || n(s.tm_def_snp) > 0 || n(s.pts_ppr) !== 0
}

async function chunkedInsert(
  rows: unknown[][],
  build: (batch: unknown[][]) => { text: string; params: unknown[] },
  size: number,
) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size)
    const { text, params } = build(batch)
    await sql.query(text, params)
  }
}

export interface IngestResult {
  playerCount: number
  gameCount: number
  currentSeason: number
  currentWeek: number
}

/**
 * Full refresh from Sleeper: pull the live roster universe + bios, the current
 * season's played weeks, and the prior seasons for history, then upsert
 * everything into Neon. Safe to run repeatedly — every row is an upsert.
 */
export async function runIngest(): Promise<IngestResult> {
  await sql`UPDATE nfl_ingest_meta SET status = 'running' WHERE id = 1`

  try {
    const [state, players] = await Promise.all([fetchState(), fetchPlayers()])
    const currentSeason = state.season
    const currentWeek = Math.max(state.week, 0)
    const historySeasons = Array.from({ length: HISTORY_COUNT }, (_, i) => currentSeason - 1 - i)

    // Universe = players currently on an NFL roster or practice squad
    // (Sleeper sets `team` to null for free agents). Exclude team DEF units.
    const universe = new Map<string, (typeof players)[string]>()
    for (const [pid, p] of Object.entries(players)) {
      if (!p.team || !p.position || p.position === "DEF") continue
      universe.set(pid, p)
    }

    // Upsert player bios.
    const playerRows: unknown[][] = []
    for (const [pid, p] of universe) {
      const exp = typeof p.years_exp === "number" ? p.years_exp : null
      playerRows.push([
        pid,
        p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown",
        p.position || "",
        p.team || "",
        p.number ?? null,
        p.height ? Number.parseInt(p.height, 10) || null : null,
        p.weight ? Number.parseInt(p.weight, 10) || null : null,
        p.birth_date || null,
        p.college || null,
        exp,
        exp != null ? currentSeason - exp : null,
        null, // draft_year (not provided by Sleeper)
        null, // draft_round
        null, // draft_pick
        p.status || "",
        p.depth_chart_position || p.position || null,
        headshotUrl(pid),
      ])
    }

    await chunkedInsert(
      playerRows,
      (batch) => {
        const cols = 17
        const values = batch
          .map((_, i) => `(${Array.from({ length: cols }, (_, c) => `$${i * cols + c + 1}`).join(",")})`)
          .join(",")
        return {
          text: `INSERT INTO nfl_players
            (gsis_id, name, position, team, jersey_number, height_in, weight_lb, birth_date, college,
             years_exp, rookie_season, draft_year, draft_round, draft_pick, roster_status, depth_position, headshot)
            VALUES ${values}
            ON CONFLICT (gsis_id) DO UPDATE SET
              name = EXCLUDED.name, position = EXCLUDED.position, team = EXCLUDED.team,
              jersey_number = EXCLUDED.jersey_number, height_in = EXCLUDED.height_in,
              weight_lb = EXCLUDED.weight_lb, birth_date = EXCLUDED.birth_date, college = EXCLUDED.college,
              years_exp = EXCLUDED.years_exp, rookie_season = EXCLUDED.rookie_season,
              draft_year = EXCLUDED.draft_year, draft_round = EXCLUDED.draft_round,
              draft_pick = EXCLUDED.draft_pick, roster_status = EXCLUDED.roster_status,
              depth_position = EXCLUDED.depth_position, headshot = EXCLUDED.headshot`,
          params: batch.flat(),
        }
      },
      150,
    )

    // Weekly stats: current season (played weeks) + history seasons (full).
    let gameCount = 0
    const seasonPlan: { season: number; weeks: number[] }[] = [
      { season: currentSeason, weeks: range(1, Math.max(currentWeek, 0)) },
      ...historySeasons.map((s) => ({ season: s, weeks: range(1, MAX_WEEK) })),
    ]

    for (const { season, weeks } of seasonPlan) {
      if (weeks.length === 0) continue
      // Fetch a season's weeks in parallel, then insert.
      const weekly = await Promise.all(weeks.map((w) => fetchWeekStats(season, w).then((data) => ({ w, data }))))

      const logRows: unknown[][] = []
      for (const { w, data } of weekly) {
        for (const [pid, s] of Object.entries(data)) {
          if (!universe.has(pid) || !played(s)) continue
          logRows.push([pid, season, w, "REG", universe.get(pid)!.team || "", "", JSON.stringify(statBlob(s))])
        }
      }
      gameCount += logRows.length

      await chunkedInsert(
        logRows,
        (batch) => {
          const cols = 7
          const values = batch
            .map((_, i) => `(${Array.from({ length: cols }, (_, c) => `$${i * cols + c + 1}`).join(",")})`)
            .join(",")
          return {
            text: `INSERT INTO nfl_game_logs
              (player_id, season, week, season_type, team, opponent, stats)
              VALUES ${values}
              ON CONFLICT (player_id, season, week, season_type) DO UPDATE SET
                team = EXCLUDED.team, opponent = EXCLUDED.opponent, stats = EXCLUDED.stats`,
            params: batch.flat(),
          }
        },
        200,
      )
    }

    await sql`
      UPDATE nfl_ingest_meta SET
        status = 'idle',
        last_updated = now(),
        current_season = ${currentSeason},
        current_week = ${currentWeek},
        player_count = ${playerRows.length},
        game_count = ${gameCount}
      WHERE id = 1
    `

    return { playerCount: playerRows.length, gameCount, currentSeason, currentWeek }
  } catch (err) {
    await sql`UPDATE nfl_ingest_meta SET status = 'error' WHERE id = 1`
    throw err
  }
}

function range(start: number, end: number): number[] {
  const out: number[] = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}
