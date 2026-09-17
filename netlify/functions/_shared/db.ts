import { getDatabase } from "@netlify/database";
import type { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = getDatabase().pool as unknown as Pool;
  }
  return pool;
}
