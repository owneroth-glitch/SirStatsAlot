"use client"

import { useMemo, useState } from "react"
import { GitCompareArrows, Scale, Search } from "lucide-react"
import type { Player, Position, ScoringFormat } from "@/lib/types"
import { SCORING_LABELS } from "@/lib/types"
import { getPlayers, ALL_POSITIONS, ALL_TEAMS, TEAM_NAMES, CURRENT_YEAR } from "@/lib/players"
import { COLUMNS, STAT_GROUPS, columnsFor, projFor, type StatGroup } from "@/lib/columns"
import { MultiSelect } from "@/components/multi-select"
import { StatTable } from "@/components/stat-table"
import { PlayerDialog } from "@/components/player-dialog"
import { CompareDialog } from "@/components/compare-dialog"
import { TradeDialog } from "@/components/trade-dialog"
import { cn } from "@/lib/utils"

const FORMATS: ScoringFormat[] = ["standard", "half", "ppr"]

export default function Page() {
  const players = useMemo(() => getPlayers(), [])

  const [format, setFormat] = useState<ScoringFormat>("ppr")
  const [positions, setPositions] = useState<string[]>([])
  const [teams, setTeams] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [group, setGroup] = useState<StatGroup>("fantasy")
  const [sortKey, setSortKey] = useState("proj")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [profileId, setProfileId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [tradeOpen, setTradeOpen] = useState(false)

  const columns = columnsFor(group)

  const filtered = useMemo(() => {
    let list = players.filter((p) => {
      if (positions.length && !positions.includes(p.position)) return false
      if (teams.length && !teams.includes(p.team)) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

    const col = COLUMNS.find((c) => c.key === sortKey)
    const getVal = (p: Player): number => {
      if (sortKey === "ovr") return p.ratings.overall
      if (sortKey === "val") return p.ratings.tradeValue
      if (col) return col.value(p, format)
      return projFor(p, format)
    }
    list = [...list].sort((a, b) => {
      const av = getVal(a)
      const bv = getVal(b)
      return sortDir === "desc" ? bv - av : av - bv
    })
    return list
  }, [players, positions, teams, search, sortKey, sortDir, format])

  function handleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 4 ? ids : [...ids, id]))
  }

  const activePlayer = players.find((p) => p.id === profileId) ?? null
  const comparePlayers = compareIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[]

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* Header */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Gridiron<span className="text-emerald-600">Stats</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {CURRENT_YEAR} fantasy football stat sheet · {players.length} players · projections averaged from Yahoo,
              ESPN &amp; Sleeper
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
            >
              <GitCompareArrows className="h-4 w-4" />
              Compare
              {compareIds.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded bg-emerald-600 px-1 text-xs font-semibold text-white">
                  {compareIds.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTradeOpen(true)}
              className="flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Scale className="h-4 w-4" />
              Trade Calculator
            </button>
          </div>
        </header>

        {/* Controls */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players…"
              className="h-9 w-52 rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <MultiSelect
            label="Position"
            options={ALL_POSITIONS.map((p) => ({ value: p, label: p }))}
            selected={positions}
            onChange={setPositions}
          />
          <MultiSelect
            label="Team"
            options={ALL_TEAMS.map((t) => ({ value: t, label: t, hint: TEAM_NAMES[t]?.split(" ").pop() }))}
            selected={teams}
            onChange={setTeams}
          />

          {(positions.length > 0 || teams.length > 0 || search) && (
            <button
              type="button"
              onClick={() => {
                setPositions([])
                setTeams([])
                setSearch("")
              }}
              className="h-9 rounded-md px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Reset filters
            </button>
          )}

          {/* Scoring toggle */}
          <div className="ml-auto flex items-center rounded-md border border-border bg-card p-0.5">
            {FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  format === f ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {SCORING_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Stat group tabs */}
        <div className="mb-3 flex flex-wrap items-center gap-1">
          {STAT_GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGroup(g.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                group === g.key ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {g.label}
            </button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "player" : "players"}
          </span>
        </div>

        <StatTable
          players={filtered}
          columns={columns}
          format={format}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onSelectPlayer={setProfileId}
          compareIds={compareIds}
          onToggleCompare={toggleCompare}
        />

        <p className="mt-3 text-xs text-muted-foreground">
          Click any column header to sort · click a row for the full player profile, game log &amp; career history ·
          use the checkbox to add players to Compare. Sample dataset for demonstration.
        </p>
      </div>

      <PlayerDialog player={activePlayer} format={format} onClose={() => setProfileId(null)} />
      <CompareDialog
        players={comparePlayers}
        format={format}
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        onRemove={toggleCompare}
      />
      <TradeDialog players={players} open={tradeOpen} onClose={() => setTradeOpen(false)} />
    </main>
  )
}
