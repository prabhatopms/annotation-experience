"use client"

import { useEffect, useState, useCallback } from "react"

interface ConnectionLineProps {
  sourceId: string | null
  targetRef: string | null
  color: string
  isActive: boolean
}

interface Position {
  x: number
  y: number
  width: number
  height: number
}

export function ConnectionLine({ sourceId, targetRef, color, isActive }: ConnectionLineProps) {
  const [sourcePos, setSourcePos] = useState<Position | null>(null)
  const [targetPos, setTargetPos] = useState<Position | null>(null)

  const updatePositions = useCallback(() => {
    if (!sourceId || !targetRef || !isActive) {
      setSourcePos(null)
      setTargetPos(null)
      return
    }

    // Find source element (field row in extraction panel)
    const sourceElement = document.querySelector(`[data-field-id="${sourceId}"]`)
    // Find target element (highlight in document)
    const targetElement = document.querySelector(`[data-ref-text="${targetRef}"]`)

    if (sourceElement) {
      const rect = sourceElement.getBoundingClientRect()
      setSourcePos({
        x: rect.left,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      })
    } else {
      setSourcePos(null)
    }

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect()
      setTargetPos({
        x: rect.right,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      })
    } else {
      setTargetPos(null)
    }
  }, [sourceId, targetRef, isActive])

  useEffect(() => {
    updatePositions()

    // Update on scroll and resize
    const handleUpdate = () => {
      requestAnimationFrame(updatePositions)
    }

    window.addEventListener("scroll", handleUpdate, true)
    window.addEventListener("resize", handleUpdate)

    // Set up mutation observer for DOM changes
    const observer = new MutationObserver(handleUpdate)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })

    // Update periodically to catch any missed changes
    const interval = setInterval(updatePositions, 100)

    return () => {
      window.removeEventListener("scroll", handleUpdate, true)
      window.removeEventListener("resize", handleUpdate)
      observer.disconnect()
      clearInterval(interval)
    }
  }, [updatePositions])

  if (!sourcePos || !targetPos || !isActive) {
    return null
  }

  // Calculate the path for a curved connection line
  const startX = sourcePos.x
  const startY = sourcePos.y
  const endX = targetPos.x
  const endY = targetPos.y

  // Control points for a smooth bezier curve
  const midX = (startX + endX) / 2
  const controlOffset = Math.min(Math.abs(endX - startX) * 0.4, 150)

  const path = `M ${startX} ${startY} 
                C ${startX - controlOffset} ${startY}, 
                  ${endX + controlOffset} ${endY}, 
                  ${endX} ${endY}`

  // Parse the color to get rgba
  const rgbaColor = color.replace("rgb", "rgba").replace(")", ", 0.8)")
  const rgbaColorLight = color.replace("rgb", "rgba").replace(")", ", 0.2)")

  return (
    <svg
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: "100vw", height: "100vh" }}
    >
      <defs>
        <linearGradient id={`gradient-${sourceId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={rgbaColor} />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor={rgbaColor} />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Glow effect */}
      <path
        d={path}
        fill="none"
        stroke={rgbaColorLight}
        strokeWidth="8"
        strokeLinecap="round"
        className="animate-pulse"
      />
      
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={`url(#gradient-${sourceId})`}
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      
      {/* Animated dash */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="8 8"
        className="animate-[dash_1s_linear_infinite]"
      />
      
      {/* Source indicator dot */}
      <circle
        cx={startX}
        cy={startY}
        r="5"
        fill={color}
        filter="url(#glow)"
      />
      
      {/* Target indicator dot */}
      <circle
        cx={endX}
        cy={endY}
        r="5"
        fill={color}
        filter="url(#glow)"
      />

      <style>
        {`
          @keyframes dash {
            to {
              stroke-dashoffset: -16;
            }
          }
        `}
      </style>
    </svg>
  )
}
