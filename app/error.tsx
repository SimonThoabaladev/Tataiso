"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error boundary — Req 12.4
 * Displays an error category and correlation ID (digest) to the user.
 * Reports the error to /api/error for server-side logging — Req 12.5.
 */
export default function GlobalError({ error, reset }: ErrorProps) {
  const correlationId = error.digest ?? "unknown"

  useEffect(() => {
    // Req 12.5 — report to server log
    fetch("/api/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correlationId,
        category: "UNHANDLED_ERROR",
        message: error.message ?? "Unknown error",
        endpoint: typeof window !== "undefined" ? window.location.pathname : "unknown",
      }),
    }).catch(() => {})
  }, [error, correlationId])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/30">
        <CardContent className="p-8 text-center">
          <div className="inline-flex p-3 bg-destructive/10 rounded-full text-destructive mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            An unexpected error occurred. Our team has been notified.
          </p>
          {/* Req 12.4 — expose error category and correlation ID */}
          <div className="rounded-lg bg-muted p-3 mt-4 text-left space-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Error category:</span> APPLICATION_ERROR
            </p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              <span className="font-medium font-sans">Correlation ID:</span> {correlationId}
            </p>
          </div>
          <div className="flex gap-3 justify-center mt-6">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
