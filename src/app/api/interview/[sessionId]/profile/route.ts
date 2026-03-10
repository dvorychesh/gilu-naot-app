import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const clerkId = await getAuthUserId()

  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { sessionId } = await params

    // Get session and verify ownership
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const currentUser = await prisma.user.findUnique({ where: { clerkId } })
    if (!currentUser || session.userId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get or create profile
    let profile = await prisma.studentProfile.findUnique({
      where: { sessionId },
    })

    if (!profile) {
      profile = await prisma.studentProfile.create({
        data: {
          sessionId,
          studentName: session.studentName,
          track: session.track,
        },
      })
    }

    return NextResponse.json(profile)
  } catch (err) {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) console.error('Profile fetch error:', err)

    return NextResponse.json(
      {
        error: 'Failed to fetch profile',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
