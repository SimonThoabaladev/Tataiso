"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  achievementDefs,
  userAchievements,
  lessonProgress,
  quizAttempts,
  learningActivity,
} from "@/lib/db/schema"
import { and, count, desc, eq, gte } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { createNotification } from "@/app/actions/notifications"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

// ─────────────────────────────────────────────────────────────
// Seed achievement definitions (idempotent)
// ─────────────────────────────────────────────────────────────

const ACHIEVEMENT_DEFINITIONS = [
  {
    key: "lessons_10",
    name: "Eager Learner",
    description: "Complete 10 lessons",
    unlockCriterion: "Complete 10 lessons on the platform",
    iconName: "BookOpen",
  },
  {
    key: "lessons_50",
    name: "Dedicated Student",
    description: "Complete 50 lessons",
    unlockCriterion: "Complete 50 lessons on the platform",
    iconName: "GraduationCap",
  },
  {
    key: "score_90",
    name: "High Achiever",
    description: "Score 90% or above on an assessment",
    unlockCriterion: "Score 90% or above on any assessment",
    iconName: "Trophy",
  },
  {
    key: "streak_7",
    name: "7-Day Streak",
    description: "Maintain a 7-day consecutive learning streak",
    unlockCriterion: "Log in and complete at least one activity for 7 consecutive days",
    iconName: "Flame",
  },
  {
    key: "streak_30",
    name: "Month of Learning",
    description: "Maintain a 30-day consecutive learning streak",
    unlockCriterion: "Log in and complete at least one activity for 30 consecutive days",
    iconName: "Star",
  },
  {
    key: "first_lesson",
    name: "First Step",
    description: "Complete your first lesson",
    unlockCriterion: "Complete your first lesson on the platform",
    iconName: "Sparkles",
  },
  {
    key: "first_assessment",
    name: "Test Taker",
    description: "Complete your first assessment",
    unlockCriterion: "Submit your first assessment",
    iconName: "ClipboardCheck",
  },
]

export async function ensureAchievementDefsExist() {
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    await db
      .insert(achievementDefs)
      .values(def)
      .onConflictDoNothing()
  }
}

// ─────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────

/** All achievement definitions (for gallery) */
export async function getAllAchievementDefs() {
  await ensureAchievementDefsExist()
  return db.select().from(achievementDefs).orderBy(achievementDefs.id)
}

/** Achievements earned by the current user */
export async function getUserAchievements() {
  const userId = await getUserId()

  return db
    .select({
      id: userAchievements.id,
      userId: userAchievements.userId,
      earnedAt: userAchievements.earnedAt,
      achievementId: userAchievements.achievementId,
      key: achievementDefs.key,
      name: achievementDefs.name,
      description: achievementDefs.description,
      unlockCriterion: achievementDefs.unlockCriterion,
      iconName: achievementDefs.iconName,
    })
    .from(userAchievements)
    .innerJoin(achievementDefs, eq(userAchievements.achievementId, achievementDefs.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.earnedAt))
}

/** Achievements earned by a specific user (for admin/instructor view) */
export async function getUserAchievementsById(targetUserId: string) {
  return db
    .select({
      id: userAchievements.id,
      userId: userAchievements.userId,
      earnedAt: userAchievements.earnedAt,
      achievementId: userAchievements.achievementId,
      key: achievementDefs.key,
      name: achievementDefs.name,
      description: achievementDefs.description,
      unlockCriterion: achievementDefs.unlockCriterion,
      iconName: achievementDefs.iconName,
    })
    .from(userAchievements)
    .innerJoin(achievementDefs, eq(userAchievements.achievementId, achievementDefs.id))
    .where(eq(userAchievements.userId, targetUserId))
    .orderBy(desc(userAchievements.earnedAt))
}

// ─────────────────────────────────────────────────────────────
// Award logic
// ─────────────────────────────────────────────────────────────

/**
 * Award an achievement to a user if they have not already earned it.
 * Sends an in-app notification and revalidates the dashboard.
 */
async function awardAchievement(userId: string, achievementId: number, achievementName: string) {
  // Check if already earned (unique constraint also prevents duplicates)
  const [existing] = await db
    .select()
    .from(userAchievements)
    .where(
      and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      )
    )

  if (existing) return // Already awarded

  await db.insert(userAchievements).values({ userId, achievementId }).onConflictDoNothing()

  // Notify the user (Req 8.2)
  await createNotification(
    userId,
    "Achievement Unlocked!",
    `You earned the "${achievementName}" achievement. Keep it up!`,
    "/dashboard",
    "Achievements"
  )

  revalidatePath("/dashboard")
}

/**
 * Check a specific achievement condition for a user and award if qualified.
 * Called from other actions after relevant events.
 */
export async function checkAndAwardAchievementForUser(
  userId: string,
  achievementKey: string
) {
  await ensureAchievementDefsExist()

  const [def] = await db
    .select()
    .from(achievementDefs)
    .where(eq(achievementDefs.key, achievementKey))

  if (!def) return

  let qualifies = false

  switch (achievementKey) {
    case "first_lesson": {
      const [row] = await db
        .select({ cnt: count() })
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, userId))
      qualifies = Number(row?.cnt ?? 0) >= 1
      break
    }
    case "lessons_10": {
      const [row] = await db
        .select({ cnt: count() })
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, userId))
      qualifies = Number(row?.cnt ?? 0) >= 10
      break
    }
    case "lessons_50": {
      const [row] = await db
        .select({ cnt: count() })
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, userId))
      qualifies = Number(row?.cnt ?? 0) >= 50
      break
    }
    case "first_assessment": {
      const [row] = await db
        .select({ cnt: count() })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId))
      qualifies = Number(row?.cnt ?? 0) >= 1
      break
    }
    case "score_90": {
      const [row] = await db
        .select({ cnt: count() })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), gte(quizAttempts.score, 90)))
      qualifies = Number(row?.cnt ?? 0) >= 1
      break
    }
    case "streak_7": {
      const streak = await calculateStreak(userId)
      qualifies = streak >= 7
      break
    }
    case "streak_30": {
      const streak = await calculateStreak(userId)
      qualifies = streak >= 30
      break
    }
  }

  if (qualifies) {
    await awardAchievement(userId, def.id, def.name)
  }
}

/**
 * Calculate the current consecutive-day streak for a user.
 */
async function calculateStreak(userId: string): Promise<number> {
  const rows = await db
    .select({ activityDate: learningActivity.activityDate })
    .from(learningActivity)
    .where(eq(learningActivity.userId, userId))
    .orderBy(desc(learningActivity.activityDate))

  // Deduplicate dates
  const uniqueDates = [...new Set(rows.map((r) => r.activityDate))].sort().reverse()

  if (uniqueDates.length === 0) return 0

  let streak = 1
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1])
    const curr = new Date(uniqueDates[i])
    const diffMs = prev.getTime() - curr.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Run all achievement checks for the current user.
 * Called after a lesson is completed.
 */
export async function runAllAchievementChecks(userId?: string) {
  const uid = userId ?? (await getUserId())
  const keys = ACHIEVEMENT_DEFINITIONS.map((d) => d.key)
  for (const key of keys) {
    await checkAndAwardAchievementForUser(uid, key)
  }
}

// ─────────────────────────────────────────────────────────────
// Streak helper (public)
// ─────────────────────────────────────────────────────────────

export async function getCurrentStreak(): Promise<number> {
  const userId = await getUserId()
  return calculateStreak(userId)
}
