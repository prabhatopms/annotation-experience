"use client"

import type React from "react"
import { useState } from "react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Sparkles,
  Calculator,
  Calendar,
  Hash,
  Type,
  ShieldCheck,
  ShieldAlert,
  Pencil,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExtractedField, BusinessCheck } from "@/lib/types"

interface FieldDetailsPopoverProps {
  field: ExtractedField
  businessCheck?: BusinessCheck | null
  children: React.ReactNode
  onEditField?: () => void
  onViewBusinessCheck?: () => void
}

export function FieldDetailsPopover({
  field,
  businessCheck,
  children,
  onEditField,
  onViewBusinessCheck,
}: FieldDetailsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Get extraction type icon and label
  const getExtractionTypeInfo = () => {
    const extractionType = field.extractionType || (field.isInferred ? "inferred" : "exact")
    
    switch (extractionType) {
      case "exact":
        return {
          icon: <FileText className="h-3 w-3" />,
          label: "Exact",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/50",
        }
      case "inferred":
        return {
          icon: <Sparkles className="h-3 w-3" />,
          label: "Inferred",
          color: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-50 dark:bg-purple-950/50",
        }
      case "calculated":
        return {
          icon: <Calculator className="h-3 w-3" />,
          label: "Calculated",
          color: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-50 dark:bg-amber-950/50",
        }
      default:
        return {
          icon: <FileText className="h-3 w-3" />,
          label: "Unknown",
          color: "text-muted-foreground",
          bgColor: "bg-muted/50",
        }
    }
  }

  // Get data type icon and label
  const getDataTypeInfo = () => {
    switch (field.dataType) {
      case "date":
        return { icon: <Calendar className="h-3 w-3" />, label: "Date" }
      case "number":
        return { icon: <Hash className="h-3 w-3" />, label: "Number" }
      case "string":
      default:
        return { icon: <Type className="h-3 w-3" />, label: "Text" }
    }
  }

  const extractionInfo = getExtractionTypeInfo()
  const dataTypeInfo = getDataTypeInfo()

  // Default instructions if none provided
  const instructions = field.instructions || `Extract the ${field.name.toLowerCase()} value from the document.`

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen} openDelay={300} closeDelay={200}>
      <HoverCardTrigger asChild>
        <span className="cursor-help">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent 
        side="bottom" 
        align="start" 
        className="w-72 p-0"
        onPointerDownOutside={(e) => {
          if ((e.target as HTMLElement).closest('[data-radix-hover-card-content]')) {
            e.preventDefault()
          }
        }}
      >
        <div className="p-3 space-y-2.5">
          {/* Header: Field Name + Edit Button */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{field.name}</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5">
                  {field.group}
                </Badge>
                <div className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                  extractionInfo.bgColor,
                  extractionInfo.color
                )}>
                  {extractionInfo.icon}
                  <span>{extractionInfo.label}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                  {dataTypeInfo.icon}
                  <span>{dataTypeInfo.label}</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1.5 shrink-0 bg-transparent"
              onClick={() => {
                onEditField?.()
                setIsOpen(false)
              }}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          </div>

          {/* Instructions */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Instructions</span>
            <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-md p-2">
              {instructions}
            </p>
          </div>

          {/* Business Check Section - only if field has validation status */}
          {field.validationStatus && businessCheck && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Business Check</span>
                <Badge 
                  variant={field.validationStatus === "pass" ? "default" : "destructive"}
                  className="text-[10px] h-4 px-1.5"
                >
                  {field.validationStatus === "pass" ? (
                    <><ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> Pass</>
                  ) : (
                    <><ShieldAlert className="h-2.5 w-2.5 mr-0.5" /> Fail</>
                  )}
                </Badge>
              </div>
              
              <div className="space-y-1.5">
                <p className="text-xs font-medium truncate">{businessCheck.name}</p>
                <code className="block text-[10px] bg-muted/50 rounded p-1.5 font-mono text-muted-foreground leading-relaxed">
                  {businessCheck.expression}
                </code>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full h-6 text-xs justify-between hover:bg-muted px-2"
                onClick={() => {
                  onViewBusinessCheck?.()
                  setIsOpen(false)
                }}
              >
                <span>View Details</span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
