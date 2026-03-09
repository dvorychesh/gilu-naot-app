import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { BookOpen, Users, Home, Clock } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-purple-900 text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-purple-700">
          <h1 className="text-xl font-bold">גילוי נאות</h1>
          <p className="text-purple-300 text-sm mt-1">מפת צמיחה</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-purple-100 hover:text-white"
          >
            <Home className="w-5 h-5" />
            <span>לוח בקרה</span>
          </Link>
          <Link
            href="/interview/new"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-purple-100 hover:text-white"
          >
            <BookOpen className="w-5 h-5" />
            <span>ראיון תלמיד חדש</span>
          </Link>
          <Link
            href="/class-profile/new"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-purple-100 hover:text-white"
          >
            <Users className="w-5 h-5" />
            <span>פרופיל כיתתי</span>
          </Link>
          <Link
            href="/history"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors text-purple-100 hover:text-white"
          >
            <Clock className="w-5 h-5" />
            <span>היסטוריה</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-purple-700">
          <div className="flex items-center gap-3">
            <UserButton />
            <span className="text-purple-200 text-sm">הגדרות חשבון</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 mr-64 min-h-screen bg-gray-50">
        {children}
      </main>
    </div>
  )
}
