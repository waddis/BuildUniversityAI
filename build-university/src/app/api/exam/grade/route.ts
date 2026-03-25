import { NextRequest, NextResponse } from 'next/server'
import { gradeExam } from '@/lib/claude/client'

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'written'
  options?: string[]
  correct_answer?: string
  points: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { questions, answers } = body as {
      questions: Question[]
      answers: Record<string, string>
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'questions array is required and must not be empty.' },
        { status: 400 }
      )
    }

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json(
        { error: 'answers object is required.' },
        { status: 400 }
      )
    }

    const result = await gradeExam(questions, answers)

    return NextResponse.json({
      score: result.score,
      feedback: result.feedback,
      breakdown: result.breakdown,
    })
  } catch (error) {
    console.error('[API] /api/exam/grade error:', error)
    return NextResponse.json(
      { error: 'Failed to grade exam. Please try again.' },
      { status: 500 }
    )
  }
}
