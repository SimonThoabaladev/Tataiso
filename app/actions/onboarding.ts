"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  studentProfile,
  courses,
  departments,
  materials,
  user,
} from "@/lib/db/schema"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

// ─────────────────────────────────────────────────────────────
// Course list for picker — popular courses first
// ─────────────────────────────────────────────────────────────

export async function getCoursesForOnboarding() {
  const rows = await db
    .select({
      id: courses.id,
      code: courses.code,
      name: courses.name,
      description: courses.description,
      popular: courses.popular,
      departmentName: departments.name,
    })
    .from(courses)
    .innerJoin(departments, eq(courses.departmentId, departments.id))
    .orderBy(
      // Popular courses first, then alphabetical by name
      sql`${courses.popular} DESC`,
      asc(courses.name)
    )

  return rows
}

// ─────────────────────────────────────────────────────────────
// Modules (materials) for a selected course
// ─────────────────────────────────────────────────────────────

export async function getModulesForCourse(courseId: number) {
  return db
    .select({
      id: materials.id,
      title: materials.title,
      subject: materials.subject,
      lessonNumber: materials.lessonNumber,
      fileType: materials.fileType,
    })
    .from(materials)
    .where(eq(materials.courseId, courseId))
    .orderBy(asc(materials.lessonNumber), asc(materials.createdAt))
}

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

/** Student number: 4 digits / 4–6 digits  e.g. 2021/12345 or just 202112345 */
export function validateStudentNumber(value: string): string | null {
  const cleaned = value.trim()
  if (!cleaned) return "Student number is required."
  // Accept formats: 2021/12345, 202112345, ST2021001, or any alphanumeric 6-12 chars
  const re = /^[A-Za-z0-9/\-]{4,20}$/
  if (!re.test(cleaned)) {
    return "Enter a valid student number (e.g. 2021/12345 or ST2021001)."
  }
  return null
}

// ─────────────────────────────────────────────────────────────
// Save onboarding profile
// ─────────────────────────────────────────────────────────────

export type OnboardingData = {
  studentNumber: string
  courseId: number
  selectedModuleIds: number[]
}

export type OnboardingResult =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string> }

export async function saveOnboardingProfile(
  data: OnboardingData
): Promise<OnboardingResult> {
  let userId: string
  try {
    userId = await getUserId()
  } catch {
    return { error: "You must be signed in to complete onboarding." }
  }

  // Validate student number
  const snError = validateStudentNumber(data.studentNumber)
  if (snError) {
    return { error: snError, fieldErrors: { studentNumber: snError } }
  }

  if (!data.courseId) {
    return { error: "Please select a course.", fieldErrors: { courseId: "Course is required." } }
  }

  // Upsert profile
  const existing = await db
    .select()
    .from(studentProfile)
    .where(eq(studentProfile.userId, userId))

  const profileData = {
    userId,
    studentNumber: data.studentNumber.trim(),
    courseId: data.courseId,
    selectedModules: JSON.stringify(data.selectedModuleIds),
    onboardingComplete: true,
    updatedAt: new Date(),
  }

  if (existing.length > 0) {
    await db
      .update(studentProfile)
      .set(profileData)
      .where(eq(studentProfile.userId, userId))
  } else {
    await db.insert(studentProfile).values(profileData)
  }

  revalidatePath("/dashboard")
  return { success: true }
}

// ─────────────────────────────────────────────────────────────
// Get student's profile (for dashboard / admin)
// ─────────────────────────────────────────────────────────────

export async function getMyStudentProfile() {
  const userId = await getUserId()

  const [profile] = await db
    .select()
    .from(studentProfile)
    .where(eq(studentProfile.userId, userId))

  if (!profile) return null

  const [course] = await db
    .select({ id: courses.id, code: courses.code, name: courses.name })
    .from(courses)
    .where(eq(courses.id, profile.courseId))

  const moduleIds: number[] = JSON.parse(profile.selectedModules ?? "[]")

  return {
    ...profile,
    course,
    selectedModuleIds: moduleIds,
  }
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const userId = await getUserId()
    const [row] = await db
      .select({ done: studentProfile.onboardingComplete })
      .from(studentProfile)
      .where(eq(studentProfile.userId, userId))
    return row?.done ?? false
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────
// Admin: toggle popular flag on a course
// ─────────────────────────────────────────────────────────────

export async function toggleCoursePopular(courseId: number, popular: boolean) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")

  const [userData] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))

  if (userData?.role !== "admin") throw new Error("Admin access required")

  await db
    .update(courses)
    .set({ popular })
    .where(eq(courses.id, courseId))

  revalidatePath("/dashboard/admin")
  revalidatePath("/onboarding")
}
