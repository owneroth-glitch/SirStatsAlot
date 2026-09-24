import { neon } from "@neondatabase/serverless"

/**
 * Single HTTP-based SQL client for Neon. Used for both reads (player stat
 * sheet) and the on-demand ingestion writes. The HTTP driver is serverless
 * friendly and supports parameterized queries + batched transactions.
 */
export const sql = neon(process.env.DATABASE_URL!)
