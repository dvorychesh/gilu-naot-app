import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const clerkId = await getAuthUserId()

  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const profiles = await prisma.studentProfile.findMany({
      where: {
        session: {
          userId: user.id,
        },
      },
      include: {
        session: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const result = profiles.map((p) => ({
      id: p.id,
      sessionId: p.session.id,
      studentName: p.studentName,
      grade: p.grade,
      track: p.track,
      status: p.status,
      createdAt: p.createdAt,
    }))

    return NextResponse.json(result)
  } catch (err) {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) console.error('Profiles fetch error:', err)

    return NextResponse.json(
      {
        error: 'Failed to fetch profiles',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
