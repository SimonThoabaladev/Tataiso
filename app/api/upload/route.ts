import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

// Req 10.2 — video uploads: MP4 or WebM, max 2 GB
const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024 // 2 GB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"]

// All allowed MIME types for materials upload
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/wav",
  "audio/mp3",
  "video/mp4",
  "video/webm",
]

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check: admin, lecturer, or tutor may upload (Req 10 — Instructor)
    const [userData] = await db.select().from(user).where(eq(user.id, session.user.id))
    const role = userData?.role ?? ""
    if (!["admin", "lecturer", "tutor"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: only instructors may upload files" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // MIME type validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Allowed formats: PDF, Word (.doc/.docx), MP3, WAV, MP4, WebM.",
        },
        { status: 400 }
      )
    }

    // Req 10.2 — video-specific size limit (2 GB)
    if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: "Video files must not exceed 2 GB. Please compress the video and try again.",
          },
          { status: 400 }
        )
      }
    }

    // Upload to Vercel Blob (private storage)
    const blob = await put(file.name, file, { access: "private" })

    return NextResponse.json({
      pathname: blob.pathname,
      url: blob.url,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }
}
