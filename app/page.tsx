import { getStatSheet } from "@/lib/players"
import { StatsExplorer } from "@/components/stats-explorer"

export const dynamic = "force-dynamic"

export default async function Page() {
  const { players, positionOptions, teamOptions, meta } = await getStatSheet()
  return (
    <StatsExplorer players={players} positionOptions={positionOptions} teamOptions={teamOptions} meta={meta} />
  )
}
