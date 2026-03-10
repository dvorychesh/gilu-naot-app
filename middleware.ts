import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Route protection is handled at the page/API level via src/lib/auth.ts
// This passthrough middleware allows the app to run in both dev and production.
export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
