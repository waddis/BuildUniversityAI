import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@/lib/claude/client'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, context } = body as { message: string; context?: string }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt =
      SYSTEM_PROMPT +
      (context ? `\n\nCurrent course context: ${context}` : '')

    // Create a streaming response using the Web Streams API
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-opus-4-6',
            max_tokens: 600,
            system: systemPrompt,
            stream: true,
            messages: [{ role: 'user', content: message.trim() }],
          })

          for await (const event of response) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const chunk = event.delta.text
              controller.enqueue(new TextEncoder().encode(chunk))
            }
          }
          controller.close()
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Stream error'
          controller.enqueue(
            new TextEncoder().encode(`\n\n[Error: ${errorMsg}]`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('[API] /api/claude/chat error:', error)
    return new Response(JSON.stringify({ error: 'Failed to process chat message.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
