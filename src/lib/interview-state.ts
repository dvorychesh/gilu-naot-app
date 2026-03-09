import { QUESTIONS, TOTAL_QUESTIONS } from './questions'

export type InterviewState = {
  currentQuestionIndex: number
  isAwaitingFollowUp: boolean
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
}

export type Transition =
  | { action: 'SHOW_FOLLOW_UP'; followUpQuestion: string }
  | { action: 'ADVANCE'; nextQuestionIndex: number; nextQuestionText: string }
  | { action: 'COMPLETE' }

export function getNextTransition(
  state: InterviewState,
  qualityPassed: boolean,
  followUpQuestion?: string
): Transition {
  // Follow-up answers always advance (no second quality check)
  if (state.isAwaitingFollowUp) {
    const nextIndex = state.currentQuestionIndex + 1
    if (nextIndex >= TOTAL_QUESTIONS) {
      return { action: 'COMPLETE' }
    }
    return {
      action: 'ADVANCE',
      nextQuestionIndex: nextIndex,
      nextQuestionText: QUESTIONS[nextIndex].text,
    }
  }

  // Main question failed quality check → show follow-up
  if (!qualityPassed && followUpQuestion) {
    return { action: 'SHOW_FOLLOW_UP', followUpQuestion }
  }

  // Quality passed → advance
  const nextIndex = state.currentQuestionIndex + 1
  if (nextIndex >= TOTAL_QUESTIONS) {
    return { action: 'COMPLETE' }
  }
  return {
    action: 'ADVANCE',
    nextQuestionIndex: nextIndex,
    nextQuestionText: QUESTIONS[nextIndex].text,
  }
}
