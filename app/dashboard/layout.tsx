import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/dashboard-nav"
import { getUserRole, getUserData } from "@/app/actions/materials"
import { hasCompletedOnboarding } from "@/app/actions/onboarding"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  // Req 11.2 — suspended users are blocked
  const userData = await getUserData()
  if (userData?.suspended) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground">
            Your account has been suspended by an administrator. Please contact support if you
            believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  const role = await getUserRole()

  // Students who haven't completed onboarding get redirected
  if (role === "student") {
    const done = await hasCompletedOnboarding()
    if (!done) redirect("/onboarding")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={{ ...session.user, role }} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
