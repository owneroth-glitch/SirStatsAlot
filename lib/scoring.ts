import type { StatLine, ScoringFormat, Advanced, SeasonStats } from "./types"

export function emptyLine(): StatLine {
  return {
    cmp: 0,
    att: 0,
    passYds: 0,
    passTD: 0,
    int: 0,
    sacks: 0,
    passAirYds: 0,
    passYAC: 0,
    passFirstDowns: 0,
    rushAtt: 0,
    rushYds: 0,
    rushTD: 0,
    rushFirstDowns: 0,
    tgt: 0,
    rec: 0,
    recYds: 0,
    recTD: 0,
    recAirYds: 0,
    recYAC: 0,
    recFirstDowns: 0,
    fumbles: 0,
    twoPt: 0,
    fgMade: 0,
    fgAtt: 0,
    patMade: 0,
    patAtt: 0,
    fgLong: 0,
    rushYAContact: 0,
    brokenTackles: 0,
    offSnaps: 0,
    teamSnaps: 0,
  }
}

/** Sum counting stats across a set of games (rate stats handled separately). */
export function addLine(a: StatLine, b: StatLine): StatLine {
  return {
    cmp: a.cmp + b.cmp,
    att: a.att + b.att,
    passYds: a.passYds + b.passYds,
    passTD: a.passTD + b.passTD,
    int: a.int + b.int,
    sacks: a.sacks + b.sacks,
    passAirYds: a.passAirYds + b.passAirYds,
    passYAC: a.passYAC + b.passYAC,
    passFirstDowns: a.passFirstDowns + b.passFirstDowns,
    rushAtt: a.rushAtt + b.rushAtt,
    rushYds: a.rushYds + b.rushYds,
    rushTD: a.rushTD + b.rushTD,
    rushFirstDowns: a.rushFirstDowns + b.rushFirstDowns,
    tgt: a.tgt + b.tgt,
    rec: a.rec + b.rec,
    recYds: a.recYds + b.recYds,
    recTD: a.recTD + b.recTD,
    recAirYds: a.recAirYds + b.recAirYds,
    recYAC: a.recYAC + b.recYAC,
    recFirstDowns: a.recFirstDowns + b.recFirstDowns,
    fumbles: a.fumbles + b.fumbles,
    twoPt: a.twoPt + b.twoPt,
    fgMade: a.fgMade + b.fgMade,
    fgAtt: a.fgAtt + b.fgAtt,
    patMade: a.patMade + b.patMade,
    patAtt: a.patAtt + b.patAtt,
    fgLong: Math.max(a.fgLong, b.fgLong),
    rushYAContact: a.rushYAContact + b.rushYAContact,
    brokenTackles: a.brokenTackles + b.brokenTackles,
    offSnaps: a.offSnaps + b.offSnaps,
    teamSnaps: a.teamSnaps + b.teamSnaps,
  }
}

/** Standard fantasy scoring for a stat line, including kicker points. */
export function scoreLine(s: StatLine, fmt: ScoringFormat): number {
  const offense =
    s.passYds * 0.04 +
    s.passTD * 4 -
    s.int * 2 +
    s.rushYds * 0.1 +
    s.rushTD * 6 +
    s.recYds * 0.1 +
    s.recTD * 6 -
    s.fumbles * 2 +
    s.twoPt * 2
  const recPts = fmt === "ppr" ? s.rec : fmt === "half" ? s.rec * 0.5 : 0
  // Simple kicker scoring: 3 per FG (+bonus for long), 1 per PAT.
  const kicking = s.fgMade * 3 + (s.fgLong >= 50 ? 2 : 0) + s.patMade
  return round1(offense + recPts + kicking)
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

const safe = (num: number, den: number, mult = 1): number => (den > 0 ? (num / den) * mult : 0)

/** NFL passer rating, clamped to the standard 0–158.3 range. */
export function passerRating(s: StatLine): number {
  if (s.att === 0) return 0
  const a = Math.max(0, Math.min(2.375, (s.cmp / s.att - 0.3) * 5))
  const b = Math.max(0, Math.min(2.375, (s.passYds / s.att - 3) * 0.25))
  const c = Math.max(0, Math.min(2.375, (s.passTD / s.att) * 20))
  const d = Math.max(0, Math.min(2.375, 2.375 - (s.int / s.att) * 25))
  return round1(((a + b + c + d) / 6) * 100)
}

/**
 * Derive advanced/efficiency stats from a season's totals and its game list.
 * Rate-based context stats (target share, EPA, etc.) are per-game averages.
 */
export function deriveAdvanced(season: SeasonStats): Advanced {
  const t = season.totals
  const gp = Math.max(season.gp, 1)

  const opportunities = t.rushAtt + t.tgt
  return {
    completionPct: safe(t.cmp, t.att, 100),
    yardsPerAtt: round2(safe(t.passYds, t.att)),
    passerRating: passerRating(t),
    tdPct: safe(t.passTD, t.att, 100),
    intPct: safe(t.int, t.att, 100),
    adjYardsPerAtt: round2(safe(t.passYds + 20 * t.passTD - 45 * t.int, t.att)),
    sackPct: safe(t.sacks, t.att + t.sacks, 100),
    yardsPerCarry: round2(safe(t.rushYds, t.rushAtt)),
    rushYdsPerGame: round1(t.rushYds / gp),
    yardsAfterContact: t.rushYAContact,
    yacPerCarry: round2(safe(t.rushYAContact, t.rushAtt)),
    brokenTackles: t.brokenTackles,
    yardsPerRec: round2(safe(t.recYds, t.rec)),
    yardsPerTarget: round2(safe(t.recYds, t.tgt)),
    catchRate: safe(t.rec, t.tgt, 100),
    aDOT: round1(safe(t.recAirYds, t.tgt)),
    yardsAfterCatch: t.recYAC,
    airYards: t.recAirYds,
    yacPerRec: round2(safe(t.recYAC, t.rec)),
    racr: t.recAirYds > 0 ? round2(t.recYds / t.recAirYds) : 0,
    snapShare: round1(safe(t.offSnaps, t.teamSnaps, 100)),
    touchesPerGame: round1(opportunities / gp),
    opportunities,
  }
}
