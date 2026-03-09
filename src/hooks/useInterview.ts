'use client'

import { useState, useCallback } from 'react'

export type ChatMessage = {
  id: string
  role: 'interviewer' | 'teacher' | 'system'
  text: string
  type?: 'question' | 'follow_up' | 'answer' | 'info'
}

export type InterviewPhase = 'answering' | 'checking' | 'complete' | 'error'

export function useInterview(sessionId: string, firstQuestion: string, firstTopic: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'q0',
      role: 'interviewer',
      text: firstQuestion,
      type: 'question',
    },
  ])
  const [phase, setPhase] = useState<InterviewPhase>('answering')
  const [currentTopic, setCurrentTopic] = useState(firstTopic)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!answer.trim() || phase !== 'answering') return

      const answerId = `a-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        { id: answerId, role: 'teacher', text: answer, type: 'answer' },
      ])
      setPhase('checking')

      try {
        const response = await fetch(`/api/interview/${sessionId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer }),
        })

        if (!response.body) throw new Error('No stream')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split('\n').filter((l) => l.startsWith('data: '))

          for (const line of lines) {
            try {
              const event = JSON.parse(line.slice(6))

              if (event.type === 'follow_up') {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `fq-${Date.now()}`,
                    role: 'interviewer',
                    text: event.text,
                    type: 'follow_up',
                  },
                ])
                setPhase('answering')
              } else if (event.type === 'next_question') {
                setQuestionIndex(event.index)
                setCurrentTopic(event.topic)
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `q-${event.index}`,
                    role: 'interviewer',
                    text: event.text,
                    type: 'question',
                  },
                ])
                setPhase('answering')
              } else if (event.type === 'complete') {
                setIsComplete(true)
                setPhase('complete')
                setMessages((prev) => [
                  ...prev,
                  {
                    id: 'done',
                    role: 'system',
                    text: 'הראיון הושלם! עכשיו ניצור עבורך פרופיל פדגוגי מלא.',
                    type: 'info',
                  },
                ])
              }
            } catch {
              // skip malformed events
            }
          }
        }
      } catch {
        setPhase('error')
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'system',
            text: 'אירעה שגיאה. אנא נסי שוב.',
            type: 'info',
          },
        ])
      }
    },
    [sessionId, phase]
  )

  return {
    messages,
    phase,
    currentTopic,
    questionIndex,
    isComplete,
    submitAnswer,
  }
}
