import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { QUESTIONS } from '@/lib/questions'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, user: { clerkId } },
    include: { answers: { orderBy: { createdAt: 'asc' } } },
  })

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const currentQuestion = session.status === 'IN_PROGRESS'
    ? QUESTIONS[session.currentQuestionIndex]
    : null

  return NextResponse.json({ session, currentQuestion })
}
