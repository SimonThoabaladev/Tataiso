/**
 * Run this once to apply all new schema changes via the app's API.
 * Usage: node scripts/migrate.mjs
 *
 * This hits the /api/run-migration endpoint which runs inside Next.js
 * and uses the same DB connection as the app (works with Neon's HTTP proxy).
 */

import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
const envPath = join(__dirname, "../.env.local")
const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eqIdx = trimmed.indexOf("=")
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
  if (!process.env[key]) process.env[key] = val
}

// Try to connect using the pg Pool with the DATABASE_URL as-is (works on Neon if SSL is configured)
const { createRequire } = await import("module")
const require = createRequire(import.meta.url)
const { Pool } = require("pg")

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set in .env.local")
  process.exit(1)
}

const sql = readFileSync(join(__dirname, "../lib/db/migrate.sql"), "utf-8")

const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"))

// Neon requires SSL and uses port 5432 — add connect_timeout and sslmode
const connectionString = DATABASE_URL.includes("sslmode")
  ? DATABASE_URL
  : DATABASE_URL + (DATABASE_URL.includes("?") ? "&" : "?") + "sslmode=require&connect_timeout=30"

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
})

async function run() {
  console.log("Connecting to database…")
  let client
  try {
    client = await pool.connect()
  } catch (err) {
    console.error("❌  Could not connect:", err.message)
    console.error("\nTroubleshooting:")
    console.error("  1. Check your DATABASE_URL in .env.local")
    console.error("  2. If using Neon, make sure the project is not suspended")
    console.error("  3. Try running the SQL manually in the Neon console:")
    console.error("     https://console.neon.tech → SQL Editor → paste lib/db/migrate.sql")
    await pool.end()
    process.exit(1)
  }

  console.log("✓  Connected\n")

  let passed = 0
  let failed = 0

  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, " ").slice(0, 80)
    try {
      await client.query(stmt)
      console.log(`  ✓  ${preview}`)
      passed++
    } catch (err) {
      // IF NOT EXISTS errors are safe — column/table/index already exists
      if (err.message.includes("already exists")) {
        console.log(`  ⚠  Already exists (skipped): ${preview.slice(0, 60)}`)
        passed++
      } else {
        console.error(`  ✗  FAILED: ${preview}`)
        console.error(`     ${err.message}`)
        failed++
      }
    }
  }

  client.release()
  await pool.end()

  console.log(`\n${passed} statements applied, ${failed} errors.`)
  if (failed === 0) {
    console.log("✅  Migration complete. Your database schema is up to date.")
  } else {
    console.log("⚠   Some statements failed. Review errors above.")
  }
}

run()
