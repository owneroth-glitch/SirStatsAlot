"use client"

import { useState } from "react"
import type { Player, ScoringFormat, SeasonStats } from "@/lib/types"
import { Modal } from "./modal"
import { PositionBadge } from "./position-badge"
import { formatHeight, formatAge, num, ordinal } from "@/lib/format"
import { seasonPoints, pointsPerGame, highGame, lowGame } from "@/lib/columns"
import { TEAM_NAMES, rosterStatusLabel } from "@/lib/teams"
import { cn } from "@/lib/utils"

type Tab = "overview" | "gamelog" | "career" | "advanced"

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "gamelog", label: "Game Log" },
  { key: "career", label: "Career" },
  { key: "advanced", label: "Advanced" },
]

export function PlayerDialog({
  player,
  format,
  onClose,
}: {
  player: Player | null
  format: ScoringFormat
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>("overview")

  return (
    <Modal open={!!player} onClose={onClose}>
      {player && (
        <div>
          <header className="flex flex-wrap items-start gap-4 border-b border-border p-5 pr-12">
            <PositionBadge position={player.position} className="h-12 w-12 text-base" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-foreground">{player.name}</h2>
              <p className="text-sm text-muted-foreground">
                {TEAM_NAMES[player.team] ?? player.team}
                {player.number ? ` · #${player.number}` : ""}
                {player.ratings.positionRank
                  ? ` · ${ordinal(player.ratings.positionRank)} ${player.position} · Tier ${player.ratings.tier}`
                  : ` · ${player.position}`}
              </p>
            </div>
            <div className="flex gap-4">
              <HeaderStat label="Overall" value={player.ratings.overall ? String(player.ratings.overall) : "—"} />
              <HeaderStat label="Trade Val" value={player.ratings.tradeValue ? String(player.ratings.tradeValue) : "—"} accent />
            </div>
          </header>

          <nav className="flex gap-1 border-b border-border px-3">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  tab === t.key
                    ? "border-purple-800 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="p-5">
            {tab === "overview" && <OverviewTab player={player} format={format} />}
            {tab === "gamelog" && <GameLogTab season={player.season} format={format} />}
            {tab === "career" && <CareerTab player={player} format={format} />}
            {tab === "advanced" && <AdvancedTab player={player} />}
          </div>
        </div>
      )}
    </Modal>
  )
}

function HeaderStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className={cn("text-2xl font-bold tabular-nums", accent ? "text-purple-800" : "text-foreground")}>
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

function OverviewTab({ player, format }: { player: Player; format: ScoringFormat }) {
  const drafted =
    player.draftYear && player.draftRound
      ? `${player.draftYear} · R${player.draftRound}${player.draftPick ? ` P${player.draftPick}` : ""}`
      : "Undrafted"
  const bio = [
    { label: "Height", value: player.heightIn ? formatHeight(player.heightIn) : "—" },
    { label: "Weight", value: player.weightLb ? `${player.weightLb} lb` : "—" },
    { label: "Age", value: player.age ? formatAge(player.age) : "—" },
    { label: "College", value: player.college },
    { label: "Experience", value: player.experience === 0 ? "Rookie" : `${player.experience} yrs` },
    { label: "Status", value: rosterStatusLabel(player.rosterStatus) },
    { label: "Drafted", value: drafted },
  ]
  const hasStats = player.season.gp > 0
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {bio.map((b) => (
          <div key={b.label} className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{b.label}</div>
            <div className="mt-0.5 truncate font-semibold text-foreground" title={b.value}>
              {b.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 text-sm text-muted-foreground">
        {hasStats
          ? `${player.season.year} totals from ${player.season.gp} game${player.season.gp === 1 ? "" : "s"}. Use the Game Log and Advanced tabs for the full breakdown; prior seasons are under Career.`
          : `No ${player.season.year} game stats yet. Prior seasons are available under the Career tab.`}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Season Pts" value={num(seasonPoints(player, format), 1)} />
        <MetricCard label="Pts / Game" value={num(pointsPerGame(player, format), 1)} />
        <MetricCard label="Consistency" value={player.ratings.consistency ? `${player.ratings.consistency}/100` : "—"} />
        <MetricCard
          label="High / Low"
          value={player.season.gp ? `${num(highGame(player, format), 1)} / ${num(lowGame(player, format), 1)}` : "—"}
        />
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{value}</div>
    </div>
  )
}

function GameLogTab({ season, format }: { season: SeasonStats; format: ScoringFormat }) {
  const isPasser = season.totals.att > 0
  const isRusher = season.totals.rushAtt > 0
  const isReceiver = season.totals.tgt > 0
  if (season.games.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No {season.year} games logged yet.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-left font-semibold">Wk</th>
            <th className="px-2 py-2 text-left font-semibold">Opp</th>
            {isPasser && <th className="px-2 py-2 text-right font-semibold">Pass Yds</th>}
            {isPasser && <th className="px-2 py-2 text-right font-semibold">Pass TD</th>}
            {isPasser && <th className="px-2 py-2 text-right font-semibold">INT</th>}
            {isRusher && <th className="px-2 py-2 text-right font-semibold">Rush Yds</th>}
            {isRusher && <th className="px-2 py-2 text-right font-semibold">Rush TD</th>}
            {isReceiver && <th className="px-2 py-2 text-right font-semibold">Rec</th>}
            {isReceiver && <th className="px-2 py-2 text-right font-semibold">Rec Yds</th>}
            {isReceiver && <th className="px-2 py-2 text-right font-semibold">Rec TD</th>}
            <th className="px-2 py-2 text-right font-semibold">Snap%</th>
            <th className="px-2 py-2 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {season.games.map((g) => {
            const pts = format === "ppr" ? g.ppr : format === "half" ? g.half : g.std
            const snapPct = g.stats.teamSnaps > 0 ? Math.round((g.stats.offSnaps / g.stats.teamSnaps) * 100) : 0
            return (
              <tr key={g.week} className="border-t border-border">
                <td className="px-2 py-1.5 text-left font-medium">{g.week}</td>
                <td className="px-2 py-1.5 text-left text-muted-foreground">{g.opp || "—"}</td>
                {isPasser && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.passYds}</td>}
                {isPasser && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.passTD}</td>}
                {isPasser && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.int}</td>}
                {isRusher && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.rushYds}</td>}
                {isRusher && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.rushTD}</td>}
                {isReceiver && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.rec}</td>}
                {isReceiver && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.recYds}</td>}
                {isReceiver && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.recTD}</td>}
                <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                  {snapPct ? `${snapPct}%` : "—"}
                </td>
                <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{num(pts, 1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CareerTab({ player, format }: { player: Player; format: ScoringFormat }) {
  const seasons = [player.season, ...player.history].filter((s) => s.gp > 0)
  if (seasons.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No career game data available.</p>
  }
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Year</th>
              <th className="px-3 py-2 text-left font-semibold">Team</th>
              <th className="px-3 py-2 text-right font-semibold">GP</th>
              <th className="px-3 py-2 text-right font-semibold">Pass Yds</th>
              <th className="px-3 py-2 text-right font-semibold">Rush Yds</th>
              <th className="px-3 py-2 text-right font-semibold">Rec Yds</th>
              <th className="px-3 py-2 text-right font-semibold">Total TD</th>
              <th className="px-3 py-2 text-right font-semibold">Pts</th>
              <th className="px-3 py-2 text-right font-semibold">PPG</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => {
              const pts = seasonPointsFor(s, format)
              const td = s.totals.passTD + s.totals.rushTD + s.totals.recTD
              return (
                <tr key={s.year} className="border-t border-border">
                  <td className="px-3 py-2 text-left font-medium">{s.year}</td>
                  <td className="px-3 py-2 text-left text-muted-foreground">{s.team}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.gp}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.totals.passYds || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.totals.rushYds || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.totals.recYds || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{td}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{num(pts, 1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(s.gp ? pts / s.gp : 0, 1)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Prior seasons shown with {format.toUpperCase()} scoring. Open the Game Log tab for the current-season
        week-by-week breakdown.
      </p>
    </div>
  )
}

function AdvancedTab({ player }: { player: Player }) {
  const a = player.advanced
  const t = player.season.totals
  const groups: { title: string; show: boolean; items: [string, string][] }[] = [
    {
      title: "Passing",
      show: t.att > 0,
      items: [
        ["Completion %", `${num(a.completionPct, 1)}%`],
        ["Yards / Attempt", num(a.yardsPerAtt, 2)],
        ["Adj Yards / Att", num(a.adjYardsPerAtt, 2)],
        ["Passer Rating", num(a.passerRating, 1)],
        ["TD %", `${num(a.tdPct, 1)}%`],
        ["INT %", `${num(a.intPct, 1)}%`],
        ["Sack %", `${num(a.sackPct, 1)}%`],
      ],
    },
    {
      title: "Rushing",
      show: t.rushAtt > 0,
      items: [
        ["Yards / Carry", num(a.yardsPerCarry, 2)],
        ["Rush Yds / Game", num(a.rushYdsPerGame, 1)],
        ["Yards After Contact", num(a.yardsAfterContact)],
        ["YAC / Carry", num(a.yacPerCarry, 2)],
        ["Broken Tackles", num(a.brokenTackles)],
        ["Rush 1st Downs", num(t.rushFirstDowns)],
      ],
    },
    {
      title: "Receiving",
      show: t.tgt > 0,
      items: [
        ["Yards / Reception", num(a.yardsPerRec, 2)],
        ["Yards / Target", num(a.yardsPerTarget, 2)],
        ["Catch Rate", `${num(a.catchRate, 1)}%`],
        ["aDOT", num(a.aDOT, 1)],
        ["YAC", num(a.yardsAfterCatch)],
        ["YAC / Rec", num(a.yacPerRec, 2)],
        ["Air Yards", num(a.airYards)],
        ["RACR", num(a.racr, 2)],
      ],
    },
    {
      title: "Usage & Opportunity",
      show: true,
      items: [
        ["Snap Share", `${num(a.snapShare, 1)}%`],
        ["Touches / Game", num(a.touchesPerGame, 1)],
        ["Opportunities", num(a.opportunities)],
      ],
    },
  ]
  return (
    <div className="space-y-5">
      {groups
        .filter((g) => g.show)
        .map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 text-sm font-semibold text-foreground">{g.title}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {g.items.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

function seasonPointsFor(s: SeasonStats, format: ScoringFormat): number {
  const recPts = format === "ppr" ? s.totals.rec : format === "half" ? s.totals.rec * 0.5 : 0
  return (
    s.totals.passYds * 0.04 +
    s.totals.passTD * 4 -
    s.totals.int * 2 +
    s.totals.rushYds * 0.1 +
    s.totals.rushTD * 6 +
    s.totals.recYds * 0.1 +
    s.totals.recTD * 6 -
    s.totals.fumbles * 2 +
    recPts
  )
}
