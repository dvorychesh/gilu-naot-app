import { getAuthUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen } from 'lucide-react'

export default async function HistoryPage() {
  const clerkId = await getAuthUserId()

  let sessions: any[] = []

  if (clerkId) {
    try {
      const user = await prisma.user.findUnique({ where: { clerkId } })
      if (user) {
        sessions = await prisma.interviewSession.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          include: { profile: { select: { id: true } } },
        })
      }
    } catch {
      // DB not connected yet
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">היסטוריה</h1>
          <p className="text-gray-500 mt-1">כל הראיונות שלך</p>
        </div>
        <Link href="/interview/new">
          <Button className="bg-purple-700 hover:bg-purple-800">ראיון חדש +</Button>
        </Link>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500">אין ראיונות עדיין</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{session.studentName}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {session.track === 'ELEMENTARY' ? '🎒 יסודי' : '🎓 על-יסודי'}
                    {session.grade && ` · ${session.grade}`}
                    {' · '}
                    {new Date(session.createdAt).toLocaleDateString('he-IL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={
                      session.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }
                    variant="outline"
                  >
                    {session.status === 'COMPLETED' ? '✓ הושלם' : '⏳ בתהליך'}
                  </Badge>
                  <Link
                    href={
                      session.status === 'COMPLETED' && session.profile
                        ? `/interview/${session.id}/complete`
                        : `/interview/${session.id}`
                    }
                  >
                    <Button variant="outline" size="sm">
                      {session.status === 'COMPLETED' ? 'צפה בפרופיל' : 'המשך'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
