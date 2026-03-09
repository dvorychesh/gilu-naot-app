import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { QUESTIONS } from '@/lib/questions'

// GET /api/interview/sessions — list all sessions for the user
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const sessions = await prisma.interviewSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { profile: { select: { id: true } } },
  })

  return NextResponse.json({ sessions })
}

// POST /api/interview/sessions — create new session
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { studentName, grade, track } = body

  if (!studentName || !track) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Upsert user (in case webhook hasn't fired yet)
  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, email: body.email || `${clerkId}@placeholder.com` },
  })

  const session = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      studentName,
      grade: grade || null,
      track,
    },
  })

  return NextResponse.json({
    sessionId: session.id,
    firstQuestion: QUESTIONS[0].text,
    firstQuestionTopic: QUESTIONS[0].topic,
  })
}
