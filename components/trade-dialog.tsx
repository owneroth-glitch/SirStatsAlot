"use client"

import { useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import type { Player } from "@/lib/types"
import { Modal } from "./modal"
import { PositionBadge } from "./position-badge"
import { cn } from "@/lib/utils"

export function TradeDialog({
  players,
  open,
  onClose,
}: {
  players: Player[]
  open: boolean
  onClose: () => void
}) {
  const [sideA, setSideA] = useState<string[]>([])
  const [sideB, setSideB] = useState<string[]>([])

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  const valueOf = (ids: string[]) => ids.reduce((sum, id) => sum + (byId.get(id)?.ratings.tradeValue ?? 0), 0)
  const totalA = valueOf(sideA)
  const totalB = valueOf(sideB)
  const diff = totalA - totalB
  const total = totalA + totalB
  const pctDiff = total ? Math.abs(diff) / total : 0

  let verdict = "Even trade"
  let verdictClass = "text-muted-foreground"
  if (pctDiff > 0.05 && total > 0) {
    const winner = diff > 0 ? "Side A" : "Side B"
    verdict = `${winner} wins`
    verdictClass = "text-emerald-600"
  }
  const fairness = total > 0 ? Math.round((1 - pctDiff) * 100) : 100

  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl">
      <div className="p-5 pr-12">
        <h2 className="text-lg font-bold text-foreground">Trade Calculator</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Add players to each side. Values use the season-long trade value model.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <TradeSide
            title="Side A"
            ids={sideA}
            total={totalA}
            players={players}
            byId={byId}
            onAdd={(id) => setSideA((s) => (s.includes(id) ? s : [...s, id]))}
            onRemove={(id) => setSideA((s) => s.filter((x) => x !== id))}
            exclude={sideB}
          />
          <TradeSide
            title="Side B"
            ids={sideB}
            total={totalB}
            players={players}
            byId={byId}
            onAdd={(id) => setSideB((s) => (s.includes(id) ? s : [...s, id]))}
            onRemove={(id) => setSideB((s) => s.filter((x) => x !== id))}
            exclude={sideA}
          />
        </div>

        <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Verdict</div>
              <div className={cn("text-lg font-bold", verdictClass)}>{verdict}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Fairness</div>
              <div className="text-lg font-bold tabular-nums text-foreground">{fairness}%</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="w-14 text-right text-sm font-semibold tabular-nums">{totalA}</span>
            <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="bg-sky-500" style={{ width: `${total ? (totalA / total) * 100 : 50}%` }} />
              <div className="bg-emerald-500" style={{ width: `${total ? (totalB / total) * 100 : 50}%` }} />
            </div>
            <span className="w-14 text-sm font-semibold tabular-nums">{totalB}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function TradeSide({
  title,
  ids,
  total,
  players,
  byId,
  onAdd,
  onRemove,
  exclude,
}: {
  title: string
  ids: string[]
  total: number
  players: Player[]
  byId: Map<string, Player>
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  exclude: string[]
}) {
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState("")
  const available = players.filter(
    (p) => !ids.includes(p.id) && !exclude.includes(p.id) && p.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="rounded bg-muted px-2 py-0.5 text-sm font-bold tabular-nums text-foreground">{total}</span>
      </div>
      <div className="space-y-1.5">
        {ids.map((id) => {
          const p = byId.get(id)
          if (!p) return null
          return (
            <div key={id} className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
              <PositionBadge position={p.position} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.team}</div>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground">{p.ratings.tradeValue}</span>
              <button
                type="button"
                onClick={() => onRemove(id)}
                aria-label={`Remove ${p.name}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      {picking ? (
        <div className="mt-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players…"
            className="mb-1 h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-emerald-500"
          />
          <div className="max-h-44 overflow-auto rounded-md border border-border">
            {available.slice(0, 40).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onAdd(p.id)
                  setPicking(false)
                  setQuery("")
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <PositionBadge position={p.position} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.ratings.tradeValue}</span>
              </button>
            ))}
            {available.length === 0 && <div className="px-2 py-3 text-center text-sm text-muted-foreground">No players</div>}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-sm font-medium text-muted-foreground hover:border-emerald-500 hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add player
        </button>
      )}
    </div>
  )
}
