import { NextRequest, NextResponse } from 'next/server'
import { generateExamQuestions } from '@/lib/claude/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { courseTitle, roofingSystem, layers } = body as {
      courseTitle: string
      roofingSystem: string
      layers: string[]
    }

    if (!courseTitle || !roofingSystem || !Array.isArray(layers) || layers.length === 0) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: courseTitle, roofingSystem, layers (array of layer names)',
        },
        { status: 400 }
      )
    }

    const result = await generateExamQuestions(courseTitle, roofingSystem, layers)

    if (!result.questions || result.questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate exam questions. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ questions: result.questions })
  } catch (error) {
    console.error('[API] /api/exam/generate error:', error)
    return NextResponse.json(
      { error: 'Failed to generate exam. Please try again.' },
      { status: 500 }
    )
  }
}
