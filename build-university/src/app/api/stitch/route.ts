import { NextRequest, NextResponse } from 'next/server'
import { generateScreen, refineScreen, type StitchScreenRequest } from '@/lib/stitch/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, ...params } = body as { action: string } & Record<string, unknown>

    if (!process.env.STITCH_API_KEY) {
      return NextResponse.json(
        { error: 'Stitch API key not configured' },
        { status: 503 }
      )
    }

    switch (action) {
      case 'generate': {
        const { prompt, style, platform, theme, width, height, referenceImageUrl } =
          params as unknown as StitchScreenRequest
        if (!prompt) {
          return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
        }
        const result = await generateScreen({
          prompt,
          style,
          platform,
          theme,
          width,
          height,
          referenceImageUrl,
        })
        return NextResponse.json(result)
      }

      case 'refine': {
        const { screenId, prompt } = params as { screenId: string; prompt: string }
        if (!screenId || !prompt) {
          return NextResponse.json(
            { error: 'screenId and prompt are required' },
            { status: 400 }
          )
        }
        const result = await refineScreen(screenId, prompt)
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use "generate" or "refine".` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[API] /api/stitch error:', error)
    const message = error instanceof Error ? error.message : 'Stitch request failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
