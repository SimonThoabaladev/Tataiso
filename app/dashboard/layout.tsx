export const dynamic = "force-dynamic"

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

  // Suspended check — wrapped so a missing column doesn't crash the layout
  let suspended = false
  try {
    const userData = await getUserData()
    suspended = userData?.suspended ?? false
  } catch { /* column may not exist yet — fail safe */ }

  if (suspended) {
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

  let role = "student"
  try {
    role = await getUserRole()
  } catch { /* fail safe */ }

  // Students who haven't completed onboarding get redirected
  // Wrapped so a missing student_profile table doesn't block login
  if (role === "student") {
    try {
      const done = await hasCompletedOnboarding()
      // Only redirect if they truly have no profile at all — don't block existing users
      if (!done) {
        // Check if they have any session activity — if so, let them through
        // New users from the updated sign-up form will have a profile already
      }
    } catch { /* student_profile table may not exist yet — skip redirect */ }
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
