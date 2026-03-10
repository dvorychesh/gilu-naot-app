import { getAuthUserId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { QUESTIONS } from '@/lib/questions'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const clerkId = await getAuthUserId()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params

  try {
    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, user: { clerkId } },
      include: { answers: { orderBy: { createdAt: 'asc' } } },
    })

    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const currentQuestion =
      session.status === 'IN_PROGRESS' ? QUESTIONS[session.currentQuestionIndex] : null

    return NextResponse.json({ session, currentQuestion })
  } catch {
    return NextResponse.json({ error: 'Database not connected' }, { status: 503 })
  }
}
