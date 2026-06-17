import { NextRequest, NextResponse } from 'next/server'
import { generateLayerContent } from '@/lib/claude/client'
import { CodeReference } from '@/types'

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { layerName, layerDescription, roofingSystem, codeReferences, failureModes, jurisdiction } = body as {
      layerKey?: string
      layerName: string
      layerDescription: string
      roofingSystem: string
      codeReferences?: CodeReference[]
      failureModes?: string[]
      jurisdiction?: JurisdictionContext | null
    }

    if (!layerName || !layerDescription || !roofingSystem) {
      return NextResponse.json(
        { error: 'Missing required fields: layerName, layerDescription, roofingSystem' },
        { status: 400 }
      )
    }

    const content = await generateLayerContent(
      layerName,
      layerDescription,
      roofingSystem,
      codeReferences,
      failureModes,
      jurisdiction
    )

    return NextResponse.json({ content })
  } catch (error) {
    console.error('[API] /api/claude/lesson error:', error)
    return NextResponse.json(
      { error: 'Failed to generate lesson content. Please try again.' },
      { status: 500 }
    )
  }
}
