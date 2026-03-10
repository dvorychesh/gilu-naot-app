// Vercel rebuild: 1773167667
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId, DEV_MODE } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'
import { QUESTIONS } from '@/lib/questions'

export async function POST(req: NextRequest) {
  let clerkId = await getAuthUserId()

  // Allow unauthenticated access in DEV_MODE or when IMPORT_ALLOW_UNAUTHENTICATED is set
  const allowUnauthenticated = DEV_MODE || process.env.IMPORT_ALLOW_UNAUTHENTICATED === 'true'

  if (!clerkId && !allowUnauthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use dev user as fallback for unauthenticated requests
  const finalClerkId = clerkId || 'dev-user-001'

  try {
    console.log('[IMPORT] Step 1: Getting formData...')
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[IMPORT] Step 2: File received:', { name: file.name, size: file.size, type: file.type })

    if (!file.size) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    console.log('[IMPORT] Step 3: Reading file text...')
    const csvText = await file.text()
    if (!csvText?.trim()) {
      return NextResponse.json({ error: 'File content is empty' }, { status: 400 })
    }

    console.log('[IMPORT] Step 4: Parsing CSV...')
    const { valid, errors } = parseCSV(csvText)
    console.log('[IMPORT] Step 5: Parse result:', { validRows: valid.length, errors: errors.length })

    if (valid.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid rows to import',
          errors,
          created: [],
        },
        { status: 400 }
      )
    }

    console.log('[IMPORT] Step 6: Finding or creating user...')
    let user = await prisma.user.findUnique({
      where: { clerkId: finalClerkId },
    })

    // Auto-create user if it doesn't exist
    if (!user) {
      console.log('[IMPORT] Creating new user:', finalClerkId)
      try {
        user = await prisma.user.create({
          data: {
            clerkId: finalClerkId,
            email: `${finalClerkId}@dev.local`,
            name: 'Educator',
          },
        })
        console.log('[IMPORT] User created:', user.id)
      } catch (err) {
        console.log('[IMPORT] User creation error, retrying findUnique:', err instanceof Error ? err.message : String(err))
        // If user already exists (race condition), fetch it again
        user = await prisma.user.findUnique({
          where: { clerkId: finalClerkId },
        })
        if (!user) throw err
      }
    } else {
      console.log('[IMPORT] User found:', user.id)
    }

    const created = []

    for (const row of valid) {
      try {
        const hasAnswers = row.answers && Object.keys(row.answers).length > 0
        // Always set status to COMPLETED for import - analysis works even with student name alone
        const sessionStatus = 'COMPLETED'

        console.log('[IMPORT] Creating session for:', row.studentName, { hasAnswers, sessionStatus })
        const session = await prisma.interviewSession.create({
          data: {
            userId: user.id,
            studentName: row.studentName,
            grade: row.grade || '',
            track: row.track,
            status: sessionStatus,
          },
        })

        // Create student profile
        console.log('[IMPORT] Creating student profile for session:', session.id)
        await prisma.studentProfile.create({
          data: {
            sessionId: session.id,
            studentName: session.studentName,
            track: session.track,
            status: 'PENDING',
          },
        })
        console.log('[IMPORT] Student profile created')

        // If answers provided, create InterviewAnswer records
        if (hasAnswers && row.answers) {
          console.log('[IMPORT] Creating interview answers for session:', session.id)
          for (const [qIdx, teacherAnswer] of Object.entries(row.answers)) {
            const questionIndex = parseInt(qIdx)
            const question = QUESTIONS.find((q) => q.index === questionIndex)
            const questionText = question?.text || `Question ${questionIndex}`

            await prisma.interviewAnswer.create({
              data: {
                sessionId: session.id,
                questionIndex,
                questionText,
                teacherAnswer,
                qualityPassed: true, // Pre-filled CSV answers are assumed valid
              },
            })
          }
          console.log('[IMPORT] Interview answers created:', Object.keys(row.answers).length)

          // Trigger AI analysis via generate endpoint
          console.log('[IMPORT] Triggering analysis for session:', session.id)
          try {
            const baseUrl = process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : 'http://localhost:3000'
            const generateUrl = `${baseUrl}/api/interview/${session.id}/generate`
            console.log('[IMPORT] Calling generate endpoint:', generateUrl)

            const generateResponse = await fetch(generateUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Internal-Call': 'true',
              },
            })

            if (!generateResponse.ok) {
              const genError = await generateResponse.text()
              console.warn('[IMPORT] Generate endpoint warning:', generateResponse.status, genError)
              // Don't fail import if generate fails - it can be retried
            } else {
              console.log('[IMPORT] Analysis triggered successfully')
            }
          } catch (genErr) {
            console.warn('[IMPORT] Failed to trigger analysis:', genErr instanceof Error ? genErr.message : String(genErr))
            // Don't fail import if generate fails - it can be retried
          }
        }

        const statusValue = 'imported-with-answers' // Always navigate since analysis works without answers
        console.log('[IMPORT] Student created:', {
          id: session.id,
          studentName: session.studentName,
          hasAnswers,
          status: statusValue,
          answerCount: row.answers ? Object.keys(row.answers).length : 0
        })

        created.push({
          id: session.id,
          studentName: session.studentName,
          status: statusValue,
          profileUrl: `/interview/${session.id}/profile`,
        })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.log('[IMPORT] Session creation error for', row.studentName, ':', errMsg)
        errors.push({
          row: -1,
          error: `Failed to create session for ${row.studentName}: ${errMsg}`,
        })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `Imported ${created.length} students${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      created,
      errors,
    })
  } catch (err) {
    const isDev = process.env.NODE_ENV === 'development'
    const errorMsg = err instanceof Error ? err.message : String(err)
    const errorStack = err instanceof Error ? err.stack : ''

    console.error('CSV import error:', {
      message: errorMsg,
      stack: errorStack,
      devMode: isDev,
    })

    return NextResponse.json(
      {
        error: 'Failed to process CSV',
        details: errorMsg, // Always show error for debugging
        stack: isDev ? errorStack : undefined,
      },
      { status: 500 }
    )
  }
}
