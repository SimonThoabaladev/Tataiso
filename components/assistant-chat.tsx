"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, MessageSquare, RefreshCw, AlertTriangle } from "lucide-react"

interface ChatMessage {
  role: "user" | "assistant"
  text: string
  isTimeout?: boolean
}

interface AssistantChatProps {
  /** Subscription plan for tier badge display */
  tier?: string
}

export function AssistantChat({ tier }: AssistantChatProps) {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTimeout, setIsTimeout] = useState(false)
  /** Last prompt so the user can retry on timeout — Req 5.5 */
  const [lastPrompt, setLastPrompt] = useState("")

  async function sendPrompt(promptText: string) {
    setError(null)
    setIsTimeout(false)
    setLoading(true)
    setLastPrompt(promptText)

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      })

      let data: any = null
      const ct = response.headers.get("content-type") ?? ""
      if (ct.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text().catch(() => "")
        throw new Error(text || "Non-JSON response from assistant")
      }

      if (!response.ok) {
        if (data?.timeout) {
          // Req 5.5 — timeout
          setIsTimeout(true)
          setMessages((prev) => [
            ...prev,
            { role: "user", text: promptText },
            {
              role: "assistant",
              text: "The assistant did not respond in time. Please retry.",
              isTimeout: true,
            },
          ])
        } else {
          throw new Error(data?.error ?? "Unable to get assistant response")
        }
        return
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", text: promptText },
        { role: "assistant", text: data.answer ?? "No response received." },
      ])
      setPrompt("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!prompt.trim()) return
    await sendPrompt(prompt.trim())
  }

  async function handleRetry() {
    if (!lastPrompt) return
    // Remove last timeout message pair
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.isTimeout) return prev.slice(0, -2)
      return prev
    })
    await sendPrompt(lastPrompt)
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Ask the AI Assistant</CardTitle>
            {tier && tier !== "free" && (
              <Badge variant="secondary" className="capitalize">
                {tier} tier
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask your study question here. Example: 'Summarize key topics for an introductory programming quiz.'"
                rows={5}
                className="min-h-[140px]"
                disabled={loading}
              />
              <div className="flex flex-col gap-4">
                <Button type="submit" disabled={loading || !prompt.trim()} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Thinking…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send to assistant
                    </>
                  )}
                </Button>
                <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                  Need an idea?
                  <ul className="mt-2 space-y-2">
                    <li>• Summarize a course material note.</li>
                    <li>• Suggest a study plan for exams.</li>
                    <li>• Explain a lecture topic step-by-step.</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
          {error && (
            <p className="text-sm text-destructive mt-3" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {messages.map((message, index) => (
          <Card
            key={index}
            className={`border-border ${message.isTimeout ? "border-orange-300 bg-orange-50 dark:bg-orange-900/20" : ""}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {message.isTimeout ? (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  )}
                  <CardTitle className="text-base font-semibold">
                    {message.role === "user" ? "You" : "Assistant"}
                  </CardTitle>
                </div>
                {/* Retry action — Req 5.5 */}
                {message.isTimeout && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleRetry}
                    disabled={loading}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm text-foreground whitespace-pre-wrap">
              {message.text}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
