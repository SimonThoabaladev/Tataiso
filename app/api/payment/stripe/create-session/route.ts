import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/auth"
import { PLANS, type SubscriptionPlan } from "@/lib/subscriptions"

export const dynamic = "force-dynamic"

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-05-28.basil" })
  : null

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 })
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

  // Convert M (Lesotho Loti) price to cents — using ZAR as closest Stripe-supported
  // currency. 1 M ≈ 1 ZAR. Stripe uses smallest currency unit (cents).
  const amountCents = planDetails.price * 100

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: session.user.email,
    line_items: [
      {
        price_data: {
          currency: "zar",
          unit_amount: amountCents,
          product_data: {
            name: `Tataiso ${planDetails.name} Plan`,
            description: planDetails.description,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.user.id,
      plan,
    },
    success_url: `${baseUrl}/api/payment/stripe/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
    cancel_url: `${baseUrl}/pricing/${plan}/checkout?cancelled=1`,
  })

  return NextResponse.json({ url: checkoutSession.url })
}
