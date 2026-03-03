"use client"

import type React from "react"
import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { X, PanelBottom, PanelRight, GripVertical, Plus, ChevronDown, Tags, BarChart3, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePanelManager, type PanelId, type DropZoneType } from "./panel-manager"

const PANEL_CONFIG: Record<Exclude<PanelId, "extractions">, { title: string; icon: React.ReactNode }> = {
  "business-checks": { title: "Business Checks", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  "taxonomy": { title: "Taxonomy", icon: <Tags className="h-3.5 w-3.5" /> },
  "measure": { title: "Measure", icon: <BarChart3 className="h-3.5 w-3.5" /> },
}

interface DraggablePanelProps {
  id: PanelId
  title: string
  icon?: React.ReactNode
  children?: React.ReactNode
  className?: string
  isMainPanel?: boolean
}

export function DraggablePanel({
  id,
  title,
  icon,
  children,
  className,
  isMainPanel = false,
}: DraggablePanelProps) {
  const {
    panels,
    dragState,
    resizeState,
    closePanel,
    openPanel,
    movePanelToZone,
    startDrag,
    startResize,
    setHoveredPanel,
  } = usePanelManager()

  const panelRef = useRef<HTMLDivElement>(null)
  const [isHeaderHovered, setIsHeaderHovered] = useState(false)
  
  const panel = panels.find(p => p.id === id)
  if (!panel || !panel.isOpen) return null

  const isBottom = panel.zone.startsWith("bottom")
  const isDragging = dragState.panelId === id && dragState.isDragging

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(id, e.clientX, e.clientY)
  }

  const handleResizeStart = (edge: "left" | "right" | "top" | "bottom") => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startResize(id, edge, e.clientX, e.clientY)
  }

  const togglePosition = () => {
    if (isBottom) {
      movePanelToZone(id, "right")
    } else {
      movePanelToZone(id, "bottom-full")
    }
  }

  return (
    <TooltipProvider>
      <div
        ref={panelRef}
        className={cn(
          "bg-card border-border flex flex-col relative group",
          isBottom ? "border-t" : "border-l",
          isDragging && "opacity-50",
          className
        )}
        style={{
          width: isBottom ? "100%" : panel.width,
          height: isBottom ? panel.height : "100%",
          minWidth: isBottom ? undefined : panel.minWidth,
          minHeight: isBottom ? panel.minHeight : undefined,
        }}
        onMouseEnter={() => setHoveredPanel(id)}
        onMouseLeave={() => setHoveredPanel(null)}
      >
        {/* Resize Handles */}
        {!isMainPanel && (
          <>
            {/* Left resize handle */}
            {!isBottom && (
              <div
                className="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 z-20 transition-colors"
                onMouseDown={handleResizeStart("left")}
              />
            )}
            {/* Top resize handle for bottom panels */}
            {isBottom && (
              <div
                className="absolute top-0 left-0 w-full h-1 cursor-ns-resize hover:bg-primary/30 active:bg-primary/50 z-20 transition-colors"
                onMouseDown={handleResizeStart("top")}
              />
            )}
          </>
        )}

        {/* Panel Header - only show for non-main panels */}
        {!isMainPanel && (
          <div 
            className="h-12 px-4 border-b border-border flex items-center justify-between"
            onMouseEnter={() => setIsHeaderHovered(true)}
            onMouseLeave={() => setIsHeaderHovered(false)}
          >
            <div className="flex items-center gap-2">
              {/* Drag Handle - visible on hover */}
              <div
                className={cn(
                  "cursor-grab active:cursor-grabbing transition-opacity",
                  isHeaderHovered ? "opacity-100" : "opacity-0"
                )}
                onMouseDown={handleDragStart}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              
              {/* Title Dropdown - switch between panel types */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-7 px-2 gap-1.5">
                    {icon && <span className="text-muted-foreground">{icon}</span>}
                    <span className="text-sm font-semibold">{title}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {(Object.keys(PANEL_CONFIG) as Exclude<PanelId, "extractions">[]).map((panelId) => {
                    const config = PANEL_CONFIG[panelId]
                    const panelState = panels.find(p => p.id === panelId)
                    const isCurrent = panelId === id
                    const isOpen = panelState?.isOpen
                    
                    return (
                      <DropdownMenuItem
                        key={panelId}
                        onClick={() => {
                          if (!isCurrent && !isOpen) {
                            // Close current panel and open the selected one
                            closePanel(id)
                            openPanel(panelId)
                          } else if (!isCurrent && isOpen) {
                            // Just close current panel, the other is already open
                            closePanel(id)
                          }
                        }}
                        disabled={isCurrent}
                        className={cn("cursor-pointer", isCurrent && "bg-accent")}
                      >
                        <span className="mr-2">{config.icon}</span>
                        {config.title}
                        {isOpen && !isCurrent && <span className="ml-auto text-xs text-muted-foreground">(open)</span>}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Add Panel Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {(Object.keys(PANEL_CONFIG) as Exclude<PanelId, "extractions">[]).map((panelId) => {
                    const config = PANEL_CONFIG[panelId]
                    const panelState = panels.find(p => p.id === panelId)
                    const isOpen = panelState?.isOpen
                    
                    if (isOpen) return null
                    
                    return (
                      <DropdownMenuItem
                        key={panelId}
                        onClick={() => openPanel(panelId)}
                        className="cursor-pointer"
                      >
                        <span className="mr-2">{config.icon}</span>
                        {config.title}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Position Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={togglePosition}
                  >
                    {isBottom ? (
                      <PanelRight className="h-3.5 w-3.5" />
                    ) : (
                      <PanelBottom className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {isBottom ? "Dock to right" : "Dock to bottom"}
                </TooltipContent>
              </Tooltip>

              {/* Close Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => closePanel(id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Close panel
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Panel Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children || (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4">
              <span>Panel content coming soon</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Drop Zone Indicator Component - shows edge line where panel will be placed
export function DropZoneIndicator() {
  const { dropIndicator, dragState } = usePanelManager()

  if (!dragState.isDragging || !dropIndicator.show || !dropIndicator.rect) return null

  // Determine if this is a horizontal or vertical edge based on zone
  const isBottomZone = dropIndicator.zone?.startsWith("bottom")
  
  // For right zone, show a vertical line on the left edge
  // For bottom zones, show a horizontal line on the top edge
  const lineStyle = isBottomZone
    ? {
        left: dropIndicator.rect.x,
        top: dropIndicator.rect.y,
        width: dropIndicator.rect.width,
        height: 3,
      }
    : {
        left: dropIndicator.rect.x,
        top: dropIndicator.rect.y,
        width: 3,
        height: dropIndicator.rect.height,
      }

  return (
    <div
      className="fixed pointer-events-none z-50 bg-primary transition-all duration-100"
      style={lineStyle}
    />
  )
}

// Drag Ghost Component
export function DragGhost() {
  const { dragState, panels } = usePanelManager()

  if (!dragState.isDragging || !dragState.panelId) return null

  const panel = panels.find(p => p.id === dragState.panelId)
  if (!panel) return null

  return (
    <div
      className="fixed pointer-events-none z-50 bg-card/90 border border-primary shadow-xl rounded-lg px-4 py-2"
      style={{
        left: dragState.currentX + 10,
        top: dragState.currentY + 10,
      }}
    >
      <span className="text-sm font-medium">{panel.title}</span>
    </div>
  )
}

// Drop Zone Area Component for detecting where to drop
interface PanelDropZoneProps {
  zone: DropZoneType
  className?: string
  style?: React.CSSProperties
}

export function DropZone({ zone, className, style }: PanelDropZoneProps) {
  const { dragState, updateDropIndicator } = usePanelManager()
  const zoneRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = useCallback(() => {
    if (dragState.isDragging && zoneRef.current) {
      const rect = zoneRef.current.getBoundingClientRect()
      updateDropIndicator(zone, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      })
    }
  }, [dragState.isDragging, zone, updateDropIndicator])

  const handleMouseLeave = useCallback(() => {
    updateDropIndicator(null)
  }, [updateDropIndicator])

  if (!dragState.isDragging) return null

  return (
    <div
      ref={zoneRef}
      className={cn(
        "absolute inset-0 z-40",
        className
      )}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  )
}
