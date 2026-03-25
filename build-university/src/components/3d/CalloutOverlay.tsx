'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'

// ════════════════════════════════════════════════════════════════════════════════
// CalloutOverlay — 3D-projected HTML labels with SVG leader lines
// Renders callout labels as DOM elements positioned via CSS transforms,
// projected from 3D world coordinates to 2D screen space each frame.
// ════════════════════════════════════════════════════════════════════════════════

export interface Callout {
  id: string
  text: string
  details?: string[]
  worldPosition: [number, number, number]
  anchorPosition: [number, number, number]
  visible: boolean
}

interface CalloutOverlayProps {
  callouts: Callout[]
  camera: THREE.PerspectiveCamera | null
  rendererDom: HTMLCanvasElement | null
}

/** Convert a world-space position to normalized screen coords {x, y} in pixels */
function projectToScreen(
  worldPos: [number, number, number],
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number
): { x: number; y: number; behind: boolean } {
  const v = new THREE.Vector3(...worldPos)
  v.project(camera)
  const behind = v.z > 1
  return {
    x: (v.x * 0.5 + 0.5) * width,
    y: (-v.y * 0.5 + 0.5) * height,
    behind,
  }
}

export default function CalloutOverlay({ callouts, camera, rendererDom }: CalloutOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const frameRef = useRef<number>(0)
  const labelRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const lineRefs = useRef<Map<string, SVGLineElement>>(new Map())
  const dotRefs = useRef<Map<string, SVGCircleElement>>(new Map())

  const setLabelRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) labelRefs.current.set(id, el)
    else labelRefs.current.delete(id)
  }, [])

  const setLineRef = useCallback((id: string) => (el: SVGLineElement | null) => {
    if (el) lineRefs.current.set(id, el)
    else lineRefs.current.delete(id)
  }, [])

  const setDotRef = useCallback((id: string) => (el: SVGCircleElement | null) => {
    if (el) dotRefs.current.set(id, el)
    else dotRefs.current.delete(id)
  }, [])

  useEffect(() => {
    if (!camera || !rendererDom) return

    const update = () => {
      frameRef.current = requestAnimationFrame(update)

      const rect = rendererDom.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      for (const callout of callouts) {
        const label = labelRefs.current.get(callout.id)
        const line = lineRefs.current.get(callout.id)
        const shadowLine = lineRefs.current.get(`${callout.id}-shadow`)
        const dot = dotRefs.current.get(callout.id)
        if (!label || !line || !dot) continue

        if (!callout.visible) {
          label.style.opacity = '0'
          label.style.pointerEvents = 'none'
          line.style.opacity = '0'
          if (shadowLine) shadowLine.style.opacity = '0'
          dot.style.opacity = '0'
          continue
        }

        const labelScreen = projectToScreen(callout.worldPosition, camera, w, h)
        const anchorScreen = projectToScreen(callout.anchorPosition, camera, w, h)

        if (labelScreen.behind || anchorScreen.behind) {
          label.style.opacity = '0'
          label.style.pointerEvents = 'none'
          line.style.opacity = '0'
          if (shadowLine) shadowLine.style.opacity = '0'
          dot.style.opacity = '0'
          continue
        }

        // Position label
        label.style.transform = `translate(${labelScreen.x}px, ${labelScreen.y}px) translate(-50%, -100%)`
        label.style.opacity = '1'
        label.style.pointerEvents = 'auto'

        // Position leader line from bottom-center of label to anchor point
        const lineSx = labelScreen.x
        const lineSy = labelScreen.y
        line.setAttribute('x1', String(lineSx))
        line.setAttribute('y1', String(lineSy))
        line.setAttribute('x2', String(anchorScreen.x))
        line.setAttribute('y2', String(anchorScreen.y))
        line.style.opacity = '1'

        // Shadow line (offset for depth effect)
        if (shadowLine) {
          shadowLine.setAttribute('x1', String(lineSx + 1))
          shadowLine.setAttribute('y1', String(lineSy + 1))
          shadowLine.setAttribute('x2', String(anchorScreen.x + 1))
          shadowLine.setAttribute('y2', String(anchorScreen.y + 1))
          shadowLine.style.opacity = '1'
        }

        // Anchor dot
        dot.setAttribute('cx', String(anchorScreen.x))
        dot.setAttribute('cy', String(anchorScreen.y))
        dot.style.opacity = '1'
      }
    }

    update()
    return () => cancelAnimationFrame(frameRef.current)
  }, [callouts, camera, rendererDom])

  const visibleCallouts = callouts.filter(c => c.visible)

  if (visibleCallouts.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 15 }}
    >
      {/* SVG layer for leader lines */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      >
        <defs>
          <filter id="callout-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {callouts.map(c => (
          <g key={c.id}>
            {/* Shadow line */}
            <line
              ref={setLineRef(`${c.id}-shadow`)}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth="2.5"
              strokeDasharray="6 3"
              style={{ opacity: 0 }}
            />
            {/* Main leader line */}
            <line
              ref={setLineRef(c.id)}
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1.5"
              strokeDasharray="6 3"
              style={{ opacity: 0 }}
            />
            {/* Anchor dot */}
            <circle
              ref={setDotRef(c.id)}
              r="4"
              fill="rgba(255,255,255,0.9)"
              stroke="rgba(0,78,159,0.8)"
              strokeWidth="2"
              filter="url(#callout-glow)"
              style={{ opacity: 0 }}
            />
          </g>
        ))}
      </svg>

      {/* HTML label layer */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {callouts.map(c => (
          <div
            key={c.id}
            ref={setLabelRef(c.id)}
            className="absolute top-0 left-0 pointer-events-auto"
            style={{
              opacity: 0,
              transition: 'opacity 0.3s ease',
              willChange: 'transform, opacity',
            }}
          >
            <div className="callout-label">
              <div className="callout-label-header">{c.text}</div>
              {c.details && c.details.length > 0 && (
                <ul className="callout-label-details">
                  {c.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Scoped styles for callout labels */}
      <style jsx>{`
        .callout-label {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 78, 159, 0.15);
          border-radius: 8px;
          padding: 8px 12px;
          min-width: 140px;
          max-width: 220px;
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(255, 255, 255, 0.5) inset;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          transform: translateY(-8px);
        }

        .callout-label-header {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #1a1c1d;
          line-height: 1.3;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .callout-label-details {
          list-style: none;
          margin: 4px 0 0 0;
          padding: 0;
          border-top: 1px solid rgba(0, 78, 159, 0.08);
          padding-top: 4px;
        }

        .callout-label-details li {
          font-size: 10px;
          color: rgba(26, 28, 29, 0.55);
          line-height: 1.5;
          padding-left: 10px;
          position: relative;
        }

        .callout-label-details li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          width: 4px;
          height: 4px;
          border-radius: 1px;
          background: rgba(0, 78, 159, 0.3);
        }
      `}</style>
    </div>
  )
}
