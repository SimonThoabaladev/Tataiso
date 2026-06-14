"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  BookOpen,
  Flame,
  GraduationCap,
  Lightbulb,
  Library,
  Trophy,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react"

interface Achievement {
  id: number
  name: string
  unlockCriterion: string
  earnedAt: Date
  iconName: string
}

interface DashboardOverviewProps {
  role: string
  stats: {
    departments: number
    courses: number
    materials: number
    users?: number
  }
  subscription: { plan: string; name: string }
  streak: number
  totalLessons: number
  progressPercent: number
  progressError: boolean
  recentAchievements: Achievement[]
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  BookOpen,
  GraduationCap,
  Flame,
  ClipboardCheck,
}

function AchievementIcon({ iconName }: { iconName: string }) {
  const Icon = ICON_MAP[iconName] ?? Trophy
  return <Icon className="h-5 w-5" />
}

export function DashboardOverview({
  role,
  stats,
  subscription,
  streak,
  totalLessons,
  progressPercent,
  progressError,
  recentAchievements,
}: DashboardOverviewProps) {
  return (
    <section>
      {/* Welcome header */}
      <div className="rounded-3xl border border-border bg-card p-8 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Dashboard Overview
            </p>
            <h1 className="text-4xl font-bold text-foreground mt-2">Welcome back to Tataiso</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              Access your courses, AI assistant, and progress from a single place.
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {/* Learning Streak — Req 4.1 */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Learning Streak</span>
            </div>
          </CardHeader>
          <CardContent>
            {progressError ? (
              <ProgressUnavailable />
            ) : (
              <>
                <p className="text-3xl font-bold text-foreground">
                  {streak} <span className="text-base font-normal text-muted-foreground">days</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Consecutive days of activity</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Lessons Completed — Req 4.1 */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm">Lessons Completed</span>
            </div>
          </CardHeader>
          <CardContent>
            {progressError ? (
              <ProgressUnavailable />
            ) : (
              <>
                <p className="text-3xl font-bold text-foreground">{totalLessons}</p>
                <p className="text-xs text-muted-foreground mt-1">Total lessons finished</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Overall Progress — Req 4.1 */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-sm">Overall Progress</span>
            </div>
          </CardHeader>
          <CardContent>
            {progressError ? (
              <ProgressUnavailable />
            ) : (
              <>
                <p className="text-3xl font-bold text-foreground">{progressPercent}%</p>
                <Progress value={progressPercent} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">Of available content completed</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Library className="h-4 w-4 text-primary" />
              <span className="text-sm">Subscription</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-foreground">{subscription.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {subscription.plan === "free"
                ? "Upgrade to unlock full access"
                : "Active plan"}
            </p>
            {subscription.plan === "free" && (
              <Link href="/pricing">
                <Button size="sm" className="mt-2 h-7 text-xs">
                  Upgrade
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick access links — Req 4.4 */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Library className="h-4 w-4" />
                Content Library
              </Button>
            </Link>
            <Link href="/dashboard/assistant">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Lightbulb className="h-4 w-4" />
                AI Assistant
              </Button>
            </Link>
            <Link href="/dashboard/search">
              <Button variant="outline" className="w-full justify-start gap-2">
                <BookOpen className="h-4 w-4" />
                Search Materials
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Achievements — Req 4.3 */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#D4AF37]" />
              <CardTitle className="text-lg">Recent Achievements</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {recentAchievements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No achievements yet. Complete lessons and assessments to earn badges.
              </p>
            ) : (
              <div className="space-y-3">
                {recentAchievements.map((ach) => (
                  <div key={ach.id} className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-full"
                      style={{ background: "#D4AF3720", color: "#D4AF37" }}
                    >
                      <AchievementIcon iconName={ach.iconName} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{ach.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {ach.unlockCriterion}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(ach.earnedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

/** Inline message shown when Progress_Tracker is unavailable — Req 4.7 */
function ProgressUnavailable() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>Progress data temporarily unavailable</span>
    </div>
  )
}
