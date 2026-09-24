import type { Player, ScoringFormat } from "./types"
import { scoreLine, round1 } from "./scoring"
import { num, pct } from "./format"

export type StatGroup = "fantasy" | "passing" | "rushing" | "receiving" | "advanced"

export interface StatColumn {
  key: string
  label: string
  tip: string
  group: StatGroup
  value: (p: Player, fmt: ScoringFormat) => number
  display: (p: Player, fmt: ScoringFormat) => string
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
export function projFor(p: Player, fmt: ScoringFormat): number {
  return p.projections.average[fmt]
}

const dash = (v: number, s: string, ok: boolean) => (ok ? s : "—")

export const COLUMNS: StatColumn[] = [
  // Fantasy
  { key: "proj", label: "PROJ", tip: "Projected season points (avg of Yahoo/ESPN/Sleeper)", group: "fantasy", value: projFor, display: (p, f) => num(projFor(p, f), 1) },
  { key: "pts", label: "PTS", tip: "Actual fantasy points this season", group: "fantasy", value: seasonPoints, display: (p, f) => num(seasonPoints(p, f), 1) },
  { key: "ppg", label: "PPG", tip: "Fantasy points per game", group: "fantasy", value: pointsPerGame, display: (p, f) => num(pointsPerGame(p, f), 1) },
  { key: "yahoo", label: "YAH", tip: "Yahoo projection", group: "fantasy", value: (p, f) => p.projections.yahoo[f], display: (p, f) => num(p.projections.yahoo[f], 1) },
  { key: "espn", label: "ESPN", tip: "ESPN projection", group: "fantasy", value: (p, f) => p.projections.espn[f], display: (p, f) => num(p.projections.espn[f], 1) },
  { key: "sleeper", label: "SLP", tip: "Sleeper projection", group: "fantasy", value: (p, f) => p.projections.sleeper[f], display: (p, f) => num(p.projections.sleeper[f], 1) },
  { key: "boom", label: "BOOM%", tip: "Share of games at 150%+ of average", group: "fantasy", value: (p) => p.ratings.boomRate, display: (p) => pct(p.ratings.boomRate) },
  { key: "bust", label: "BUST%", tip: "Share of games at 50% or less of average", group: "fantasy", value: (p) => p.ratings.bustRate, display: (p) => pct(p.ratings.bustRate) },
  { key: "cons", label: "CONS", tip: "Consistency score (0-100)", group: "fantasy", value: (p) => p.ratings.consistency, display: (p) => String(p.ratings.consistency) },

  // Passing
  { key: "cmp", label: "CMP", tip: "Completions", group: "passing", value: (p) => p.season.totals.cmp, display: (p) => dash(p.season.totals.att, num(p.season.totals.cmp), p.season.totals.att > 0) },
  { key: "patt", label: "ATT", tip: "Pass attempts", group: "passing", value: (p) => p.season.totals.att, display: (p) => dash(p.season.totals.att, num(p.season.totals.att), p.season.totals.att > 0) },
  { key: "cmppct", label: "CMP%", tip: "Completion percentage", group: "passing", value: (p) => p.advanced.completionPct, display: (p) => dash(p.season.totals.att, pct(p.advanced.completionPct), p.season.totals.att > 0) },
  { key: "pyds", label: "PYDS", tip: "Passing yards", group: "passing", value: (p) => p.season.totals.passYds, display: (p) => dash(p.season.totals.att, num(p.season.totals.passYds), p.season.totals.att > 0) },
  { key: "ypa", label: "Y/A", tip: "Yards per pass attempt", group: "passing", value: (p) => p.advanced.yardsPerAtt, display: (p) => dash(p.season.totals.att, num(p.advanced.yardsPerAtt, 2), p.season.totals.att > 0) },
  { key: "ptd", label: "PTD", tip: "Passing touchdowns", group: "passing", value: (p) => p.season.totals.passTD, display: (p) => dash(p.season.totals.att, num(p.season.totals.passTD), p.season.totals.att > 0) },
  { key: "int", label: "INT", tip: "Interceptions", group: "passing", value: (p) => p.season.totals.int, display: (p) => dash(p.season.totals.att, num(p.season.totals.int), p.season.totals.att > 0) },
  { key: "rate", label: "RATE", tip: "Passer rating", group: "passing", value: (p) => p.advanced.passerRating, display: (p) => dash(p.season.totals.att, num(p.advanced.passerRating, 1), p.season.totals.att > 0) },

  // Rushing
  { key: "ratt", label: "ATT", tip: "Rush attempts", group: "rushing", value: (p) => p.season.totals.rushAtt, display: (p) => dash(p.season.totals.rushAtt, num(p.season.totals.rushAtt), p.season.totals.rushAtt > 0) },
  { key: "ryds", label: "RYDS", tip: "Rushing yards", group: "rushing", value: (p) => p.season.totals.rushYds, display: (p) => dash(p.season.totals.rushAtt, num(p.season.totals.rushYds), p.season.totals.rushAtt > 0) },
  { key: "ypc", label: "Y/C", tip: "Yards per carry", group: "rushing", value: (p) => p.advanced.yardsPerCarry, display: (p) => dash(p.season.totals.rushAtt, num(p.advanced.yardsPerCarry, 2), p.season.totals.rushAtt > 0) },
  { key: "rtd", label: "RTD", tip: "Rushing touchdowns", group: "rushing", value: (p) => p.season.totals.rushTD, display: (p) => dash(p.season.totals.rushAtt, num(p.season.totals.rushTD), p.season.totals.rushAtt > 0) },
  { key: "yaco", label: "YCO/A", tip: "Yards after contact per attempt", group: "rushing", value: (p) => p.advanced.yardsAfterContactPerAtt, display: (p) => dash(p.season.totals.rushAtt, num(p.advanced.yardsAfterContactPerAtt, 2), p.season.totals.rushAtt > 0) },
  { key: "brk", label: "BRKT", tip: "Broken tackles", group: "rushing", value: (p) => p.advanced.brokenTackles, display: (p) => num(p.advanced.brokenTackles) },

  // Receiving
  { key: "tgt", label: "TGT", tip: "Targets", group: "receiving", value: (p) => p.season.totals.tgt, display: (p) => dash(p.season.totals.tgt, num(p.season.totals.tgt), p.season.totals.tgt > 0) },
  { key: "rec", label: "REC", tip: "Receptions", group: "receiving", value: (p) => p.season.totals.rec, display: (p) => dash(p.season.totals.tgt, num(p.season.totals.rec), p.season.totals.tgt > 0) },
  { key: "recyds", label: "RECYD", tip: "Receiving yards", group: "receiving", value: (p) => p.season.totals.recYds, display: (p) => dash(p.season.totals.tgt, num(p.season.totals.recYds), p.season.totals.tgt > 0) },
  { key: "ypr", label: "Y/R", tip: "Yards per reception", group: "receiving", value: (p) => p.advanced.yardsPerRec, display: (p) => dash(p.season.totals.rec, num(p.advanced.yardsPerRec, 2), p.season.totals.rec > 0) },
  { key: "ypt", label: "Y/TGT", tip: "Yards per target", group: "receiving", value: (p) => p.advanced.yardsPerTarget, display: (p) => dash(p.season.totals.tgt, num(p.advanced.yardsPerTarget, 2), p.season.totals.tgt > 0) },
  { key: "catch", label: "CATCH%", tip: "Catch rate", group: "receiving", value: (p) => p.advanced.catchRate, display: (p) => dash(p.season.totals.tgt, pct(p.advanced.catchRate), p.season.totals.tgt > 0) },
  { key: "rectd", label: "RTD", tip: "Receiving touchdowns", group: "receiving", value: (p) => p.season.totals.recTD, display: (p) => dash(p.season.totals.tgt, num(p.season.totals.recTD), p.season.totals.tgt > 0) },
  { key: "tgtsh", label: "TGT%", tip: "Target share", group: "receiving", value: (p) => p.advanced.targetShare, display: (p) => dash(p.season.totals.tgt, pct(p.advanced.targetShare), p.season.totals.tgt > 0) },

  // Advanced
  { key: "adot", label: "aDOT", tip: "Average depth of target", group: "advanced", value: (p) => p.advanced.aDOT, display: (p) => dash(p.season.totals.tgt, num(p.advanced.aDOT, 1), p.season.totals.tgt > 0) },
  { key: "yac", label: "YAC", tip: "Yards after catch", group: "advanced", value: (p) => p.advanced.yardsAfterCatch, display: (p) => dash(p.season.totals.tgt, num(p.advanced.yardsAfterCatch), p.season.totals.tgt > 0) },
  { key: "airyds", label: "AIR", tip: "Air yards", group: "advanced", value: (p) => p.advanced.airYards, display: (p) => dash(p.season.totals.tgt, num(p.advanced.airYards), p.season.totals.tgt > 0) },
  { key: "snap", label: "SNAP%", tip: "Snap share", group: "advanced", value: (p) => p.advanced.snapPct, display: (p) => pct(p.advanced.snapPct) },
  { key: "tpg", label: "TCH/G", tip: "Touches per game", group: "advanced", value: (p) => p.advanced.touchesPerGame, display: (p) => num(p.advanced.touchesPerGame, 1) },
  { key: "rz", label: "RZ TCH", tip: "Red zone touches", group: "advanced", value: (p) => p.advanced.redzoneTouches, display: (p) => num(p.advanced.redzoneTouches) },
  { key: "yaco2", label: "YCO/A", tip: "Yards after contact per attempt", group: "advanced", value: (p) => p.advanced.yardsAfterContactPerAtt, display: (p) => dash(p.season.totals.rushAtt, num(p.advanced.yardsAfterContactPerAtt, 2), p.season.totals.rushAtt > 0) },
  { key: "rate2", label: "RATE", tip: "Passer rating", group: "advanced", value: (p) => p.advanced.passerRating, display: (p) => dash(p.season.totals.att, num(p.advanced.passerRating, 1), p.season.totals.att > 0) },
]

export function columnsFor(group: StatGroup): StatColumn[] {
  return COLUMNS.filter((c) => c.group === group)
}
