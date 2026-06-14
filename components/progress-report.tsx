"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Flame,
  GraduationCap,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Clock,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ProgressReportProps {
  report: {
    streak: number
    totalLessons: number
    progressPercent: number
    recentScores: {
      id: number
      score: number
      passed: boolean
      completedAt: Date
    }[]
    activityDates: string[]
    detailedAnalytics: {
      subjectBreakdown: { subject: string; count: number }[]
      timeOnTaskMinutes: number
      improvementPercent: number
    } | null
  } | null
  loadError: boolean
}

export function ProgressReport({ report, loadError }: ProgressReportProps) {
  // Req 7.6 — empty state
  if (!loadError && report && report.totalLessons === 0 && report.recentScores.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          No learning data available yet. Complete a lesson or assessment to see your progress here.
        </CardContent>
      </Card>
    )
  }

  if (loadError || !report) {
    return (
      <Card className="border-border bg-destructive/5">
        <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Progress data is temporarily unavailable. Please try again later.</span>
        </CardContent>
      </Card>
    )
  }

  const avgScore =
    report.recentScores.length > 0
      ? Math.round(
          report.recentScores.reduce((s, a) => s + a.score, 0) /
            report.recentScores.length
        )
      : null

  return (
    <div className="space-y-6">
      {/* Summary cards — Req 7.2 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              Learning Streak
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {report.streak}{" "}
              <span className="text-base font-normal text-muted-foreground">days</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BookOpen className="h-4 w-4 text-primary" />
              Lessons Completed
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{report.totalLessons}</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <GraduationCap className="h-4 w-4 text-primary" />
              Overall Progress
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{report.progressPercent}%</p>
            <Progress value={report.progressPercent} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              Avg Assessment Score
            </div>
          </CardHeader>
          <CardContent>
            {avgScore !== null ? (
              <p className="text-3xl font-bold text-foreground">
                {avgScore}
                <span className="text-base font-normal text-muted-foreground">%</span>
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">No assessments yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 30-day learning trend */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">30-Day Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {report.activityDates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity in the last 30 days.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 30 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - (29 - i))
                const key = d.toISOString().slice(0, 10)
                const active = report.activityDates.includes(key)
                return (
                  <div
                    key={key}
                    title={key}
                    className={`w-5 h-5 rounded-sm ${
                      active
                        ? "bg-primary"
                        : "bg-muted border border-border"
                    }`}
                  />
                )
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Each square represents one day. Blue = active day.
          </p>
        </CardContent>
      </Card>

      {/* Recent assessment scores — Req 7.2 */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Recent Assessment Scores</CardTitle>
        </CardHeader>
        <CardContent>
          {report.recentScores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments in the past 30 days.</p>
          ) : (
            <div className="space-y-3">
              {report.recentScores.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        attempt.passed ? "bg-green-500" : "bg-destructive"
                      }`}
                    />
                    <span className="text-sm text-foreground">
                      {new Date(attempt.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={attempt.passed ? "default" : "destructive"}>
                      {attempt.score}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {attempt.passed ? "Passed" : "Failed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed analytics — Req 7.3 (Standard / Premium / Elite only) */}
      {report.detailedAnalytics && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Improvement (30 days)
                </div>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-bold ${
                    report.detailedAnalytics.improvementPercent >= 0
                      ? "text-green-600"
                      : "text-destructive"
                  }`}
                >
                  {report.detailedAnalytics.improvementPercent >= 0 ? "+" : ""}
                  {report.detailedAnalytics.improvementPercent}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">vs previous 15 days</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  Time on Task
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">
                  {report.detailedAnalytics.timeOnTaskMinutes}
                  <span className="text-base font-normal text-muted-foreground ml-1">min</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Estimated over 30 days</p>
              </CardContent>
            </Card>

            {/* Subject breakdown */}
            <Card className="border-border md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Subject Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {report.detailedAnalytics.subjectBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subject data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {report.detailedAnalytics.subjectBreakdown.map((s) => (
                      <div key={s.subject} className="flex items-center justify-between text-sm">
                        <span className="text-foreground truncate">{s.subject}</span>
                        <Badge variant="secondary">{s.count} lessons</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
