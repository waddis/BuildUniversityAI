// ============================================================================
// Stitch by Google — Client Library
// Generates UI screens and design assets from text prompts
// Docs: https://stitch.withgoogle.com/
// ============================================================================

const STITCH_API_KEY = process.env.STITCH_API_KEY

if (!STITCH_API_KEY) {
  console.warn('[Stitch] STITCH_API_KEY not set — Stitch features disabled')
}

// Stitch SDK endpoint (Google Labs)
const STITCH_BASE_URL = 'https://stitch.withgoogle.com/api/v1'

export interface StitchScreenRequest {
  prompt: string
  style?: 'material3' | 'cupertino' | 'custom'
  platform?: 'web' | 'mobile' | 'tablet'
  theme?: 'light' | 'dark'
  width?: number
  height?: number
  referenceImageUrl?: string
}

export interface StitchScreenResponse {
  id: string
  html: string
  css: string
  screenshot_url: string | null
  metadata: {
    components: string[]
    colors: string[]
    fonts: string[]
  }
}

export interface StitchError {
  code: string
  message: string
}

/**
 * Generate a UI screen from a text prompt using Stitch by Google.
 * Returns production-ready HTML/CSS and optional screenshot.
 */
export async function generateScreen(
  request: StitchScreenRequest
): Promise<StitchScreenResponse> {
  if (!STITCH_API_KEY) {
    throw new Error('STITCH_API_KEY is not configured')
  }

  const response = await fetch(`${STITCH_BASE_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STITCH_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: request.prompt,
      style: request.style ?? 'material3',
      platform: request.platform ?? 'web',
      theme: request.theme ?? 'dark',
      width: request.width ?? 1280,
      height: request.height ?? 800,
      reference_image_url: request.referenceImageUrl,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`Stitch API error (${response.status}): ${(error as StitchError).message}`)
  }

  return response.json()
}

/**
 * Generate a UI component (smaller scope than full screen).
 */
export async function generateComponent(
  prompt: string,
  options?: { style?: string; theme?: 'light' | 'dark' }
): Promise<StitchScreenResponse> {
  return generateScreen({
    prompt: `Generate a single UI component: ${prompt}`,
    style: (options?.style as StitchScreenRequest['style']) ?? 'material3',
    theme: options?.theme ?? 'dark',
  })
}

/**
 * Iterate on an existing Stitch-generated screen with a refinement prompt.
 */
export async function refineScreen(
  screenId: string,
  refinementPrompt: string
): Promise<StitchScreenResponse> {
  if (!STITCH_API_KEY) {
    throw new Error('STITCH_API_KEY is not configured')
  }

  const response = await fetch(`${STITCH_BASE_URL}/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STITCH_API_KEY}`,
    },
    body: JSON.stringify({
      screen_id: screenId,
      prompt: refinementPrompt,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`Stitch API error (${response.status}): ${(error as StitchError).message}`)
  }

  return response.json()
}
