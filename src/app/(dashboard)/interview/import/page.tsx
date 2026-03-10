import { CSVUploader } from '@/components/csv-uploader'
import Link from 'next/link'
import { ArrowLeft, FileUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ImportPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">בחר דרך לעבוד עם תלמידים</h1>
          <p className="text-gray-500 mt-1">בחר בין ראיון ידני או העלאת קובץ מוכן</p>
        </div>
        <Link href="/interview/new">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            חזור
          </Button>
        </Link>
      </div>

      {/* Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Option 1: Manual Interview */}
        <Link href="/interview/new">
          <Card className="cursor-pointer hover:shadow-lg hover:border-purple-400 transition-all h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                ראיון ידני
              </CardTitle>
              <CardDescription>עבודה עם תלמיד אחד בכל פעם</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                ענה על 10 שאלות בהדרגה לכל תלמיד. מצוין ללימוד עמוק והכנה קפדנית.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ ראיון אינטראקטיבי</li>
                <li>✓ אפשרות שאלות המשך</li>
                <li>✓ שליטה מלאה על התשובות</li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        {/* Option 2: CSV Import */}
        <div className="relative">
          <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-transparent shadow-md h-full">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileUp className="w-5 h-5 text-purple-600" />
                    העלאת קובץ
                  </CardTitle>
                  <CardDescription>יבוא מהיר של מספר תלמידים</CardDescription>
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-purple-600 text-white rounded-full">מומלץ</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                העלה קובץ CSV עם שמות תלמידים בלבד, או קובץ עם תשובות מלאות לניתוח AI מיידי.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ קורא שמות + כיתה + מסלול</li>
                <li>✓ תמיכה בתשובות מלאות בקובץ</li>
                <li>✓ AI ניתוח מיידי (אם יש תשובות)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CSV Uploader */}
      <div className="border-t pt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">העלאת קובץ CSV</h2>
        <CSVUploader />
      </div>
    </div>
  )
}
