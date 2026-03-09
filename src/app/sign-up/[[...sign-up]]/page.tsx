import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-purple-800 mb-2">גילוי נאות</h1>
        <p className="text-gray-500 mb-8">הצטרפי למערכת</p>
        <SignUp />
      </div>
    </div>
  )
}
