import { getAuthUserId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { QUESTIONS } from '@/lib/questions'

// GET /api/interview/sessions — list all sessions for the user
export async function GET() {
  const clerkId = await getAuthUserId()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) return NextResponse.json({ sessions: [] })
    const sessions = await prisma.interviewSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { profile: { select: { id: true } } },
    })
    return NextResponse.json({ sessions })
  } catch {
    return NextResponse.json({ error: 'Database not connected' }, { status: 503 })
  }
}

// POST /api/interview/sessions — create new session
export async function POST(req: NextRequest) {
  const clerkId = await getAuthUserId()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { studentName, grade, track } = body

  if (!studentName || !track) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Upsert user (handles both dev-mode fixed ID and real Clerk IDs)
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: {},
      create: { clerkId, email: body.email || 'unknown@example.com' },
    })

    const session = await prisma.interviewSession.create({
      data: { userId: user.id, studentName, grade: grade || null, track },
    })

    return NextResponse.json({
      sessionId: session.id,
      firstQuestion: QUESTIONS[0].text,
      firstQuestionTopic: QUESTIONS[0].topic,
    })
  } catch {
    return NextResponse.json(
      { error: 'מסד הנתונים לא מחובר. יש להגדיר DATABASE_URL.' },
      { status: 503 }
    )
  }
}
