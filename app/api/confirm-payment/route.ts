import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { activatePaidSubscription } from "@/app/actions/subscriptions"
import { PLANS, type SubscriptionPlan } from "@/lib/subscriptions"

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const plan = body?.plan as SubscriptionPlan

  const validPaidPlans: SubscriptionPlan[] = ["basic", "standard", "premium", "elite"]
  if (!plan || !PLANS[plan] || !validPaidPlans.includes(plan)) {
    return NextResponse.json(
      { error: "Invalid plan. Choose one of: basic, standard, premium, elite." },
      { status: 400 }
    )
  }

  try {
    await activatePaidSubscription(plan)

    const planDetails = PLANS[plan]
    return NextResponse.json({
      success: true,
      message: `Payment confirmed. Your ${planDetails.name} plan (${planDetails.currency}${planDetails.price}/month) is now active.`,
      plan: planDetails.name,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to confirm payment" },
      { status: 500 }
    )
  }
}
