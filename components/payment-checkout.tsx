"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  CreditCard,
  Smartphone,
  Banknote,
} from "lucide-react"
import { type SubscriptionPlan } from "@/lib/subscriptions"

interface PaymentCheckoutProps {
  plan: SubscriptionPlan
  name: string
  price: string
  description: string
  features: string[]
  stripeEnabled: boolean
  paystackEnabled: boolean
}

type PaymentMethod = "stripe" | "paystack" | "manual"

const StripeIcon = () => (
  <svg viewBox="0 0 60 25" className="h-5 w-auto fill-current" aria-hidden>
    <path d="M59.6 10.8c0-3.6-1.8-6.4-5.1-6.4-3.4 0-5.4 2.8-5.4 6.3 0 4.2 2.4 6.3 5.8 6.3 1.7 0 3-.4 3.9-1v-2.8c-.9.5-1.9.7-3.2.7-1.3 0-2.4-.4-2.5-2h6.4c0-.2.1-.9.1-1.1zm-6.5-1.3c0-1.5.9-2.1 1.8-2.1.8 0 1.7.6 1.7 2.1h-3.5zM41.2 4.4c-1.3 0-2.1.6-2.6 1l-.2-.8h-2.9v16.6l3.3-.7V18c.5.3 1.2.8 2.4.8 2.4 0 4.6-1.9 4.6-6.2-.1-3.9-2.3-6.2-4.6-6.2zm-.8 9.5c-.8 0-1.3-.3-1.6-.7V8c.3-.4.9-.7 1.6-.7 1.2 0 2.1 1.4 2.1 3.3 0 1.9-.8 3.3-2.1 3.3zM30.5 3.2l-3.3.7v2.7l3.3-.7V3.2zM27.2 4.6v12h3.3V4.6h-3.3zM23.2 5.5l-.2-1h-2.8V16.6h3.3v-8c.8-1 2.1-.8 2.5-.7V4.7c-.5-.1-2-.4-2.8.8zM15.3 1.7l-3.2.7-.1 10.9c0 2 1.5 3.5 3.5 3.5 1.1 0 1.9-.2 2.4-.5v-2.7c-.4.2-2.5.8-2.5-1.2V7.6h2.5V4.6h-2.5l-.1-2.9zM5.4 8.4c0-.5.4-.7 1.1-.7 1 0 2.2.3 3.2.8V5.2C8.7 4.8 7.6 4.4 6.5 4.4 3.6 4.4 1.7 6 1.7 8.6c0 4 5.5 3.4 5.5 5.1 0 .6-.5.8-1.3.8-1.1 0-2.5-.5-3.6-1.1v3.4c1.2.5 2.4.8 3.6.8 2.9 0 4.9-1.5 4.9-4 0-4.4-5.4-3.6-5.4-5.2z"/>
  </svg>
)

const PaystackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
    <path d="M11.6 0C5.2 0 0 5.2 0 11.6s5.2 11.6 11.6 11.6 11.6-5.2 11.6-11.6S18 0 11.6 0zm5.2 14.4H6.4V9.6h10.4v4.8z"/>
  </svg>
)

export function PaymentCheckout({
  plan,
  name,
  price,
  description,
  features,
  stripeEnabled,
  paystackEnabled,
}: PaymentCheckoutProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<PaymentMethod | null>(null)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleStripe = async () => {
    setLoading("stripe")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/payment/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Stripe session creation failed")
      window.location.href = data.url
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Stripe payment failed")
      setLoading(null)
    }
  }

  const handlePaystack = async () => {
    setLoading("paystack")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/payment/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Paystack initialization failed")
      window.location.href = data.url
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Paystack payment failed")
      setLoading(null)
    }
  }

  const handleManual = async () => {
    setLoading("manual")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Activation failed")
      setSuccess(true)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Activation failed")
    } finally {
      setLoading(null)
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
            Your <strong>{name}</strong> plan is now active.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
            <Button variant="outline" onClick={() => router.push("/pricing")}>View Plans</Button>
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

      {/* Payment method selection */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Choose payment method</p>

        {/* Stripe */}
        {stripeEnabled && (
          <Button
            onClick={handleStripe}
            disabled={loading !== null}
            className="w-full h-14 text-base gap-3 bg-[#635BFF] hover:bg-[#4f48d4] text-white"
          >
            {loading === "stripe" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            <span>Pay with Card (Stripe)</span>
            <StripeIcon />
          </Button>
        )}

        {/* Paystack */}
        {paystackEnabled && (
          <Button
            onClick={handlePaystack}
            disabled={loading !== null}
            className="w-full h-14 text-base gap-3 bg-[#0BA4DB] hover:bg-[#0890c4] text-white"
          >
            {loading === "paystack" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Smartphone className="h-5 w-5" />
            )}
            <span>Pay with Paystack</span>
            <PaystackIcon />
          </Button>
        )}

        {/* Manual / admin confirmation (fallback) */}
        {!stripeEnabled && !paystackEnabled && (
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground space-y-3">
            <div className="flex items-start gap-2">
              <Banknote className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Manual Payment</p>
                <p>Transfer <strong>{price}</strong> via mobile money or EFT, then click confirm below.</p>
                <p className="mt-1">Account details will be sent to your email.</p>
              </div>
            </div>
            <Button onClick={handleManual} disabled={loading !== null} className="w-full">
              {loading === "manual" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating…</> : `Confirm ${name} Plan`}
            </Button>
          </div>
        )}

        {/* Show manual as secondary option even when gateways are available */}
        {(stripeEnabled || paystackEnabled) && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
        )}
        {(stripeEnabled || paystackEnabled) && (
          <Button variant="outline" onClick={handleManual} disabled={loading !== null} className="w-full">
            {loading === "manual" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating…</> : "Manual / Admin Activation"}
          </Button>
        )}
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Payment failed</p>
            <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      <Button variant="ghost" onClick={() => router.push("/pricing")} disabled={loading !== null} className="w-full">
        Change Plan
      </Button>
    </div>
  )
}
