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

  // Detect which gateways are configured
  const stripeEnabled =
    !!process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes("your_stripe")

  const paystackEnabled =
    !!process.env.PAYSTACK_SECRET_KEY &&
    !process.env.PAYSTACK_SECRET_KEY.includes("your_paystack")

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">
              {planDetails.name} Plan
            </h1>
            <p className="mt-3 text-base text-muted-foreground max-w-sm mx-auto">
              {planDetails.currency}{planDetails.price}/month · {planDetails.description}
            </p>
          </div>

          <PaymentCheckout
            plan={plan}
            name={planDetails.name}
            price={`${planDetails.currency}${planDetails.price}`}
            description={planDetails.description}
            features={planDetails.features}
            stripeEnabled={stripeEnabled}
            paystackEnabled={paystackEnabled}
          />
        </div>
      </div>
    </div>
  )
}
