'use client'

import { useState, useEffect, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { marked } from 'marked'
import { Button } from '@/components/ui/button'
import { Loader2, Printer, BookOpen } from 'lucide-react'

type Props = {
  sessionId: string
  studentName: string
  track: 'ELEMENTARY' | 'HIGH_SCHOOL'
  existingProfile?: string | null
}

export default function ProfileView({ sessionId, studentName, track, existingProfile }: Props) {
  const [profileText, setProfileText] = useState(existingProfile || '')
  const [isGenerating, setIsGenerating] = useState(!existingProfile)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `פרופיל פדגוגי - ${studentName}`,
    pageStyle: `
      @page { size: A4; margin: 20mm; }
      @media print {
        body { font-family: 'Arial', sans-serif; direction: rtl; font-size: 12pt; }
        h1, h2, h3 { color: #000; }
        .no-print { display: none !important; }
        section { margin-bottom: 16px; page-break-inside: avoid; }
      }
    `,
  })

  useEffect(() => {
    if (existingProfile) return

    async function generate() {
      const response = await fetch(`/api/interview/${sessionId}/generate`, {
        method: 'POST',
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

    generate()
  }, [sessionId, existingProfile])

  const htmlContent = profileText
    ? (marked(profileText, { breaks: true }) as string)
    : ''

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">פרופיל פדגוגי</h1>
          <p className="text-gray-500 mt-1">
            {studentName} · {track === 'ELEMENTARY' ? '🎒 יסודי' : '🎓 על-יסודי'}
          </p>
        </div>
        <Button
          onClick={handlePrint}
          disabled={isGenerating}
          variant="outline"
          className="gap-2"
        >
          <Printer className="w-4 h-4" />
          הדפסה / PDF
        </Button>
      </div>

      {isGenerating && !profileText && (
        <div className="flex items-center gap-3 text-purple-700 bg-purple-50 rounded-xl p-6 mb-6">
          <Loader2 className="w-6 h-6 animate-spin" />
          <div>
            <p className="font-medium">יוצר את הפרופיל הפדגוגי...</p>
            <p className="text-sm text-purple-500 mt-0.5">הפעולה עשויה לקחת מספר שניות</p>
          </div>
        </div>
      )}

      {/* Profile content */}
      <div ref={printRef} dir="rtl">
        {/* Print header */}
        <div className="hidden print:block mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold">פרופיל פדגוגי — גילוי נאות</h1>
          <p className="text-gray-600 mt-1">
            {studentName} · {track === 'ELEMENTARY' ? 'יסודי' : 'על-יסודי'} ·{' '}
            {new Date().toLocaleDateString('he-IL')}
          </p>
        </div>

        {profileText ? (
          <div className="prose prose-lg max-w-none prose-headings:text-right prose-p:text-right prose-li:text-right rtl-profile">
            <style>{`
              .rtl-profile h2 { color: #4a1d96; border-right: 4px solid #7c3aed; padding-right: 12px; margin-top: 2rem; }
              .rtl-profile h3 { color: #1e3a5f; margin-top: 1.5rem; }
              .rtl-profile hr { border-color: #e5e7eb; margin: 2rem 0; }
              .rtl-profile ul { list-style: none; padding-right: 0; }
              .rtl-profile ul li::before { content: "•"; color: #7c3aed; margin-left: 8px; }
              .rtl-profile strong { color: #374151; }
              @media print {
                .rtl-profile h2 { color: #000; border-right: 3px solid #000; }
              }
            `}</style>
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        ) : isGenerating ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full" />
            ))}
          </div>
        ) : null}

        {/* Print footer */}
        <div className="hidden print:block mt-8 pt-4 border-t text-sm text-gray-500">
          <p>נוצר על ידי מערכת גילוי נאות | {new Date().getFullYear()}</p>
        </div>
      </div>

      {!isGenerating && profileText && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 no-print">
          <BookOpen className="w-5 h-5 text-green-600" />
          <p className="text-green-700 text-sm">
            הפרופיל נשמר במערכת ויהיה זמין בכל עת בהיסטוריה שלך
          </p>
        </div>
      )}
    </div>
  )
}
