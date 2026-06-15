import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

// Max sizes
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024   // 2 GB
const MAX_DEFAULT_BYTES = 500 * 1024 * 1024        // 500 MB for everything else

// Explicitly restricted (executable / potentially dangerous) types
const BLOCKED_TYPES = new Set([
  "application/x-msdownload",
  "application/x-executable",
  "application/x-sh",
  "application/x-bat",
  "text/x-shellscript",
  "application/x-msdos-program",
])

// Video types with the 2 GB limit
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/avi"])

function getFileCategory(mime: string): string {
  if (mime.includes("pdf")) return "PDF"
  if (mime.includes("word") || mime.includes("document")) return "Word"
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "PowerPoint"
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "Spreadsheet"
  if (mime.startsWith("audio/")) return "Audio"
  if (VIDEO_TYPES.has(mime)) return "Video"
  if (mime.startsWith("image/")) return "Image"
  if (mime.startsWith("text/")) return "Text"
  return "File"
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [userData] = await db.select().from(user).where(eq(user.id, session.user.id))
    const role = userData?.role ?? ""

    if (!["admin", "lecturer", "tutor"].includes(role)) {
      return NextResponse.json(
        { error: "Only instructors (admin / lecturer / tutor) may upload files." },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    // Block dangerous executables
    if (BLOCKED_TYPES.has(file.type) || file.name.match(/\.(exe|bat|sh|cmd|msi|dmg|app)$/i)) {
      return NextResponse.json(
        { error: "This file type is not allowed for security reasons." },
        { status: 400 }
      )
    }

    // Size limits
    if (VIDEO_TYPES.has(file.type)) {
      if (file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: "Video files must not exceed 2 GB. Please compress and try again." },
          { status: 400 }
        )
      }
    } else {
      if (file.size > MAX_DEFAULT_BYTES) {
        return NextResponse.json(
          { error: "File must not exceed 500 MB." },
          { status: 400 }
        )
      }
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, { access: "private" })

    return NextResponse.json({
      pathname: blob.pathname,
      url: blob.url,
      size: file.size,
      type: file.type,
      category: getFileCategory(file.type),
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }
}
