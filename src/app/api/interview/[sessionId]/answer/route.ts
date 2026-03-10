import { getAuthUserId } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { runQualityCheck } from '@/lib/claude'
import { getNextTransition } from '@/lib/interview-state'
import { QUESTIONS } from '@/lib/questions'

export const maxDuration = 60;

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const clerkId = await getAuthUserId()
  if (!clerkId) return new Response('Unauthorized', { status: 401 })

  const { sessionId } = await params
  const { answer } = await req.json()

  if (!answer?.trim()) {
    return new Response('Missing answer', { status: 400 })
  }

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, user: { clerkId } },
  })

  if (!session) return new Response('Not found', { status: 404 })
  if (session.status !== 'IN_PROGRESS') {
    return new Response('Session not in progress', { status: 400 })
  }

  const currentQ = QUESTIONS[session.currentQuestionIndex]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(sseEvent({ type: 'checking' })))

        const qualityResult = await runQualityCheck({
          questionText: currentQ.text,
          answer,
          isFollowUp: session.isAwaitingFollowUp,
        })

        await prisma.interviewAnswer.create({
          data: {
            sessionId,
            questionIndex: session.currentQuestionIndex,
            questionText: currentQ.text,
            isFollowUp: session.isAwaitingFollowUp,
            followUpText: null,
            teacherAnswer: answer,
            qualityPassed: qualityResult.passed || session.isAwaitingFollowUp,
          },
        })

        controller.enqueue(encoder.encode(sseEvent({ type: 'quality', passed: qualityResult.passed })))

        const transition = getNextTransition(
          {
            currentQuestionIndex: session.currentQuestionIndex,
            isAwaitingFollowUp: session.isAwaitingFollowUp,
            status: 'IN_PROGRESS',
          },
          qualityResult.passed,
          qualityResult.followUpQuestion
        )

        if (transition.action === 'SHOW_FOLLOW_UP') {
          await prisma.interviewSession.update({
            where: { id: sessionId },
            data: { isAwaitingFollowUp: true },
          })
          controller.enqueue(
            encoder.encode(sseEvent({ type: 'follow_up', text: transition.followUpQuestion }))
          )
        } else if (transition.action === 'COMPLETE') {
          await prisma.interviewSession.update({
            where: { id: sessionId },
            data: { status: 'COMPLETED', isAwaitingFollowUp: false },
          })
          controller.enqueue(encoder.encode(sseEvent({ type: 'complete' })))
        } else {
          await prisma.interviewSession.update({
            where: { id: sessionId },
            data: {
              currentQuestionIndex: transition.nextQuestionIndex,
              isAwaitingFollowUp: false,
            },
          })
          controller.enqueue(
            encoder.encode(
              sseEvent({
                type: 'next_question',
                index: transition.nextQuestionIndex,
                text: transition.nextQuestionText,
                topic: QUESTIONS[transition.nextQuestionIndex].topic,
              })
            )
          )
        }
      } catch {
        controller.enqueue(encoder.encode(sseEvent({ type: 'error', message: 'שגיאה בעיבוד התשובה' })))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
