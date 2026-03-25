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

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-h-[calc(100%-8rem)] overflow-y-auto">
      {/* Explode slider */}
      <div className="bg-gray-1000 backdrop-blur-md border border-gray-200/50 shadow-sm rounded-lg px-3 py-2.5 ">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-gray-500 text-[10px] uppercase tracking-wider">Explode</label>
          <span className="text-blue-500 text-[10px] font-mono">{explodedOffset.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={3}
          step={0.1}
          value={explodedOffset}
          onChange={e => onExplodeChange(parseFloat(e.target.value))}
          className="w-28 accent-blue-600"
          aria-label="Explode view offset"
        />
      </div>

      {/* Blueprint mode toggle */}
      {onBlueprintToggle && (
        <button
          onClick={onBlueprintToggle}
          aria-label="Toggle blueprint mode"
          aria-pressed={blueprintMode}
          className={`bg-gray-1000 backdrop-blur-md border shadow-sm rounded-lg px-3 py-2 text-xs text-left transition-all ${
            blueprintMode
              ? 'border-blue-400 text-blue-100 bg-[#1a2a5c]'
              : 'border-gray-200/50 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Blueprint {blueprintMode ? 'ON' : ''}
        </button>
      )}

      {/* Code references toggle */}
      <button
        onClick={onCodeToggle}
        aria-label="Toggle code references"
        aria-pressed={codeOpen}
        className={`bg-gray-1000 backdrop-blur-md border border-gray-200/50 shadow-sm rounded-lg px-3 py-2 border text-xs text-left transition-all ${
          codeOpen
            ? 'border-blue-300 text-blue-600 bg-blue-50'
            : 'border-white/10 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
      >
        Code Refs {codeOpen ? '(open)' : ''}
      </button>

      {/* Visibility toggles */}
      {visibilityGroups.length > 0 && (
        <div className="bg-gray-1000 backdrop-blur-md border border-gray-200/50 shadow-sm rounded-lg px-3 py-2.5 ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Layers</span>
            {hiddenGroups.length > 0 && (
              <button
                onClick={() => hiddenGroups.forEach(g => onToggleGroup(g))}
                className="text-blue-500 text-[9px] hover:text-blue-600"
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
                    hidden ? 'text-gray-300' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-sm shrink-0 ${hidden ? 'bg-white/10' : 'bg-blue-500'}`} />
                  {group.replace(/_/g, ' ')}
                </button>
              )
            })}
            {hasMore && (
              <button
                onClick={() => setLayersExpanded(e => !e)}
                className="text-blue-400 text-[10px] hover:text-blue-600 mt-1"
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
