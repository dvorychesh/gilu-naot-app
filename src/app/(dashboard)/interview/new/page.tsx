'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function NewInterviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    studentName: '',
    grade: '',
    track: '' as 'ELEMENTARY' | 'HIGH_SCHOOL' | '',
  })

  async function handleStart() {
    if (!form.studentName || !form.track) return
    setLoading(true)
    try {
      const res = await fetch('/api/interview/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.sessionId) {
        router.push(`/interview/${data.sessionId}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ראיון תלמיד/ה חדש/ה</h1>
        <p className="text-gray-500 mt-1">מלאי את הפרטים הבסיסיים להתחלת הראיון</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי התלמיד/ה</CardTitle>
          <CardDescription>
            הראיון יכלול 10 שאלות עם בקרת איכות אוטומטית. ניתן לעצור ולהמשיך בכל עת.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="studentName">שם התלמיד/ה *</Label>
            <Input
              id="studentName"
              placeholder="שם פרטי ושם משפחה"
              value={form.studentName}
              onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade">כיתה (אופציונלי)</Label>
            <Input
              id="grade"
              placeholder="לדוגמה: ד׳2, י׳א"
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
              className="text-right"
            />
          </div>

          <div className="space-y-3">
            <Label>מסלול *</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, track: 'ELEMENTARY' }))}
                className={`p-4 rounded-xl border-2 text-right transition-all ${
                  form.track === 'ELEMENTARY'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🎒</div>
                <div className="font-semibold">יסודי</div>
                <div className="text-sm text-gray-500">כיתות א׳–ו׳</div>
              </button>

              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, track: 'HIGH_SCHOOL' }))}
                className={`p-4 rounded-xl border-2 text-right transition-all ${
                  form.track === 'HIGH_SCHOOL'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🎓</div>
                <div className="font-semibold">על-יסודי</div>
                <div className="text-sm text-gray-500">כיתות ז׳–י״ב</div>
              </button>
            </div>
          </div>

          <Button
            className="w-full bg-purple-700 hover:bg-purple-800 text-white py-6 text-lg"
            onClick={handleStart}
            disabled={!form.studentName || !form.track || loading}
          >
            {loading ? 'מתחיל...' : 'התחילי את הראיון →'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
