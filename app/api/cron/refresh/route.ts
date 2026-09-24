import { NextResponse } from "next/server"
import { runIngest } from "@/lib/ingest"

export const maxDuration = 300
export const dynamic = "force-dynamic"

// Triggered automatically by Vercel Cron (see vercel.json).
// Vercel sends the CRON_SECRET as a Bearer token so the endpoint
// cannot be run by the public.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const result = await runIngest()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("[v0] cron refresh failed:", err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 },
    )
  }
}
