/**
 * POST /api/error
 * Client-side error reporting endpoint.
 * Logs correlation ID, endpoint, and timestamp per Req 12.5.
 */
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  const correlationId = randomUUID()
  const timestamp = new Date().toISOString()

  try {
    const body = await request.json().catch(() => ({}))
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : request.headers.get("referer") ?? "unknown"
    const errorCategory = typeof body?.category === "string" ? body.category : "CLIENT_ERROR"
    const message = typeof body?.message === "string" ? body.message : "Unknown error"

    // Req 12.5 — log with correlation ID, endpoint, timestamp
    console.error(
      JSON.stringify({
        correlationId,
        errorCategory,
        endpoint,
        message,
        timestamp,
      })
    )

    return NextResponse.json(
      { correlationId, errorCategory, timestamp },
      { status: 200 }
    )
  } catch {
    // Req 12.4 — always return within 10s with correlation ID
    return NextResponse.json(
      { correlationId, errorCategory: "INTERNAL_ERROR", timestamp },
      { status: 500 }
    )
  }
}
