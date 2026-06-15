import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { courses, departments } from "@/lib/db/schema"
import { asc, sql } from "drizzle-orm"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json([], { status: 200 })
    }

    const rows = await db
      .select({
        id: courses.id,
        code: courses.code,
        name: courses.name,
        popular: courses.popular,
        departmentName: departments.name,
      })
      .from(courses)
      .innerJoin(departments, eq(courses.departmentId, departments.id))
      .orderBy(
        sql`${courses.popular} DESC`,
        asc(courses.name)
      )

    return NextResponse.json(rows)
  } catch {
    // Table may not exist yet — return empty list so sign-up form still works
    return NextResponse.json([])
  }
}
