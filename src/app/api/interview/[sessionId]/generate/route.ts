import { getAuthUserId } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { streamProfileGeneration } from '@/lib/claude'

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const clerkId = await getAuthUserId()
  if (!clerkId) return new Response('Unauthorized', { status: 401 })

  const { sessionId } = await params

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, user: { clerkId } },
    include: {
      answers: { orderBy: { createdAt: 'asc' } },
      profile: true,
    },
  })

  if (!session) return new Response('Not found', { status: 404 })
  if (session.status !== 'COMPLETED') {
    return new Response('Interview not completed', { status: 400 })
  }

  // If profile already exists, return it as a stream
  if (session.profile) {
    const profileText = [
      '## 💎 השורה התחתונה\n' + session.profile.bottomLine,
      session.profile.pedagogicalAnalysis,
      session.profile.actionPlan,
    ].join('\n\n---\n\n')

    const encoder = new TextEncoder()
    return new Response(encoder.encode(profileText), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const encoder = new TextEncoder()
  let fullText = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamProfileGeneration({
          answers: session.answers.map((a) => ({
            questionText: a.questionText,
            teacherAnswer: a.teacherAnswer,
            isFollowUp: a.isFollowUp,
          })),
          studentName: session.studentName,
          track: session.track,
        })) {
          fullText += chunk
          controller.enqueue(encoder.encode(chunk))
        }

        // Parse and save sections
        const bottomLineMatch = fullText.match(/##\s*💎[^\n]*\n([\s\S]*?)(?=\n---|\n##|$)/)
        const analysisMatch = fullText.match(/##\s*📊[^\n]*\n([\s\S]*?)(?=\n---\n\n##\s*🛠️|$)/)
        const actionMatch = fullText.match(/##\s*🛠️[^\n]*\n([\s\S]*?)(?=\n---\n\n##\s*⏰|##\s*⏰|$)/)
        const kpiMatch = fullText.match(/##\s*⏰[^\n]*\n([\s\S]*)$/)

        await prisma.studentProfile.create({
          data: {
            sessionId,
            studentName: session.studentName,
            track: session.track,
            bottomLine: bottomLineMatch?.[1]?.trim() || fullText.slice(0, 200),
            pedagogicalAnalysis: analysisMatch?.[1]?.trim() || '',
            actionPlan:
              (actionMatch?.[1]?.trim() || '') +
              (kpiMatch ? '\n\n## ⏰ מדדי הצלחה\n' + kpiMatch[1].trim() : ''),
          },
        })
      } catch (err) {
        const isDev = process.env.NODE_ENV === 'development'
        if (isDev) console.error('Generate profile error:', err)
        controller.enqueue(encoder.encode('\n\n❌ שגיאה בעיבוד הפרופיל. אנא נסו שוב מאוחר יותר.'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
