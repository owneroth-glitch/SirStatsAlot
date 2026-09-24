"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { GitCompareArrows, RefreshCw, Scale, Search } from "lucide-react"
import type { IngestMeta, Player, ScoringFormat } from "@/lib/types"
import { SCORING_LABELS } from "@/lib/types"
import { COLUMNS, STAT_GROUPS, columnsFor, type StatGroup } from "@/lib/columns"
import { MultiSelect } from "@/components/multi-select"
import { StatTable } from "@/components/stat-table"
import { PlayerDialog } from "@/components/player-dialog"
import { CompareDialog } from "@/components/compare-dialog"
import { TradeDialog } from "@/components/trade-dialog"
import { cn } from "@/lib/utils"

const FORMATS: ScoringFormat[] = ["standard", "half", "ppr"]

interface Props {
  players: Player[]
  positionOptions: { value: string; label: string }[]
  teamOptions: { value: string; label: string; hint?: string }[]
  meta: IngestMeta
}

function formatUpdated(iso: string | null): string {
  if (!iso) return "never"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "never"
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function StatsExplorer({ players, positionOptions, teamOptions, meta }: Props) {
  const router = useRouter()

  const [format, setFormat] = useState<ScoringFormat>("ppr")
  const [perGame, setPerGame] = useState(false)
  const [positions, setPositions] = useState<string[]>([])
  const [teams, setTeams] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [group, setGroup] = useState<StatGroup>("fantasy")
  const [sortKey, setSortKey] = useState("pts")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [profileId, setProfileId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [tradeOpen, setTradeOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const columns = columnsFor(group)
  const season = meta.currentSeason ?? 2026

  const filtered = useMemo(() => {
    const list = players.filter((p) => {
      if (positions.length && !positions.includes(p.position)) return false
      if (teams.length && !teams.includes(p.team)) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

    const col = COLUMNS.find((c) => c.key === sortKey)
    const getVal = (p: Player): number => {
      if (sortKey === "ovr") return p.ratings.overall
      if (sortKey === "val") return p.ratings.tradeValue
      if (col) {
        const v = col.value(p, format)
        return perGame && col.kind === "count" ? v / Math.max(1, p.season.gp) : v
      }
      return p.ratings.overall
    }
    return [...list].sort((a, b) => {
      const av = getVal(a)
      const bv = getVal(b)
      return sortDir === "desc" ? bv - av : av - bv
    })
  }, [players, positions, teams, search, sortKey, sortDir, format, perGame])

  function handleSort(key: string) {
    if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 4 ? ids : [...ids, id]))
  }

  async function refresh() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const res = await fetch("/api/refresh", { method: "POST" })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? "Refresh failed")
      router.refresh()
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Refresh failed")
    } finally {
      setRefreshing(false)
    }
  }

  const activePlayer = players.find((p) => p.id === profileId) ?? null
  const comparePlayers = compareIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[]
  const isEmpty = players.length === 0

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Sir<span className="text-purple-800 dark:text-purple-400">Stats</span><span className="text-slate-400 dark:text-slate-300">Alot</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {season} NFL fantasy football stat sheet · every rostered &amp; practice-squad skill player ·{" "}
              {players.length} players
              {meta.currentWeek ? ` · through Week ${meta.currentWeek}` : ""} · updated {formatUpdated(meta.lastUpdated)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Updating…" : "Refresh data"}
            </button>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
            >
              <GitCompareArrows className="h-4 w-4" />
              Compare
              {compareIds.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded bg-slate-300 px-1 text-xs font-semibold text-slate-900">
                  {compareIds.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTradeOpen(true)}
              className="flex h-9 items-center gap-2 rounded-md bg-purple-800 px-3 text-sm font-medium text-white hover:bg-purple-900"
            >
              <Scale className="h-4 w-4" />
              Trade Calculator
            </button>
          </div>
        </header>

        {refreshError && (
          <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {refreshError}
          </div>
        )}

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-6 py-20 text-center">
            <h2 className="text-lg font-semibold text-foreground">No data loaded yet</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Pull the current NFL rosters, practice squads, and every player&apos;s {season} game log plus prior-season
              history from Sleeper. This runs a one-time import into your database.
            </p>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="mt-4 flex h-10 items-center gap-2 rounded-md bg-purple-800 px-4 text-sm font-medium text-white hover:bg-purple-900 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Importing… this can take a minute" : "Load player data"}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search players…"
                  className="h-9 w-52 rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none focus:border-purple-500"
                />
              </div>

              <MultiSelect label="Position" options={positionOptions} selected={positions} onChange={setPositions} />
              <MultiSelect label="Team" options={teamOptions} selected={teams} onChange={setTeams} />

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

              <div className="ml-auto flex items-center rounded-md border border-border bg-card p-0.5">
                <button
                  type="button"
                  onClick={() => setPerGame(false)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium",
                    !perGame ? "bg-purple-800 text-white" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Totals
                </button>
                <button
                  type="button"
                  onClick={() => setPerGame(true)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium",
                    perGame ? "bg-purple-800 text-white" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Per Game
                </button>
              </div>

              <div className="flex items-center rounded-md border border-border bg-card p-0.5">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={cn(
                      "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                      format === f ? "bg-purple-800 text-white" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {SCORING_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

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
              perGame={perGame}
            />

            <p className="mt-3 text-xs text-muted-foreground">
              Click any column header to sort · click a row for the full player profile, game log &amp; career history ·
              use the checkbox to add players to Compare. Data from nflverse — hit Refresh after each week&apos;s games.
            </p>
          </>
        )}
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
