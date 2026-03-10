import { getAuthUserId, DEV_MODE } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { streamClassProfile } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const clerkId = await getAuthUserId()
  if (!clerkId) return new Response('Unauthorized', { status: 401 })

  const { className, track, school, academicYear, classDescription } = await req.json()

  if (!className || !track || !classDescription) {
    return new Response('Missing required fields', { status: 400 })
  }

  const encoder = new TextEncoder()
  let fullText = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamClassProfile({ className, track, description: classDescription })) {
          fullText += chunk
          controller.enqueue(encoder.encode(chunk))
        }

        // Save to DB only when database is available
        if (!DEV_MODE) {
          try {
            const user = await prisma.user.upsert({
              where: { clerkId },
              update: {},
              create: { clerkId, email: `${clerkId}@placeholder.com` },
            })
            await prisma.classProfile.create({
              data: {
                userId: user.id,
                className,
                track,
                school: school || null,
                academicYear: academicYear || null,
                classDescription,
                classAnalysis: fullText.slice(0, fullText.indexOf('## 🛠️')) || fullText,
                groupInterventions: fullText.includes('## 🛠️')
                  ? fullText.slice(fullText.indexOf('## 🛠️'))
                  : '',
              },
            })
          } catch {
            // DB save failed — profile was already streamed, ignore
          }
        }
      } catch (err) {
        console.error('Class profile error:', err)
        controller.enqueue(encoder.encode('\n\nשגיאה ביצירת הפרופיל. אנא נסו שוב.'))
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

export async function GET() {
  const clerkId = await getAuthUserId()
  if (!clerkId) return new Response('Unauthorized', { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) return Response.json({ profiles: [] })
    const profiles = await prisma.classProfile.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json({ profiles })
  } catch {
    return Response.json({ profiles: [] })
  }
}
