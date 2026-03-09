'use client'

import { useState } from 'react'
import { marked } from 'marked'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Printer } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { useRef } from 'react'

export default function NewClassProfilePage() {
  const [form, setForm] = useState({
    className: '',
    school: '',
    academicYear: '',
    track: '' as 'ELEMENTARY' | 'HIGH_SCHOOL' | '',
    classDescription: '',
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [profileText, setProfileText] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `פרופיל כיתתי - ${form.className}`,
    pageStyle: `@page { size: A4; margin: 20mm; } @media print { body { direction: rtl; font-family: Arial, sans-serif; } }`,
  })

  async function handleGenerate() {
    if (!form.className || !form.track || !form.classDescription) return
    setIsGenerating(true)
    setProfileText('')

    const response = await fetch('/api/class-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!response.body) return
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let text = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value)
      setProfileText(text)
    }

    setIsGenerating(false)
  }

  const htmlContent = profileText ? (marked(profileText, { breaks: true }) as string) : ''

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">פרופיל כיתתי</h1>
        <p className="text-gray-500 mt-1">ניתוח מערכתי של הכיתה כולה — מגמות, דפוסים, תוכנית התערבות</p>
      </div>

      {!profileText ? (
        <Card>
          <CardHeader>
            <CardTitle>פרטי הכיתה</CardTitle>
            <CardDescription>
              תארי את הכיתה בחופשיות — ממה שאת מרגישה, רואה, ויודעת. ככל שתהיי ספציפית יותר, הפרופיל יהיה שימושי יותר.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שם הכיתה *</Label>
                <Input
                  placeholder="לדוגמה: ד׳2, י׳א"
                  value={form.className}
                  onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label>בית ספר (אופציונלי)</Label>
                <Input
                  placeholder="שם בית הספר"
                  value={form.school}
                  onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
                  className="text-right"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>מסלול *</Label>
              <div className="grid grid-cols-2 gap-4">
                {(['ELEMENTARY', 'HIGH_SCHOOL'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, track: t }))}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      form.track === t
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{t === 'ELEMENTARY' ? '🎒' : '🎓'}</div>
                    <div className="font-semibold">{t === 'ELEMENTARY' ? 'יסודי' : 'על-יסודי'}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>תיאור הכיתה *</Label>
              <p className="text-xs text-gray-400">
                תארי את הכיתה — אקלים רגשי, דינמיקות חברתיות, קשיים אקדמיים, תלמידים בולטים, אתגרים, חוזקות. ככל שיהיה יותר מידע, כך הניתוח יהיה מדויק יותר.
              </p>
              <Textarea
                placeholder="לדוגמה: כיתה של 28 תלמידים, 60% בנות. יש שתי חברות קרובות שמקשות על עבודה קבוצתית... רוב הכיתה מגיעה בזמן אבל 4-5 תלמידים מאחרים באופן קבוע..."
                value={form.classDescription}
                onChange={(e) => setForm((f) => ({ ...f, classDescription: e.target.value }))}
                rows={10}
                className="text-right resize-none"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!form.className || !form.track || !form.classDescription || isGenerating}
              className="w-full bg-green-700 hover:bg-green-800 py-6 text-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  יוצר פרופיל כיתתי...
                </>
              ) : (
                'צרי פרופיל כיתתי ←'
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">פרופיל כיתה: {form.className}</h2>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setProfileText('')}>
                פרופיל חדש
              </Button>
              <Button onClick={handlePrint} disabled={isGenerating} className="gap-2">
                <Printer className="w-4 h-4" />
                הדפסה / PDF
              </Button>
            </div>
          </div>

          {isGenerating && (
            <div className="flex items-center gap-2 text-green-700 mb-4 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              יוצר...
            </div>
          )}

          <div ref={printRef} dir="rtl">
            <div className="hidden print:block mb-6 border-b pb-4">
              <h1 className="text-2xl font-bold">פרופיל כיתתי — גילוי נאות</h1>
              <p>כיתה: {form.className} · {form.track === 'ELEMENTARY' ? 'יסודי' : 'על-יסודי'} · {new Date().toLocaleDateString('he-IL')}</p>
            </div>
            <div className="prose prose-lg max-w-none rtl-profile">
              <style>{`
                .rtl-profile h2 { color: #166534; border-right: 4px solid #16a34a; padding-right: 12px; margin-top: 2rem; }
                .rtl-profile h3 { color: #1e3a5f; margin-top: 1.5rem; }
                .rtl-profile hr { border-color: #e5e7eb; margin: 2rem 0; }
              `}</style>
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
