import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// During Vercel build (static page collection), DATABASE_URL may not be present.
// We defer the throw to runtime so the build succeeds.
const connectionString = process.env.DATABASE_URL

function buildConnectionString(url: string): string {
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'verify-full')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export const pool = connectionString
  ? new Pool({ connectionString: buildConnectionString(connectionString) })
  : (null as unknown as Pool)

export const db = connectionString
  ? drizzle(pool, { schema })
  : (null as unknown as ReturnType<typeof drizzle>)

// Validate at runtime (not build time)
export function requireDb() {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return db
}
