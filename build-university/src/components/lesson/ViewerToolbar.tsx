'use client'

import { useState } from 'react'

interface ViewerToolbarProps {
  explodedOffset: number
  onExplodeChange: (offset: number) => void
  onCodeToggle: () => void
  codeOpen: boolean
  visibilityGroups: string[]
  hiddenGroups: string[]
  onToggleGroup: (group: string) => void
  blueprintMode?: boolean
  onBlueprintToggle?: () => void
}

export default function ViewerToolbar({
  explodedOffset, onExplodeChange, onCodeToggle, codeOpen,
  visibilityGroups, hiddenGroups, onToggleGroup,
  blueprintMode = false, onBlueprintToggle,
}: ViewerToolbarProps) {
  const [layersExpanded, setLayersExpanded] = useState(false)

  // Show only first 8 groups unless expanded
  const visibleGroups = layersExpanded ? visibilityGroups : visibilityGroups.slice(0, 8)
  const hasMore = visibilityGroups.length > 8

  const panelStyle = {
    background: 'rgba(42,42,42,0.70)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(86,67,52,0.15)',
  }

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-h-[calc(100%-8rem)] overflow-y-auto">
      {/* Explode slider */}
      <div className="rounded-lg px-3 py-2.5" style={panelStyle}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[#e5e2e1] opacity-40 text-[10px] uppercase tracking-wider">Explode</label>
          <span className="text-[#FF8C00] text-[10px] font-mono">{explodedOffset.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={3}
          step={0.1}
          value={explodedOffset}
          onChange={e => onExplodeChange(parseFloat(e.target.value))}
          className="w-28 accent-[#FF8C00]"
          aria-label="Explode view offset"
        />
      </div>

      {/* Blueprint mode toggle */}
      {onBlueprintToggle && (
        <button
          onClick={onBlueprintToggle}
          aria-label="Toggle blueprint mode"
          aria-pressed={blueprintMode}
          className="rounded-lg px-3 py-2 text-xs text-left transition-all"
          style={{
            ...panelStyle,
            ...(blueprintMode ? { borderColor: '#FF8C00', color: '#ffb77d', background: 'rgba(255,140,0,0.15)' } : { color: 'rgba(229,226,225,0.4)' }),
          }}
        >
          Blueprint {blueprintMode ? 'ON' : ''}
        </button>
      )}

      {/* Code references toggle */}
      <button
        onClick={onCodeToggle}
        aria-label="Toggle code references"
        aria-pressed={codeOpen}
        className="rounded-lg px-3 py-2 text-xs text-left transition-all"
        style={{
          ...panelStyle,
          ...(codeOpen ? { borderColor: '#FF8C00', color: '#FF8C00', background: 'rgba(255,140,0,0.1)' } : { color: 'rgba(229,226,225,0.4)' }),
        }}
      >
        Code Refs {codeOpen ? '(open)' : ''}
      </button>

      {/* Visibility toggles */}
      {visibilityGroups.length > 0 && (
        <div className="rounded-lg px-3 py-2.5" style={panelStyle}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#e5e2e1] opacity-40 text-[10px] uppercase tracking-wider">Layers</span>
            {hiddenGroups.length > 0 && (
              <button
                onClick={() => hiddenGroups.forEach(g => onToggleGroup(g))}
                className="text-[#FF8C00] text-[9px] hover:text-[#ffb77d]"
              >
                Show all
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {visibleGroups.map(group => {
              const hidden = hiddenGroups.includes(group)
              return (
                <button
                  key={group}
                  onClick={() => onToggleGroup(group)}
                  aria-label={`${hidden ? 'Show' : 'Hide'} ${group.replace(/_/g, ' ')}`}
                  className={`flex items-center gap-1.5 w-full text-left text-xs px-1.5 py-1 rounded transition-colors capitalize ${
                    hidden ? 'text-[#e5e2e1] opacity-20' : 'text-[#e5e2e1] opacity-60 hover:opacity-80 hover:bg-[#353534]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-sm shrink-0 ${hidden ? 'bg-[#353534]' : 'bg-[#FF8C00]'}`} />
                  {group.replace(/_/g, ' ')}
                </button>
              )
            })}
            {hasMore && (
              <button
                onClick={() => setLayersExpanded(e => !e)}
                className="text-[#FF8C00] text-[10px] hover:text-[#ffb77d] mt-1"
              >
                {layersExpanded ? 'Show less' : `+${visibilityGroups.length - 8} more`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
