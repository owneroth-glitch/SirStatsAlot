export type Position = "QB" | "RB" | "WR" | "TE"

export type ScoringFormat = "standard" | "half" | "ppr"

export const SCORING_LABELS: Record<ScoringFormat, string> = {
  standard: "Standard",
  half: "Half PPR",
  ppr: "PPR",
}

/** Raw counting stats for a game or a full season. */
export interface StatLine {
  cmp: number
  att: number
  passYds: number
  passTD: number
  int: number
  rushAtt: number
  rushYds: number
  rushTD: number
  tgt: number
  rec: number
  recYds: number
  recTD: number
  fumbles: number
}

export interface GameLogEntry {
  week: number
  opp: string
  home: boolean
  stats: StatLine
  std: number
  half: number
  ppr: number
}

export interface SeasonStats {
  year: number
  team: string
  gp: number
  totals: StatLine
  games: GameLogEntry[]
}

export interface SourceProjection {
  standard: number
  half: number
  ppr: number
}

export interface Projections {
  yahoo: SourceProjection
  espn: SourceProjection
  sleeper: SourceProjection
  average: SourceProjection
}

export interface Advanced {
  // Passing
  completionPct: number
  yardsPerAtt: number
  passerRating: number
  tdPct: number
  intPct: number
  // Rushing
  yardsPerCarry: number
  yardsAfterContactPerAtt: number
  brokenTackles: number
  // Receiving
  yardsPerRec: number
  yardsPerTarget: number
  catchRate: number
  aDOT: number
  yardsAfterCatch: number
  airYards: number
  // Usage
  targetShare: number
  snapPct: number
  redzoneTouches: number
  touchesPerGame: number
}

export interface Ratings {
  overall: number
  positionRank: number
  tradeValue: number
  tier: number
  consistency: number
  boomRate: number
  bustRate: number
  ppgPPR: number
}

export interface Player {
  id: string
  name: string
  team: string
  position: Position
  number: number
  heightIn: number
  weightLb: number
  age: number
  college: string
  experience: number
  byeWeek: number
  season: SeasonStats
  history: SeasonStats[]
  projections: Projections
  advanced: Advanced
  ratings: Ratings
}
