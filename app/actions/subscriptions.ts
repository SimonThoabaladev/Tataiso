"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  subscriptions,
  quizzes,
  quizQuestions,
  quizAttempts,
  materials,
  user,
  learningActivity,
  adminAuditLog,
} from "@/lib/db/schema"
import { and, desc, eq, gte, sql, count } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { createNotification } from "@/app/actions/notifications"
import { PLANS, type SubscriptionPlan } from "@/lib/subscriptions"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

// ─────────────────────────────────────────────────────────────
// Subscription queries
// ─────────────────────────────────────────────────────────────

/** Returns the user's active subscription merged with the plan feature set */
export async function getUserSubscription() {
  const userId = await getUserId()
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  if (!subscription) {
    return { plan: "free" as SubscriptionPlan, ...PLANS.free }
  }

  const plan = subscription.plan as SubscriptionPlan
  return { ...subscription, ...PLANS[plan] }
}

/** Activate the free 7-day trial for a user */
export async function subscribeToPlan(plan: SubscriptionPlan) {
  const userId = await getUserId()

  if (plan !== "free") {
    throw new Error("Only free trial activation is available from this action")
  }

  // Do not allow downgrade from a paid plan
  const [activePaid] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        sql`${subscriptions.plan} != 'free'`
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  if (activePaid) {
    throw new Error("You already have an active paid plan")
  }

  const [existingFree] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
        eq(subscriptions.plan, "free")
      )
    )
    .limit(1)

  if (existingFree) {
    return existingFree
  }

  // 7-day free trial per spec
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)

  const [newSub] = await db
    .insert(subscriptions)
    .values({ userId, plan, status: "active", endDate })
    .returning()

  await createNotification(
    userId,
    "Free Trial Started",
    "Your Tataiso 7-day free trial is now active. Explore up to 10 lessons and 2 assessment attempts.",
    "/pricing",
    "Subscription"
  )

  revalidatePath("/dashboard")
  revalidatePath("/pricing")
  return newSub
}

/** Activate a paid subscription (called after payment confirmation) */
export async function activatePaidSubscription(plan: SubscriptionPlan) {
  const userId = await getUserId()

  const validPaidPlans: SubscriptionPlan[] = ["basic", "standard", "premium", "elite"]
  if (!validPaidPlans.includes(plan)) {
    throw new Error("Invalid paid plan")
  }

  const previousPlan = await getUserSubscription()

  // Cancel any existing active subscription
  await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))

  const startDate = new Date()
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 1)

  const [newSub] = await db
    .insert(subscriptions)
    .values({ userId, plan, status: "active", startDate, endDate })
    .returning()

  const planDetails = PLANS[plan]
  await createNotification(
    userId,
    "Subscription Activated",
    `Your ${planDetails.name} plan (${planDetails.currency}${planDetails.price}/month) is active until ${endDate.toDateString()}.`,
    "/pricing",
    "Subscription"
  )

  revalidatePath("/dashboard")
  revalidatePath("/pricing")
  return newSub
}

/** Cancel the active subscription */
export async function cancelSubscription() {
  const userId = await getUserId()

  await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))

  revalidatePath("/dashboard")
  revalidatePath("/pricing")
}

// ─────────────────────────────────────────────────────────────
// Access control helpers
// ─────────────────────────────────────────────────────────────

async function getUserRole(userId: string) {
  const [userData] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
  return userData?.role ?? "student"
}

function isStaff(role: string) {
  return ["admin", "lecturer", "tutor"].includes(role)
}

export async function canAccessMaterial(materialId: number) {
  const userId = await getUserId()
  const subscription = await getUserSubscription()
  const role = await getUserRole(userId)

  if (isStaff(role)) return { canView: true, canDownload: true }

  return {
    canView: subscription.canViewMaterials,
    canDownload: subscription.canDownload,
  }
}

export async function canAccessRecordings() {
  const userId = await getUserId()
  const subscription = await getUserSubscription()
  const role = await getUserRole(userId)

  if (isStaff(role)) return true
  return subscription.canViewRecordings
}

// ─────────────────────────────────────────────────────────────
// Assessment attempt gating (Free Trial: max 2 per 7 days)
// ─────────────────────────────────────────────────────────────

export async function canAttemptAssessment(): Promise<{
  canAttempt: boolean
  reason: string
  attemptsUsed: number
  maxAttempts: number | null
}> {
  const userId = await getUserId()
  const subscription = await getUserSubscription()

  const max = subscription.maxAssessmentsPerWeek
  if (max === null) {
    return { canAttempt: true, reason: "Unlimited", attemptsUsed: 0, maxAttempts: null }
  }

  // Count attempts in the last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [result] = await db
    .select({ cnt: count() })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.userId, userId),
        gte(quizAttempts.completedAt, sevenDaysAgo)
      )
    )

  const used = Number(result?.cnt ?? 0)

  if (used >= max) {
    return {
      canAttempt: false,
      reason: `You have reached your ${max} assessment attempt limit for this 7-day period. Upgrade your plan for unlimited attempts.`,
      attemptsUsed: used,
      maxAttempts: max,
    }
  }

  return { canAttempt: true, reason: "OK", attemptsUsed: used, maxAttempts: max }
}

// ─────────────────────────────────────────────────────────────
// Quiz CRUD
// ─────────────────────────────────────────────────────────────

export async function getQuizzesByCourse(courseId: number) {
  return db
    .select()
    .from(quizzes)
    .where(eq(quizzes.courseId, courseId))
    .orderBy(quizzes.moduleNumber)
}

export async function getQuizById(quizId: number) {
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId))
  return quiz
}

export async function getQuizQuestions(quizId: number) {
  return db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
}

export async function canAccessQuiz(quizId: number) {
  const userId = await getUserId()
  const subscription = await getUserSubscription()
  const role = await getUserRole(userId)

  if (isStaff(role)) {
    return { canAccess: true, reason: "Staff access" }
  }

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId))
  if (!quiz) {
    return { canAccess: false, reason: "Quiz not found" }
  }

  if (subscription.fullAccess) {
    return { canAccess: true, reason: "Full access" }
  }

  if (quiz.moduleNumber <= subscription.freeTutorials) {
    return { canAccess: true, reason: "Within free lesson limit" }
  }

  return {
    canAccess: false,
    reason: "Upgrade your subscription to access this assessment.",
  }
}

/** Submit a quiz attempt; enforces Free Trial attempt limit */
export async function submitQuizAttempt(quizId: number, answers: number[]) {
  const userId = await getUserId()

  // Check quiz access
  const access = await canAccessQuiz(quizId)
  if (!access.canAccess) {
    throw new Error(access.reason)
  }

  // Check attempt limit
  const attemptCheck = await canAttemptAssessment()
  if (!attemptCheck.canAttempt) {
    throw new Error(attemptCheck.reason)
  }

  const questions = await getQuizQuestions(quizId)

  let correct = 0
  questions.forEach((q, i) => {
    if (answers[i] === q.correctAnswer) correct++
  })

  const score = Math.round((correct / (questions.length || 1)) * 100)
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId))
  const passed = score >= (quiz?.passingScore ?? 80)

  const [attempt] = await db
    .insert(quizAttempts)
    .values({
      userId,
      quizId,
      score,
      passed,
      answersSnapshot: JSON.stringify(answers),
    })
    .returning()

  // Record learning activity
  const today = new Date().toISOString().slice(0, 10)
  await db
    .insert(learningActivity)
    .values({ userId, activityDate: today, activityType: "assessment", referenceId: quizId })
    .onConflictDoNothing()

  const aiFeedback = `AI marking complete for ${quiz?.title ?? "this assessment"}. You scored ${score}%. ${
    passed
      ? "Well done — you are ready for the next module."
      : `Review the material and retry to reach the ${quiz?.passingScore ?? 80}% passing score.`
  }`

  // Check for score achievement (90%+)
  if (score >= 90) {
    await checkAndAwardAchievement(userId, "score_90")
  }

  // Streak check
  await checkAndAwardAchievement(userId, "streak_7")

  revalidatePath("/dashboard")
  return { score, passed, attempt, aiMarked: true, aiFeedback }
}

/** Get quiz progress for a course (used by course page) */
export async function getUserQuizProgress(courseId: number) {
  const userId = await getUserId()

  const courseQuizzes = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.courseId, courseId))
    .orderBy(quizzes.moduleNumber)

  const progress = await Promise.all(
    courseQuizzes.map(async (quiz) => {
      const [bestAttempt] = await db
        .select()
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quiz.id)))
        .orderBy(desc(quizAttempts.score))
        .limit(1)

      const access = await canAccessQuiz(quiz.id)

      return {
        quiz,
        bestScore: bestAttempt?.score ?? null,
        passed: bestAttempt?.passed ?? false,
        attempts: bestAttempt ? 1 : 0,
        canAccess: access.canAccess,
        accessReason: access.reason,
      }
    })
  )

  return progress
}

// ─────────────────────────────────────────────────────────────
// Quiz management (Instructor / Admin)
// ─────────────────────────────────────────────────────────────

export async function createQuiz(data: {
  courseId: number
  moduleNumber: number
  title: string
  description?: string
  passingScore?: number
  timeLimitMinutes?: number
  targetTier?: SubscriptionPlan
}) {
  const userId = await getUserId()
  const role = await getUserRole(userId)

  if (!["admin", "lecturer"].includes(role)) {
    throw new Error("Only admins and lecturers can create assessments")
  }

  if (data.timeLimitMinutes !== undefined) {
    if (data.timeLimitMinutes < 1 || data.timeLimitMinutes > 180) {
      throw new Error("Time limit must be between 1 and 180 minutes")
    }
  }

  const [quiz] = await db
    .insert(quizzes)
    .values({
      ...data,
      passingScore: data.passingScore ?? 80,
      timeLimitMinutes: data.timeLimitMinutes ?? null,
      targetTier: data.targetTier ?? "free",
    })
    .returning()

  revalidatePath("/dashboard")
  return quiz
}

export async function addQuizQuestion(data: {
  quizId: number
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}) {
  const userId = await getUserId()
  const role = await getUserRole(userId)

  if (!["admin", "lecturer"].includes(role)) {
    throw new Error("Only admins and lecturers can add questions")
  }

  if (data.options.length < 2 || data.options.length > 6) {
    throw new Error("Each question must have between 2 and 6 answer options")
  }

  const [question] = await db
    .insert(quizQuestions)
    .values({
      quizId: data.quizId,
      question: data.question,
      options: JSON.stringify(data.options),
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
    })
    .returning()

  revalidatePath("/dashboard")
  return question
}

// ─────────────────────────────────────────────────────────────
// Subscription admin stats
// ─────────────────────────────────────────────────────────────

export async function getSubscriptionStats() {
  const userId = await getUserId()
  const role = await getUserRole(userId)

  if (role !== "admin") {
    throw new Error("Admin access required")
  }

  const plans: SubscriptionPlan[] = ["free", "basic", "standard", "premium", "elite"]
  const result: Record<string, number> = {}

  for (const plan of plans) {
    const [row] = await db
      .select({ cnt: sql<number>`count(distinct "userId")` })
      .from(subscriptions)
      .where(and(eq(subscriptions.plan, plan), eq(subscriptions.status, "active")))
    result[plan] = Number(row?.cnt ?? 0)
  }

  return result
}

// ─────────────────────────────────────────────────────────────
// Achievement checking (internal helper)
// ─────────────────────────────────────────────────────────────

/**
 * Check whether a user qualifies for a specific achievement and award it if so.
 * Achievements are awarded at most once per user.
 */
async function checkAndAwardAchievement(userId: string, achievementKey: string) {
  try {
    const { checkAndAwardAchievementForUser } = await import("@/app/actions/achievements")
    await checkAndAwardAchievementForUser(userId, achievementKey)
  } catch {
    // Non-critical — silently ignore
  }
}
