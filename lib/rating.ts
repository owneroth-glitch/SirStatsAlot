import type { Player, Position } from "./types"
import { round1 } from "./scoring"

/**
 * Season-long trade value model.
 *
 * Combines projected production (PPR points per game, the strongest signal of
 * fantasy value), positional scarcity (a replacement-level baseline per
 * position), a dynasty-style age curve, and week-to-week consistency. The
 * result is normalized to a 1-100 scale that is comparable across positions so
 * it can be used to weigh trades.
 */

// Replacement level: points-per-game of a streamable starter at each position.
const REPLACEMENT_PPG: Record<Position, number> = {
  QB: 15,
  RB: 9,
  WR: 9,
  TE: 6,
}

// Age where a position typically peaks; value decays past it.
const PEAK_AGE: Record<Position, number> = {
  QB: 28,
  RB: 24,
  WR: 26,
  TE: 27,
}

function ageMultiplier(pos: Position, age: number): number {
  const peak = PEAK_AGE[pos]
  if (age <= peak) {
    // Slight bump for players still ascending toward their peak.
    return 1 + Math.min(peak - age, 4) * 0.02
  }
  // RBs fall off a cliff; others decline more gently.
  const decayPerYear = pos === "RB" ? 0.07 : pos === "WR" ? 0.04 : 0.045
  return Math.max(0.55, 1 - (age - peak) * decayPerYear)
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/** Compute ratings for every player in place, using positional context. */
export function computeRatings(players: Player[]): Player[] {
  // Positional ranking by average projected PPR points.
  const byPos: Record<string, Player[]> = {}
  for (const p of players) {
    ;(byPos[p.position] ||= []).push(p)
  }

  for (const pos of Object.keys(byPos)) {
    const group = byPos[pos]
    group.sort((a, b) => b.projections.average.ppr - a.projections.average.ppr)

    const rawValues = group.map((p) => rawValue(p))
    const maxRaw = Math.max(...rawValues)
    const minRaw = Math.min(...rawValues)

    group.forEach((p, i) => {
      const weekly = p.season.games.map((g) => g.ppr)
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

      const norm = maxRaw === minRaw ? 1 : (rawValues[i] - minRaw) / (maxRaw - minRaw)
      const overall = Math.round(55 + norm * 44) // 55-99
      const tradeValue = Math.round(4 + norm * 95) // 4-99

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

function rawValue(p: Player): number {
  const games = Math.max(p.season.gp, 1)
  const ppg = p.projections.average.ppr / 17 // projected per-game
  const vor = Math.max(0, ppg - REPLACEMENT_PPG[p.position])
  const ageAdj = ageMultiplier(p.position, p.age)
  // Durability nudge: reward players who stayed on the field.
  const durability = 0.9 + (games / 17) * 0.1
  return vor * ageAdj * durability
}

function tierFor(rank: number): number {
  if (rank <= 3) return 1
  if (rank <= 8) return 2
  if (rank <= 16) return 3
  if (rank <= 24) return 4
  return 5
}
