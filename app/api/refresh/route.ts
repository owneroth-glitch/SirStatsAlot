import { NextResponse } from "next/server"
import { runIngest } from "@/lib/ingest"
import { sql } from "@/lib/db"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET() {
  const rows = await sql`
    SELECT last_updated, current_season, current_week, player_count, game_count, status
    FROM nfl_ingest_meta WHERE id = 1
  `
  const m = rows[0]
  return NextResponse.json({
    lastUpdated: m?.last_updated ?? null,
    currentSeason: m?.current_season ?? null,
    currentWeek: m?.current_week ?? null,
    playerCount: m?.player_count ?? 0,
    gameCount: m?.game_count ?? 0,
    status: m?.status ?? "idle",
  })
}

export async function POST() {
  try {
    const result = await runIngest()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("[v0] refresh failed:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 },
    )
  }
}
