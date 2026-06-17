'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import QuizPanel from '@/components/lesson/QuizPanel'
import type { QuizQuestion } from '@/types'

// Demo quiz — will be loaded from DB
const DEMO_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1', text: 'What is the minimum gauge for valley metal flashing per IRC R905.2.8.2?',
    type: 'multiple_choice',
    options: ['28-gauge galvanized', '26-gauge galvanized', '24-gauge galvanized', '22-gauge galvanized'],
    correct_answer: 2,
    explanation: 'IRC R905.2.8.2 specifies a minimum of 24-gauge galvanized steel, 0.019-inch aluminum, or 16-ounce copper for valley flashing.',
  },
  {
    id: 'q2', text: 'Where should fasteners be placed when installing valley metal?',
    type: 'multiple_choice',
    options: ['Through the center of the valley channel', 'Along the valley centerline', 'At the outer edges only, where shingles will cover them', 'Anywhere the metal overlaps'],
    correct_answer: 2,
    explanation: 'No fasteners in the water flow path. All fasteners go at the outer edges where shingle courses will cover the nail heads. Every penetration in the channel is a potential leak.',
  },
  {
    id: 'q3', text: 'Ice barrier in valley areas must extend at least how many inches from the centerline on each side?',
    type: 'multiple_choice',
    options: ['12 inches', '18 inches', '24 inches', '36 inches'],
    correct_answer: 2,
    explanation: 'IRC R905.2.7.1 requires the ice barrier to extend at least 24 inches from the valley centerline on each side, providing 48 inches of total protected width.',
  },
  {
    id: 'q4', text: 'At the eave, drip edge is installed OVER the underlayment.',
    type: 'true_false',
    correct_answer: 'false',
    explanation: 'At the eave, drip edge goes UNDER the underlayment so water running off the underlayment lands on top of the drip edge and sheds into the gutter. At the rake, this order is reversed — drip edge goes OVER.',
  },
  {
    id: 'q5', text: 'What is a "dead valley" on a roof?',
    type: 'multiple_choice',
    options: [
      'A valley where the metal has corroded through',
      'A low-slope area where a lower roof meets a higher wall, trapping water and debris',
      'A valley with no ice barrier installed',
      'A decorative valley with no functional purpose',
    ],
    correct_answer: 1,
    explanation: 'A dead valley occurs where a lower roof slope transitions into a vertical wall surface, creating a pocket where water and debris accumulate. Without a cricket or diverter, this condition leads to premature failure.',
  },
]

export default function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <Link href="/learn" className="text-[#e5e2e1]/30 hover:text-[#e5e2e1]/60 text-sm mb-6 inline-block">&larr; Back to courses</Link>

        <div className="bg-[#201f1f] rounded-2xl overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
          <div className="p-5" style={{ boxShadow: 'inset 0 -1px 0 rgba(86,67,52,0.15)' }}>
            <h1 className="text-lg font-bold">Valley Metal & Flashing Quiz</h1>
            <p className="text-[#e5e2e1]/40 text-xs mt-1 capitalize">{slug.replace(/-/g, ' ')}</p>
          </div>

          {result ? (
            <div className="p-8 text-center">
              <div className={`text-5xl font-bold mb-3 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                {result.score}%
              </div>
              <p className={`text-sm mb-6 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                {result.passed ? 'Congratulations -- you passed!' : `You need 70% to pass. Review the lesson and try again.`}
              </p>
              <div className="flex gap-3 justify-center">
                <Link href={`/lesson/${slug}`} className="px-4 py-2 bg-[#2a2a2a] rounded-lg text-sm hover:bg-[#353534]" style={{ boxShadow: 'inset 0 0 0 1px rgba(86,67,52,0.15)' }}>
                  Review Lesson
                </Link>
                <button onClick={() => setResult(null)} className="px-4 py-2 bg-[#FF8C00] text-[#131313] text-sm font-semibold rounded-lg hover:opacity-90">
                  Retake Quiz
                </button>
              </div>
            </div>
          ) : (
            <div className="h-[500px]">
              <QuizPanel
                questions={DEMO_QUESTIONS}
                passingScore={70}
                onComplete={(score, passed) => setResult({ score, passed })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
