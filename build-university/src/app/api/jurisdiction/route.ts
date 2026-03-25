import { NextRequest, NextResponse } from 'next/server'
import { getJurisdictionByZip } from '@/lib/jurisdiction'

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get('zip')

  if (!zip) {
    return NextResponse.json({ error: 'Missing ?zip= parameter' }, { status: 400 })
  }

  try {
    const snapshot = await getJurisdictionByZip(zip)
    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[jurisdiction]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
