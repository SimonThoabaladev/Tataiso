"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { notifications, notificationPreferences } from "@/lib/db/schema"
import { and, asc, desc, eq, lte, or, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

export type NotificationCategory =
  | "Deadlines"
  | "Achievements"
  | "Subscription"
  | "Announcements"

const ALL_CATEGORIES: NotificationCategory[] = [
  "Deadlines",
  "Achievements",
  "Subscription",
  "Announcements",
]

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

// ─────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────

/** Active (non-archived) notifications for the current user */
export async function getUserNotifications() {
  const userId = await getUserId()

  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.archived, false)))
    .orderBy(desc(notifications.createdAt))
    .limit(50)
}

/** Archived notifications (history) */
export async function getNotificationArchive() {
  const userId = await getUserId()

  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.archived, true)))
    .orderBy(desc(notifications.createdAt))
    .limit(100)
}

// ─────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: number) {
  const userId = await getUserId()

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))

  revalidatePath("/dashboard")
}

/**
 * Dismiss a notification: marks read, moves to archive.
 * Archive expires after 90 days.
 */
export async function dismissNotification(notificationId: number) {
  const userId = await getUserId()

  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 90)

  await db
    .update(notifications)
    .set({ read: true, archived: true, archiveExpiresAt: expiry })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/notifications")
}

/**
 * Create a notification for a given user.
 * Respects the user's per-category preference (skips if category disabled).
 * Called internally by other server actions.
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  href?: string,
  category: NotificationCategory = "Announcements"
) {
  // Check user preference for this category
  const [pref] = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.category, category)
      )
    )

  if (pref && !pref.enabled) {
    // User has disabled this category — skip
    return null
  }

  const [notification] = await db
    .insert(notifications)
    .values({ userId, title, message, href, category, read: false, archived: false })
    .returning()

  return notification
}

// ─────────────────────────────────────────────────────────────
// Notification Preferences
// ─────────────────────────────────────────────────────────────

/** Get the current user's notification preferences (all 4 categories) */
export async function getNotificationPreferences() {
  const userId = await getUserId()

  // Fetch stored prefs
  const stored = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))

  // Build full map, defaulting to enabled=true
  return ALL_CATEGORIES.map((cat) => {
    const match = stored.find((p) => p.category === cat)
    return { category: cat, enabled: match ? match.enabled : true }
  })
}

/** Update a single category preference for the current user */
export async function setNotificationPreference(
  category: NotificationCategory,
  enabled: boolean
) {
  const userId = await getUserId()

  // Select-then-upsert to avoid onConflictDoUpdate composite-index issues
  const [existing] = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.category, category)
      )
    )

  if (existing) {
    await db
      .update(notificationPreferences)
      .set({ enabled, updatedAt: new Date() })
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.category, category)
        )
      )
  } else {
    await db
      .insert(notificationPreferences)
      .values({ userId, category, enabled, updatedAt: new Date() })
  }

  revalidatePath("/dashboard/notifications")
}

// ─────────────────────────────────────────────────────────────
// Cleanup (expired archives)
// ─────────────────────────────────────────────────────────────

/**
 * Delete archived notifications whose 90-day retention window has passed.
 * Intended to be called from a cron/maintenance route.
 */
export async function purgeExpiredNotificationArchive() {
  const now = new Date()
  await db
    .delete(notifications)
    .where(
      and(eq(notifications.archived, true), lte(notifications.archiveExpiresAt!, now))
    )
}
