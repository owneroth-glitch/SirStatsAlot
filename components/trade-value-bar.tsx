import { cn } from "@/lib/utils"

export function TradeValueBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", barColor(value))}
          style={{ width: `${Math.max(4, value)}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
}

function barColor(v: number): string {
  if (v >= 80) return "bg-emerald-600"
  if (v >= 55) return "bg-emerald-500"
  if (v >= 30) return "bg-amber-500"
  return "bg-muted-foreground/50"
}
