/** Client-safe static data (no server imports) shared by UI + data layer. */

export const TEAM_NAMES: Record<string, string> = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs",
  LA: "Los Angeles Rams",
  LAR: "Los Angeles Rams",
  LAC: "Los Angeles Chargers",
  LV: "Las Vegas Raiders",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SF: "San Francisco 49ers",
  SEA: "Seattle Seahawks",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
}

/** Preferred ordering for the position filter (fantasy-relevant first). */
export const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "FB", "OL", "DL", "LB", "DB", "DEF"]

/** Friendly labels for roster status codes coming from nflverse. */
export function rosterStatusLabel(code: string): string {
  const c = code.toUpperCase()
  if (c.startsWith("A")) return "Active"
  if (c.startsWith("P") || c === "DEV") return "Practice Squad"
  if (c.startsWith("R") || c === "IR") return "Injured Reserve"
  if (c.startsWith("E")) return "Exempt"
  if (c.startsWith("C")) return "Cut"
  return code || "—"
}
