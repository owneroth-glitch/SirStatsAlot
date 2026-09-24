import { cn } from "@/lib/utils"

const STYLES: Record<string, string> = {
  QB: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  RB: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  WR: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  TE: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  K: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
}

export function PositionBadge({ position, className }: { position: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold",
        STYLES[position] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {position || "—"}
    </span>
  )
}
