import { getAuthUserId } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { QUESTIONS } from '@/lib/questions'
import InterviewChat from '@/components/interview/InterviewChat'

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const clerkId = await getAuthUserId()
  if (!clerkId) redirect('/')

  const { sessionId } = await params

  let session: any = null
  try {
    session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, user: { clerkId } },
      include: { answers: { orderBy: { createdAt: 'asc' } } },
    })
  } catch {
    redirect('/')
  }

  if (!session) redirect('/')

  if (session.status === 'COMPLETED') {
    redirect(`/interview/${sessionId}/complete`)
  }

  const currentQ = QUESTIONS[session.currentQuestionIndex]

  return (
    <InterviewChat
      sessionId={sessionId}
      studentName={session.studentName}
      track={session.track}
      firstQuestion={currentQ.text}
      firstTopic={currentQ.topic}
      initialQuestionIndex={session.currentQuestionIndex}
    />
  )
}
