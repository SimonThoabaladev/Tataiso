export const dynamic = "force-dynamic"
export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getCoursesForOnboarding, hasCompletedOnboarding } from "@/app/actions/onboarding"
import { OnboardingForm } from "@/components/onboarding-form"
import { GraduationCap } from "lucide-react"

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  // Only students go through onboarding
  const role = (session.user as any).role ?? "student"
  if (role !== "student") redirect("/dashboard")

  // Already completed — go to dashboard
  const done = await hasCompletedOnboarding()
  if (done) redirect("/dashboard")

  const allCourses = await getCoursesForOnboarding()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4">
        <div className="container mx-auto flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">TATAISO</span>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome! Let&apos;s set up your profile
            </h1>
            <p className="text-muted-foreground mt-2">
              Tell us a bit about yourself so we can personalise your learning experience.
            </p>
          </div>
          <OnboardingForm courses={allCourses} userName={session.user.name} />
        </div>
      </main>
    </div>
  )
}
