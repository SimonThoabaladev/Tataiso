"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, BookOpen, Brain, Crown, Sparkles, Star } from "lucide-react"
import { subscribeToPlan } from "@/app/actions/subscriptions"
import { PLANS, type SubscriptionPlan } from "@/lib/subscriptions"

interface PricingCardsProps {
  currentPlan: SubscriptionPlan
}

const planMeta: Record<
  SubscriptionPlan,
  { icon: React.ComponentType<{ className?: string }>; highlight: boolean; colorClass: string }
> = {
  free: { icon: BookOpen, highlight: false, colorClass: "bg-muted" },
  basic: { icon: Sparkles, highlight: false, colorClass: "bg-primary/10" },
  standard: { icon: Brain, highlight: false, colorClass: "bg-slate-100 dark:bg-slate-800" },
  premium: { icon: Crown, highlight: true, colorClass: "bg-accent/10" },
  elite: { icon: Star, highlight: true, colorClass: "bg-yellow-50 dark:bg-yellow-900/20" },
}

export function PricingCards({ currentPlan }: PricingCardsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleFreeTrial = async () => {
    setLoading("free")
    try {
      await subscribeToPlan("free")
      router.refresh()
    } catch (error) {
      console.error("Free trial error:", error)
      alert("Unable to start the free trial. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  const planOrder: SubscriptionPlan[] = ["free", "basic", "standard", "premium", "elite"]

  return (
    <div className="grid md:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
      {planOrder.map((key) => {
        const plan = PLANS[key]
        const meta = planMeta[key]
        const Icon = meta.icon
        const isCurrent = currentPlan === key
        const isDisabled = isCurrent || (key === "free" && currentPlan !== "free")

        return (
          <Card
            key={key}
            className={`relative flex flex-col ${
              meta.highlight
                ? "border-2 border-primary shadow-lg scale-[1.03]"
                : "border-border"
            }`}
          >
            {meta.highlight && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground whitespace-nowrap">
                Most Popular
              </Badge>
            )}

            <CardHeader className={`rounded-t-lg ${meta.colorClass}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{plan.name}</CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price === 0 ? "Free" : `${plan.currency}${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                )}
              </div>
              {key === "free" && (
                <p className="text-xs text-muted-foreground mt-1">7-day trial</p>
              )}
              <CardDescription className="mt-1">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 pt-6">
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              {key === "free" ? (
                <Button
                  className="w-full"
                  variant={meta.highlight ? "default" : "outline"}
                  disabled={isDisabled || loading !== null}
                  onClick={handleFreeTrial}
                >
                  {loading === "free" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : currentPlan !== "free" ? (
                    "Trial Used"
                  ) : (
                    "Start Free Trial"
                  )}
                </Button>
              ) : (
                <Link href={`/pricing/${key}/checkout`} className="w-full">
                  <Button
                    className="w-full"
                    variant={meta.highlight ? "default" : "outline"}
                    disabled={isCurrent}
                  >
                    {isCurrent ? "Current Plan" : `Choose ${plan.name}`}
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
