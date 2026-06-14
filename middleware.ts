import { NextRequest, NextResponse } from "next/server"

/**
 * Minimal middleware.
 * Suspension enforcement (Req 11.2) is handled in the dashboard layout
 * via the server action getUserRole/getUserData which checks user.suspended.
 * Better Auth manages session invalidation on the server side.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.*\\.png|icon\\.svg|apple-icon\\.png).*)"],
}
