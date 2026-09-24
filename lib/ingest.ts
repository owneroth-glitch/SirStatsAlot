import { sql } from "./db"
import { fetchCSV, num, PLAYERS_URL, rosterUrl, statsUrl } from "./nflverse"

export const CURRENT_SEASON = 2026
// Seasons kept as player "history" (older than the current season).
export const HISTORY_SEASONS = [2025, 2024, 2023]

/** Build the JSONB stat blob stored per game from an nflverse weekly row. */
function statBlob(r: Record<string, string>) {
  return {
    cmp: num(r.completions),
    att: num(r.attempts),
    passYds: num(r.passing_yards),
    passTD: num(r.passing_tds),
    int: num(r.passing_interceptions ?? r.interceptions),
    sacks: num(r.sacks_suffered ?? r.sacks),
    passAirYds: num(r.passing_air_yards),
    passYAC: num(r.passing_yards_after_catch),
    passFirstDowns: num(r.passing_first_downs),
    rushAtt: num(r.carries ?? r.rushing_attempts),
    rushYds: num(r.rushing_yards),
    rushTD: num(r.rushing_tds),
    rushFirstDowns: num(r.rushing_first_downs),
    tgt: num(r.targets),
    rec: num(r.receptions),
    recYds: num(r.receiving_yards),
    recTD: num(r.receiving_tds),
    recAirYds: num(r.receiving_air_yards),
    recYAC: num(r.receiving_yards_after_catch),
    recFirstDowns: num(r.receiving_first_downs),
    fumbles: num(r.sack_fumbles_lost) + num(r.rushing_fumbles_lost) + num(r.receiving_fumbles_lost),
    twoPt:
      num(r.passing_2pt_conversions) + num(r.rushing_2pt_conversions) + num(r.receiving_2pt_conversions),
    fgMade: num(r.fg_made),
    fgAtt: num(r.fg_att),
    patMade: num(r.pat_made),
    patAtt: num(r.pat_att),
    fgLong: num(r.fg_long),
    epa: num(r.passing_epa) + num(r.rushing_epa) + num(r.receiving_epa),
    targetShare: num(r.target_share),
    airYardsShare: num(r.air_yards_share),
    wopr: num(r.wopr),
    cpoe: num(r.passing_cpoe ?? r.cpoe),
  }
}

async function chunkedInsert(rows: unknown[][], build: (batch: unknown[][]) => { text: string; params: unknown[] }, size: number) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size)
    const { text, params } = build(batch)
    await sql.query(text, params)
  }
}

export interface IngestResult {
  playerCount: number
  gameCount: number
  currentWeek: number
}

/**
 * Full refresh: pull the current roster universe + bios, plus current-season
 * and historical weekly stats, and upsert everything into Neon.
 */
export async function runIngest(): Promise<IngestResult> {
  await sql`UPDATE nfl_ingest_meta SET status = 'running' WHERE id = 1`

  try {
    const [bios, roster] = await Promise.all([fetchCSV(PLAYERS_URL), fetchCSV(rosterUrl(CURRENT_SEASON))])

    // Bios keyed by gsis id.
    const bioById = new Map<string, Record<string, string>>()
    for (const b of bios) {
      const id = b.gsis_id || b.gsis_it_id
      if (id) bioById.set(id, b)
    }

    // Universe = players present in the roster file's latest available week.
    const maxWeek = roster.reduce((m, r) => Math.max(m, num(r.week)), 0)
    const latest = new Map<string, Record<string, string>>()
    for (const r of roster) {
      if (num(r.week) !== maxWeek) continue
      const id = r.gsis_id
      if (id) latest.set(id, r)
    }

    const playerRows: unknown[][] = []
    for (const [id, r] of latest) {
      const bio = bioById.get(id) ?? {}
      const height = num(r.height) || num(bio.height)
      const weight = num(r.weight) || num(bio.weight)
      const birth = r.birth_date || bio.birth_date || null
      playerRows.push([
        id,
        r.player_name || r.full_name || bio.display_name || bio.full_name || "Unknown",
        r.position || bio.position || "",
        r.team || "",
        num(r.jersey_number) || null,
        height || null,
        weight || null,
        birth || null,
        bio.college_name || bio.college || r.college || null,
        num(r.years_exp),
        num(bio.rookie_season) || null,
        num(bio.draft_year ?? bio.entry_year) || null,
        num(bio.draft_round) || null,
        num(bio.draft_number ?? bio.draft_pick) || null,
        r.status || r.status_description_abbr || "",
        r.depth_chart_position || r.position || null,
        bio.headshot || bio.headshot_url || r.headshot_url || null,
      ])
    }

    // Upsert players in batches.
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

    // Weekly stats: current season + history. Only keep players in universe.
    const universe = new Set(latest.keys())
    let gameCount = 0
    const allSeasons = [CURRENT_SEASON, ...HISTORY_SEASONS]

    for (const season of allSeasons) {
      const stats = await fetchCSV(statsUrl(season))
      if (stats.length === 0) continue

      const logRows: unknown[][] = []
      for (const r of stats) {
        const pid = r.player_id || r.gsis_id
        if (!pid || !universe.has(pid)) continue
        const week = num(r.week)
        if (week === 0) continue
        logRows.push([
          pid,
          season,
          week,
          r.season_type || "REG",
          r.team || r.recent_team || "",
          r.opponent_team || r.opponent || "",
          JSON.stringify(statBlob(r)),
        ])
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
        120,
      )
    }

    // Current season/week = the most recent season that actually has REG data.
    // nflverse only publishes a season once it is underway, so before 2026
    // games exist this resolves to the latest completed season (e.g. 2024).
    const latestSeasonRow = await sql`
      SELECT season, COALESCE(MAX(week), 0) AS week
      FROM nfl_game_logs
      WHERE season_type = 'REG'
      GROUP BY season
      ORDER BY season DESC
      LIMIT 1
    `
    const currentSeason = Number(latestSeasonRow[0]?.season ?? CURRENT_SEASON)
    const currentWeek = Number(latestSeasonRow[0]?.week ?? 0)

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

    return { playerCount: playerRows.length, gameCount, currentWeek }
  } catch (err) {
    await sql`UPDATE nfl_ingest_meta SET status = 'error' WHERE id = 1`
    throw err
  }
}
