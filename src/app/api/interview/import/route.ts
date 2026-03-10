import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId, DEV_MODE } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'

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
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.size) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    const csvText = await file.text()
    if (!csvText?.trim()) {
      return NextResponse.json({ error: 'File content is empty' }, { status: 400 })
    }

    const { valid, errors } = parseCSV(csvText)

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

    let user = await prisma.user.findUnique({
      where: { clerkId: finalClerkId },
    })

    // Auto-create user if it doesn't exist
    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            clerkId: finalClerkId,
            email: `${finalClerkId}@dev.local`,
            name: 'Educator',
          },
        })
      } catch (err) {
        // If user already exists (race condition), fetch it again
        user = await prisma.user.findUnique({
          where: { clerkId: finalClerkId },
        })
        if (!user) throw err
      }
    }

    const created = []

    for (const row of valid) {
      try {
        const session = await prisma.interviewSession.create({
          data: {
            userId: user.id,
            studentName: row.studentName,
            grade: row.grade || '',
            track: row.track,
            status: 'IN_PROGRESS',
          },
        })

        // Create student profile and trigger analysis
        await prisma.studentProfile.create({
          data: {
            sessionId: session.id,
            studentName: session.studentName,
            track: session.track,
            status: 'PENDING',
          },
        })

        created.push({
          id: session.id,
          studentName: session.studentName,
          status: 'created',
          profileUrl: `/interview/${session.id}/profile`,
        })
      } catch (err) {
        errors.push({
          row: -1,
          error: `Failed to create session for ${row.studentName}: ${err instanceof Error ? err.message : 'Unknown error'}`,
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
        details: isDev ? errorMsg : 'An error occurred during import. Please check your file and try again.',
        ...(isDev && { stack: errorStack }),
      },
      { status: 500 }
    )
  }
}
