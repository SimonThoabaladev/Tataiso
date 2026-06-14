export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { PaymentCheckout } from "@/components/payment-checkout"
import { PLANS, type SubscriptionPlan } from "@/lib/subscriptions"

interface CheckoutPageProps {
  params: Promise<{ plan: string }>
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { plan: planKey } = await params
  const plan = planKey as SubscriptionPlan
  const planDetails = PLANS[plan]

  const validPaidPlans: SubscriptionPlan[] = ["basic", "standard", "premium", "elite"]
  if (!planDetails || !validPaidPlans.includes(plan)) {
    redirect("/pricing")
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    redirect("/sign-in")
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <h1 className="text-4xl font-bold text-foreground">
              Confirm your {planDetails.name} plan
            </h1>
            <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
              You are about to activate the {planDetails.name} plan at{" "}
              {planDetails.currency}
              {planDetails.price}/month. After payment is confirmed, your subscription will be
              activated and you will have immediate access to all{" "}
              {planDetails.name.toLowerCase()} features.
            </p>
          </div>

          <PaymentCheckout
            plan={plan}
            name={planDetails.name}
            price={`${planDetails.currency}${planDetails.price}`}
            description={planDetails.description}
            features={planDetails.features}
          />
        </div>
      </div>
    </div>
  )
}
