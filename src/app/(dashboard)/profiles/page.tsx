'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface StudentProfileSummary {
  id: string
  sessionId: string
  studentName: string
  grade?: string
  track: string
  status: string
  createdAt: string
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<StudentProfileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles')
      if (!res.ok) throw new Error('Failed to load profiles')

      const data = await res.json()
      setProfiles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  // Get unique grades for filter
  const grades = Array.from(new Set(profiles.map((p) => p.grade).filter((g): g is string => Boolean(g))))
  const filteredProfiles = selectedGrade ? profiles.filter((p) => p.grade === selectedGrade) : profiles

  const statusConfig = {
    PENDING: { icon: Clock, color: 'bg-gray-100 text-gray-800', label: 'ממתין' },
    ANALYZING: { icon: Loader2, color: 'bg-blue-100 text-blue-800', label: 'מנתח' },
    COMPLETED: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'הושלם' },
    ERROR: { icon: AlertCircle, color: 'bg-red-100 text-red-800', label: 'שגיאה' },
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">כל הפרופילים</h1>
        <p className="text-gray-600 mt-1">
          {filteredProfiles.length} פרופיל{filteredProfiles.length > 1 ? 'ים' : ''}
        </p>
      </div>

      {/* Filters */}
      {grades.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedGrade === null ? 'default' : 'outline'}
            onClick={() => setSelectedGrade(null)}
            size="sm"
          >
            כל הכיתות
          </Button>
          {grades.map((grade) => (
            <Button
              key={grade}
              variant={selectedGrade === grade ? 'default' : 'outline'}
              onClick={() => setSelectedGrade(grade)}
              size="sm"
            >
              כיתה {grade}
            </Button>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {filteredProfiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">אין פרופילים להצגה</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((profile) => {
            const config = statusConfig[profile.status as keyof typeof statusConfig] || statusConfig.PENDING
            const Icon = config.icon

            return (
              <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{profile.studentName}</CardTitle>
                      <CardDescription>
                        {profile.grade ? `כיתה ${profile.grade}` : 'כיתה לא ידועה'} •{' '}
                        {profile.track === 'ELEMENTARY' ? '🎒 יסודי' : '🎓 על-יסודי'}
                      </CardDescription>
                    </div>
                    <Badge className={config.color}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-xs text-gray-500 mb-4">
                    {new Date(profile.createdAt).toLocaleDateString('he-IL')}
                  </p>
                  <Link href={`/interview/${profile.sessionId}/profile`}>
                    <Button className="w-full bg-purple-700 hover:bg-purple-800" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      צפה בפרופיל
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
