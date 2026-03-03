"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, TrendingUp, LayoutGrid, ChevronDown, RotateCcw, Pencil, BarChart3, Database } from "lucide-react"
import { cn } from "@/lib/utils"

type LayoutPreset = "annotate" | "measure" | "schema"
type PerformanceRating = "poor" | "fair" | "good" | "excellent"

interface SubHeaderProps {
  experienceName?: string
  activeLayout?: LayoutPreset
  onLayoutChange?: (layout: LayoutPreset) => void
  onResetLayout?: () => void
  modelScore?: number
  onBack?: () => void
}

const getPerformanceRating = (score: number): PerformanceRating => {
  if (score < 50) return "poor"
  if (score < 70) return "fair"
  if (score < 85) return "good"
  return "excellent"
}

const getRatingStyles = (rating: PerformanceRating) => {
  switch (rating) {
    case "poor":
      return {
        badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-500/30",
        label: "Poor"
      }
    case "fair":
      return {
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-500/30",
        label: "Fair"
      }
    case "good":
      return {
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-500/30",
        label: "Good"
      }
    case "excellent":
      return {
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-500/30",
        label: "Excellent"
      }
  }
}

export function SubHeader({
  experienceName = "Model Building",
  activeLayout = "annotate",
  onLayoutChange,
  onResetLayout,
  modelScore = 78,
  onBack,
}: SubHeaderProps) {
  const rating = getPerformanceRating(modelScore)
  const ratingStyles = getRatingStyles(rating)

  const layoutPresets: { id: LayoutPreset; label: string; description: string; icon: React.ReactNode }[] = [
    { id: "annotate", label: "Annotate", description: "Optimized for document annotation workflow", icon: <Pencil className="h-3.5 w-3.5" /> },
    { id: "measure", label: "Measure", description: "Focus on model performance metrics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "schema", label: "Schema Definition", description: "Configure extraction schema and fields", icon: <Database className="h-3.5 w-3.5" /> },
  ]

  const activePreset = layoutPresets.find(p => p.id === activeLayout)

  return (
    <TooltipProvider>
      <div className="h-11 border-b border-border bg-muted/30 flex items-center justify-between px-4">
        {/* Left Section: Back + Experience Name */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Back to Models
            </TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-border" />

          <h1 className="text-sm font-medium">{experienceName}</h1>
        </div>

        {/* Center Section: Layout Preset Selector */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 bg-transparent">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{activePreset?.label} Layout</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64">
              {layoutPresets.map((preset) => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() => onLayoutChange?.(preset.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 py-2.5 cursor-pointer",
                    activeLayout === preset.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {preset.icon}
                    <span className="font-medium text-sm">{preset.label}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground ml-5.5">{preset.description}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onResetLayout} className="text-xs cursor-pointer">
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Reset to Default Layout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Section: Model Performance */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-background border border-border">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">{modelScore}%</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4 font-medium",
                    ratingStyles.badge
                  )}
                >
                  {ratingStyles.label}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[200px]">
              <div className="space-y-1">
                <div className="font-medium">Model Performance Score</div>
                <div className="text-muted-foreground">
                  Current accuracy based on validated annotations
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
