import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PLANS, type SubscriptionPlan } from "@/lib/subscriptions"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const paystackKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackKey || paystackKey.includes("your_paystack")) {
    return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 })
  }

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const plan = body?.plan as SubscriptionPlan
  const validPaid: SubscriptionPlan[] = ["basic", "standard", "premium", "elite"]

  if (!plan || !validPaid.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 })
  }

  const planDetails = PLANS[plan]
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

  // Paystack amount is in kobo (ZAR cents). 1 M ≈ 1 ZAR → multiply by 100
  const amountKobo = planDetails.price * 100

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: session.user.email,
      amount: amountKobo,
      currency: "ZAR",
      callback_url: `${baseUrl}/api/payment/paystack/verify?plan=${plan}&userId=${session.user.id}`,
      metadata: {
        userId: session.user.id,
        plan,
        planName: planDetails.name,
      },
    }),
  })

  const data = await response.json()

  if (!response.ok || !data.status) {
    return NextResponse.json(
      { error: data.message ?? "Paystack initialization failed" },
      { status: 400 }
    )
  }

  return NextResponse.json({
    url: data.data.authorization_url,
    reference: data.data.reference,
  })
}
