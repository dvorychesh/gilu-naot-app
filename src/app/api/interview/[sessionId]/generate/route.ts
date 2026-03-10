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

        await prisma.studentProfile.create({
          data: {
            sessionId,
            studentName: session.studentName,
            track: session.track,
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
