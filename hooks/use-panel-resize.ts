"use client"

import { useState, useCallback, useEffect } from "react"

interface UsePanelResizeOptions {
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
  onWidthChange?: (width: number) => void
}

/**
 * Handles horizontal (ew-resize) drag resizing for a panel on the right edge.
 * The new width is computed from the window right edge to the cursor.
 */
export function useRightPanelResize({
  initialWidth = 400,
  minWidth = 320,
  maxWidth = 1200,
  onWidthChange,
}: UsePanelResizeOptions = {}) {
  const [width, setWidth] = useState(initialWidth)
  const [isResizing, setIsResizing] = useState(false)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - e.clientX))
      setWidth(newWidth)
      onWidthChange?.(newWidth)
    },
    [isResizing, minWidth, maxWidth, onWidthChange]
  )

  const stopResize = useCallback(() => setIsResizing(false), [])

  useEffect(() => {
    if (!isResizing) return
    document.addEventListener("mousemove", handleMove)
    document.addEventListener("mouseup", stopResize)
    document.body.style.cursor = "ew-resize"
    document.body.style.userSelect = "none"
    return () => {
      document.removeEventListener("mousemove", handleMove)
      document.removeEventListener("mouseup", stopResize)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing, handleMove, stopResize])

  return { width, isResizing, startResize }
}

interface UseBottomPanelResizeOptions {
  initialHeight?: number
  minHeight?: number
  maxHeight?: number
  onHeightChange?: (height: number) => void
}

/**
 * Handles vertical (ns-resize) drag resizing for a bottom panel.
 * The new height is computed from the window bottom edge to the cursor.
 */
export function useBottomPanelResize({
  initialHeight = 256,
  minHeight = 150,
  maxHeight = 600,
  onHeightChange,
}: UseBottomPanelResizeOptions = {}) {
  const [height, setHeight] = useState(initialHeight)
  const [isResizing, setIsResizing] = useState(false)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return
      const newHeight = Math.max(minHeight, Math.min(maxHeight, window.innerHeight - e.clientY))
      setHeight(newHeight)
      onHeightChange?.(newHeight)
    },
    [isResizing, minHeight, maxHeight, onHeightChange]
  )

  const stopResize = useCallback(() => setIsResizing(false), [])

  useEffect(() => {
    if (!isResizing) return
    document.addEventListener("mousemove", handleMove)
    document.addEventListener("mouseup", stopResize)
    document.body.style.cursor = "ns-resize"
    document.body.style.userSelect = "none"
    return () => {
      document.removeEventListener("mousemove", handleMove)
      document.removeEventListener("mouseup", stopResize)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing, handleMove, stopResize])

  return { height, isResizing, startResize }
}
