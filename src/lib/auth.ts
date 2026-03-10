/**
 * Auth helper that works in dev (no Clerk keys) and production (Clerk configured).
 * In dev mode every request is treated as a fixed "dev-user-001" — no login required.
 */

export const DEV_MODE =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ||
  !process.env.CLERK_SECRET_KEY?.trim()

export const DEV_USER_CLERK_ID = 'dev-user-001'

export async function getAuthUserId(): Promise<string | null> {
  if (DEV_MODE) return DEV_USER_CLERK_ID

  try {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    return userId
  } catch {
    return null
  }
}
