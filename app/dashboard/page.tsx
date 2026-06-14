import { getUserRole, getDepartments, getCoursesByDepartment, getDashboardStats, getMyMaterials } from "@/app/actions/materials"
import { getUserNotifications } from "@/app/actions/notifications"
import { getUserSubscription } from "@/app/actions/subscriptions"
import { getLearningStreak, getTotalLessonsCompleted, getOverallProgressPercent } from "@/app/actions/progress"
import { getUserAchievements } from "@/app/actions/achievements"
import { DepartmentBrowser } from "@/components/department-browser"
import { DashboardOverview } from "@/components/dashboard-overview"
import { InstructorDashboard } from "@/components/instructor-dashboard"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell } from "lucide-react"

export default async function DashboardPage() {
  const role = await getUserRole()

  // ── Instructor / Tutor dashboard ──────────────────────────
  if (role === "lecturer" || role === "tutor") {
    const [notifications, myMaterials, stats] = await Promise.all([
      getUserNotifications(),
      getMyMaterials(),
      getDashboardStats(),
    ])
    return (
      <InstructorDashboard
        role={role}
        notifications={notifications}
        myMaterials={myMaterials}
        stats={stats}
      />
    )
  }

  // ── Admin dashboard — keep the existing overview + user stats ─
  if (role === "admin") {
    const [notifications, stats] = await Promise.all([
      getUserNotifications(),
      getDashboardStats(),
    ])
    const departments = await getDepartments()
    const departmentsWithCourses = await Promise.all(
      departments.map(async (dept) => ({
        ...dept,
        courses: await getCoursesByDepartment(dept.id),
      }))
    )
    return (
      <div className="space-y-10">
        <div className="rounded-3xl border border-border bg-card p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Admin Panel</p>
              <h1 className="text-4xl font-bold text-foreground mt-2">Platform Overview</h1>
              <p className="text-muted-foreground mt-3">Manage users, subscriptions, and platform content.</p>
            </div>
            <Badge variant="destructive" className="text-sm">Administrator</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-4 mt-6">
            {[
              { label: "Departments", value: stats.departments },
              { label: "Courses", value: stats.courses },
              { label: "Materials", value: stats.materials },
              { label: "Users", value: stats.users ?? 0 },
            ].map(({ label, value }) => (
              <Card key={label} className="border-border">
                <CardContent className="pt-6">
                  <p className="text-3xl font-bold text-foreground">{value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Content Library</h2>
              <p className="text-muted-foreground mt-1">Browse all departments and courses.</p>
            </div>
            <DepartmentBrowser departments={departmentsWithCourses} userRole={role} />
          </section>
          <NotificationsSidebar notifications={notifications} />
        </div>
      </div>
    )
  }

  // ── Student dashboard ─────────────────────────────────────
  const departments = await getDepartments()
  const subscription = await getUserSubscription()
  const notifications = await getUserNotifications()
  const stats = await getDashboardStats()

  let streak = 0, totalLessons = 0, progressPercent = 0, progressError = false
  try {
    ;[streak, totalLessons, progressPercent] = await Promise.all([
      getLearningStreak(),
      getTotalLessonsCompleted(),
      getOverallProgressPercent(),
    ])
  } catch { progressError = true }

  let recentAchievements: Awaited<ReturnType<typeof getUserAchievements>> = []
  try { recentAchievements = (await getUserAchievements()).slice(0, 3) } catch {}

  const departmentsWithCourses = await Promise.all(
    departments.map(async (dept) => ({
      ...dept,
      courses: await getCoursesByDepartment(dept.id),
    }))
  )

  return (
    <div className="space-y-10">
      <DashboardOverview
        role={role}
        stats={stats}
        subscription={{ plan: subscription.plan, name: subscription.name }}
        streak={streak}
        totalLessons={totalLessons}
        progressPercent={progressPercent}
        progressError={progressError}
        recentAchievements={recentAchievements}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-foreground">Browse Materials</h2>
            <p className="text-muted-foreground mt-1">Select a department and course to view available lecture materials.</p>
          </div>
          <DepartmentBrowser departments={departmentsWithCourses} userRole={role} />
        </section>
        <NotificationsSidebar notifications={notifications} />
      </div>
    </div>
  )
}

// Shared notifications sidebar component (server)
function NotificationsSidebar({ notifications }: { notifications: Array<{ id: number; title: string; message: string; read: boolean; createdAt: Date }> }) {
  return (
    <aside>
      <Card className="border-border bg-card sticky top-24">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Recent Alerts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="rounded-2xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground text-sm">{n.title}</p>
                    {!n.read && <Badge variant="default" className="text-xs">New</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}
