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
  FolderOpen,
  Pencil,
  FileText,
  Sparkles,
  Calendar,
  Hash,
} from "lucide-react"
import type { ExtractedField, FieldGroupMeta } from "@/lib/types"

interface GroupDetailsPopoverProps {
  groupName: string
  groupMeta?: FieldGroupMeta | null
  fields: ExtractedField[]
  children: React.ReactNode
  onEditGroup?: () => void
}

function getFieldTypeSummary(fields: ExtractedField[]) {
  const counts = { exact: 0, inferred: 0, date: 0, number: 0 }
  for (const f of fields) {
    if (f.dataType === "date") counts.date++
    else if (f.dataType === "number") counts.number++
    else if (f.extractionType === "inferred" || f.isInferred) counts.inferred++
    else counts.exact++
  }
  return counts
}

export function GroupDetailsPopover({
  groupName,
  groupMeta,
  fields,
  children,
  onEditGroup,
}: GroupDetailsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const typeCounts = getFieldTypeSummary(fields)
  const instructions = groupMeta?.instructions || `Extract all fields related to ${groupName.toLowerCase()} from the document.`

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
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <h4 className="font-semibold text-sm truncate">{groupName}</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1.5 shrink-0 bg-transparent"
              onClick={() => {
                onEditGroup?.()
                setIsOpen(false)
              }}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          </div>

          {/* Summary */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
              {fields.length} fields
            </Badge>
            {typeCounts.exact > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-[10px] text-blue-600 dark:text-blue-400">
                <FileText className="h-2.5 w-2.5" />
                <span>{typeCounts.exact}</span>
              </div>
            )}
            {typeCounts.inferred > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-[10px] text-purple-600 dark:text-purple-400">
                <Sparkles className="h-2.5 w-2.5" />
                <span>{typeCounts.inferred}</span>
              </div>
            )}
            {typeCounts.date > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-[10px] text-emerald-600 dark:text-emerald-400">
                <Calendar className="h-2.5 w-2.5" />
                <span>{typeCounts.date}</span>
              </div>
            )}
            {typeCounts.number > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-[10px] text-amber-600 dark:text-amber-400">
                <Hash className="h-2.5 w-2.5" />
                <span>{typeCounts.number}</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Instructions</span>
            <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-md p-2">
              {instructions}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
