'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Printer } from 'lucide-react'

interface StudentProfile {
  id: string
  studentName: string
  grade?: string
  track: string
  status: string
  headline?: string
  strengths?: string
  barriers?: string
  deepReading?: string
  interventions?: string
  trackingSignsSuccess?: string
  trackingSignsWarning?: string
  closingInsight?: string
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [sessionId])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/interview/${sessionId}/profile`)
      if (!res.ok) throw new Error('Failed to load profile')

      const data = await res.json()
      setProfile(data)

      // If status is PENDING or ANALYZING, trigger/fetch analysis
      if (data.status === 'PENDING') {
        triggerAnalysis()
      } else if (data.status === 'ANALYZING') {
        fetchAndUpdateAnalysis()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchAndUpdateAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch(`/api/interview/${sessionId}/generate`, {
        headers: { 'X-Internal-Call': 'true' }
      })

      if (!res.ok) throw new Error('Failed to fetch analysis')

      // Fetch updated profile
      const profileRes = await fetch(`/api/interview/${sessionId}/profile`)
      if (!profileRes.ok) throw new Error('Failed to load updated profile')

      const updatedProfile = await profileRes.json()
      setProfile(updatedProfile)
    } catch (err) {
      console.error('Analysis fetch error:', err)
      // Don't set error state, just stop analyzing
    } finally {
      setAnalyzing(false)
    }
  }

  const triggerAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (!res.ok) throw new Error('Analysis failed')

      const data = await res.json()
      setProfile(data.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis error')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              חזור
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-8">
        <p className="text-gray-600">פרופיל לא נמצא</p>
      </div>
    )
  }

  const isAnalyzing = profile.status === 'ANALYZING'
  const isCompleted = profile.status === 'COMPLETED'

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{profile.studentName}</h1>
          <p className="text-gray-600 mt-1">
            {profile.grade ? `כיתה ${profile.grade}` : 'כיתה לא ידועה'} •{' '}
            {profile.track === 'ELEMENTARY' ? '🎒 יסודי' : '🎓 על-יסודי'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="flex gap-2">
        {isAnalyzing && <Badge className="bg-blue-100 text-blue-800">מנתח...</Badge>}
        {isCompleted && <Badge className="bg-green-100 text-green-800">הושלם</Badge>}
      </div>

      {isAnalyzing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-blue-900">ניתוח הפרופיל בעיצומו...</p>
          </CardContent>
        </Card>
      )}

      {/* Profile Sections */}
      {isCompleted && (
        <>
          {/* Headline */}
          {profile.headline && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎯 תמונת על</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{profile.headline}</p>
              </CardContent>
            </Card>
          )}

          {/* Strengths */}
          {profile.strengths && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">💪 מנועי כוח</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert">
                <div className="text-gray-700 whitespace-pre-wrap">{profile.strengths}</div>
              </CardContent>
            </Card>
          )}

          {/* Barriers */}
          {profile.barriers && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🚧 חסמים ואתגרים</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert">
                <div className="text-gray-700 whitespace-pre-wrap">{profile.barriers}</div>
              </CardContent>
            </Card>
          )}

          {/* Deep Reading */}
          {profile.deepReading && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">⚡ קריאה בין השורות</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert">
                <div className="text-gray-700 whitespace-pre-wrap">{profile.deepReading}</div>
              </CardContent>
            </Card>
          )}

          {/* Interventions */}
          {profile.interventions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📋 תוכנית התערבות</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert">
                <div className="text-gray-700 whitespace-pre-wrap">{profile.interventions}</div>
              </CardContent>
            </Card>
          )}

          {/* Tracking Signs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.trackingSignsSuccess && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">✅ סימני הצלחה</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{profile.trackingSignsSuccess}</p>
                </CardContent>
              </Card>
            )}

            {profile.trackingSignsWarning && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">⚠️ נורות אזהרה</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{profile.trackingSignsWarning}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Closing Insight */}
          {profile.closingInsight && (
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg">💡 משפט מסכם</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 italic text-center text-lg">{profile.closingInsight}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
