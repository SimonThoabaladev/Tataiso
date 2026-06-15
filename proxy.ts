import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy (formerly middleware) — Next.js 16 uses this file instead of middleware.ts
 * Suspension enforcement is handled in the dashboard layout via server actions.
 */
export function proxy(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.*\\.png|icon\\.svg|apple-icon\\.png).*)"],
}
