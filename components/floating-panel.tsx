"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { X, PanelBottom, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export type PanelPosition = "right" | "bottom"

interface FloatingPanelProps {
  title: string
  icon?: React.ReactNode
  position?: PanelPosition
  onClose: () => void
  onPositionChange?: (position: PanelPosition) => void
  children?: React.ReactNode
  className?: string
}

export function FloatingPanel({
  title,
  icon,
  position = "right",
  onClose,
  onPositionChange,
  children,
  className,
}: FloatingPanelProps) {
  const isBottom = position === "bottom"

  return (
    <TooltipProvider>
      <div
        className={cn(
          "bg-card border-border flex flex-col",
          isBottom
            ? "border-t h-64 w-full"
            : "border-l w-80 h-full",
          className
        )}
      >
        {/* Panel Header */}
        <div className="h-12 px-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-grab" />
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <span className="text-sm font-medium">{title}</span>
          </div>

          <div className="flex items-center gap-0.5">
            {/* Position Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onPositionChange?.(isBottom ? "right" : "bottom")}
                >
                  <PanelBottom className={cn("h-3.5 w-3.5", isBottom && "rotate-180")} />
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
                  onClick={onClose}
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

        {/* Panel Content */}
        <div className="flex-1 overflow-auto p-4">
          {children || (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              <span>Panel content coming soon</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
