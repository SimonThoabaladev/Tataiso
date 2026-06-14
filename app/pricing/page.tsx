export const dynamic = "force-dynamic"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { PricingCards } from "@/components/pricing-cards"
import { getUserSubscription } from "@/app/actions/subscriptions"

export default async function PricingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    redirect("/sign-in")
  }

  const subscription = await getUserSubscription()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Learning Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start with a free 7-day trial, then choose the plan that fits your goals — from
            Basic at M50/month to Elite at M200/month.
          </p>
        </div>

        <PricingCards currentPlan={subscription.plan} />

        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "How long is the free trial?",
                a: "The Free Trial lasts 7 days and gives you access to up to 10 lessons, the AI Assistant, and up to 2 assessment attempts. No payment details required.",
              },
              {
                q: "What is the difference between Standard and Premium?",
                a: "Standard adds advanced AI responses, video resources, and detailed analytics on top of Basic. Premium adds personalized learning paths, priority AI responses, and Instructor feedback on top of Standard.",
              },
              {
                q: "Can I upgrade or downgrade at any time?",
                a: "Yes. Plan changes take effect immediately after confirmed payment or cancellation. You will receive an in-app notification confirming the change.",
              },
              {
                q: "What happens when my subscription renews?",
                a: "Your plan renews monthly. If a renewal charge fails, you will be notified by email and in-app, and access will revert to Free Trial limits until successful renewal.",
              },
              {
                q: "What payment methods are accepted?",
                a: "We accept mobile money, bank transfers, and card payments. All transactions are processed securely.",
              },
            ].map(({ q, a }, i) => (
              <div key={i} className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-medium text-foreground mb-2">{q}</h3>
                <p className="text-muted-foreground text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
