import { getProgressReport, getProgressConsent } from "@/app/actions/progress"
import { ProgressReport } from "@/components/progress-report"
import { ConsentCard } from "@/components/consent-card"

export default async function ProgressPage() {
  let report: Awaited<ReturnType<typeof getProgressReport>> | null = null
  let loadError = false
  let consented = false

  try {
    ;[report, consented] = await Promise.all([getProgressReport(), getProgressConsent()])
  } catch {
    loadError = true
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Progress</h1>
        <p className="text-muted-foreground mt-1">
          Track your learning activity, assessment scores, and improvement trends.
        </p>
      </div>

      {/* Data-sharing consent — Req 7.5 */}
      <ConsentCard consented={consented} />

      <ProgressReport report={report} loadError={loadError} />
    </div>
  )
}
