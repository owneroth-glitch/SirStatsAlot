"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
  value: string
  label: string
  hint?: string
}

interface MultiSelectProps {
  label: string
  options: Option[]
  selected: string[]
  onChange: (next: string[]) => void
}

export function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function toggle(value: string) {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value))
    else onChange([...selected, value])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent",
          selected.length > 0 && "border-purple-500/60 bg-purple-500/5",
        )}
      >
        <span className="text-foreground">{label}</span>
        {selected.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded bg-amber-400 px-1 text-xs font-semibold text-amber-950">
            {selected.length}
          </span>
        )}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-80 w-56 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-xl">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" /> Clear selection
            </button>
          )}
          {options.map((opt) => {
            const active = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    active ? "border-purple-600 bg-purple-600 text-white" : "border-border",
                  )}
                >
                  {active && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.hint && <span className="text-xs text-muted-foreground">{opt.hint}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
