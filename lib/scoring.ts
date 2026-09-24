import type { StatLine, ScoringFormat } from "./types"

export function emptyLine(): StatLine {
  return {
    cmp: 0,
    att: 0,
    passYds: 0,
    passTD: 0,
    int: 0,
    rushAtt: 0,
    rushYds: 0,
    rushTD: 0,
    tgt: 0,
    rec: 0,
    recYds: 0,
    recTD: 0,
    fumbles: 0,
  }
}

export function addLine(a: StatLine, b: StatLine): StatLine {
  return {
    cmp: a.cmp + b.cmp,
    att: a.att + b.att,
    passYds: a.passYds + b.passYds,
    passTD: a.passTD + b.passTD,
    int: a.int + b.int,
    rushAtt: a.rushAtt + b.rushAtt,
    rushYds: a.rushYds + b.rushYds,
    rushTD: a.rushTD + b.rushTD,
    tgt: a.tgt + b.tgt,
    rec: a.rec + b.rec,
    recYds: a.recYds + b.recYds,
    recTD: a.recTD + b.recTD,
    fumbles: a.fumbles + b.fumbles,
  }
}

/** Fantasy points for a stat line under a scoring format. */
export function scoreLine(s: StatLine, fmt: ScoringFormat): number {
  const base =
    s.passYds * 0.04 +
    s.passTD * 4 -
    s.int * 2 +
    s.rushYds * 0.1 +
    s.rushTD * 6 +
    s.recYds * 0.1 +
    s.recTD * 6 -
    s.fumbles * 2
  const recPts = fmt === "ppr" ? s.rec : fmt === "half" ? s.rec * 0.5 : 0
  return round1(base + recPts)
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
