"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { FileDown, Users, RefreshCw, CreditCard, LogIn, Loader2 } from "lucide-react"
import { getPlatformActivityReport } from "@/app/actions/materials"

interface ActivityReport {
  period: { from: string; to: string }
  newUserRegistrations: number
  loginActivity: number
  subscriptionChanges: number
}

interface AdminActivityReportProps {
  report: ActivityReport
}

export function AdminActivityReport({ report: initialReport }: AdminActivityReportProps) {
  const [report, setReport] = useState<ActivityReport>(initialReport)
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  )
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10))
  const [isPending, startTransition] = useTransition()

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const result = await getPlatformActivityReport(new Date(fromDate), new Date(toDate))
        setReport(result)
      } catch (err) {
        console.error("Failed to generate report:", err)
      }
    })
  }

  // Simple CSV download — Req 11.4
  const handleDownload = () => {
    const csv = [
      "Metric,Value",
      `Period From,${report.period.from}`,
      `Period To,${report.period.to}`,
      `New User Registrations,${report.newUserRegistrations}`,
      `Login Activity,${report.loginActivity}`,
      `Subscription Changes,${report.subscriptionChanges}`,
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tataiso-activity-report-${fromDate}-to-${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-lg">Platform Activity Report</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              User registrations, login activity, and subscription changes for a date range.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
            <FileDown className="h-4 w-4" />
            Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date range selector */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="from-date">From</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to-date">To</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={handleGenerate} disabled={isPending} className="gap-2">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Generate
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {report.newUserRegistrations}
              </p>
              <p className="text-sm text-muted-foreground">New Registrations</p>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <LogIn className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{report.loginActivity}</p>
              <p className="text-sm text-muted-foreground">Login Events</p>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {report.subscriptionChanges}
              </p>
              <p className="text-sm text-muted-foreground">Subscription Changes</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Period: {new Date(report.period.from).toLocaleDateString()} –{" "}
          {new Date(report.period.to).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  )
}
