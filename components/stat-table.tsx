"use client"

import { memo } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import type { Player, ScoringFormat } from "@/lib/types"
import type { StatColumn } from "@/lib/columns"
import { cn } from "@/lib/utils"
import { formatKickoff, ordinal } from "@/lib/format"
import { PositionBadge } from "./position-badge"
import { TradeValueBar } from "./trade-value-bar"

interface StatTableProps {
  players: Player[]
  columns: StatColumn[]
  format: ScoringFormat
  sortKey: string
  sortDir: "asc" | "desc"
  onSort: (key: string) => void
  onSelectPlayer: (id: string) => void
  compareIds: string[]
  onToggleCompare: (id: string) => void
  perGame?: boolean
}

export function StatTable({
  players,
  columns,
  format,
  sortKey,
  sortDir,
  onSort,
  onSelectPlayer,
  compareIds,
  onToggleCompare,
  perGame = false,
}: StatTableProps) {
  return (
    <div className="overflow-auto rounded-lg border border-border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <th className="sticky left-0 z-30 bg-muted px-2 py-2.5 text-center font-semibold">#</th>
            <th className="sticky left-9 z-30 min-w-56 bg-muted px-3 py-2.5 text-left font-semibold">Player</th>
            <SortableTh label="OVR" tip="Overall rating" active={sortKey === "ovr"} dir={sortDir} onClick={() => onSort("ovr")} />
            <SortableTh label="VALUE" tip="Trade value (0-100)" active={sortKey === "val"} dir={sortDir} onClick={() => onSort("val")} wide />
            {columns.map((c) => (
              <SortableTh
                key={c.key}
                label={c.label}
                tip={c.tip}
                active={sortKey === c.key}
                dir={sortDir}
                onClick={() => onSort(c.key)}
              />
            ))}
            <th className="px-2 py-2.5 text-center font-semibold">CMP</th>
          </tr>
        </thead>
        <tbody className="[counter-reset:rownum]">
          {players.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              columns={columns}
              format={format}
              perGame={perGame}
              inCompare={compareIds.includes(p.id)}
              onSelect={onSelectPlayer}
              onToggleCompare={onToggleCompare}
            />
          ))}
          {players.length === 0 && (
            <tr>
              <td colSpan={columns.length + 5} className="px-4 py-16 text-center text-muted-foreground">
                No players match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

interface PlayerRowProps {
  player: Player
  columns: StatColumn[]
  format: ScoringFormat
  perGame: boolean
  inCompare: boolean
  onSelect: (id: string) => void
  onToggleCompare: (id: string) => void
}

const PlayerRow = memo(function PlayerRow({
  player: p,
  columns,
  format,
  perGame,
  inCompare,
  onSelect,
  onToggleCompare,
}: PlayerRowProps) {
  function cellText(c: StatColumn): string {
    if (perGame && c.kind === "count") {
      return c.guard(p) ? (c.value(p, format) / Math.max(1, p.season.gp)).toFixed(1) : "—"
    }
    return c.display(p, format)
  }

  return (
    <tr
      onClick={() => onSelect(p.id)}
      className={cn(
        "cursor-pointer border-t border-border transition-colors [counter-increment:rownum] hover:bg-accent/60",
        inCompare && "bg-purple-500/5",
      )}
    >
      <td className="sticky left-0 z-10 bg-card px-2 py-2 text-center text-xs font-medium text-muted-foreground before:[content:counter(rownum)]" />
      <td className="sticky left-9 z-10 bg-card px-3 py-2">
        <div className="flex items-center gap-2.5">
          <PositionBadge position={p.position} />
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">{p.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>
                {p.team}
                {p.number ? ` · #${p.number}` : ""}
              </span>
              <Matchup player={p} />
            </div>
          </div>
        </div>
      </td>
      <td className="px-2 py-2 text-center">
        <span
          className={cn(
            "inline-flex h-7 w-9 items-center justify-center rounded font-bold tabular-nums",
            ratingColor(p.ratings.overall),
          )}
        >
          {p.ratings.overall || "—"}
        </span>
      </td>
      <td className="px-3 py-2">
        <TradeValueBar value={p.ratings.tradeValue} />
      </td>
      {columns.map((c) => (
        <td key={c.key} className="px-2 py-2 text-center tabular-nums text-foreground/80">
          {cellText(c)}
        </td>
      ))}
      <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={inCompare}
          onChange={() => onToggleCompare(p.id)}
          aria-label={`Add ${p.name} to compare`}
          className="h-4 w-4 cursor-pointer accent-purple-800"
        />
      </td>
    </tr>
  )
})

function SortableTh({
  label,
  tip,
  active,
  dir,
  onClick,
  wide,
}: {
  label: string
  tip: string
  active: boolean
  dir: "asc" | "desc"
  onClick: () => void
  wide?: boolean
}) {
  return (
    <th className={cn("px-2 py-2.5 font-semibold", wide && "min-w-28")} title={tip}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "mx-auto flex items-center gap-1 whitespace-nowrap transition-colors hover:text-foreground",
          active && "text-purple-800",
        )}
      >
        {label}
        {active ? (
          dir === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  )
}

/** Next-opponent chip with strength-of-matchup rank against the player's position. */
function Matchup({ player: p }: { player: Player }) {
  const g = p.nextGame
  if (!g) return null
  const rankLabel = g.matchupRank ? `${ordinal(g.matchupRank)} vs ${p.position}` : null
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className="text-muted-foreground/40">
        ·
      </span>
      <span className="font-medium text-foreground/70">
        {g.home ? "vs" : "@"} {g.opp}
      </span>
      {g.kickoff && <span className="hidden text-muted-foreground/70 sm:inline">{formatKickoff(g.kickoff)}</span>}
      {rankLabel && (
        <span
          title={`${g.opp} allows ${g.ptsAllowedPerGame} PPR/g to ${p.position}s (ranked ${g.matchupRank} of ${g.matchupCount})`}
          className={cn(
            "rounded px-1 py-px text-[10px] font-semibold tabular-nums",
            matchupColor(g.matchupRank, g.matchupCount),
          )}
        >
          {rankLabel}
        </span>
      )}
    </span>
  )
}

/** Green = soft matchup (defense allows a lot), red = tough matchup. */
function matchupColor(rank: number, count: number): string {
  if (!rank || !count) return "bg-muted text-muted-foreground"
  const pctile = rank / count // small = allows most = easiest
  if (pctile <= 1 / 3) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
  if (pctile <= 2 / 3) return "bg-amber-500/20 text-amber-700 dark:text-amber-300"
  return "bg-red-500/20 text-red-700 dark:text-red-300"
}

function ratingColor(r: number): string {
  if (r >= 90) return "bg-emerald-600 text-white"
  if (r >= 80) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
  if (r >= 70) return "bg-amber-500/20 text-amber-700 dark:text-amber-300"
  return "bg-muted text-muted-foreground"
}
