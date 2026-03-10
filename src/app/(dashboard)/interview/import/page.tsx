import { CSVUploader } from '@/components/csv-uploader'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ImportPage() {
  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">יבוא תלמידים</h1>
          <p className="text-gray-500 mt-1">העלה קובץ CSV כדי ליצור מספר ראיונות בבת אחת</p>
        </div>
        <Link href="/interview/new">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            חזור
          </Button>
        </Link>
      </div>

      <CSVUploader />
    </div>
  )
}
