import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { QUESTIONS } from '@/lib/questions'
import InterviewChat from '@/components/interview/InterviewChat'

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const { sessionId } = await params

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, user: { clerkId } },
    include: { answers: { orderBy: { createdAt: 'asc' } } },
  })

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
