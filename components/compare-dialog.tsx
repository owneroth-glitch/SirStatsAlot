"use client"

import type { Player, ScoringFormat } from "@/lib/types"
import { Modal } from "./modal"
import { PositionBadge } from "./position-badge"
import { num } from "@/lib/format"
import { seasonPoints, pointsPerGame, projFor } from "@/lib/columns"
import { cn } from "@/lib/utils"

interface Row {
  label: string
  get: (p: Player, f: ScoringFormat) => number
  digits?: number
  higher?: boolean
}

const ROWS: Row[] = [
  { label: "Overall Rating", get: (p) => p.ratings.overall },
  { label: "Trade Value", get: (p) => p.ratings.tradeValue },
  { label: "Proj Points", get: (p, f) => projFor(p, f), digits: 1 },
  { label: "Season Points", get: (p, f) => seasonPoints(p, f), digits: 1 },
  { label: "Points / Game", get: (p, f) => pointsPerGame(p, f), digits: 1 },
  { label: "Consistency", get: (p) => p.ratings.consistency },
  { label: "Boom %", get: (p) => p.ratings.boomRate },
  { label: "Bust %", get: (p) => p.ratings.bustRate, higher: false },
  { label: "Games Played", get: (p) => p.season.gp },
  { label: "Total TD", get: (p) => p.season.totals.passTD + p.season.totals.rushTD + p.season.totals.recTD },
  { label: "Age", get: (p) => p.age, digits: 1, higher: false },
]

export function CompareDialog({
  players,
  format,
  open,
  onClose,
  onRemove,
}: {
  players: Player[]
  format: ScoringFormat
  open: boolean
  onClose: () => void
  onRemove: (id: string) => void
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl">
      <div className="p-5 pr-12">
        <h2 className="mb-4 text-lg font-bold text-foreground">Compare Players</h2>
        {players.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Select players with the checkbox in the table to compare them here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="w-36 px-2 py-2 text-left" />
                  {players.map((p) => (
                    <th key={p.id} className="px-2 py-2 text-center align-top">
                      <div className="flex flex-col items-center gap-1">
                        <PositionBadge position={p.position} />
                        <span className="text-sm font-semibold text-foreground">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.team}</span>
                        <button
                          type="button"
                          onClick={() => onRemove(p.id)}
                          className="text-xs text-muted-foreground underline hover:text-destructive"
                        >
                          remove
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const values = players.map((p) => row.get(p, format))
                  const higher = row.higher !== false
                  const best = higher ? Math.max(...values) : Math.min(...values)
                  return (
                    <tr key={row.label} className="border-t border-border">
                      <td className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {row.label}
                      </td>
                      {players.map((p, i) => (
                        <td
                          key={p.id}
                          className={cn(
                            "px-2 py-2 text-center tabular-nums",
                            values[i] === best && players.length > 1
                              ? "font-bold text-emerald-600"
                              : "text-foreground",
                          )}
                        >
                          {num(values[i], row.digits ?? 0)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}
