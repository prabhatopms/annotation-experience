"use client"

import { useRef, useCallback } from "react"
import { usePanelManager } from "@/components/panel-manager"

/**
 * Shown at the bottom of the layout when a panel is being dragged but no
 * bottom panels exist yet. Provides a drop target to dock a panel to the bottom.
 */
export function BottomDropZonePlaceholder() {
  const { dragState, updateDropIndicator } = usePanelManager()
  const zoneRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = useCallback(() => {
    if (dragState.isDragging && zoneRef.current) {
      const rect = zoneRef.current.getBoundingClientRect()
      updateDropIndicator("bottom-full", {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: 3,
      })
    }
  }, [dragState.isDragging, updateDropIndicator])

  const handleMouseLeave = useCallback(() => {
    updateDropIndicator(null)
  }, [updateDropIndicator])

  if (!dragState.isDragging) return null

  return (
    <div
      ref={zoneRef}
      className="h-16 border-t border-dashed border-primary/30 bg-primary/5 flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="text-xs text-muted-foreground">Drop here to dock panel to bottom</span>
    </div>
  )
}
