import type {
  Player,
  Position,
  StatLine,
  GameLogEntry,
  SeasonStats,
  Projections,
  Advanced,
} from "./types"
import { emptyLine, addLine, scoreLine, round1, round2 } from "./scoring"
import { computeRatings } from "./rating"

export const CURRENT_YEAR = 2026

export const TEAMS: { abbr: string; name: string; bye: number }[] = [
  { abbr: "ARI", name: "Arizona Cardinals", bye: 11 },
  { abbr: "ATL", name: "Atlanta Falcons", bye: 12 },
  { abbr: "BAL", name: "Baltimore Ravens", bye: 14 },
  { abbr: "BUF", name: "Buffalo Bills", bye: 12 },
  { abbr: "CAR", name: "Carolina Panthers", bye: 11 },
  { abbr: "CHI", name: "Chicago Bears", bye: 7 },
  { abbr: "CIN", name: "Cincinnati Bengals", bye: 12 },
  { abbr: "CLE", name: "Cleveland Browns", bye: 10 },
  { abbr: "DAL", name: "Dallas Cowboys", bye: 7 },
  { abbr: "DEN", name: "Denver Broncos", bye: 14 },
  { abbr: "DET", name: "Detroit Lions", bye: 5 },
  { abbr: "GB", name: "Green Bay Packers", bye: 10 },
  { abbr: "HOU", name: "Houston Texans", bye: 14 },
  { abbr: "IND", name: "Indianapolis Colts", bye: 14 },
  { abbr: "JAX", name: "Jacksonville Jaguars", bye: 8 },
  { abbr: "KC", name: "Kansas City Chiefs", bye: 6 },
  { abbr: "LV", name: "Las Vegas Raiders", bye: 10 },
  { abbr: "LAC", name: "Los Angeles Chargers", bye: 5 },
  { abbr: "LAR", name: "Los Angeles Rams", bye: 6 },
  { abbr: "MIA", name: "Miami Dolphins", bye: 12 },
  { abbr: "MIN", name: "Minnesota Vikings", bye: 6 },
  { abbr: "NO", name: "New Orleans Saints", bye: 12 },
  { abbr: "NYG", name: "New York Giants", bye: 11 },
  { abbr: "NYJ", name: "New York Jets", bye: 12 },
  { abbr: "PHI", name: "Philadelphia Eagles", bye: 9 },
  { abbr: "SEA", name: "Seattle Seahawks", bye: 8 },
  { abbr: "SF", name: "San Francisco 49ers", bye: 14 },
  { abbr: "TB", name: "Tampa Bay Buccaneers", bye: 11 },
  { abbr: "WAS", name: "Washington Commanders", bye: 12 },
  { abbr: "IND2", name: "", bye: 0 },
]

export const TEAM_NAMES: Record<string, string> = Object.fromEntries(
  TEAMS.filter((t) => t.name).map((t) => [t.abbr, t.name]),
)

function byeFor(team: string): number {
  return TEAMS.find((t) => t.abbr === team)?.bye ?? 9
}

// --- Deterministic RNG so data is stable across renders ---
function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Seed {
  id: string
  name: string
  team: string
  pos: Position
  number: number
  heightIn: number
  weightLb: number
  age: number
  college: string
  exp: number
  // 2025 season totals
  gp: number
  cmp?: number
  att?: number
  passYds?: number
  passTD?: number
  int?: number
  rushAtt?: number
  rushYds?: number
  rushTD?: number
  tgt?: number
  rec?: number
  recYds?: number
  recTD?: number
}

const SEEDS: Seed[] = [
  // ---------------- QB ----------------
  { id: "josh-allen", name: "Josh Allen", team: "BUF", pos: "QB", number: 17, heightIn: 77, weightLb: 237, age: 29.4, college: "Wyoming", exp: 8, gp: 17, cmp: 307, att: 483, passYds: 3731, passTD: 28, int: 6, rushAtt: 102, rushYds: 531, rushTD: 12 },
  { id: "lamar-jackson", name: "Lamar Jackson", team: "BAL", pos: "QB", number: 8, heightIn: 74, weightLb: 205, age: 28.7, college: "Louisville", exp: 8, gp: 17, cmp: 316, att: 474, passYds: 4172, passTD: 41, int: 4, rushAtt: 139, rushYds: 915, rushTD: 4 },
  { id: "jalen-hurts", name: "Jalen Hurts", team: "PHI", pos: "QB", number: 1, heightIn: 73, weightLb: 223, age: 27.3, college: "Oklahoma", exp: 6, gp: 15, cmp: 292, att: 432, passYds: 2903, passTD: 18, int: 5, rushAtt: 150, rushYds: 630, rushTD: 14 },
  { id: "jayden-daniels", name: "Jayden Daniels", team: "WAS", pos: "QB", number: 5, heightIn: 76, weightLb: 210, age: 24.9, college: "LSU", exp: 2, gp: 17, cmp: 331, att: 480, passYds: 3568, passTD: 25, int: 9, rushAtt: 148, rushYds: 891, rushTD: 6 },
  { id: "joe-burrow", name: "Joe Burrow", team: "CIN", pos: "QB", number: 9, heightIn: 76, weightLb: 221, age: 28.9, college: "LSU", exp: 6, gp: 17, cmp: 460, att: 652, passYds: 4918, passTD: 43, int: 9, rushAtt: 42, rushYds: 201, rushTD: 2 },
  { id: "patrick-mahomes", name: "Patrick Mahomes", team: "KC", pos: "QB", number: 15, heightIn: 74, weightLb: 225, age: 30.1, college: "Texas Tech", exp: 9, gp: 16, cmp: 392, att: 581, passYds: 3928, passTD: 26, int: 11, rushAtt: 58, rushYds: 307, rushTD: 2 },
  { id: "baker-mayfield", name: "Baker Mayfield", team: "TB", pos: "QB", number: 6, heightIn: 73, weightLb: 215, age: 30.6, college: "Oklahoma", exp: 8, gp: 17, cmp: 407, att: 570, passYds: 4500, passTD: 41, int: 16, rushAtt: 61, rushYds: 378, rushTD: 3 },
  { id: "jared-goff", name: "Jared Goff", team: "DET", pos: "QB", number: 16, heightIn: 76, weightLb: 217, age: 31.1, college: "California", exp: 10, gp: 17, cmp: 390, att: 539, passYds: 4629, passTD: 37, int: 12, rushAtt: 24, rushYds: 56, rushTD: 1 },
  { id: "justin-herbert", name: "Justin Herbert", team: "LAC", pos: "QB", number: 10, heightIn: 78, weightLb: 236, age: 27.7, college: "Oregon", exp: 6, gp: 17, cmp: 331, att: 504, passYds: 3870, passTD: 23, int: 3, rushAtt: 55, rushYds: 306, rushTD: 2 },
  { id: "cj-stroud", name: "C.J. Stroud", team: "HOU", pos: "QB", number: 7, heightIn: 75, weightLb: 218, age: 24.2, college: "Ohio State", exp: 3, gp: 17, cmp: 319, att: 499, passYds: 3727, passTD: 20, int: 12, rushAtt: 53, rushYds: 242, rushTD: 3 },
  { id: "bo-nix", name: "Bo Nix", team: "DEN", pos: "QB", number: 10, heightIn: 74, weightLb: 217, age: 25.8, college: "Oregon", exp: 2, gp: 17, cmp: 375, att: 567, passYds: 3775, passTD: 29, int: 12, rushAtt: 92, rushYds: 430, rushTD: 4 },
  { id: "kyler-murray", name: "Kyler Murray", team: "ARI", pos: "QB", number: 1, heightIn: 70, weightLb: 207, age: 28.3, college: "Oklahoma", exp: 7, gp: 17, cmp: 368, att: 541, passYds: 3851, passTD: 21, int: 11, rushAtt: 78, rushYds: 572, rushTD: 5 },

  // ---------------- RB ----------------
  { id: "saquon-barkley", name: "Saquon Barkley", team: "PHI", pos: "RB", number: 26, heightIn: 72, weightLb: 233, age: 28.6, college: "Penn State", exp: 8, gp: 16, rushAtt: 345, rushYds: 2005, rushTD: 13, tgt: 43, rec: 33, recYds: 278, recTD: 2 },
  { id: "derrick-henry", name: "Derrick Henry", team: "BAL", pos: "RB", number: 22, heightIn: 75, weightLb: 247, age: 31.6, college: "Alabama", exp: 10, gp: 17, rushAtt: 325, rushYds: 1921, rushTD: 16, tgt: 22, rec: 19, recYds: 193, recTD: 2 },
  { id: "jahmyr-gibbs", name: "Jahmyr Gibbs", team: "DET", pos: "RB", number: 26, heightIn: 69, weightLb: 199, age: 23.6, college: "Alabama", exp: 3, gp: 17, rushAtt: 250, rushYds: 1412, rushTD: 16, tgt: 63, rec: 52, recYds: 517, recTD: 4 },
  { id: "bijan-robinson", name: "Bijan Robinson", team: "ATL", pos: "RB", number: 7, heightIn: 71, weightLb: 215, age: 23.9, college: "Texas", exp: 3, gp: 17, rushAtt: 304, rushYds: 1456, rushTD: 14, tgt: 72, rec: 61, recYds: 431, recTD: 1 },
  { id: "devon-achane", name: "De'Von Achane", team: "MIA", pos: "RB", number: 28, heightIn: 68, weightLb: 188, age: 24.1, college: "Texas A&M", exp: 3, gp: 17, rushAtt: 203, rushYds: 907, rushTD: 6, tgt: 87, rec: 78, recYds: 592, recTD: 6 },
  { id: "josh-jacobs", name: "Josh Jacobs", team: "GB", pos: "RB", number: 8, heightIn: 70, weightLb: 220, age: 27.7, college: "Alabama", exp: 7, gp: 17, rushAtt: 301, rushYds: 1329, rushTD: 15, tgt: 43, rec: 36, recYds: 342, recTD: 1 },
  { id: "kyren-williams", name: "Kyren Williams", team: "LAR", pos: "RB", number: 23, heightIn: 68, weightLb: 194, age: 25.2, college: "Notre Dame", exp: 4, gp: 16, rushAtt: 316, rushYds: 1299, rushTD: 14, tgt: 41, rec: 34, recYds: 182, recTD: 2 },
  { id: "jonathan-taylor", name: "Jonathan Taylor", team: "IND", pos: "RB", number: 28, heightIn: 70, weightLb: 226, age: 26.7, college: "Wisconsin", exp: 6, gp: 14, rushAtt: 303, rushYds: 1431, rushTD: 11, tgt: 24, rec: 18, recYds: 136, recTD: 1 },
  { id: "kenneth-walker", name: "Kenneth Walker III", team: "SEA", pos: "RB", number: 9, heightIn: 69, weightLb: 211, age: 24.9, college: "Michigan State", exp: 4, gp: 11, rushAtt: 153, rushYds: 573, rushTD: 7, tgt: 46, rec: 34, recYds: 299, recTD: 1 },
  { id: "chase-brown", name: "Chase Brown", team: "CIN", pos: "RB", number: 30, heightIn: 70, weightLb: 209, age: 25.4, college: "Illinois", exp: 3, gp: 16, rushAtt: 229, rushYds: 990, rushTD: 7, tgt: 54, rec: 43, recYds: 360, recTD: 4 },
  { id: "bucky-irving", name: "Bucky Irving", team: "TB", pos: "RB", number: 7, heightIn: 69, weightLb: 192, age: 23.1, college: "Oregon", exp: 2, gp: 17, rushAtt: 207, rushYds: 1122, rushTD: 8, tgt: 52, rec: 47, recYds: 392, recTD: 0 },
  { id: "james-cook", name: "James Cook", team: "BUF", pos: "RB", number: 4, heightIn: 71, weightLb: 190, age: 26.1, college: "Georgia", exp: 4, gp: 16, rushAtt: 207, rushYds: 1009, rushTD: 16, tgt: 38, rec: 32, recYds: 258, recTD: 2 },
  { id: "aaron-jones", name: "Aaron Jones", team: "MIN", pos: "RB", number: 33, heightIn: 69, weightLb: 208, age: 31.0, college: "UTEP", exp: 9, gp: 17, rushAtt: 255, rushYds: 1138, rushTD: 5, tgt: 63, rec: 51, recYds: 408, recTD: 2 },
  { id: "alvin-kamara", name: "Alvin Kamara", team: "NO", pos: "RB", number: 41, heightIn: 70, weightLb: 215, age: 30.4, college: "Tennessee", exp: 9, gp: 14, rushAtt: 228, rushYds: 950, rushTD: 6, tgt: 89, rec: 68, recYds: 543, recTD: 2 },
  { id: "joe-mixon", name: "Joe Mixon", team: "HOU", pos: "RB", number: 28, heightIn: 73, weightLb: 220, age: 29.4, college: "Oklahoma", exp: 9, gp: 14, rushAtt: 245, rushYds: 1016, rushTD: 11, tgt: 44, rec: 36, recYds: 309, recTD: 1 },
  { id: "david-montgomery", name: "David Montgomery", team: "DET", pos: "RB", number: 5, heightIn: 71, weightLb: 224, age: 28.4, college: "Iowa State", exp: 7, gp: 14, rushAtt: 185, rushYds: 775, rushTD: 12, tgt: 42, rec: 36, recYds: 341, recTD: 0 },
  { id: "breece-hall", name: "Breece Hall", team: "NYJ", pos: "RB", number: 20, heightIn: 71, weightLb: 217, age: 24.6, college: "Iowa State", exp: 4, gp: 16, rushAtt: 209, rushYds: 876, rushTD: 5, tgt: 76, rec: 57, recYds: 483, recTD: 3 },
  { id: "chuba-hubbard", name: "Chuba Hubbard", team: "CAR", pos: "RB", number: 30, heightIn: 71, weightLb: 210, age: 26.3, college: "Oklahoma State", exp: 5, gp: 15, rushAtt: 250, rushYds: 1195, rushTD: 10, tgt: 55, rec: 43, recYds: 171, recTD: 0 },

  // ---------------- WR ----------------
  { id: "jamarr-chase", name: "Ja'Marr Chase", team: "CIN", pos: "WR", number: 1, heightIn: 72, weightLb: 201, age: 25.7, college: "LSU", exp: 5, gp: 17, tgt: 175, rec: 127, recYds: 1708, recTD: 17 },
  { id: "justin-jefferson", name: "Justin Jefferson", team: "MIN", pos: "WR", number: 18, heightIn: 73, weightLb: 195, age: 26.4, college: "LSU", exp: 6, gp: 17, tgt: 154, rec: 103, recYds: 1533, recTD: 10 },
  { id: "ceedee-lamb", name: "CeeDee Lamb", team: "DAL", pos: "WR", number: 88, heightIn: 74, weightLb: 198, age: 26.7, college: "Oklahoma", exp: 6, gp: 15, tgt: 152, rec: 101, recYds: 1194, recTD: 6, rushAtt: 3, rushYds: 15, rushTD: 0 },
  { id: "amon-ra-st-brown", name: "Amon-Ra St. Brown", team: "DET", pos: "WR", number: 14, heightIn: 71, weightLb: 202, age: 26.0, college: "USC", exp: 5, gp: 17, tgt: 141, rec: 115, recYds: 1263, recTD: 12 },
  { id: "puka-nacua", name: "Puka Nacua", team: "LAR", pos: "WR", number: 17, heightIn: 74, weightLb: 201, age: 24.5, college: "BYU", exp: 3, gp: 11, tgt: 106, rec: 79, recYds: 990, recTD: 3 },
  { id: "malik-nabers", name: "Malik Nabers", team: "NYG", pos: "WR", number: 1, heightIn: 72, weightLb: 200, age: 22.4, college: "LSU", exp: 2, gp: 15, tgt: 170, rec: 109, recYds: 1204, recTD: 7 },
  { id: "brian-thomas", name: "Brian Thomas Jr.", team: "JAX", pos: "WR", number: 7, heightIn: 75, weightLb: 209, age: 23.2, college: "LSU", exp: 2, gp: 17, tgt: 133, rec: 87, recYds: 1282, recTD: 10 },
  { id: "aj-brown", name: "A.J. Brown", team: "PHI", pos: "WR", number: 11, heightIn: 72, weightLb: 226, age: 28.5, college: "Ole Miss", exp: 7, gp: 13, tgt: 96, rec: 67, recYds: 1079, recTD: 7 },
  { id: "nico-collins", name: "Nico Collins", team: "HOU", pos: "WR", number: 12, heightIn: 76, weightLb: 215, age: 26.7, college: "Michigan", exp: 5, gp: 12, tgt: 92, rec: 68, recYds: 1006, recTD: 7 },
  { id: "drake-london", name: "Drake London", team: "ATL", pos: "WR", number: 5, heightIn: 76, weightLb: 213, age: 24.3, college: "USC", exp: 4, gp: 17, tgt: 158, rec: 100, recYds: 1271, recTD: 9 },
  { id: "terry-mclaurin", name: "Terry McLaurin", team: "WAS", pos: "WR", number: 17, heightIn: 72, weightLb: 210, age: 30.1, college: "Ohio State", exp: 7, gp: 17, tgt: 117, rec: 82, recYds: 1096, recTD: 13 },
  { id: "mike-evans", name: "Mike Evans", team: "TB", pos: "WR", number: 13, heightIn: 77, weightLb: 231, age: 32.1, college: "Texas A&M", exp: 12, gp: 14, tgt: 89, rec: 74, recYds: 1004, recTD: 11 },
  { id: "tee-higgins", name: "Tee Higgins", team: "CIN", pos: "WR", number: 5, heightIn: 76, weightLb: 219, age: 26.8, college: "Clemson", exp: 6, gp: 12, tgt: 73, rec: 73, recYds: 911, recTD: 10 },
  { id: "davante-adams", name: "Davante Adams", team: "NYJ", pos: "WR", number: 17, heightIn: 73, weightLb: 215, age: 33.0, college: "Fresno State", exp: 12, gp: 14, tgt: 130, rec: 85, recYds: 1063, recTD: 8 },
  { id: "garrett-wilson", name: "Garrett Wilson", team: "NYJ", pos: "WR", number: 5, heightIn: 72, weightLb: 192, age: 25.4, college: "Ohio State", exp: 4, gp: 17, tgt: 154, rec: 101, recYds: 1104, recTD: 7 },
  { id: "dk-metcalf", name: "DK Metcalf", team: "SEA", pos: "WR", number: 14, heightIn: 76, weightLb: 235, age: 27.9, college: "Ole Miss", exp: 7, gp: 15, tgt: 108, rec: 66, recYds: 992, recTD: 5 },
  { id: "jaylen-waddle", name: "Jaylen Waddle", team: "MIA", pos: "WR", number: 17, heightIn: 70, weightLb: 182, age: 27.0, college: "Alabama", exp: 5, gp: 16, tgt: 99, rec: 58, recYds: 744, recTD: 2 },
  { id: "dj-moore", name: "DJ Moore", team: "CHI", pos: "WR", number: 2, heightIn: 72, weightLb: 210, age: 28.6, college: "Maryland", exp: 8, gp: 17, tgt: 140, rec: 98, recYds: 966, recTD: 6, rushAtt: 6, rushYds: 42, rushTD: 1 },
  { id: "courtland-sutton", name: "Courtland Sutton", team: "DEN", pos: "WR", number: 14, heightIn: 76, weightLb: 216, age: 30.2, college: "SMU", exp: 8, gp: 16, tgt: 135, rec: 81, recYds: 1081, recTD: 8 },
  { id: "ladd-mcconkey", name: "Ladd McConkey", team: "LAC", pos: "WR", number: 15, heightIn: 72, weightLb: 186, age: 24.0, college: "Georgia", exp: 2, gp: 16, tgt: 112, rec: 82, recYds: 1149, recTD: 7 },

  // ---------------- TE ----------------
  { id: "brock-bowers", name: "Brock Bowers", team: "LV", pos: "TE", number: 89, heightIn: 76, weightLb: 235, age: 23.0, college: "Georgia", exp: 2, gp: 17, tgt: 153, rec: 112, recYds: 1194, recTD: 5 },
  { id: "trey-mcbride", name: "Trey McBride", team: "ARI", pos: "TE", number: 85, heightIn: 76, weightLb: 246, age: 26.0, college: "Colorado State", exp: 4, gp: 16, tgt: 147, rec: 111, recYds: 1146, recTD: 2 },
  { id: "george-kittle", name: "George Kittle", team: "SF", pos: "TE", number: 85, heightIn: 76, weightLb: 250, age: 32.0, college: "Iowa", exp: 9, gp: 15, tgt: 78, rec: 59, recYds: 1106, recTD: 8 },
  { id: "sam-laporta", name: "Sam LaPorta", team: "DET", pos: "TE", number: 87, heightIn: 75, weightLb: 245, age: 24.6, college: "Iowa", exp: 3, gp: 17, tgt: 83, rec: 60, recYds: 726, recTD: 7 },
  { id: "travis-kelce", name: "Travis Kelce", team: "KC", pos: "TE", number: 87, heightIn: 77, weightLb: 250, age: 36.1, college: "Cincinnati", exp: 13, gp: 16, tgt: 133, rec: 97, recYds: 823, recTD: 3 },
  { id: "mark-andrews", name: "Mark Andrews", team: "BAL", pos: "TE", number: 89, heightIn: 77, weightLb: 247, age: 30.2, college: "Oklahoma", exp: 8, gp: 17, tgt: 69, rec: 55, recYds: 673, recTD: 11 },
  { id: "tj-hockenson", name: "T.J. Hockenson", team: "MIN", pos: "TE", number: 87, heightIn: 77, weightLb: 248, age: 28.4, college: "Iowa", exp: 7, gp: 10, tgt: 63, rec: 41, recYds: 455, recTD: 2 },
  { id: "jonnu-smith", name: "Jonnu Smith", team: "MIA", pos: "TE", number: 9, heightIn: 75, weightLb: 248, age: 30.4, college: "Florida International", exp: 9, gp: 17, tgt: 111, rec: 88, recYds: 884, recTD: 8 },
  { id: "david-njoku", name: "David Njoku", team: "CLE", pos: "TE", number: 85, heightIn: 76, weightLb: 246, age: 29.4, college: "Miami", exp: 9, gp: 11, tgt: 82, rec: 64, recYds: 505, recTD: 5 },
  { id: "dallas-goedert", name: "Dallas Goedert", team: "PHI", pos: "TE", number: 88, heightIn: 77, weightLb: 256, age: 30.7, college: "South Dakota State", exp: 8, gp: 10, tgt: 52, rec: 42, recYds: 496, recTD: 2 },
]

const OPP_POOL = TEAMS.filter((t) => t.name).map((t) => t.abbr)

function distributeContinuous(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  const raw = weights.map((w) => (w / sum) * total)
  const out = raw.map((r) => Math.round(r))
  // fix rounding drift on the highest-weight game
  const diff = total - out.reduce((a, b) => a + b, 0)
  if (diff !== 0) {
    let idx = 0
    for (let i = 1; i < weights.length; i++) if (weights[i] > weights[idx]) idx = i
    out[idx] = Math.max(0, out[idx] + diff)
  }
  return out
}

function distributeDiscrete(count: number, gp: number, rng: () => number): number[] {
  const out = new Array(gp).fill(0)
  for (let i = 0; i < count; i++) {
    out[Math.floor(rng() * gp)]++
  }
  return out
}

function buildSeason(seed: Seed, year: number, team: string, rng: () => number, scale = 1): SeasonStats {
  const gp = year === CURRENT_YEAR ? seed.gp : Math.max(10, Math.min(17, Math.round(seed.gp * (0.85 + rng() * 0.3))))
  const bye = byeFor(team)

  // per-game weights (game script variance)
  const weights = Array.from({ length: gp }, () => 0.55 + rng() * 0.9)

  const s = (v?: number) => Math.round((v ?? 0) * scale)
  const passYds = distributeContinuous(s(seed.passYds), weights)
  const cmp = distributeContinuous(s(seed.cmp), weights)
  const att = distributeContinuous(s(seed.att), weights)
  const rushYds = distributeContinuous(s(seed.rushYds), weights)
  const rushAtt = distributeContinuous(s(seed.rushAtt), weights)
  const recYds = distributeContinuous(s(seed.recYds), weights)
  const rec = distributeContinuous(s(seed.rec), weights)
  const tgt = distributeContinuous(s(seed.tgt), weights)
  const passTD = distributeDiscrete(s(seed.passTD), gp, rng)
  const rushTD = distributeDiscrete(s(seed.rushTD), gp, rng)
  const recTD = distributeDiscrete(s(seed.recTD), gp, rng)
  const int = distributeDiscrete(s(seed.int), gp, rng)
  const fumbleCount = Math.round((s(seed.rushAtt) + s(seed.rec)) / 180)
  const fumbles = distributeDiscrete(fumbleCount, gp, rng)

  const games: GameLogEntry[] = []
  let week = 1
  for (let i = 0; i < gp; i++) {
    if (week === bye) week++
    let opp = OPP_POOL[Math.floor(rng() * OPP_POOL.length)]
    if (opp === team) opp = OPP_POOL[(OPP_POOL.indexOf(opp) + 1) % OPP_POOL.length]
    const line: StatLine = {
      cmp: cmp[i], att: att[i], passYds: passYds[i], passTD: passTD[i], int: int[i],
      rushAtt: rushAtt[i], rushYds: rushYds[i], rushTD: rushTD[i],
      tgt: tgt[i], rec: rec[i], recYds: recYds[i], recTD: recTD[i], fumbles: fumbles[i],
    }
    games.push({
      week,
      opp,
      home: i % 2 === 0,
      stats: line,
      std: scoreLine(line, "standard"),
      half: scoreLine(line, "half"),
      ppr: scoreLine(line, "ppr"),
    })
    week++
  }

  const totals = games.reduce((acc, g) => addLine(acc, g.stats), emptyLine())
  return { year, team, gp, totals, games }
}

function buildAdvanced(pos: Position, t: StatLine, gp: number, rng: () => number): Advanced {
  const attSafe = t.att || 1
  const carriesSafe = t.rushAtt || 1
  const recSafe = t.rec || 1
  const tgtSafe = t.tgt || 1
  const passerRating = clampRating(
    ((Math.min(Math.max((t.cmp / attSafe - 0.3) * 5, 0), 2.375) +
      Math.min(Math.max((t.passYds / attSafe - 3) * 0.25, 0), 2.375) +
      Math.min((t.passTD / attSafe) * 20, 2.375) +
      Math.min(Math.max(2.375 - (t.int / attSafe) * 25, 0), 2.375)) /
      6) *
      100,
  )
  const aDOT = pos === "TE" ? 6 + rng() * 4 : pos === "RB" ? 1 + rng() * 3 : 9 + rng() * 6
  const yardsPerRec = t.rec ? t.recYds / t.rec : 0
  const yac = t.recYds * (0.35 + rng() * 0.25)
  const airYards = Math.max(0, t.recYds - yac + aDOT * (tgtSafe - t.rec) * 0.4)
  const touches = t.rushAtt + t.rec

  return {
    completionPct: round1((t.cmp / attSafe) * 100),
    yardsPerAtt: round2(t.passYds / attSafe),
    passerRating: round1(passerRating),
    tdPct: round1((t.passTD / attSafe) * 100),
    intPct: round1((t.int / attSafe) * 100),
    yardsPerCarry: round2(t.rushYds / carriesSafe),
    yardsAfterContactPerAtt: round2((t.rushYds / carriesSafe) * (0.5 + rng() * 0.15)),
    brokenTackles: Math.round(touches * (0.05 + rng() * 0.06)),
    yardsPerRec: round2(yardsPerRec),
    yardsPerTarget: round2(t.recYds / tgtSafe),
    catchRate: round1((t.rec / tgtSafe) * 100),
    aDOT: round1(aDOT),
    yardsAfterCatch: Math.round(yac),
    airYards: Math.round(airYards),
    targetShare: pos === "QB" ? 0 : round1((tgtSafe / (140 + rng() * 60)) * 100),
    snapPct: round1(pos === "QB" ? 98 + rng() : 55 + rng() * 40),
    redzoneTouches: Math.round((t.rushTD + t.recTD + t.passTD) * (1.4 + rng())),
    touchesPerGame: round1(touches / (gp || 1)),
  }
}

function clampRating(n: number): number {
  return Math.max(0, Math.min(158.3, n))
}

function buildProjections(current: SeasonStats, rng: () => number): Projections {
  const base = {
    standard: scoreLine(current.totals, "standard"),
    half: scoreLine(current.totals, "half"),
    ppr: scoreLine(current.totals, "ppr"),
  }
  // Each provider is a little optimistic/pessimistic in a stable way.
  const mk = (bias: number): { standard: number; half: number; ppr: number } => ({
    standard: round1(base.standard * bias),
    half: round1(base.half * bias),
    ppr: round1(base.ppr * bias),
  })
  const yahoo = mk(0.97 + rng() * 0.1)
  const espn = mk(0.95 + rng() * 0.12)
  const sleeper = mk(0.98 + rng() * 0.1)
  const average = {
    standard: round1((yahoo.standard + espn.standard + sleeper.standard) / 3),
    half: round1((yahoo.half + espn.half + sleeper.half) / 3),
    ppr: round1((yahoo.ppr + espn.ppr + sleeper.ppr) / 3),
  }
  return { yahoo, espn, sleeper, average }
}

function buildPlayer(seed: Seed): Player {
  const rng = mulberry32(hashString(seed.id))
  const season = buildSeason(seed, CURRENT_YEAR, seed.team, rng)
  const history: SeasonStats[] = []
  const pastYears = Math.min(seed.exp, 3)
  for (let k = 1; k <= pastYears; k++) {
    const scale = 0.78 + rng() * 0.3
    history.push(buildSeason(seed, CURRENT_YEAR - k, seed.team, rng, scale))
  }
  const advanced = buildAdvanced(seed.pos, season.totals, season.gp, rng)

  return {
    id: seed.id,
    name: seed.name,
    team: seed.team,
    position: seed.pos,
    number: seed.number,
    heightIn: seed.heightIn,
    weightLb: seed.weightLb,
    age: seed.age,
    college: seed.college,
    experience: seed.exp,
    byeWeek: byeFor(seed.team),
    season,
    history,
    projections: { yahoo: { standard: 0, half: 0, ppr: 0 }, espn: { standard: 0, half: 0, ppr: 0 }, sleeper: { standard: 0, half: 0, ppr: 0 }, average: { standard: 0, half: 0, ppr: 0 } },
    advanced,
    ratings: {
      overall: 0,
      positionRank: 0,
      tradeValue: 0,
      tier: 5,
      consistency: 0,
      boomRate: 0,
      bustRate: 0,
      ppgPPR: 0,
    },
  }
}

let cached: Player[] | null = null

export function getPlayers(): Player[] {
  if (cached) return cached
  cached = computeRatings(SEEDS.map(buildPlayer))
  return cached
}

export const ALL_TEAMS: string[] = Array.from(new Set(SEEDS.map((s) => s.team))).sort()
export const ALL_POSITIONS: Position[] = ["QB", "RB", "WR", "TE"]
