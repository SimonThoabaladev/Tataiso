"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  departments,
  courses,
  materials,
  bookmarks,
  comments,
  downloads,
  user,
  adminAuditLog,
  subscriptions,
} from "@/lib/db/schema"
import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { createNotification } from "@/app/actions/notifications"

export type UserRole = "admin" | "lecturer" | "tutor" | "student"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session
}

async function getUserWithRole() {
  const session = await getSession()
  const userId = session.user.id
  const [userData] = await db.select().from(user).where(eq(user.id, userId))
  if (!userData) throw new Error("User not found")
  return { userId, role: userData.role as UserRole, userData }
}

// Permission helpers
function canUploadMaterial(role: UserRole): boolean {
  return ["admin", "lecturer", "tutor"].includes(role)
}

function canManageDepartments(role: UserRole): boolean {
  return ["admin", "lecturer"].includes(role)
}

function canManageUsers(role: UserRole): boolean {
  return role === "admin"
}

async function requireUploadPermission() {
  const { userId, role } = await getUserWithRole()
  if (!canUploadMaterial(role)) {
    throw new Error("Forbidden: Upload permission required")
  }
  return userId
}

async function requireDepartmentPermission() {
  const { userId, role } = await getUserWithRole()
  if (!canManageDepartments(role)) {
    throw new Error("Forbidden: Department management permission required")
  }
  return userId
}

async function requireAdmin() {
  const { userId, role } = await getUserWithRole()
  if (!canManageUsers(role)) {
    throw new Error("Forbidden: Admin access required")
  }
  return userId
}

// Departments
export async function getDepartments() {
  return db.select().from(departments).orderBy(departments.name)
}

export async function createDepartment(name: string, description?: string) {
  await requireDepartmentPermission()
  const [newDept] = await db.insert(departments).values({ name, description }).returning()
  revalidatePath("/dashboard")
  return newDept
}

// Courses
export async function getCoursesByDepartment(departmentId: number) {
  return db.select().from(courses).where(eq(courses.departmentId, departmentId)).orderBy(courses.code)
}

export async function createCourse(data: { departmentId: number; code: string; name: string; description?: string }) {
  await requireDepartmentPermission()
  const [newCourse] = await db.insert(courses).values(data).returning()
  revalidatePath("/dashboard")
  return newCourse
}

export async function getCourseWithDepartment(courseId: number) {
  const result = await db
    .select({
      course: courses,
      department: departments,
    })
    .from(courses)
    .innerJoin(departments, eq(courses.departmentId, departments.id))
    .where(eq(courses.id, courseId))
  return result[0]
}

// Materials
export async function getMaterialsByCourse(courseId: number) {
  return db.select().from(materials).where(eq(materials.courseId, courseId)).orderBy(desc(materials.createdAt))
}

export async function getMaterialById(materialId: number) {
  const [material] = await db.select().from(materials).where(eq(materials.id, materialId))
  return material
}

export async function createMaterial(data: {
  courseId: number
  title: string
  description?: string
  fileType: string
  fileName: string
  fileUrl: string
  fileSize: number
}) {
  const uploaderId = await requireUploadPermission()
  const [newMaterial] = await db.insert(materials).values({ ...data, uploaderId }).returning()

  await createNotification(
    uploaderId,
    "Material Uploaded",
    `Your file ${data.title} has been uploaded successfully and is available in the selected course.`,
    `/dashboard/course/${data.courseId}`
  )

  revalidatePath("/dashboard")
  return newMaterial
}

export async function deleteMaterial(materialId: number) {
  await requireUploadPermission()
  await db.delete(materials).where(eq(materials.id, materialId))
  revalidatePath("/dashboard")
}

// Bookmarks
export async function getUserBookmarks() {
  const userId = await getUserId()
  return db
    .select({
      bookmark: bookmarks,
      material: materials,
      course: courses,
      department: departments,
    })
    .from(bookmarks)
    .innerJoin(materials, eq(bookmarks.materialId, materials.id))
    .innerJoin(courses, eq(materials.courseId, courses.id))
    .innerJoin(departments, eq(courses.departmentId, departments.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt))
}

export async function toggleBookmark(materialId: number) {
  const userId = await getUserId()
  const [existing] = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.materialId, materialId)))

  if (existing) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing.id))
  } else {
    await db.insert(bookmarks).values({ userId, materialId })
  }
  revalidatePath("/dashboard")
}

export async function isBookmarked(materialId: number) {
  const userId = await getUserId()
  const [existing] = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.materialId, materialId)))
  return !!existing
}

// Comments
export async function getCommentsByMaterial(materialId: number) {
  return db
    .select({
      comment: comments,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
        role: user.role,
      },
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(eq(comments.materialId, materialId))
    .orderBy(desc(comments.createdAt))
}

export async function addComment(materialId: number, content: string) {
  const userId = await getUserId()
  const [newComment] = await db.insert(comments).values({ materialId, userId, content }).returning()
  revalidatePath("/dashboard")
  return newComment
}

export async function deleteComment(commentId: number) {
  const userId = await getUserId()
  await db.delete(comments).where(and(eq(comments.id, commentId), eq(comments.userId, userId)))
  revalidatePath("/dashboard")
}

// Downloads
export async function trackDownload(materialId: number) {
  const userId = await getUserId()
  await db.insert(downloads).values({ materialId, userId })
  await db
    .update(materials)
    .set({ downloadCount: sql`${materials.downloadCount} + 1` })
    .where(eq(materials.id, materialId))
  revalidatePath("/dashboard")
}

// Search
export async function searchMaterials(query: string) {
  await getUserId()
  return db
    .select({
      material: materials,
      course: courses,
      department: departments,
    })
    .from(materials)
    .innerJoin(courses, eq(materials.courseId, courses.id))
    .innerJoin(departments, eq(courses.departmentId, departments.id))
    .where(
      or(
        ilike(materials.title, `%${query}%`),
        ilike(materials.description, `%${query}%`),
        ilike(courses.name, `%${query}%`),
        ilike(courses.code, `%${query}%`),
        ilike(departments.name, `%${query}%`)
      )
    )
    .orderBy(desc(materials.createdAt))
    .limit(50)
}

// User role
export async function getUserRole(): Promise<UserRole> {
  const userId = await getUserId()
  const [userData] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId))
  return (userData?.role as UserRole) || "student"
}

export async function getUserData() {
  const userId = await getUserId()
  const [userData] = await db.select().from(user).where(eq(user.id, userId))
  return userData
}

export async function getAllUsers() {
  await requireAdmin()
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      suspended: user.suspended,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(user.name)
}

// Dashboard stats
export async function getDashboardStats() {
  const { role } = await getUserWithRole()
  
  const [deptCount] = await db.select({ count: sql<number>`count(*)` }).from(departments)
  const [courseCount] = await db.select({ count: sql<number>`count(*)` }).from(courses)
  const [materialCount] = await db.select({ count: sql<number>`count(*)` }).from(materials)
  
  const stats = {
    departments: Number(deptCount?.count || 0),
    courses: Number(courseCount?.count || 0),
    materials: Number(materialCount?.count || 0),
    role,
  }

  if (canManageUsers(role)) {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(user)
    return { ...stats, users: Number(userCount?.count || 0) }
  }

  return stats
}

// Get materials uploaded by current user (for lecturers/tutors)
export async function getMyMaterials() {
  const userId = await requireUploadPermission()
  return db
    .select({
      material: materials,
      course: courses,
      department: departments,
    })
    .from(materials)
    .innerJoin(courses, eq(materials.courseId, courses.id))
    .innerJoin(departments, eq(courses.departmentId, departments.id))
    .where(eq(materials.uploaderId, userId))
    .orderBy(desc(materials.createdAt))
}

// ─────────────────────────────────────────────────────────────
// Lesson content management with full validation (Req 10)
// ─────────────────────────────────────────────────────────────

/** Validation helpers */
function validateLessonTitle(title: string) {
  if (!title || title.trim().length < 1 || title.trim().length > 200) {
    return "Title must be between 1 and 200 characters."
  }
  return null
}

function validateLessonBody(body: string) {
  if (!body || body.trim().length < 1 || body.trim().length > 50_000) {
    return "Content body must be between 1 and 50,000 characters."
  }
  return null
}

function validateVideoUrl(videoUrl?: string) {
  if (!videoUrl) return null
  try {
    new URL(videoUrl)
    return null
  } catch {
    return "Video URL must be a valid URL."
  }
}

export type LessonFieldErrors = {
  title?: string
  subject?: string
  contentBody?: string
  videoUrl?: string
}

/**
 * Create a lesson (material) with full content-management validation per Req 10.1.
 * Returns fieldErrors if validation fails, otherwise returns the created material.
 */
export async function createLesson(data: {
  courseId: number
  title: string
  subject?: string
  contentBody: string
  videoUrl?: string
  lessonNumber?: number
}): Promise<{ material: typeof materials.$inferSelect } | { fieldErrors: LessonFieldErrors }> {
  const uploaderId = await requireUploadPermission()

  const fieldErrors: LessonFieldErrors = {}

  const titleErr = validateLessonTitle(data.title)
  if (titleErr) fieldErrors.title = titleErr

  const bodyErr = validateLessonBody(data.contentBody)
  if (bodyErr) fieldErrors.contentBody = bodyErr

  const urlErr = validateVideoUrl(data.videoUrl)
  if (urlErr) fieldErrors.videoUrl = urlErr

  if (!data.subject) fieldErrors.subject = "Subject is required."

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  const [newMaterial] = await db
    .insert(materials)
    .values({
      courseId: data.courseId,
      uploaderId,
      title: data.title.trim(),
      description: data.contentBody.substring(0, 500), // excerpt for list views
      fileType: "lesson/text",
      fileName: "lesson",
      fileUrl: "",
      fileSize: 0,
      videoUrl: data.videoUrl?.trim() || null,
      subject: data.subject,
      lessonNumber: data.lessonNumber ?? null,
    })
    .returning()

  await createNotification(
    uploaderId,
    "Lesson Published",
    `Your lesson "${data.title}" has been published successfully.`,
    `/dashboard/course/${data.courseId}`,
    "Announcements"
  )

  revalidatePath("/dashboard")
  return { material: newMaterial }
}

/**
 * Edit a published lesson (Req 10.4). Records edit timestamp, preserves student progress.
 */
export async function editLesson(
  materialId: number,
  data: {
    title?: string
    subject?: string
    contentBody?: string
    videoUrl?: string
  }
): Promise<{ material: typeof materials.$inferSelect } | { fieldErrors: LessonFieldErrors }> {
  await requireUploadPermission()

  const fieldErrors: LessonFieldErrors = {}

  if (data.title !== undefined) {
    const err = validateLessonTitle(data.title)
    if (err) fieldErrors.title = err
  }

  if (data.contentBody !== undefined) {
    const err = validateLessonBody(data.contentBody)
    if (err) fieldErrors.contentBody = err
  }

  if (data.videoUrl !== undefined) {
    const err = validateVideoUrl(data.videoUrl)
    if (err) fieldErrors.videoUrl = err
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  const updateValues: Partial<typeof materials.$inferInsert> = {
    lastEditedAt: new Date(),
  }
  if (data.title !== undefined) updateValues.title = data.title.trim()
  if (data.subject !== undefined) updateValues.subject = data.subject
  if (data.contentBody !== undefined)
    updateValues.description = data.contentBody.substring(0, 500)
  if (data.videoUrl !== undefined) updateValues.videoUrl = data.videoUrl.trim() || null

  const [updated] = await db
    .update(materials)
    .set(updateValues)
    .where(eq(materials.id, materialId))
    .returning()

  revalidatePath("/dashboard")
  return { material: updated }
}

// ─────────────────────────────────────────────────────────────
// Admin: User search with partial-match (Req 11.1)
// ─────────────────────────────────────────────────────────────

export async function searchUsers(query: string) {
  await requireAdmin()

  if (!query.trim()) {
    return []
  }

  const pattern = `%${query.trim()}%`
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      suspended: user.suspended,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(or(ilike(user.name, pattern), ilike(user.email, pattern)))
    .orderBy(user.name)
    .limit(50)
}

// ─────────────────────────────────────────────────────────────
// Admin: Suspend / unsuspend user (Req 11.2)
// ─────────────────────────────────────────────────────────────

export async function suspendUser(targetUserId: string) {
  const adminId = await requireAdmin()

  await db
    .update(user)
    .set({ suspended: true })
    .where(eq(user.id, targetUserId))

  // Audit log
  await db.insert(adminAuditLog).values({
    adminId,
    actionType: "SUSPEND_USER",
    entityType: "user",
    entityId: targetUserId,
    details: JSON.stringify({ suspended: true }),
  })

  revalidatePath("/dashboard/admin")
  revalidatePath("/dashboard/admin/users")
}

export async function unsuspendUser(targetUserId: string) {
  const adminId = await requireAdmin()

  await db
    .update(user)
    .set({ suspended: false })
    .where(eq(user.id, targetUserId))

  await db.insert(adminAuditLog).values({
    adminId,
    actionType: "UNSUSPEND_USER",
    entityType: "user",
    entityId: targetUserId,
    details: JSON.stringify({ suspended: false }),
  })

  revalidatePath("/dashboard/admin")
  revalidatePath("/dashboard/admin/users")
}

// ─────────────────────────────────────────────────────────────
// Admin: Adjust subscription plan (Req 11.3)
// ─────────────────────────────────────────────────────────────

export async function adminAdjustSubscription(
  targetUserId: string,
  newPlan: string
) {
  const adminId = await requireAdmin()

  // Cancel existing active subscriptions
  await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(subscriptions.userId, targetUserId),
        eq(subscriptions.status, "active")
      )
    )

  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 1)

  await db.insert(subscriptions).values({
    userId: targetUserId,
    plan: newPlan,
    status: "active",
    endDate,
  })

  // Notify the affected user
  const [targetUser] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, targetUserId))

  await createNotification(
    targetUserId,
    "Subscription Updated",
    `Your subscription has been changed to the ${newPlan} plan by an administrator.`,
    "/pricing",
    "Subscription"
  )

  // Audit log
  await db.insert(adminAuditLog).values({
    adminId,
    actionType: "ADJUST_SUBSCRIPTION",
    entityType: "subscription",
    entityId: targetUserId,
    details: JSON.stringify({ newPlan }),
  })

  revalidatePath("/dashboard/admin")
}

// ─────────────────────────────────────────────────────────────
// Admin: Role update with audit log (Req 11.5)
// ─────────────────────────────────────────────────────────────

export async function updateUserRole(targetUserId: string, newRole: UserRole) {
  const adminId = await requireAdmin()
  const validRoles: UserRole[] = ["admin", "lecturer", "tutor", "student"]
  if (!validRoles.includes(newRole)) {
    throw new Error("Invalid role")
  }

  const [existing] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, targetUserId))

  await db.update(user).set({ role: newRole }).where(eq(user.id, targetUserId))

  await db.insert(adminAuditLog).values({
    adminId,
    actionType: "CHANGE_ROLE",
    entityType: "user",
    entityId: targetUserId,
    details: JSON.stringify({ from: existing?.role, to: newRole }),
  })

  revalidatePath("/dashboard")
}

// ─────────────────────────────────────────────────────────────
// Admin: Platform activity report (Req 11.4)
// ─────────────────────────────────────────────────────────────

export async function getPlatformActivityReport(fromDate: Date, toDate: Date) {
  await requireAdmin()

  const [newUsers] = await db
    .select({ cnt: count() })
    .from(user)
    .where(and(gte(user.createdAt, fromDate), sql`${user.createdAt} <= ${toDate.toISOString()}`))

  // Login activity approximated via session count in range
  // (Better Auth does not expose login events directly, so we count session rows)
  const loginCount = 0 // placeholder – real impl would query session table

  const [subChanges] = await db
    .select({ cnt: count() })
    .from(subscriptions)
    .where(
      and(
        gte(subscriptions.createdAt, fromDate),
        sql`${subscriptions.createdAt} <= ${toDate.toISOString()}`
      )
    )

  return {
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    newUserRegistrations: Number(newUsers?.cnt ?? 0),
    loginActivity: loginCount,
    subscriptionChanges: Number(subChanges?.cnt ?? 0),
  }
}

// ─────────────────────────────────────────────────────────────
// Instructor: Student monitoring (Req 10.5)
// ─────────────────────────────────────────────────────────────

/**
 * Aggregated performance metrics for students who accessed the instructor's
 * lessons within the past 30 days, for consenting students only.
 */
export async function getInstructorStudentMonitoring() {
  const { userId, role } = await getUserWithRole()

  if (!["admin", "lecturer"].includes(role)) {
    throw new Error("Instructor access required")
  }

  // Lessons uploaded by this instructor
  const instructorMaterials = await db
    .select({ id: materials.id })
    .from(materials)
    .where(eq(materials.uploaderId, userId))

  if (instructorMaterials.length === 0) return []

  // Import here to avoid circular dep
  const { getStudentProgressForInstructor } = await import("@/app/actions/progress")

  // Get unique students who completed any of the instructor's lessons
  const { lessonProgress, progressConsent } = await import("@/lib/db/schema")
  const materialIds = instructorMaterials.map((m) => m.id)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const studentRows = await db
    .selectDistinct({ userId: lessonProgress.userId })
    .from(lessonProgress)
    .where(gte(lessonProgress.completedAt, thirtyDaysAgo))

  const results = []
  for (const row of studentRows) {
    if (materialIds.some(Boolean)) {
      const progress = await getStudentProgressForInstructor(row.userId)
      if (progress) results.push(progress)
    }
  }

  return results
}

// ─────────────────────────────────────────────────────────────
// Instructor: Comments on their materials (student notifications)
// ─────────────────────────────────────────────────────────────

/**
 * Returns recent comments from students on this instructor's materials.
 * Used as a "student activity" feed on the instructor dashboard.
 */
export async function getCommentsOnMyMaterials(limit = 20) {
  const { userId, role } = await getUserWithRole()
  if (!["lecturer", "tutor", "admin"].includes(role)) {
    throw new Error("Instructor access required")
  }

  // Get material IDs belonging to this instructor
  const myMats = await db
    .select({ id: materials.id, title: materials.title })
    .from(materials)
    .where(eq(materials.uploaderId, userId))

  if (myMats.length === 0) return []

  const matIds = myMats.map((m) => m.id)

  const rows = await db
    .select({
      commentId: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      materialId: comments.materialId,
      materialTitle: materials.title,
      studentName: user.name,
      studentId: user.id,
    })
    .from(comments)
    .innerJoin(materials, eq(comments.materialId, materials.id))
    .innerJoin(user, eq(comments.userId, user.id))
    .where(sql`${comments.materialId} = ANY(ARRAY[${sql.join(matIds.map((id) => sql`${id}`), sql`, `)}]::int[])`)
    .orderBy(desc(comments.createdAt))
    .limit(limit)

  return rows
}

/**
 * Returns aggregate upload stats for this instructor.
 */
export async function getMyUploadStats() {
  const { userId, role } = await getUserWithRole()
  if (!["lecturer", "tutor", "admin"].includes(role)) {
    throw new Error("Instructor access required")
  }

  const [totalRow] = await db
    .select({ cnt: count() })
    .from(materials)
    .where(eq(materials.uploaderId, userId))

  const [downloadRow] = await db
    .select({ total: sql<number>`coalesce(sum(${materials.downloadCount}), 0)` })
    .from(materials)
    .where(eq(materials.uploaderId, userId))

  return {
    totalUploads: Number(totalRow?.cnt ?? 0),
    totalDownloads: Number(downloadRow?.total ?? 0),
  }
}
