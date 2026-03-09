'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useInterview } from '@/hooks/useInterview'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TOTAL_QUESTIONS } from '@/lib/questions'
import { Send, Loader2 } from 'lucide-react'

type Props = {
  sessionId: string
  studentName: string
  track: 'ELEMENTARY' | 'HIGH_SCHOOL'
  firstQuestion: string
  firstTopic: string
  initialQuestionIndex: number
}

export default function InterviewChat({
  sessionId,
  studentName,
  track,
  firstQuestion,
  firstTopic,
  initialQuestionIndex,
}: Props) {
  const router = useRouter()
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, phase, currentTopic, questionIndex, isComplete, submitAnswer } =
    useInterview(sessionId, firstQuestion, firstTopic)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        router.push(`/interview/${sessionId}/complete`)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isComplete, sessionId, router])

  async function handleSubmit() {
    if (!inputValue.trim()) return
    const val = inputValue
    setInputValue('')
    await submitAnswer(val)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit()
    }
  }

  const progress = Math.round(((questionIndex + (isComplete ? 1 : 0)) / TOTAL_QUESTIONS) * 100)

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">ראיון: {studentName}</h2>
          <p className="text-sm text-gray-500">
            {track === 'ELEMENTARY' ? '🎒 יסודי' : '🎓 על-יסודי'} · {currentTopic}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            שאלה {Math.min(questionIndex + 1, TOTAL_QUESTIONS)} מתוך {TOTAL_QUESTIONS}
          </span>
          <div className="w-32">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'teacher' ? 'justify-start' : 'justify-end'}`}
          >
            {msg.role === 'system' ? (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm max-w-lg text-center mx-auto">
                {msg.text}
              </div>
            ) : (
              <div
                className={`max-w-xl rounded-2xl px-5 py-3 ${
                  msg.role === 'teacher'
                    ? 'bg-white border border-gray-200 text-gray-800'
                    : msg.type === 'follow_up'
                    ? 'bg-amber-50 border border-amber-200 text-amber-900'
                    : 'bg-purple-700 text-white'
                }`}
              >
                {msg.role === 'interviewer' && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge
                      variant="outline"
                      className={
                        msg.type === 'follow_up'
                          ? 'border-amber-400 text-amber-700 text-xs'
                          : 'border-purple-300 text-purple-200 text-xs bg-transparent'
                      }
                    >
                      {msg.type === 'follow_up' ? '💬 שאלת הרחבה' : '❓ שאלה'}
                    </Badge>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            )}
          </div>
        ))}

        {phase === 'checking' && (
          <div className="flex justify-end">
            <div className="bg-gray-100 rounded-2xl px-5 py-3 flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              בודק איכות תשובה...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {phase !== 'complete' && (
        <div className="bg-white border-t p-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="כתבי את תשובתך כאן... (Ctrl+Enter לשליחה)"
              className="resize-none text-right"
              rows={3}
              disabled={phase !== 'answering'}
            />
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || phase !== 'answering'}
              className="bg-purple-700 hover:bg-purple-800 h-[72px] px-4"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            Ctrl+Enter לשליחה · ניתן להפסיק ולחזור בכל עת
          </p>
        </div>
      )}
    </div>
  )
}
