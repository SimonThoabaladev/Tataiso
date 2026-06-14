/**
 * ONE-TIME migration endpoint — safe to call multiple times (all statements are idempotent).
 * Call: GET /api/run-migration?secret=<MIGRATION_SECRET>
 */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export const dynamic = "force-dynamic"

const SECRET = process.env.MIGRATION_SECRET

export async function GET(request: NextRequest) {
  if (!SECRET) {
    return NextResponse.json({ error: "MIGRATION_SECRET not set" }, { status: 403 })
  }
  const provided = request.nextUrl.searchParams.get("secret")
  if (provided !== SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 })
  }

  if (!db) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 })
  }

  const statements = [
    // user
    `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "suspended" boolean NOT NULL DEFAULT false`,
    // materials
    `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "videoUrl" text`,
    `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "subject" text`,
    `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "lessonNumber" integer`,
    `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "lastEditedAt" timestamp`,
    // notifications
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'Announcements'`,
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "archived" boolean NOT NULL DEFAULT false`,
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "archiveExpiresAt" timestamp`,
    // quizzes
    `ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "timeLimitMinutes" integer`,
    `ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "targetTier" text NOT NULL DEFAULT 'free'`,
    // quiz_questions
    `ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "explanation" text`,
    // quiz_attempts
    `ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "answersSnapshot" text`,
    // courses popular flag
    `ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "popular" boolean NOT NULL DEFAULT false`,
    // notification_preferences
    `CREATE TABLE IF NOT EXISTS "notification_preferences" (
      "id" serial PRIMARY KEY,
      "userId" text NOT NULL,
      "category" text NOT NULL,
      "enabled" boolean NOT NULL DEFAULT true,
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "notif_pref_user_cat_idx" ON "notification_preferences" ("userId", "category")`,
    // lesson_progress
    `CREATE TABLE IF NOT EXISTS "lesson_progress" (
      "id" serial PRIMARY KEY,
      "userId" text NOT NULL,
      "materialId" integer NOT NULL,
      "completedAt" timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "lesson_progress_user_material_idx" ON "lesson_progress" ("userId", "materialId")`,
    // learning_activity
    `CREATE TABLE IF NOT EXISTS "learning_activity" (
      "id" serial PRIMARY KEY,
      "userId" text NOT NULL,
      "activityDate" text NOT NULL,
      "activityType" text NOT NULL,
      "referenceId" integer,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "learning_activity_user_date_type_idx" ON "learning_activity" ("userId", "activityDate", "activityType")`,
    // progress_consent
    `CREATE TABLE IF NOT EXISTS "progress_consent" (
      "id" serial PRIMARY KEY,
      "userId" text NOT NULL UNIQUE,
      "consented" boolean NOT NULL DEFAULT false,
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )`,
    // achievement_defs
    `CREATE TABLE IF NOT EXISTS "achievement_defs" (
      "id" serial PRIMARY KEY,
      "key" text NOT NULL UNIQUE,
      "name" text NOT NULL,
      "description" text NOT NULL,
      "unlockCriterion" text NOT NULL,
      "iconName" text NOT NULL DEFAULT 'Trophy',
      "createdAt" timestamp NOT NULL DEFAULT now()
    )`,
    // user_achievements
    `CREATE TABLE IF NOT EXISTS "user_achievements" (
      "id" serial PRIMARY KEY,
      "userId" text NOT NULL,
      "achievementId" integer NOT NULL,
      "earnedAt" timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "user_achievements_user_ach_idx" ON "user_achievements" ("userId", "achievementId")`,
    // admin_audit_log
    `CREATE TABLE IF NOT EXISTS "admin_audit_log" (
      "id" serial PRIMARY KEY,
      "adminId" text NOT NULL,
      "actionType" text NOT NULL,
      "entityType" text NOT NULL,
      "entityId" text NOT NULL,
      "details" text,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )`,
    // student_profile (onboarding)
    `CREATE TABLE IF NOT EXISTS "student_profile" (
      "id" serial PRIMARY KEY,
      "userId" text NOT NULL UNIQUE,
      "studentNumber" text NOT NULL,
      "courseId" integer NOT NULL,
      "selectedModules" text NOT NULL DEFAULT '[]',
      "onboardingComplete" boolean NOT NULL DEFAULT false,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )`,
    // Mark popular courses
    `UPDATE "courses" SET "popular" = true WHERE lower("name") LIKE '%engineering mathematics%' OR lower("name") LIKE '%communication skills%'`,
  ]

  const results: { stmt: string; status: string; error?: string }[] = []
  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, " ").slice(0, 80)
    try {
      await db.execute(sql.raw(stmt))
      results.push({ stmt: preview, status: "ok" })
    } catch (err: any) {
      results.push({ stmt: preview, status: "error", error: err.message })
    }
  }

  const errors = results.filter((r) => r.status === "error")
  return NextResponse.json({
    total: results.length,
    succeeded: results.filter((r) => r.status === "ok").length,
    failed: errors.length,
    results,
    message: errors.length === 0 ? "✅ All migrations applied." : "⚠️ Some statements failed — check results.",
  })
}
