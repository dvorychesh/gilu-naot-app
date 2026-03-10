import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId, DEV_MODE } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  let clerkId = await getAuthUserId()
  const allowUnauthenticated = DEV_MODE || process.env.IMPORT_ALLOW_UNAUTHENTICATED === 'true'

  if (!clerkId && !allowUnauthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  clerkId = clerkId || 'dev-user-001'

  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    // Get session with answers
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: true,
        user: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Skip ownership check in dev/unauthenticated mode
    if (!allowUnauthenticated) {
      const user = await prisma.user.findUnique({ where: { clerkId } })
      if (!user || session.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Update status to ANALYZING
    await prisma.studentProfile.upsert({
      where: { sessionId },
      create: {
        sessionId,
        studentName: session.studentName,
        grade: session.grade,
        track: session.track,
        status: 'ANALYZING',
      },
      update: {
        status: 'ANALYZING',
      },
    })

    // Prepare data for analysis (handle both with and without answers)
    const answersText = session.answers.length > 0
      ? session.answers
          .map(
            (a) => `
**שאלה ${a.questionIndex + 1}:** ${a.questionText}
**תשובה:** ${a.teacherAnswer}
${a.followUpText ? `**המשך:** ${a.followUpText}` : ''}
          `
          )
          .join('\n')
      : `בצע ניתוח עמוק על התלמיד ${session.studentName} בהתבסס על ניסיון פדגוגי עמוק.`

    const gemPrompt = `
אתה מומחה בניתוח נתונים חינוכיים ובניית תוכניות התערבות מערכתיות.

**תלמיד/ה:** ${session.studentName}
**כיתה:** ${session.grade || 'לא ידוע'}
**מסלול:** ${session.track === 'ELEMENTARY' ? 'יסודי' : 'על-יסודי'}

**נתונים מראיון עם המחנכת:**
${answersText}

---

בנה פרופיל אופרטיבי בדיוק לפי המבנה הזה:

## [שם התלמיד/ה] - פרופיל אופרטיבי

🎯 **תמונת על / נקודת מפנה:**
[משפט אחד-שניים שמזקקים את הסיפור של התלמיד ואת ההזדמנות לשינוי]

💪 **מנועי כוח (לחיזוק ושימור):**
[רשימת חוזקות עם הסבר איך ניתן למנף אותן]

🚧 **חסמים ואתגרים (למיקוד עבודה):**
[רשימת קשיים והשפעתם על הלמידה]

⚡ **קריאה בין השורות (תובנות עומק):**
[חיבור בין נקודות וניתוח נוסף]

📋 **תוכנית התערבות והמלצות אופרטיביות:**

📌 **למחנכת (קשר אישי וניהול כיתה):**
[פעולות מומלצות עם רציונל]

📌 **למורים מקצועיים (התאמות בלמידה):**
[אסטרטגיות למשל: פירוק משימות, מתן תפקיד כוח]

📌 **ליועצת / טיפול (במידת הצורך):**
[מיקוד אם צריך]

⏰ **סימני מעקב:**
- **סימן להצלחה:** [איך נדע שהתוכנית עובדת?]
- **נורת אזהרה:** [מה דורש התערבות מיידית?]

💡 **משפט מסכם:**
[משפט השראה ייחודי לתלמיד/ה זה]
`

    // Call Gemini API (or your configured AI provider)
    const analysisResult = await callGeminiAPI(gemPrompt)

    // Parse and store results
    const profile = parseAnalysis(analysisResult)

    const updated = await prisma.studentProfile.update({
      where: { sessionId },
      data: {
        status: 'COMPLETED',
        headline: profile.headline,
        strengths: profile.strengths,
        barriers: profile.barriers,
        deepReading: profile.deepReading,
        interventions: profile.interventions,
        trackingSignsSuccess: profile.trackingSignsSuccess,
        trackingSignsWarning: profile.trackingSignsWarning,
        closingInsight: profile.closingInsight,
      },
    })

    return NextResponse.json({ success: true, profile: updated })
  } catch (err) {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) console.error('Analysis error:', err)

    // Update profile status to ERROR
    const { sessionId } = await req.json().catch(() => ({}))
    if (sessionId) {
      await prisma.studentProfile.updateMany({
        where: { sessionId },
        data: { status: 'ERROR' },
      }).catch(() => {})
    }

    return NextResponse.json(
      {
        error: 'Failed to analyze student',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json() as any
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

function parseAnalysis(text: string) {
  // Extract sections from markdown format
  const sections = {
    headline: extractSection(text, '🎯 **תמונת על', '💪 **מנועי כוח'),
    strengths: extractSection(text, '💪 **מנועי כוח', '🚧 **חסמים'),
    barriers: extractSection(text, '🚧 **חסמים', '⚡ **קריאה'),
    deepReading: extractSection(text, '⚡ **קריאה', '📋 **תוכנית'),
    interventions: extractSection(text, '📋 **תוכנית', '⏰ **סימני'),
    trackingSignsSuccess: extractSection(text, '✅ **סימן להצלחה', '⚠️'),
    trackingSignsWarning: extractSection(text, '⚠️', '💡 **משפט'),
    closingInsight: extractSection(text, '💡 **משפט', ''),
  }
  return sections
}

function extractSection(text: string, startMarker: string, endMarker: string): string {
  const startIdx = text.indexOf(startMarker)
  if (startIdx === -1) return ''

  const endIdx = endMarker ? text.indexOf(endMarker, startIdx + 1) : text.length

  const section = text.substring(startIdx, endIdx === -1 ? undefined : endIdx).trim()
  return section.replace(startMarker, '').trim()
}
