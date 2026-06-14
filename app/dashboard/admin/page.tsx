import Link from "next/link"
import { getAllUsers, getUserRole, getPlatformActivityReport } from "@/app/actions/materials"
import { redirect } from "next/navigation"
import { AdminPanel } from "@/components/admin-panel"
import { AdminActivityReport } from "@/components/admin-activity-report"
import { buttonVariants } from "@/components/ui/button"
import { Shield, Users } from "lucide-react"

export default async function AdminPage() {
  const role = await getUserRole()

  if (role !== "admin") {
    redirect("/dashboard")
  }

  const users = await getAllUsers()

  // Default: last 30 days
  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 30)

  let activityReport: Awaited<ReturnType<typeof getPlatformActivityReport>> | null = null
  try {
    activityReport = await getPlatformActivityReport(fromDate, toDate)
  } catch {
    // Non-critical
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Manage users, subscriptions, and platform activity.</p>
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

      {/* Activity report — Req 11.4 */}
      {activityReport && (
        <AdminActivityReport report={activityReport} />
      )}

      <AdminPanel users={users} currentUserRole={role} />
    </div>
  )
}
