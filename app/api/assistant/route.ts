import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserSubscription } from "@/app/actions/subscriptions"

const TIMEOUT_MS = 15_000

// Model names to try in order — different API keys have access to different versions
const GEMINI_MODEL_FALLBACKS = [
  "gemini-pro",
  "gemini-1.0-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
]

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
  }

  // Get subscription tier for feature gating
  let subscription: Awaited<ReturnType<typeof getUserSubscription>>
  try {
    subscription = await getUserSubscription()
  } catch {
    return NextResponse.json({ error: "Unable to verify subscription" }, { status: 500 })
  }

  const isAdvanced = subscription.advancedAI ?? false
  const isPersonalized = subscription.personalizedLearningPath ?? false

  // Build system instruction based on tier
  const systemParts: string[] = [
    "You are Tataiso AI Assistant, an educational assistant for university students.",
    "Keep responses clear, concise, and academically focused.",
  ]
  if (isAdvanced) {
    systemParts.push(
      "When explaining concepts, use a numbered step-by-step structure with at least one example."
    )
  }
  if (!isPersonalized) {
    systemParts.push("Provide general educational guidance only — no personalized learning paths.")
  }
  const systemInstruction = systemParts.join(" ")
  const fullPrompt = `${systemInstruction}\n\nStudent question: ${prompt}`

  // ── Google Gemini ─────────────────────────────────────────
  const geminiKey = process.env.GOOGLE_API_KEY
  const preferredModel = process.env.GOOGLE_GEMINI_MODEL || "gemini-pro"

  if (geminiKey && !geminiKey.includes("your_google")) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai")
      const genAI = new GoogleGenerativeAI(geminiKey)

      // Try preferred model first, then fallbacks
      const modelsToTry = [
        preferredModel,
        ...GEMINI_MODEL_FALLBACKS.filter((m) => m !== preferredModel),
      ]

      let lastError: Error | null = null

      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName })

          const result = await Promise.race([
            model.generateContent(fullPrompt),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS)
            ),
          ])

          const answer = (result as Awaited<ReturnType<typeof model.generateContent>>)
            .response.text()

          if (!answer) throw new Error("Empty response")

          // Record AI session (fire-and-forget)
          import("@/app/actions/progress")
            .then(({ recordAiSession }) => recordAiSession().catch(() => {}))
            .catch(() => {})

          return NextResponse.json({
            answer,
            tier: subscription.plan,
            provider: `gemini/${modelName}`,
          })
        } catch (err: any) {
          if (err?.message === "TIMEOUT") {
            return NextResponse.json(
              { error: "The assistant did not respond in time. Please try again.", timeout: true },
              { status: 504 }
            )
          }
          // 404 = model not available for this key — try next
          if (err?.message?.includes("404") || err?.message?.includes("not found")) {
            lastError = err
            continue
          }
          // Any other Gemini error — log and fall through to Ollama
          lastError = err
          break
        }
      }

      console.error("All Gemini models failed:", lastError?.message)
    } catch (importErr) {
      console.error("Failed to import @google/generative-ai:", importErr)
    }
  }

  // ── Fallback: Ollama ──────────────────────────────────────
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434"
  const ollamaModel = process.env.OLLAMA_MODEL || "mistral"

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: ollamaModel, prompt: fullPrompt, stream: false }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.error ?? `Ollama responded with ${response.status}`)
    }

    const answer = data?.response ?? "The assistant returned an empty response."

    import("@/app/actions/progress")
      .then(({ recordAiSession }) => recordAiSession().catch(() => {}))
      .catch(() => {})

    return NextResponse.json({ answer, tier: subscription.plan, provider: "ollama" })
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json(
        { error: "The assistant did not respond in time. Please try again.", timeout: true },
        { status: 504 }
      )
    }

    const isOllamaDown = err?.message?.includes("fetch failed") || err?.message?.includes("ECONNREFUSED")

    return NextResponse.json(
      {
        error: isOllamaDown
          ? "The AI service is not reachable. Please check your Google API key or ensure Ollama is running."
          : `AI error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timeout: false,
      },
      { status: 500 }
    )
  }
}
