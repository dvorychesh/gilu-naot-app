import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import ProfileView from '@/components/profile/ProfileView'

export default async function CompletePage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const { sessionId } = await params

  const session = await prisma.interviewSession.findFirst({
    where: { id: sessionId, user: { clerkId } },
    include: { profile: true },
  })

  if (!session) redirect('/')
  if (session.status !== 'COMPLETED') redirect(`/interview/${sessionId}`)

  // If profile exists, reconstruct the full markdown text from saved sections
  const existingProfileText = session.profile
    ? [
        '## 💎 השורה התחתונה\n' + session.profile.bottomLine,
        session.profile.pedagogicalAnalysis,
        session.profile.actionPlan,
      ].join('\n\n---\n\n')
    : null

  return (
    <ProfileView
      sessionId={sessionId}
      studentName={session.studentName}
      track={session.track}
      existingProfile={existingProfileText}
    />
  )
}
