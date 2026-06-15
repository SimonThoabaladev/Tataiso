import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { activatePaidSubscription } from "@/app/actions/subscriptions"
import { type SubscriptionPlan } from "@/lib/subscriptions"

export const dynamic = "force-dynamic"

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-05-28.basil" })
  : null

export async function GET(request: NextRequest) {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
  const sessionId = request.nextUrl.searchParams.get("session_id")
  const plan = request.nextUrl.searchParams.get("plan") as SubscriptionPlan

  if (!stripe || !sessionId || !plan) {
    return NextResponse.redirect(`${baseUrl}/pricing?error=invalid_session`)
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== "paid") {
      return NextResponse.redirect(`${baseUrl}/pricing/${plan}/checkout?error=payment_failed`)
    }

    // Activate subscription server-side using the userId from metadata
    // We call the DB directly since we're not in an auth context here
    const { db } = await import("@/lib/db")
    const { subscriptions, user } = await import("@/lib/db/schema")
    const { and, eq, desc } = await import("drizzle-orm")
    const { createNotification } = await import("@/app/actions/notifications")
    const { PLANS } = await import("@/lib/subscriptions")

    const userId = session.metadata?.plan ? session.metadata?.userId ?? "" : ""
    const metaUserId = session.metadata?.userId ?? ""

    if (!metaUserId) {
      return NextResponse.redirect(`${baseUrl}/pricing?error=missing_user`)
    }

    // Cancel existing active subscriptions
    await db
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(and(eq(subscriptions.userId, metaUserId), eq(subscriptions.status, "active")))

    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1)

    await db.insert(subscriptions).values({
      userId: metaUserId,
      plan,
      status: "active",
      startDate: new Date(),
      endDate,
    })

    await createNotification(
      metaUserId,
      "Subscription Activated via Stripe",
      `Your ${PLANS[plan].name} plan is now active until ${endDate.toDateString()}.`,
      "/dashboard",
      "Subscription"
    )

    return NextResponse.redirect(`${baseUrl}/dashboard?payment=success&plan=${plan}`)
  } catch (err) {
    console.error("Stripe success handler error:", err)
    return NextResponse.redirect(`${baseUrl}/pricing?error=activation_failed`)
  }
}
