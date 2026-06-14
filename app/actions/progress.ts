"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  lessonProgress,
  learningActivity,
  quizAttempts,
  materials,
  progressConsent,
} from "@/lib/db/schema"
import { and, count, desc, eq, gte, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { checkAndAwardAchievementForUser } from "@/app/actions/achievements"
import { getUserSubscription } from "@/app/actions/subscriptions"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

// ─────────────────────────────────────────────────────────────
// Lesson completion
// ─────────────────────────────────────────────────────────────

export async function markLessonCompleted(materialId: number) {
  const userId = await getUserId()

  try {
    await db.insert(lessonProgress).values({ userId, materialId }).onConflictDoNothing()
  } catch { /* duplicate — ignore */ }

  const today = new Date().toISOString().slice(0, 10)
  try {
    await db
      .insert(learningActivity)
      .values({ userId, activityDate: today, activityType: "lesson", referenceId: materialId })
      .onConflictDoNothing()
  } catch { /* duplicate — ignore */ }

  // Achievement checks — non-critical, never crash the page
  try {
    await checkAndAwardAchievementForUser(userId, "first_lesson")
    await checkAndAwardAchievementForUser(userId, "lessons_10")
    await checkAndAwardAchievementForUser(userId, "lessons_50")
    await checkAndAwardAchievementForUser(userId, "streak_7")
    await checkAndAwardAchievementForUser(userId, "streak_30")
  } catch { /* non-critical */ }

  revalidatePath("/dashboard")
}

export async function recordAiSession() {
  const userId = await getUserId()
  const today = new Date().toISOString().slice(0, 10)
  try {
    await db
      .insert(learningActivity)
      .values({ userId, activityDate: today, activityType: "ai_session" })
      .onConflictDoNothing()
  } catch { /* non-critical */ }
}

// ─────────────────────────────────────────────────────────────
// Progress metrics
// ─────────────────────────────────────────────────────────────

export async function getLearningStreak(): Promise<number> {
  const userId = await getUserId()
  try {
    const rows = await db
      .select({ activityDate: learningActivity.activityDate })
      .from(learningActivity)
      .where(eq(learningActivity.userId, userId))
      .orderBy(desc(learningActivity.activityDate))

    const uniqueDates = [...new Set(rows.map((r) => r.activityDate))].sort().reverse()
    if (uniqueDates.length === 0) return 0

    let streak = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const diffDays = Math.round(
        (new Date(uniqueDates[i - 1]).getTime() - new Date(uniqueDates[i]).getTime()) / 86_400_000
      )
      if (diffDays === 1) streak++
      else break
    }
    return streak
  } catch {
    return 0
  }
}

export async function getTotalLessonsCompleted(): Promise<number> {
  const userId = await getUserId()
  try {
    const [row] = await db
      .select({ cnt: count() })
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId))
    return Number(row?.cnt ?? 0)
  } catch {
    return 0
  }
}

export async function getOverallProgressPercent(): Promise<number> {
  const userId = await getUserId()
  try {
    const [completedRow] = await db
      .select({ cnt: count() })
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId))
    const [totalRow] = await db.select({ cnt: count() }).from(materials)
    const completed = Number(completedRow?.cnt ?? 0)
    const total = Math.max(1, Number(totalRow?.cnt ?? 1))
    return Math.min(100, Math.round((completed / total) * 100))
  } catch {
    return 0
  }
}

export async function getRecentAssessmentScores() {
  const userId = await getUserId()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  try {
    return await db
      .select({
        id: quizAttempts.id,
        score: quizAttempts.score,
        passed: quizAttempts.passed,
        completedAt: quizAttempts.completedAt,
        quizId: quizAttempts.quizId,
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, userId),
          gte(quizAttempts.completedAt, thirtyDaysAgo)
        )
      )
      .orderBy(quizAttempts.completedAt)
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────
// Full progress report
// ─────────────────────────────────────────────────────────────

export async function getProgressReport() {
  const userId = await getUserId()
  const subscription = await getUserSubscription()

  const [streak, totalLessons, progressPercent, recentScores] = await Promise.all([
    getLearningStreak(),
    getTotalLessonsCompleted(),
    getOverallProgressPercent(),
    getRecentAssessmentScores(),
  ])

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let activityRows: { activityDate: string; activityType: string }[] = []
  try {
    activityRows = await db
      .select({
        activityDate: learningActivity.activityDate,
        activityType: learningActivity.activityType,
      })
      .from(learningActivity)
      .where(
        and(
          eq(learningActivity.userId, userId),
          gte(learningActivity.createdAt, thirtyDaysAgo)
        )
      )
      .orderBy(learningActivity.activityDate)
  } catch {
    activityRows = []
  }

  const report: {
    streak: number
    totalLessons: number
    progressPercent: number
    recentScores: typeof recentScores
    activityDates: string[]
    detailedAnalytics: null | {
      subjectBreakdown: { subject: string; count: number }[]
      timeOnTaskMinutes: number
      improvementPercent: number
    }
  } = {
    streak,
    totalLessons,
    progressPercent,
    recentScores,
    activityDates: [...new Set(activityRows.map((r) => r.activityDate))],
    detailedAnalytics: null,
  }

  // Detailed analytics for Standard / Premium / Elite only — non-critical
  if (subscription.detailedAnalytics) {
    try {
      const fifteenDaysAgo = new Date()
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

      const [completedMaterials, recentAvgRow, prevAvgRow] = await Promise.all([
        db
          .select({ subject: materials.subject, cnt: count() })
          .from(lessonProgress)
          .innerJoin(materials, eq(lessonProgress.materialId, materials.id))
          .where(eq(lessonProgress.userId, userId))
          .groupBy(materials.subject),

        db
          .select({ avg: sql<number>`avg(score)` })
          .from(quizAttempts)
          .where(and(eq(quizAttempts.userId, userId), gte(quizAttempts.completedAt, fifteenDaysAgo))),

        db
          .select({ avg: sql<number>`avg(score)` })
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.userId, userId),
              gte(quizAttempts.completedAt, thirtyDaysAgo),
              sql`${quizAttempts.completedAt} < ${fifteenDaysAgo.toISOString()}`
            )
          ),
      ])

      const prev = Number(prevAvgRow[0]?.avg ?? 0)
      const recent = Number(recentAvgRow[0]?.avg ?? 0)
      const improvement = prev > 0 ? Math.round(((recent - prev) / prev) * 100) : 0

      const typeCounts = activityRows.reduce<Record<string, number>>((acc, r) => {
        acc[r.activityType] = (acc[r.activityType] ?? 0) + 1
        return acc
      }, {})

      report.detailedAnalytics = {
        subjectBreakdown: completedMaterials.map((m) => ({
          subject: m.subject ?? "General",
          count: Number(m.cnt),
        })),
        timeOnTaskMinutes:
          (typeCounts["lesson"] ?? 0) * 5 +
          (typeCounts["assessment"] ?? 0) * 15 +
          (typeCounts["ai_session"] ?? 0) * 10,
        improvementPercent: improvement,
      }
    } catch {
      // Non-critical — leave detailedAnalytics as null
    }
  }

  return report
}

// ─────────────────────────────────────────────────────────────
// Consent management
// ─────────────────────────────────────────────────────────────

export async function getProgressConsent(): Promise<boolean> {
  const userId = await getUserId()
  try {
    const [row] = await db
      .select()
      .from(progressConsent)
      .where(eq(progressConsent.userId, userId))
    return row?.consented ?? false
  } catch {
    return false
  }
}

export async function setProgressConsent(consented: boolean) {
  const userId = await getUserId()

  const [existing] = await db
    .select()
    .from(progressConsent)
    .where(eq(progressConsent.userId, userId))

  if (existing) {
    await db
      .update(progressConsent)
      .set({ consented, updatedAt: new Date() })
      .where(eq(progressConsent.userId, userId))
  } else {
    await db.insert(progressConsent).values({ userId, consented, updatedAt: new Date() })
  }

  revalidatePath("/dashboard")
}

export async function getStudentProgressForInstructor(studentId: string) {
  try {
    const [consent] = await db
      .select()
      .from(progressConsent)
      .where(eq(progressConsent.userId, studentId))

    if (!consent?.consented) return null

    const [[completedRow], [totalRow], recentAttempts] = await Promise.all([
      db.select({ cnt: count() }).from(lessonProgress).where(eq(lessonProgress.userId, studentId)),
      db.select({ cnt: count() }).from(materials),
      db
        .select({ score: quizAttempts.score })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, studentId))
        .orderBy(desc(quizAttempts.completedAt))
        .limit(20),
    ])

    const completed = Number(completedRow?.cnt ?? 0)
    const total = Math.max(1, Number(totalRow?.cnt ?? 1))
    const completionRate = Math.min(100, Math.round((completed / total) * 100))
    const avgScore =
      recentAttempts.length > 0
        ? Math.round(recentAttempts.reduce((s, a) => s + a.score, 0) / recentAttempts.length)
        : null

    return { studentId, completedLessons: completed, completionRate, avgAssessmentScore: avgScore }
  } catch {
    return null
  }
}
