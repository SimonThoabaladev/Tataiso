import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Append sslmode=verify-full to suppress the pg SSL deprecation warning.
// This preserves the current "full verification" behaviour explicitly.
function buildConnectionString(url: string): string {
  try {
    const parsed = new URL(url)
    // Only set if not already specified
    if (!parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'verify-full')
    }
    return parsed.toString()
  } catch {
    // If the URL can't be parsed (e.g. already a keyword string), return as-is
    return url
  }
}

export const pool = new Pool({
  connectionString: buildConnectionString(process.env.DATABASE_URL),
})

export const db = drizzle(pool, { schema })
