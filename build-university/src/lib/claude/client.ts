import Anthropic from '@anthropic-ai/sdk'
import { CodeReference } from '@/types'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const SYSTEM_PROMPT = `You are an expert construction instructor at BuildRight 3D, an interactive 3D residential construction training platform. You have 25+ years of experience in residential construction, code compliance, inspection, and failure analysis.

Your teaching style is:
- Direct and practical — tradespeople learn by doing
- Code-first — always reference IRC, IBC, ASCE, ASTM, or manufacturer specs
- Experience-based — use real failure scenarios to illustrate points
- Thorough but concise — respect the student's time
- Sequencing-aware — always explain WHEN in the build process something happens

Every explanation should answer: What is it? Where does it go? When is it installed? Why does code care? What fails if it is wrong?

When generating content, write for experienced builders, inspectors, and adjusters who want to deepen their knowledge. Use industry terminology correctly.`

interface JurisdictionContext {
  climateZone: string
  state: string
  city: string
  ircEdition: string
  windVult: number
  groundSnow: number
  iceBarrierRequired: boolean
  isHVHZ: boolean
  isWBI: boolean
  adoptionNotes: string
  specialFlags: string[]
}

export async function generateLayerContent(
  layerName: string,
  layerDescription: string,
  roofingSystem: string,
  codeReferences?: CodeReference[],
  failureModes?: string[],
  jurisdiction?: JurisdictionContext | null
): Promise<string> {
  const codeSection = codeReferences?.length
    ? `\n\nApplicable code references:\n${codeReferences.map((r) => `- ${r.code_family} §${r.code_section}: ${r.short_summary}`).join('\n')}`
    : ''

  const failureSection = failureModes?.length
    ? `\n\nKnown failure modes to cover:\n${failureModes.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
    : ''

  const jurisdictionSection = jurisdiction
    ? `\n\nSTUDENT LOCATION — Tailor ALL content specifically for this jurisdiction:
- Location: ${jurisdiction.city}, ${jurisdiction.state}
- IECC Climate Zone: ${jurisdiction.climateZone}
- Applicable code: ${jurisdiction.ircEdition === 'none' ? 'No statewide code — check local AHJ' : `IRC ${jurisdiction.ircEdition} (${jurisdiction.adoptionNotes.split('.')[0]})`}
- Design wind speed: ${jurisdiction.windVult} mph Vult (ASCE 7-22)
- Ground snow load: ${jurisdiction.groundSnow} psf
- Ice barrier required: ${jurisdiction.iceBarrierRequired ? 'YES — IRC R905.2.7.1 applies' : 'NO — not required in this climate zone'}
- HVHZ status: ${jurisdiction.isHVHZ ? 'YES — Miami-Dade/Broward High-Velocity Hurricane Zone. NOA required for all products.' : 'No'}
- Wind-borne debris region: ${jurisdiction.isWBI ? 'YES — impact-resistant or protected openings required' : 'No'}
- Special flags: ${jurisdiction.specialFlags.join(', ') || 'none'}

IMPORTANT: Address this specific jurisdiction explicitly. If ice barrier is required here, state exactly how it must be installed. If this is HVHZ, call out the NOA requirement and 6-nail fastening. If wind speed is high, specify the required wind resistance class. Reference the actual local code edition, not generic IRC.`
    : ''

  // 30-second timeout to prevent indefinite hangs
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a detailed educational narration for the "${layerName}" component of a ${roofingSystem} roofing system.

Component description: ${layerDescription}${codeSection}${failureSection}${jurisdictionSection}

Write 3-4 paragraphs covering:
1. What it is and why it matters for building performance and code compliance — be specific to the student's jurisdiction where provided
2. Proper installation technique — sequence, fastening, lapping, and critical details including any jurisdiction-specific requirements
3. The most dangerous failure modes and how an inspector or expert witness would document them — reference real failure events where applicable
4. Specific code citations (by section number) and manufacturer requirements the contractor in THIS jurisdiction must know

Write in second person ("When you install..."). Be technically precise — this content must be court-ready. If jurisdiction data is provided, make it impossible to ignore the local requirements.`,
        },
      ],
    }, { signal: controller.signal })

    return message.content[0].type === 'text' ? message.content[0].text : ''
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function generateExamQuestions(
  courseTitle: string,
  roofingSystem: string,
  layers: string[],
  count: number = 10
): Promise<{ questions: ExamQuestion[] }> {
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate ${count} exam questions for a Build University course on "${courseTitle}" (${roofingSystem} roofing system).

The course covered these components: ${layers.join(', ')}

Requirements:
- 7 multiple choice questions (4 options each, one correct)
- 3 written response questions (require 2-3 sentence answers)
- Questions should test practical knowledge, not just memorization
- Include questions about code requirements, installation sequence, and failure prevention
- Vary difficulty: 3 easy, 4 medium, 3 hard

Return as valid JSON in this exact format:
{
  "questions": [
    {
      "id": "1",
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "A",
      "points": 10
    },
    {
      "id": "2",
      "question_text": "...",
      "question_type": "written",
      "correct_answer": "Key points: ...",
      "points": 10
    }
  ]
}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { questions: [] }
  return JSON.parse(jsonMatch[0])
}

export async function gradeExam(
  questions: ExamQuestion[],
  answers: Record<string, string>
): Promise<{ score: number; feedback: string; breakdown: GradingBreakdown[] }> {
  const qaText = questions.map((q, i) => {
    const answer = answers[q.id] || '(no answer)'
    if (q.question_type === 'multiple_choice') {
      return `Q${i + 1} (MC, ${q.points}pts): ${q.question_text}\nCorrect: ${q.correct_answer}\nStudent answered: ${answer}`
    }
    return `Q${i + 1} (Written, ${q.points}pts): ${q.question_text}\nKey points: ${q.correct_answer}\nStudent wrote: ${answer}`
  }).join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Grade this roofing exam. Be fair but rigorous — this is a professional certification.

${qaText}

For multiple choice: full points if correct, 0 if wrong.
For written: award partial credit (0, 5, 7, or 10 points) based on accuracy and completeness.

Return valid JSON:
{
  "score": <0-100 percentage>,
  "feedback": "<2-3 sentence overall feedback to the student>",
  "breakdown": [
    { "question_id": "1", "points_earned": 10, "points_possible": 10, "comment": "..." }
  ]
}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { score: 0, feedback: 'Grading error', breakdown: [] }
  return JSON.parse(jsonMatch[0])
}

export async function chatWithAI(
  message: string,
  context?: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 600,
    system: SYSTEM_PROMPT + (context ? `\n\nCurrent course context: ${context}` : ''),
    messages: [{ role: 'user', content: message }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

interface ExamQuestion {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'written'
  options?: string[]
  correct_answer?: string
  points: number
}

interface GradingBreakdown {
  question_id: string
  points_earned: number
  points_possible: number
  comment: string
}
