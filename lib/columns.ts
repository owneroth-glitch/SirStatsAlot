import type { Player, ScoringFormat } from "./types"
import { scoreLine, round1 } from "./scoring"
import { num, pct } from "./format"

export type StatGroup = "fantasy" | "passing" | "rushing" | "receiving" | "advanced"

export interface StatColumn {
  key: string
  label: string
  tip: string
  group: StatGroup
  /** "count" stats can be shown as per-game; "rate" stats are shown as-is. */
  kind: "count" | "rate"
  value: (p: Player, fmt: ScoringFormat) => number
  display: (p: Player, fmt: ScoringFormat) => string
  /** Whether the stat is meaningful for the player (else render a dash). */
  guard: (p: Player) => boolean
}

export const STAT_GROUPS: { key: StatGroup; label: string }[] = [
  { key: "fantasy", label: "Fantasy" },
  { key: "passing", label: "Passing" },
  { key: "rushing", label: "Rushing" },
  { key: "receiving", label: "Receiving" },
  { key: "advanced", label: "Advanced" },
]

export function seasonPoints(p: Player, fmt: ScoringFormat): number {
  return scoreLine(p.season.totals, fmt)
}
export function pointsPerGame(p: Player, fmt: ScoringFormat): number {
  return p.season.gp ? round1(seasonPoints(p, fmt) / p.season.gp) : 0
}

const always = () => true
const hasPass = (p: Player) => p.season.totals.att > 0
const hasRush = (p: Player) => p.season.totals.rushAtt > 0
const hasRec = (p: Player) => p.season.totals.tgt > 0

function count(
  key: string,
  label: string,
  tip: string,
  group: StatGroup,
  get: (p: Player, f: ScoringFormat) => number,
  guard: (p: Player) => boolean = always,
  digits = 0,
): StatColumn {
  return {
    key,
    label,
    tip,
    group,
    kind: "count",
    value: get,
    guard,
    display: (p, f) => (guard(p) ? num(get(p, f), digits) : "—"),
  }
}

function rate(
  key: string,
  label: string,
  tip: string,
  group: StatGroup,
  get: (p: Player, f: ScoringFormat) => number,
  fmt: (n: number) => string,
  guard: (p: Player) => boolean = always,
): StatColumn {
  return {
    key,
    label,
    tip,
    group,
    kind: "rate",
    value: get,
    guard,
    display: (p, f) => (guard(p) ? fmt(get(p, f)) : "—"),
  }
}

const d1 = (n: number) => num(n, 1)
const d2 = (n: number) => num(n, 2)

export const COLUMNS: StatColumn[] = [
  // Fantasy
  count("pts", "PTS", "Fantasy points (per game when toggled)", "fantasy", (p, f) => seasonPoints(p, f), always, 1),
  rate("ppg", "PPG", "Fantasy points per game", "fantasy", (p, f) => pointsPerGame(p, f), d1),
  rate("games", "GP", "Games played", "fantasy", (p) => p.season.gp, (n) => num(n)),
  rate("cons", "CONS", "Consistency score (0-100)", "fantasy", (p) => p.ratings.consistency, (n) => String(n)),
  rate("boom", "BOOM%", "Share of games at 150%+ of average", "fantasy", (p) => p.ratings.boomRate, pct),
  rate("bust", "BUST%", "Share of games at 50% or less of average", "fantasy", (p) => p.ratings.bustRate, pct),

  // Passing
  count("cmp", "CMP", "Completions", "passing", (p) => p.season.totals.cmp, hasPass),
  count("patt", "ATT", "Pass attempts", "passing", (p) => p.season.totals.att, hasPass),
  rate("cmppct", "CMP%", "Completion percentage", "passing", (p) => p.advanced.completionPct, pct, hasPass),
  count("pyds", "PYDS", "Passing yards", "passing", (p) => p.season.totals.passYds, hasPass),
  rate("ypa", "Y/A", "Yards per pass attempt", "passing", (p) => p.advanced.yardsPerAtt, d2, hasPass),
  rate("aya", "AY/A", "Adjusted yards per attempt (TD/INT weighted)", "passing", (p) => p.advanced.adjYardsPerAtt, d2, hasPass),
  count("ptd", "PTD", "Passing touchdowns", "passing", (p) => p.season.totals.passTD, hasPass),
  count("int", "INT", "Interceptions", "passing", (p) => p.season.totals.int, hasPass),
  count("sack", "SACK", "Times sacked", "passing", (p) => p.season.totals.sacks, hasPass),
  rate("rate", "RATE", "Passer rating", "passing", (p) => p.advanced.passerRating, d1, hasPass),

  // Rushing
  count("ratt", "ATT", "Rush attempts", "rushing", (p) => p.season.totals.rushAtt, hasRush),
  count("ryds", "RYDS", "Rushing yards", "rushing", (p) => p.season.totals.rushYds, hasRush),
  rate("ypc", "Y/C", "Yards per carry", "rushing", (p) => p.advanced.yardsPerCarry, d2, hasRush),
  count("rtd", "RTD", "Rushing touchdowns", "rushing", (p) => p.season.totals.rushTD, hasRush),
  count("r1d", "1D", "Rushing first downs", "rushing", (p) => p.season.totals.rushFirstDowns, hasRush),
  rate("rypg", "RY/G", "Rushing yards per game", "rushing", (p) => p.advanced.rushYdsPerGame, d1, hasRush),
  count("yaco", "YACON", "Rushing yards after contact", "rushing", (p) => p.advanced.yardsAfterContact, hasRush),
  rate("yacoa", "YCON/A", "Yards after contact per carry", "rushing", (p) => p.advanced.yacPerCarry, d2, hasRush),
  count("btk", "BRKTK", "Broken/missed tackles forced (rushing)", "rushing", (p) => p.advanced.brokenTackles, hasRush),

  // Receiving
  count("tgt", "TGT", "Targets", "receiving", (p) => p.season.totals.tgt, hasRec),
  count("rec", "REC", "Receptions", "receiving", (p) => p.season.totals.rec, hasRec),
  count("recyds", "RECYD", "Receiving yards", "receiving", (p) => p.season.totals.recYds, hasRec),
  rate("ypr", "Y/R", "Yards per reception", "receiving", (p) => p.advanced.yardsPerRec, d2, hasRec),
  rate("ypt", "Y/TGT", "Yards per target", "receiving", (p) => p.advanced.yardsPerTarget, d2, hasRec),
  rate("catch", "CATCH%", "Catch rate", "receiving", (p) => p.advanced.catchRate, pct, hasRec),
  count("rectd", "RTD", "Receiving touchdowns", "receiving", (p) => p.season.totals.recTD, hasRec),

  // Advanced
  rate("snap", "SNAP%", "Share of team offensive snaps", "advanced", (p) => p.advanced.snapShare, pct),
  rate("adot", "aDOT", "Average depth of target", "advanced", (p) => p.advanced.aDOT, d1, hasRec),
  count("yac", "YAC", "Receiving yards after catch", "advanced", (p) => p.advanced.yardsAfterCatch, hasRec),
  count("air", "AIR", "Receiving air yards", "advanced", (p) => p.advanced.airYards, hasRec),
  rate("yacr", "YAC/R", "Yards after catch per reception", "advanced", (p) => p.advanced.yacPerRec, d2, hasRec),
  rate("racr", "RACR", "Receiver air conversion ratio", "advanced", (p) => p.advanced.racr, d2, hasRec),
  rate("tpg", "TCH/G", "Touches per game", "advanced", (p) => p.advanced.touchesPerGame, d1),
]

export function columnsFor(group: StatGroup): StatColumn[] {
  return COLUMNS.filter((c) => c.group === group)
}
