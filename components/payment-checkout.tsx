"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, CheckCircle2, Loader2, AlertTriangle } from "lucide-react"
import { type SubscriptionPlan } from "@/lib/subscriptions"

interface PaymentCheckoutProps {
  plan: SubscriptionPlan
  name: string
  price: string
  description: string
  features: string[]
}

export function PaymentCheckout({
  plan,
  name,
  price,
  description,
  features,
}: PaymentCheckoutProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleConfirmPayment() {
    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Req 2.4 — display failure reason, allow retry without re-entering plan
        throw new Error(data?.error ?? "Payment confirmation failed")
      }

      setSuccess(true)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Unable to confirm payment")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-8 text-center">
          <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Subscription Activated!</h2>
          <p className="text-muted-foreground mt-2">
            Your <strong>{name}</strong> plan is now active. You have full access to all{" "}
            {name.toLowerCase()} features.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
            <Button variant="outline" onClick={() => router.push("/pricing")}>
              View Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Plan summary */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{name}</CardTitle>
            <Badge variant="secondary">{price}/month</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        By confirming, you agree to be billed <strong>{price}/month</strong>. Your subscription
        will renew automatically. You can cancel at any time from your account settings.
      </p>

      {/* Req 2.4 — show error with retry option */}
      {errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Payment failed</p>
            <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Please check your payment details and try again.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleConfirmPayment}
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming payment…
            </>
          ) : errorMsg ? (
            "Retry Payment"
          ) : (
            `Confirm & Activate ${name}`
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/pricing")}
          disabled={loading}
        >
          Change Plan
        </Button>
      </div>
    </div>
  )
}
