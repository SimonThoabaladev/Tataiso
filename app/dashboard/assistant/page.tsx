import { getUserSubscription } from "@/app/actions/subscriptions"
import { AssistantChat } from "@/components/assistant-chat"

export default async function AssistantPage() {
  const subscription = await getUserSubscription()

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">AI Assistant</h1>
        <p className="text-muted-foreground mt-1">
          Ask questions, get step-by-step explanations, and request practice exercises.
          {subscription.plan === "free" || subscription.plan === "basic"
            ? " Upgrade to Standard or above for advanced structured responses."
            : ""}
        </p>
      </div>
      <AssistantChat tier={subscription.plan} />
    </div>
  )
}
