/**
 * POST /api/assistant/analyze
 * Accepts a multipart/form-data upload with a single file field named "file".
 * Uses Google Gemini's native multimodal API to generate an explanation/summary.
 *
 * Supported:
 *   - PDF, Word (.docx/.doc)  → text extraction
 *   - Images (jpg/png/gif/webp) → Gemini vision
 *   - Audio (mp3/wav/m4a/ogg)   → Gemini audio understanding
 *   - Video (mp4/mov/webm)      → Gemini video understanding
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

// 20 MB limit for non-video; 100 MB for video (Gemini inline limit)
const MAX_DEFAULT_BYTES = 20 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

const SUPPORTED_MIME: Record<string, string> = {
  // Documents
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  // Images
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  // Audio
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/mp4": "audio",
  "audio/m4a": "audio",
  "audio/ogg": "audio",
  "audio/aac": "audio",
  // Video
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "video/x-msvideo": "video",
  "video/avi": "video",
}

const EXPLANATION_PROMPT = `You are an expert tutor helping a university student understand study material.

Analyze the provided content and respond with a well-structured explanation in markdown format:

## 📋 Summary
A concise 2-3 sentence overview of what this material is about.

## 🔑 Key Concepts
List and explain the most important concepts, terms, or ideas found in the material.

## 📝 Detailed Explanation
Break down the content in simple, clear terms a student can understand. Use examples where helpful.

## 💡 Key Takeaways
3-5 bullet points of the most important things to remember.

## ❓ Possible Exam Questions
2-3 questions a student should be able to answer after studying this material.

Be clear, educational, and helpful. Avoid jargon unless explaining it.`

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const geminiKey = process.env.GOOGLE_API_KEY
  if (!geminiKey || geminiKey.includes("your_google")) {
    return NextResponse.json(
      { error: "AI service not configured. Please contact your administrator." },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid request — expected multipart form data." }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 })
  }

  const mimeType = file.type || "application/octet-stream"
  const category = SUPPORTED_MIME[mimeType]

  if (!category) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${mimeType}. Supported: PDF, Word, JPG, PNG, MP3, WAV, MP4, MOV.`,
      },
      { status: 400 }
    )
  }

  // Size check
  const maxBytes = category === "video" ? MAX_VIDEO_BYTES : MAX_DEFAULT_BYTES
  if (file.size > maxBytes) {
    const limitMB = Math.round(maxBytes / 1024 / 1024)
    return NextResponse.json(
      { error: `File too large. Maximum size for ${category} files is ${limitMB} MB.` },
      { status: 400 }
    )
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai")
    const genAI = new GoogleGenerativeAI(geminiKey)

    // Gemini model — use flash for speed/cost, pro for quality
    const modelName = process.env.GOOGLE_GEMINI_MODEL || "gemini-pro"
    // Multimodal needs gemini-1.5-flash or gemini-1.5-pro — fall back gracefully
    const multimodalModel = "gemini-1.5-flash"

    const fileBytes = await file.arrayBuffer()
    const base64Data = Buffer.from(fileBytes).toString("base64")

    let parts: any[]

    if (category === "pdf" || category === "doc" || category === "docx") {
      // For documents: send as inline data with PDF mime type
      // Gemini 1.5 supports PDF natively
      parts = [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data,
          },
        },
        { text: EXPLANATION_PROMPT },
      ]
    } else {
      // Images, audio, video — send inline
      parts = [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        { text: EXPLANATION_PROMPT },
      ]
    }

    // Try multimodal model first, fall back to text-only if it fails
    const modelsToTry = [
      multimodalModel,
      "gemini-1.5-pro",
      "gemini-pro-vision",
    ]

    let lastError: Error | null = null
    for (const model of modelsToTry) {
      try {
        const genModel = genAI.getGenerativeModel({ model })
        const result = await Promise.race([
          genModel.generateContent({ contents: [{ role: "user", parts }] }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("TIMEOUT")), 45_000)
          ),
        ])

        const explanation = (result as any).response.text()
        if (!explanation) throw new Error("Empty response")

        return NextResponse.json({
          explanation,
          fileName: file.name,
          fileSize: file.size,
          fileType: mimeType,
          category,
          model,
        })
      } catch (err: any) {
        if (err?.message === "TIMEOUT") {
          return NextResponse.json(
            { error: "Analysis timed out. Try a smaller file or a different format." },
            { status: 504 }
          )
        }
        if (err?.message?.includes("404") || err?.message?.includes("not found")) {
          lastError = err
          continue
        }
        throw err
      }
    }

    throw lastError ?? new Error("All models failed")
  } catch (err: any) {
    console.error("File analysis error:", err)
    return NextResponse.json(
      {
        error: `Analysis failed: ${err instanceof Error ? err.message : "Unknown error"}. Please try a different file or contact support.`,
      },
      { status: 500 }
    )
  }
}
