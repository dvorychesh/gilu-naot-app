'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ImportResult {
  success: boolean
  message: string
  created: Array<{ id: string; studentName: string; status: string }>
  errors: Array<{ row: number; error: string }>
}

export function CSVUploader() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [file, setFile] = useState<File | null>(null)

  async function handleUpload() {
    if (!file) return

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/interview/import', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`)
      }

      const data = await res.json() as ImportResult
      setResult(data)
      if (data && data.success && data.created.length > 0) {
        setFile(null)
        const student = data.created[0]
        const profileUrl = student.profileUrl || `/interview/${student.id}/profile`

        // Debug logging
        console.log('[NAVIGATION] Import successful:', {
          status: student.status,
          profileUrl,
          hasAnswers: student.status === 'imported-with-answers'
        })

        // Auto-navigate to first student's profile if imported with answers
        if (student.status === 'imported-with-answers') {
          console.log('[NAVIGATION] Triggering navigation to:', profileUrl)
          // Immediate navigation
          router.push(profileUrl)
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setResult({
        success: false,
        message: 'Failed to upload file',
        created: [],
        errors: [{ row: 0, error: errorMsg }],
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const res = await fetch('/api/interview/template')
      if (!res.ok) throw new Error('Failed to download template')

      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'תבנית-גילוי-נאות.csv'
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>עלוי תלמידים מ-CSV</CardTitle>
          <CardDescription>
            העלה קובץ CSV עם רשימת תלמידים ותאריכים כדי ליצור ראיונות בכמות גדולה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format help */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">פורמט ה-CSV - שתי אפשרויות:</h3>

            {/* Option 1: Simple mode */}
            <div className="mb-4 pb-4 border-b border-blue-300">
              <h4 className="font-semibold text-blue-800 mb-2">1️⃣ מצב פשוט (שמות בלבד)</h4>
              <p className="text-xs text-blue-700 mb-2">עבור ראיון ידני עם כל תלמיד:</p>
              <div className="overflow-x-auto mb-3 text-xs">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-blue-300 bg-blue-100 px-2 py-1 text-right">שם התלמיד</th>
                      <th className="border border-blue-300 bg-blue-100 px-2 py-1 text-right">כיתה</th>
                      <th className="border border-blue-300 bg-blue-100 px-2 py-1 text-right">מסלול</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-blue-200 px-2 py-1">דני כהן</td>
                      <td className="border border-blue-200 px-2 py-1">ד׳</td>
                      <td className="border border-blue-200 px-2 py-1">יסודי</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-blue-700">
                • שם התלמיד: חובה | כיתה: אופציונלי | מסלול: חובה ("יסודי" או "על-יסודי")
              </p>
            </div>

            {/* Option 2: Rich mode */}
            <div className="mb-4">
              <h4 className="font-semibold text-blue-800 mb-2">2️⃣ מצב עשיר (עם תשובות מלאות)</h4>
              <p className="text-xs text-blue-700 mb-2">עבור ניתוח AI מיידי עם תוכנית התערבות:</p>
              <p className="text-xs text-blue-700 mb-3 bg-blue-100 p-2 rounded">
                ⭐ <strong>הסבר:</strong> כלול עמודות עבור 9 השאלות (חוזקות, קוגניטיבי, שפה, חברתי, תלמידאות, אחריות, מוטיבציה, רקע, הערות) והוסף תשובות לכל שדה. המערכת תחזיר פרופיל מפורט עם תוכנית התערבות ספציפית לכל תלמיד.
              </p>
              <Button variant="outline" size="sm" className="mb-3" onClick={downloadTemplate}>
                📥 הורד תבנית דוגמה עם הכל כולל
              </Button>
              <p className="text-xs text-blue-600">
                התבנית מכילה דוגמה מלאה עם 2 תלמידים וכל 9 השאלות + תשובות דוגמה
              </p>
            </div>
          </div>

          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">בחר קובץ CSV</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="csv-input"
                disabled={loading}
              />
              <label
                htmlFor="csv-input"
                className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  {file ? file.name : 'לחץ כאן לבחירת קובץ'}
                </p>
              </label>
            </div>
          </div>

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-purple-700 hover:bg-purple-800"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                מעלה...
              </>
            ) : (
              'העלה ותחל'
            )}
          </Button>

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {result.success ? (
                <div className="flex items-center gap-3 border-2 border-green-200 bg-green-50 p-4 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <p className="text-green-800">{result.message}</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 border-2 border-red-200 bg-red-50 p-4 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-red-800">{result.message}</p>
                </div>
              )}

              {result.created.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">
                    {result.created.length} ראיונות שנוצרו:
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    {result.created.map((item) => (
                      <li key={item.id}>✓ {item.studentName}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-2">
                    {result.errors.length} שגיאות:
                  </h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>
                        {err.row > 0 ? `שורה ${err.row}: ` : ''}
                        {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
