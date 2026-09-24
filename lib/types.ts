export type ScoringFormat = "standard" | "half" | "ppr"

export const SCORING_LABELS: Record<ScoringFormat, string> = {
  standard: "Standard",
  half: "Half PPR",
  ppr: "PPR",
}

/** Offensive fantasy-relevant positions that get a value rating. */
export const FANTASY_POSITIONS = ["QB", "RB", "WR", "TE", "K"] as const

/**
 * Raw counting stats for a single game or an aggregated season.
 * Field names mirror what we ingest from nflverse weekly player stats.
 */
export interface StatLine {
  // Passing
  cmp: number
  att: number
  passYds: number
  passTD: number
  int: number
  sacks: number
  passAirYds: number
  passYAC: number
  passFirstDowns: number
  // Rushing
  rushAtt: number
  rushYds: number
  rushTD: number
  rushFirstDowns: number
  // Receiving
  tgt: number
  rec: number
  recYds: number
  recTD: number
  recAirYds: number
  recYAC: number
  recFirstDowns: number
  // Misc
  fumbles: number
  twoPt: number
  // Kicking
  fgMade: number
  fgAtt: number
  patMade: number
  patAtt: number
  fgLong: number
  // Sleeper-native usage / efficiency (summed across games)
  rushYAContact: number
  brokenTackles: number
  offSnaps: number
  teamSnaps: number
}

export interface GameLogEntry {
  week: number
  opp: string
  home: boolean
  seasonType: string
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

export interface Advanced {
  // Passing
  completionPct: number
  yardsPerAtt: number
  passerRating: number
  tdPct: number
  intPct: number
  adjYardsPerAtt: number
  sackPct: number
  // Rushing
  yardsPerCarry: number
  rushYdsPerGame: number
  yardsAfterContact: number
  yacPerCarry: number
  brokenTackles: number
  // Receiving
  yardsPerRec: number
  yardsPerTarget: number
  catchRate: number
  aDOT: number
  yardsAfterCatch: number
  airYards: number
  yacPerRec: number
  racr: number
  // Usage / opportunity
  snapShare: number
  touchesPerGame: number
  opportunities: number
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
  position: string
  number: number
  heightIn: number
  weightLb: number
  age: number
  college: string
  experience: number
  rookieSeason: number
  draftYear: number
  draftRound: number
  draftPick: number
  rosterStatus: string
  headshot: string
  season: SeasonStats
  history: SeasonStats[]
  advanced: Advanced
  ratings: Ratings
}

export interface IngestMeta {
  lastUpdated: string | null
  currentSeason: number | null
  currentWeek: number | null
  playerCount: number
  gameCount: number
  status: string
}
