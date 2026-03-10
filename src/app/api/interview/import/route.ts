import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId, DEV_MODE } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'

export async function POST(req: NextRequest) {
  let clerkId = await getAuthUserId()

  // In production, require authentication
  if (!clerkId && !DEV_MODE) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // In development, use dev user as fallback
  const finalClerkId = clerkId || 'dev-user-001'

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const csvText = await file.text()
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
      user = await prisma.user.create({
        data: {
          clerkId: finalClerkId,
          email: 'dev@example.com',
          name: 'Developer',
        },
      })
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
        created.push({
          id: session.id,
          studentName: session.studentName,
          status: 'created',
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
    if (isDev) console.error('CSV import error:', err)

    return NextResponse.json(
      {
        error: 'Failed to process CSV',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
