import { getAuthUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { BookOpen, Users, Clock, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const clerkId = await getAuthUserId()

  let recentSessions: any[] = []
  let totalSessions = 0
  let completedSessions = 0

  if (clerkId) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        include: {
          interviewSessions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { profile: { select: { id: true } } },
          },
        },
      })
      recentSessions = user?.interviewSessions || []
      if (user) {
        totalSessions = await prisma.interviewSession.count({ where: { userId: user.id } })
        completedSessions = await prisma.interviewSession.count({
          where: { userId: user.id, status: 'COMPLETED' },
        })
      }
    } catch {
      // DB not connected yet — show empty state
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">שלום, ברוכה הבאה 👋</h1>
        <p className="text-gray-500 mt-1">מה נעשה היום?</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <Link href="/interview/new">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-purple-200 hover:border-purple-400">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <BookOpen className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <CardTitle className="text-lg">ראיון תלמיד חדש</CardTitle>
                  <CardDescription>10 שאלות + בקרת איכות אוטומטית</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/class-profile/new">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-200 hover:border-green-400">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Users className="w-6 h-6 text-green-700" />
                </div>
                <div>
                  <CardTitle className="text-lg">פרופיל כיתתי</CardTitle>
                  <CardDescription>ניתוח מערכתי של כיתה שלמה</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-700">{totalSessions}</div>
            <div className="text-sm text-gray-500 mt-1">ראיונות סה&quot;כ</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-700">{completedSessions}</div>
            <div className="text-sm text-gray-500 mt-1">פרופילים מושלמים</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-700">
              {totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-500 mt-1">שיעור השלמה</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              ראיונות אחרונים
            </h2>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="gap-1">
                הכל <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{session.studentName}</div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {session.track === 'ELEMENTARY' ? '🎒 יסודי' : '🎓 על-יסודי'} ·{' '}
                      {new Date(session.createdAt).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={session.status === 'COMPLETED' ? 'default' : 'secondary'}
                      className={session.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {session.status === 'COMPLETED' ? 'הושלם' : 'בתהליך'}
                    </Badge>
                    <Link
                      href={
                        session.status === 'COMPLETED' && session.profile
                          ? `/interview/${session.id}/complete`
                          : `/interview/${session.id}`
                      }
                    >
                      <Button variant="outline" size="sm">
                        {session.status === 'COMPLETED' ? 'צפה בפרופיל' : 'המשך ראיון'}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {recentSessions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">עדיין אין ראיונות</h3>
            <p className="text-gray-400 mb-6">התחילי עם ראיון תלמיד/ה ראשון/ה</p>
            <Link href="/interview/new">
              <Button className="bg-purple-700 hover:bg-purple-800">
                התחילי ראיון עכשיו
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
