export const dynamic = "force-dynamic"
import { getUserSubscription } from "@/app/actions/subscriptions"
import { AssistantChat } from "@/components/assistant-chat"
import { MaterialAnalyzer } from "@/components/material-analyzer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Sparkles } from "lucide-react"

export default async function AssistantPage() {
  const subscription = await getUserSubscription()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Assistant</h1>
        <p className="text-muted-foreground mt-1">
          Ask questions, get step-by-step explanations, and analyze your study materials with AI.
          {subscription.plan === "free" || subscription.plan === "basic"
            ? " Upgrade to Standard or above for advanced structured responses."
            : ""}
        </p>
      </div>

      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Ask a Question
          </TabsTrigger>
          <TabsTrigger value="analyze" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Analyze Material
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <AssistantChat tier={subscription.plan} />
        </TabsContent>

        <TabsContent value="analyze">
          <MaterialAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  )
}
