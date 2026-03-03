"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { User, Clock } from "lucide-react"

export interface FieldHistoryEntry {
  timestamp: string
  user: string
  action: "predicted" | "manual_edit" | "text_selection" | "annotated" | "reset"
  oldValue?: string
  newValue: string
  reference?: {
    text: string
    page: number
  }
}

interface FieldHistoryModalProps {
  fieldName: string
  history: FieldHistoryEntry[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FieldHistoryModal({ fieldName, history, open, onOpenChange }: FieldHistoryModalProps) {
  const getActionBadge = (action: string) => {
    switch (action) {
      case "predicted":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
          >
            AI Predicted
          </Badge>
        )
      case "manual_edit":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
          >
            Manual Edit
          </Badge>
        )
      case "text_selection":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
          >
            Text Selection
          </Badge>
        )
      case "annotated":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
          >
            Annotated
          </Badge>
        )
      case "reset":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30"
          >
            Reset
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {action}
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Field History: {fieldName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={index} className="border border-border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getActionBadge(entry.action)}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {entry.timestamp}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {entry.user}
                  </span>
                </div>

                {entry.oldValue && (
                  <div className="mb-2">
                    <div className="text-[10px] text-muted-foreground mb-1">Previous Value:</div>
                    <div className="bg-muted/50 border border-border rounded px-2 py-1.5">
                      <code className="text-xs text-muted-foreground line-through">{entry.oldValue}</code>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">
                    {entry.action === "predicted" ? "Predicted Value:" : "New Value:"}
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1.5">
                    <code className="text-xs text-emerald-700 dark:text-emerald-400">{entry.newValue}</code>
                  </div>
                </div>

                {entry.reference && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="text-[10px] text-muted-foreground mb-1">Reference:</div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        Page {entry.reference.page}
                      </Badge>
                      <span className="text-xs text-blue-600 dark:text-blue-400 italic">"{entry.reference.text}"</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
