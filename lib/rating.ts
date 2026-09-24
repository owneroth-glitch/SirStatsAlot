import type { Player, SeasonStats } from "./types"
import { FANTASY_POSITIONS } from "./types"
import { round1 } from "./scoring"

/**
 * Season used to evaluate a player's value: the current season once it has
 * games, otherwise the most recent prior season with games. This keeps trade
 * values meaningful in the preseason (based on last year) and rolls forward
 * automatically as 2026 games are played and refreshed in.
 */
function evalSeason(p: Player): SeasonStats {
  if (p.season.gp > 0) return p.season
  const prior = p.history.find((s) => s.gp > 0)
  return prior ?? p.season
}

/**
 * Season-long trade value model.
 *
 * Combines actual production, positional scarcity, age, durability, and
 * week-to-week consistency. A deliberately flat curve keeps elite players from
 * running away from useful depth — e.g. the top 16 RBs land much closer to
 * third-string backs than a raw points model would suggest.
 */

type FantasyPos = (typeof FANTASY_POSITIONS)[number]

function isFantasy(pos: string): pos is FantasyPos {
  return (FANTASY_POSITIONS as readonly string[]).includes(pos)
}

// Replacement level: points-per-game of a streamable starter at each position.
const REPLACEMENT_PPG: Record<FantasyPos, number> = {
  QB: 15,
  RB: 9,
  WR: 9,
  TE: 6,
  K: 7,
}

// Age where a position typically peaks; value decays past it.
const PEAK_AGE: Record<FantasyPos, number> = {
  QB: 28,
  RB: 24,
  WR: 26,
  TE: 27,
  K: 30,
}

function ageMultiplier(pos: FantasyPos, age: number): number {
  if (!age) return 1
  const peak = PEAK_AGE[pos]
  if (age <= peak) {
    return 1 + Math.min(peak - age, 4) * 0.02
  }
  const decayPerYear = pos === "RB" ? 0.07 : pos === "WR" ? 0.04 : 0.045
  return Math.max(0.55, 1 - (age - peak) * decayPerYear)
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function neutralRatings(rank: number): Player["ratings"] {
  return {
    overall: 0,
    positionRank: rank,
    tradeValue: 0,
    tier: 0,
    consistency: 0,
    boomRate: 0,
    bustRate: 0,
    ppgPPR: 0,
  }
}

/** Compute ratings for every player in place, using positional context. */
export function computeRatings(players: Player[]): Player[] {
  const byPos: Record<string, Player[]> = {}
  for (const p of players) {
    ;(byPos[p.position] ||= []).push(p)
  }

  for (const pos of Object.keys(byPos)) {
    const group = byPos[pos]

    // Non-fantasy positions (OL, DL, LB, DB, etc.) are catalogued but not
    // assigned a fantasy trade value — they simply rank by raw production.
    if (!isFantasy(pos)) {
      group.sort((a, b) => rawProduction(b) - rawProduction(a))
      group.forEach((p, i) => {
        p.ratings = neutralRatings(i + 1)
      })
      continue
    }

    group.sort((a, b) => rawValue(b, pos) - rawValue(a, pos))
    const rawValues = group.map((p) => rawValue(p, pos))
    const maxRaw = Math.max(...rawValues, 0.0001)
    const minRaw = Math.min(...rawValues)

    group.forEach((p, i) => {
      const weekly = evalSeason(p).games.map((g) => g.ppr)
      const ppg = weekly.length ? weekly.reduce((a, b) => a + b, 0) / weekly.length : 0
      const sd = stdev(weekly)
      const cv = ppg > 0 ? sd / ppg : 1
      const consistency = Math.max(0, Math.min(100, Math.round(100 - cv * 90)))
      const boomRate = weekly.length
        ? Math.round((weekly.filter((w) => w >= ppg * 1.5).length / weekly.length) * 100)
        : 0
      const bustRate = weekly.length
        ? Math.round((weekly.filter((w) => w <= ppg * 0.5).length / weekly.length) * 100)
        : 0

      const norm = maxRaw === minRaw ? 0 : (rawValues[i] - minRaw) / (maxRaw - minRaw)
      // Concave curve (exponent < 1) lifts mid/low players toward the top,
      // compressing the elite tier so studs and depth stay relatively close —
      // e.g. a top-16 RB isn't miles ahead of a third-stringer. The scale still
      // stretches to the low 90s so the very best players read as elite.
      const curved = Math.pow(norm, 0.62)
      const overall = Math.round(55 + curved * 39) // 55–94
      const tradeValue = Math.round(20 + curved * 59) // 20–79

      p.ratings = {
        overall,
        positionRank: i + 1,
        tradeValue,
        tier: tierFor(i + 1),
        consistency,
        boomRate,
        bustRate,
        ppgPPR: round1(ppg),
      }
    })
  }

  return players
}

function rawValue(p: Player, pos: FantasyPos): number {
  const s = evalSeason(p)
  const games = Math.max(s.gp, 1)
  const ppg = s.gp ? s.games.reduce((sum, g) => sum + g.ppr, 0) / s.gp : 0
  const vor = Math.max(0, ppg - REPLACEMENT_PPG[pos])
  const ageAdj = ageMultiplier(pos, p.age)
  const durability = 0.9 + (games / 17) * 0.1
  return vor * ageAdj * durability
}

/** Non-fantasy players: just total yards + TDs so the list has a sane order. */
function rawProduction(p: Player): number {
  const t = evalSeason(p).totals
  return t.passYds + t.rushYds + t.recYds + (t.passTD + t.rushTD + t.recTD) * 10
}

function tierFor(rank: number): number {
  if (rank <= 3) return 1
  if (rank <= 8) return 2
  if (rank <= 16) return 3
  if (rank <= 24) return 4
  return 5
}
