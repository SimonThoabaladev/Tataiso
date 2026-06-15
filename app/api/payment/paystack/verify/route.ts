import { NextRequest, NextResponse } from "next/server"
import { type SubscriptionPlan, PLANS } from "@/lib/subscriptions"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
  const reference = request.nextUrl.searchParams.get("reference")
  const plan = request.nextUrl.searchParams.get("plan") as SubscriptionPlan
  const userId = request.nextUrl.searchParams.get("userId") ?? ""
  const paystackKey = process.env.PAYSTACK_SECRET_KEY

  if (!reference || !plan || !userId || !paystackKey) {
    return NextResponse.redirect(`${baseUrl}/pricing?error=invalid_callback`)
  }

  try {
    // Verify transaction with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
    })

    const verifyData = await verifyRes.json()

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return NextResponse.redirect(`${baseUrl}/pricing/${plan}/checkout?error=payment_failed`)
    }

    // Activate subscription
    const { db } = await import("@/lib/db")
    const { subscriptions } = await import("@/lib/db/schema")
    const { and, eq } = await import("drizzle-orm")
    const { createNotification } = await import("@/app/actions/notifications")

    await db
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))

    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1)

    await db.insert(subscriptions).values({
      userId,
      plan,
      status: "active",
      startDate: new Date(),
      endDate,
    })

    await createNotification(
      userId,
      "Subscription Activated via Paystack",
      `Your ${PLANS[plan].name} plan is now active until ${endDate.toDateString()}.`,
      "/dashboard",
      "Subscription"
    )

    return NextResponse.redirect(`${baseUrl}/dashboard?payment=success&plan=${plan}`)
  } catch (err) {
    console.error("Paystack verify error:", err)
    return NextResponse.redirect(`${baseUrl}/pricing?error=activation_failed`)
  }
}
