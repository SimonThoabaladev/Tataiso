export const dynamic = "force-dynamic"
import Link from "next/link"
import { getAllUsers, getUserRole, getPlatformActivityReport } from "@/app/actions/materials"
import { getCoursesForOnboarding } from "@/app/actions/onboarding"
import { getDepartments } from "@/app/actions/materials"
import { db } from "@/lib/db"
import { departments } from "@/lib/db/schema"
import { redirect } from "next/navigation"
import { AdminPanel } from "@/components/admin-panel"
import { AdminActivityReport } from "@/components/admin-activity-report"
import { AdminCoursesPanel } from "@/components/admin-courses-panel"
import { buttonVariants } from "@/components/ui/button"
import { Shield, Users } from "lucide-react"

export default async function AdminPage() {
  const role = await getUserRole()

  if (role !== "admin") {
    redirect("/dashboard")
  }

  const [users, courses, activityReport] = await Promise.all([
    getAllUsers(),
    getCoursesForOnboarding().catch(() => []),
    getPlatformActivityReport(
      new Date(Date.now() - 30 * 86400000),
      new Date()
    ).catch(() => null),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage users, subscriptions, courses, and platform activity.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/admin/users" className={buttonVariants({ variant: "outline" })}>
            <Users className="h-4 w-4 mr-2" />
            User Management
          </Link>
          <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
            <Shield className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Link>
        </div>
      </div>

      {activityReport && <AdminActivityReport report={activityReport} />}

      {/* Course popularity management */}
      <AdminCoursesPanel courses={courses} />

      <AdminPanel users={users} currentUserRole={role} />
    </div>
  )
}
