"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { setProgressConsent } from "@/app/actions/progress"

interface ConsentCardProps {
  consented: boolean
}

export function ConsentCard({ consented: initialConsented }: ConsentCardProps) {
  const [consented, setConsented] = useState(initialConsented)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (checked: boolean) => {
    setConsented(checked)
    startTransition(async () => {
      await setProgressConsent(checked)
    })
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {consented ? (
            <Eye className="h-4 w-4 text-primary" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
          Data Sharing with Instructors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-foreground">
              Allow instructors to view your assessment scores and lesson completion rates.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {consented
                ? "Instructors assigned to your courses can see your progress data."
                : "Your progress data is private and not visible to instructors."}
              {" "}You can change this setting at any time — changes take effect immediately.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="consent-toggle" className="text-sm text-muted-foreground">
              {consented ? "Sharing on" : "Sharing off"}
            </Label>
            <Switch
              id="consent-toggle"
              checked={consented}
              onCheckedChange={handleToggle}
              disabled={isPending}
              aria-label="Toggle progress data sharing with instructors"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
