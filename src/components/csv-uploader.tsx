'use client'

import { useState } from 'react'
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

      const data = (await res.json()) as ImportResult
      setResult(data)
      if (data.success) {
        setFile(null)
      }
    } catch (err) {
      setResult({
        success: false,
        message: 'Failed to upload file',
        created: [],
        errors: [{ row: 0, error: err instanceof Error ? err.message : 'Unknown error' }],
      })
    } finally {
      setLoading(false)
    }
  }

  const sampleCSV = `שם התלמיד,כיתה,מסלול
דני כהן,ד׳2,יסודי
שרה דדון,י׳א,על-יסודי
אליהו לוי,,יסודי`

  const downloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'sample-students.csv'
    link.click()
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
            <h3 className="font-semibold text-blue-900 mb-3">פורמט ה-CSV:</h3>

            {/* Table example */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-blue-300 bg-blue-100 px-3 py-2 text-right font-semibold text-blue-900">שם התלמיד</th>
                    <th className="border border-blue-300 bg-blue-100 px-3 py-2 text-right font-semibold text-blue-900">כיתה</th>
                    <th className="border border-blue-300 bg-blue-100 px-3 py-2 text-right font-semibold text-blue-900">מסלול</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-blue-200 px-3 py-2 text-blue-800">דני כהן</td>
                    <td className="border border-blue-200 px-3 py-2 text-blue-800">ד׳2</td>
                    <td className="border border-blue-200 px-3 py-2 text-blue-800">יסודי</td>
                  </tr>
                  <tr>
                    <td className="border border-blue-200 px-3 py-2 text-blue-800">שרה דדון</td>
                    <td className="border border-blue-200 px-3 py-2 text-blue-800">י׳א</td>
                    <td className="border border-blue-200 px-3 py-2 text-blue-800">על-יסודי</td>
                  </tr>
                  <tr>
                    <td className="border border-blue-200 px-3 py-2 text-blue-800">אליהו לוי</td>
                    <td className="border border-blue-200 px-3 py-2 text-blue-800"></td>
                    <td className="border border-blue-200 px-3 py-2 text-blue-800">יסודי</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-blue-700 mb-3">
              • <span className="font-semibold">שם התלמיד</span> - חובה<br/>
              • <span className="font-semibold">כיתה</span> - אופציונלי<br/>
              • <span className="font-semibold">מסלול</span> - חובה: "יסודי" או "על-יסודי"
            </p>

            <Button variant="outline" size="sm" className="mt-2" onClick={downloadSample}>
              הורד דוגמה
            </Button>
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
