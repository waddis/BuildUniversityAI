'use client'

import { useState, useEffect } from 'react'
import type { QuizQuestion } from '@/types'

interface QuizPanelProps {
  questions: QuizQuestion[]
  passingScore: number
  onComplete: (score: number, passed: boolean) => void
}

export default function QuizPanel({ questions, passingScore, onComplete }: QuizPanelProps) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const q = questions[currentQ]
  const isLast = currentQ === questions.length - 1
  const userAnswer = q ? answers[q.id] : undefined
  const isCorrect = q ? userAnswer === q.correct_answer : false

  // Keyboard: Enter to proceed after answering
  useEffect(() => {
    if (!showExplanation) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Enter') { e.preventDefault(); handleNext() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  function handleAnswer(value: string | number) {
    if (showExplanation) return // already answered
    setAnswers(prev => ({ ...prev, [q.id]: value }))
    setShowExplanation(true)
  }

  function handleNext() {
    setShowExplanation(false)
    if (isLast) {
      let correct = 0
      questions.forEach(question => {
        const answer = answers[question.id]
        if (answer === question.correct_answer) correct++
      })
      // Include current question
      if (userAnswer === q.correct_answer) correct = Math.max(correct, correct) // already counted
      const score = Math.round((correct / questions.length) * 100)
      setSubmitted(true)
      onComplete(score, score >= passingScore)
    } else {
      setCurrentQ(prev => prev + 1)
    }
  }

  if (submitted) {
    const correct = questions.filter(question => answers[question.id] === question.correct_answer).length
    const score = Math.round((correct / questions.length) * 100)
    const passed = score >= passingScore

    return (
      <div className="p-5 text-center animate-[fadeIn_0.3s_ease-out]">
        <div className={`text-4xl font-bold mb-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {score}%
        </div>
        <p className="text-white/60 text-sm">{correct} of {questions.length} correct</p>
        <p className={`text-sm mt-2 ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {passed ? 'Passed!' : `Need ${passingScore}% to pass`}
        </p>
      </div>
    )
  }

  if (!q) return null

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex gap-1 mb-3">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < currentQ ? 'bg-amber-500/60' : i === currentQ ? 'bg-amber-400' : 'bg-white/10'
            }`} />
          ))}
        </div>
        <div className="text-white/40 text-xs">Question {currentQ + 1} of {questions.length}</div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        <div key={q.id} className="animate-[fadeIn_0.25s_ease-out]">
          <p className="text-sm font-medium mb-4 leading-relaxed">{q.text}</p>

          {/* Multiple choice */}
          {q.type === 'multiple_choice' && q.options && (
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const selected = userAnswer === i
                const correct = showExplanation && q.correct_answer === i
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={showExplanation}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm border transition-all ${
                      correct
                        ? 'border-green-500/50 bg-green-500/10 text-green-400'
                        : selected && !isCorrect
                          ? 'border-red-500/30 bg-red-500/5 text-red-400'
                          : selected
                            ? 'border-amber-500/30 bg-amber-500/10'
                            : showExplanation
                              ? 'border-white/5 bg-white/[0.02] text-white/30'
                              : 'border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/15 text-white/70'
                    }`}
                  >
                    <span className="text-white/30 mr-2 font-mono text-xs">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {/* True / false */}
          {q.type === 'true_false' && (
            <div className="flex gap-3">
              {['True', 'False'].map(opt => {
                const val = opt.toLowerCase()
                const selected = userAnswer === val
                const correct = showExplanation && q.correct_answer === val
                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(val)}
                    disabled={showExplanation}
                    className={`flex-1 px-4 py-3.5 rounded-lg text-sm font-medium border transition-all ${
                      correct
                        ? 'border-green-500/50 bg-green-500/10 text-green-400'
                        : selected && !isCorrect
                          ? 'border-red-500/30 bg-red-500/5 text-red-400'
                          : showExplanation
                            ? 'border-white/5 text-white/30'
                            : 'border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/15'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {/* Explanation */}
          {showExplanation && q.explanation && (
            <div className={`mt-4 p-3 rounded-lg border text-xs leading-relaxed animate-[fadeIn_0.2s_ease-out] ${
              isCorrect ? 'border-green-500/20 bg-green-500/5 text-green-300/80' : 'border-red-500/20 bg-red-500/5 text-red-300/80'
            }`}>
              <span className="font-semibold">{isCorrect ? 'Correct!' : 'Not quite.'}</span> {q.explanation}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      {showExplanation && (
        <div className="px-5 py-3 border-t border-white/8 animate-[fadeIn_0.2s_ease-out]">
          <div className="text-[10px] text-white/15 text-center mb-1.5">Press Enter to continue</div>
          <button
            onClick={handleNext}
            autoFocus
            className="w-full px-4 py-2.5 bg-amber-500 text-black text-sm font-semibold rounded-lg hover:bg-amber-400 transition-all active:scale-[0.97]"
          >
            {isLast ? 'See Results' : 'Next Question'}
          </button>
        </div>
      )}
    </div>
  )
}
