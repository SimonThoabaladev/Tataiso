/**
 * POST /api/assistant/analyze
 * Streams a Gemini multimodal explanation of an uploaded file.
 */
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

const MAX_BYTES = 15 * 1024 * 1024
const MODEL_ID = process.env.GOOGLE_GEMINI_MODEL || "gemini-2.0-flash"

const SUPPORTED: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/jpeg": "image", "image/jpg": "image", "image/png": "image",
  "image/gif": "image", "image/webp": "image",
  "audio/mpeg": "audio", "audio/mp3": "audio", "audio/wav": "audio",
  "video/mp4": "video", "video/quicktime": "video", "video/webm": "video",
}

const PROMPT = `You are Tataiso Academic Assistant. Explain this study material clearly and helpfully.

Respond in well-structured markdown:

## 📋 Summary
2-3 sentence overview.

## 🔑 Key Concepts
Most important concepts with clear explanations.

## 📝 Detailed Explanation
Break down the content in simple terms with examples.

## 💡 Key Takeaways
3-5 bullet points of the most important things.

## ❓ Practice Questions
2-3 questions to test understanding.`

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI service not configured." }), { status: 503 })
  }

  let formData: FormData
  try { formData = await request.formData() }
  catch { return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 }) }

  const file = formData.get("file") as File | null
  if (!file) return new Response(JSON.stringify({ error: "No file." }), { status: 400 })

  const category = SUPPORTED[file.type]
  if (!category) {
    return new Response(
      JSON.stringify({ error: `Unsupported format: ${file.type || "unknown"}` }),
      { status: 400 }
    )
  }
  if (file.size > MAX_BYTES) {
    return new Response(
      JSON.stringify({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 15 MB.` }),
      { status: 400 }
    )
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString("base64")

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const enq = (t: string) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(t)}\n\n`))
      const end = () => {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ meta: { fileName: file.name, category, model: MODEL_ID } })}\n\n`))
        controller.close()
      }
      const err = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        controller.close()
      }

      try {
        const { GoogleGenAI } = await import("@google/genai")
        const ai = new GoogleGenAI({ apiKey })

        const result = await ai.models.generateContentStream({
          model: MODEL_ID,
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: file.type, data: base64 } },
              { text: `File: ${file.name}\n\n${PROMPT}` },
            ],
          }],
        })

        for await (const chunk of result) {
          if (chunk.text) enq(chunk.text)
        }
        end()
      } catch (e: any) {
        const msg = e?.message ?? ""
        if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
          err("I'm a bit busy — please try again in a moment.")
        } else {
          err(`Analysis failed: ${msg || "Unknown error"}`)
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
