import { getAuthUserId } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { streamProfileGeneration } from '@/lib/claude'

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const clerkId = await getAuthUserId()
  const isInternalCall = req.headers.get('X-Internal-Call') === 'true'

  console.log('[GENERATE] Step 1: Auth check', { sessionId, hasClerkId: !!clerkId, isInternalCall })

  // Allow internal calls from import route or authenticated calls
  if (!clerkId && !isInternalCall) {
    return new Response('Unauthorized', { status: 401 })
  }

  // For internal calls, just find by sessionId; for auth calls, verify ownership
  const session = await prisma.interviewSession.findFirst({
    where: clerkId
      ? { id: sessionId, user: { clerkId } }
      : { id: sessionId },
    include: {
      answers: { orderBy: { createdAt: 'asc' } },
      profile: true,
    },
  })

  console.log('[GENERATE] Step 2: Session found', { sessionId, hasSession: !!session, status: session?.status })

  if (!session) return new Response('Not found', { status: 404 })
  if (session.status !== 'COMPLETED') {
    return new Response('Interview not completed', { status: 400 })
  }

  // If profile already exists, return it as a stream
  if (session.profile) {
    console.log('[GENERATE] Step 3: Profile exists, returning cached')
    const parts: string[] = []
    if (session.profile.headline || session.profile.bottomLine) {
      parts.push('## 💎 השורה התחתונה\n' + (session.profile.headline || session.profile.bottomLine))
    }
    if (session.profile.strengths) parts.push('## 🔥 מוטיבציה וחוזקות\n' + session.profile.strengths)
    if (session.profile.barriers) parts.push('## 🚧 האתגר המרכזי\n' + session.profile.barriers)
    if (session.profile.deepReading) parts.push('## 🧠 סגנון למידה\n' + session.profile.deepReading)
    if (session.profile.interventions) parts.push('## 🛠️ תוכנית התערבות\n' + session.profile.interventions)
    if (session.profile.trackingSignsSuccess) parts.push('## ✅ סימני הצלחה\n' + session.profile.trackingSignsSuccess)
    if (session.profile.trackingSignsWarning) parts.push('## ⚠️ נורות אזהרה\n' + session.profile.trackingSignsWarning)
    if (session.profile.closingInsight) parts.push('## 🎯 משפט סיכום\n' + session.profile.closingInsight)
    // Fallback to legacy fields if new fields are empty
    if (!session.profile.interventions && session.profile.actionPlan) {
      parts.push('## 🛠️ תוכנית התערבות\n' + session.profile.actionPlan)
    }

    const profileText = parts.join('\n\n---\n\n')
    const encoder = new TextEncoder()
    return new Response(encoder.encode(profileText), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  console.log('[GENERATE] Step 4: Generating new profile', { studentName: session.studentName, answers: session.answers.length })

  try {
    // If no answers, generate analysis based on student name alone
    const answers = session.answers.length > 0
      ? session.answers.map((a) => ({
          questionText: a.questionText,
          teacherAnswer: a.teacherAnswer,
          isFollowUp: a.isFollowUp,
        }))
      : [
          {
            questionText: 'תיאור כללי',
            teacherAnswer: `בצע ניתוח עמוק על התלמיד ${session.studentName} בהתבסס על ניסיון פדגוגי עמוק. ספק תוכנית התערבות מפורטת.`,
            isFollowUp: false,
          }
        ]

    console.log('[GENERATE] Collecting profile generation', { answersCount: answers.length })

    let fullText = ''
    for await (const chunk of streamProfileGeneration({
      answers,
      studentName: session.studentName,
      track: session.track,
    })) {
      fullText += chunk
    }

    console.log('[GENERATE] Collection complete', { textLength: fullText.length })

    // Parse and save sections with new detailed fields
    const parseSection = (header: string, nextHeader?: string): string => {
      const pattern = nextHeader
        ? new RegExp(`##\\s*${header}[^\\n]*\\n([\\s\\S]*?)(?=\\n---\\s*\\n##|##\\s*${nextHeader})`, 'i')
        : new RegExp(`##\\s*${header}[^\\n]*\\n([\\s\\S]*)$`, 'i')
      const match = fullText.match(pattern)
      return match?.[1]?.trim() || ''
    }

    const headline = parseSection('💎', '📊') || parseSection('💎')
    const strengths = parseSection('🔥', '🚧') || parseSection('🔥')
    const barriers = parseSection('🚧', '🧠') || parseSection('🚧')
    const deepReading = parseSection('🧠', '🏠') || parseSection('🧠')
    const interventions = parseSection('🛠️', '⏰') || parseSection('🛠️')
    const kpis = parseSection('⏰', '🎯') || parseSection('⏰')
    const closingInsight = parseSection('🎯')
    const trackingSignsSuccess = parseSection('✅')
    const trackingSignsWarning = parseSection('⚠️')

    console.log('[GENERATE] Saving to database')

    // Update existing profile or create new one
    await prisma.studentProfile.upsert({
      where: { sessionId },
      create: {
        sessionId,
        studentName: session.studentName,
        track: session.track,
        status: 'COMPLETED',
        // New fields
        headline: headline || fullText.slice(0, 300),
        strengths,
        barriers,
        deepReading,
        interventions,
        trackingSignsSuccess,
        trackingSignsWarning,
        closingInsight,
        // Legacy fields for backward compatibility
        bottomLine: headline || fullText.slice(0, 200),
        pedagogicalAnalysis: strengths + (barriers ? '\n\n' + barriers : ''),
        actionPlan: interventions + (kpis ? '\n\n## ⏰ מדדי הצלחה\n' + kpis : ''),
      },
      update: {
        status: 'COMPLETED',
        // New fields
        headline: headline || fullText.slice(0, 300),
        strengths,
        barriers,
        deepReading,
        interventions,
        trackingSignsSuccess,
        trackingSignsWarning,
        closingInsight,
        // Legacy fields for backward compatibility
        bottomLine: headline || fullText.slice(0, 200),
        pedagogicalAnalysis: strengths + (barriers ? '\n\n' + barriers : ''),
        actionPlan: interventions + (kpis ? '\n\n## ⏰ מדדי הצלחה\n' + kpis : ''),
      },
    })
    console.log('[GENERATE] Profile saved')

    const encoder = new TextEncoder()
    return new Response(encoder.encode(fullText), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('[GENERATE] Error:', err instanceof Error ? err.message : String(err), err instanceof Error ? err.stack : '')
    const encoder = new TextEncoder()
    return new Response(encoder.encode('\n\n❌ שגיאה בעיבוד הפרופיל: ' + (err instanceof Error ? err.message : String(err))), {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
