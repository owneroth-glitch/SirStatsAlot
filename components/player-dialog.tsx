"use client"

import { useState } from "react"
import type { Player, ScoringFormat, SeasonStats } from "@/lib/types"
import { Modal } from "./modal"
import { PositionBadge } from "./position-badge"
import { TradeValueBar } from "./trade-value-bar"
import { formatHeight, formatAge, num, ordinal } from "@/lib/format"
import { seasonPoints, pointsPerGame } from "@/lib/columns"
import { TEAM_NAMES } from "@/lib/players"
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
                {TEAM_NAMES[player.team] ?? player.team} · #{player.number} ·{" "}
                {ordinal(player.ratings.positionRank)} {player.position} · Tier {player.ratings.tier}
              </p>
            </div>
            <div className="flex gap-4">
              <HeaderStat label="Overall" value={String(player.ratings.overall)} />
              <HeaderStat label="Trade Val" value={String(player.ratings.tradeValue)} accent />
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
                    ? "border-emerald-600 text-foreground"
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
      <div className={cn("text-2xl font-bold tabular-nums", accent ? "text-emerald-600" : "text-foreground")}>
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

function OverviewTab({ player, format }: { player: Player; format: ScoringFormat }) {
  const bio = [
    { label: "Height", value: formatHeight(player.heightIn) },
    { label: "Weight", value: `${player.weightLb} lb` },
    { label: "Age", value: formatAge(player.age) },
    { label: "College", value: player.college },
    { label: "Experience", value: player.experience === 0 ? "Rookie" : `${player.experience} yrs` },
    { label: "Bye Week", value: String(player.byeWeek) },
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {bio.map((b) => (
          <div key={b.label} className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{b.label}</div>
            <div className="mt-0.5 font-semibold text-foreground">{b.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-muted-foreground">
        Season totals are updated from the latest completed games. Use the Game Log and Advanced tabs for the full 2026 sample.
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Season Pts" value={num(seasonPoints(player, format), 1)} />
        <MetricCard label="Pts / Game" value={num(pointsPerGame(player, format), 1)} />
        <MetricCard label="Consistency" value={`${player.ratings.consistency}/100`} />
        <MetricCard label="Boom / Bust" value={`${player.ratings.boomRate}% / ${player.ratings.bustRate}%`} />
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
            <th className="px-2 py-2 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {season.games.map((g) => {
            const pts = format === "ppr" ? g.ppr : format === "half" ? g.half : g.std
            return (
              <tr key={g.week} className="border-t border-border">
                <td className="px-2 py-1.5 text-left font-medium">{g.week}</td>
                <td className="px-2 py-1.5 text-left text-muted-foreground">
                  {g.home ? "vs " : "@ "}
                  {g.opp}
                </td>
                {isPasser && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.passYds}</td>}
                {isPasser && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.passTD}</td>}
                {isPasser && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.int}</td>}
                {isRusher && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.rushYds}</td>}
                {isRusher && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.rushTD}</td>}
                {isReceiver && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.rec}</td>}
                {isReceiver && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.recYds}</td>}
                {isReceiver && <td className="px-2 py-1.5 text-right tabular-nums">{g.stats.recTD}</td>}
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
  const seasons = [player.season, ...player.history]
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
        ["Completion %", `${a.completionPct}%`],
        ["Yards / Attempt", num(a.yardsPerAtt, 2)],
        ["Passer Rating", num(a.passerRating, 1)],
        ["TD %", `${a.tdPct}%`],
        ["INT %", `${a.intPct}%`],
      ],
    },
    {
      title: "Rushing",
      show: t.rushAtt > 0,
      items: [
        ["Yards / Carry", num(a.yardsPerCarry, 2)],
        ["Yds After Contact / Att", num(a.yardsAfterContactPerAtt, 2)],
        ["Broken Tackles", num(a.brokenTackles)],
      ],
    },
    {
      title: "Receiving",
      show: t.tgt > 0,
      items: [
        ["Yards / Reception", num(a.yardsPerRec, 2)],
        ["Yards / Target", num(a.yardsPerTarget, 2)],
        ["Catch Rate", `${a.catchRate}%`],
        ["aDOT", num(a.aDOT, 1)],
        ["Yards After Catch", num(a.yardsAfterCatch)],
        ["Air Yards", num(a.airYards)],
        ["Target Share", `${a.targetShare}%`],
      ],
    },
    {
      title: "Usage",
      show: true,
      items: [
        ["Snap Share", `${a.snapPct}%`],
        ["Touches / Game", num(a.touchesPerGame, 1)],
        ["Red Zone Touches", num(a.redzoneTouches)],
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
