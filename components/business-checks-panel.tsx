"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Calculator,
  ArrowRight,
  Equal,
  Plus,
  Minus,
  Sigma,
  FileText,
  Hash,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { BusinessCheck, BusinessCheckField, HighlightReference } from "@/lib/types"

interface BusinessChecksPanelProps {
  businessChecks: BusinessCheck[]
  focusedCheckId?: string | null
  focusedFieldId?: string | null
  onFieldClick?: (reference: HighlightReference, fieldId?: string) => void
  onClose?: () => void
}

export function BusinessChecksPanel({
  businessChecks,
  focusedCheckId,
  focusedFieldId,
  onFieldClick,
}: BusinessChecksPanelProps) {
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(
    new Set(focusedCheckId ? [focusedCheckId] : businessChecks.map(c => c.id))
  )

  const toggleCheck = (checkId: string) => {
    setExpandedChecks(prev => {
      const next = new Set(prev)
      if (next.has(checkId)) {
        next.delete(checkId)
      } else {
        next.add(checkId)
      }
      return next
    })
  }

  const passedChecks = businessChecks.filter(c => c.status === "pass").length
  const failedChecks = businessChecks.filter(c => c.status === "fail").length

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Summary Header */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Business Rules Evaluation</span>
            </div>
            <div className="flex items-center gap-2">
              {passedChecks > 0 && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {passedChecks} Passed
                </Badge>
              )}
              {failedChecks > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  {failedChecks} Failed
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Checks List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {businessChecks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <ShieldCheck className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">No business checks configured</span>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {businessChecks.map((check) => (
                <BusinessCheckCard
                  key={check.id}
                  check={check}
                  isExpanded={expandedChecks.has(check.id)}
                  isFocused={focusedCheckId === check.id}
                  focusedFieldId={focusedFieldId}
                  onToggle={() => toggleCheck(check.id)}
                  onFieldClick={onFieldClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

interface BusinessCheckCardProps {
  check: BusinessCheck
  isExpanded: boolean
  isFocused: boolean
  focusedFieldId?: string | null
  onToggle: () => void
  onFieldClick?: (reference: HighlightReference, fieldId?: string) => void
}

function BusinessCheckCard({
  check,
  isExpanded,
  isFocused,
  focusedFieldId,
  onToggle,
  onFieldClick,
}: BusinessCheckCardProps) {
  const isPassed = check.status === "pass"

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        isPassed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-red-500/30 bg-red-500/5",
        isFocused && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {/* Check Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-1.5 rounded-md",
            isPassed ? "bg-emerald-500/20" : "bg-red-500/20"
          )}>
            {isPassed ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium">{check.name}</div>
            <div className="text-xs text-muted-foreground">
              {check.inputFields.length} fields involved
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isPassed
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
            )}
          >
            {isPassed ? "PASSED" : "FAILED"}
          </Badge>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Rule Expression */}
          <div className="bg-muted/50 rounded-md p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
              Rule Expression
            </div>
            <div className="font-mono text-sm text-foreground">
              {check.expression}
            </div>
          </div>

          {/* Input Fields */}
          <div>
            <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              Input Fields
            </div>
            <div className="space-y-2">
              {check.inputFields.map((field) => (
                <FieldCard
                  key={field.fieldId}
                  field={field}
                  isFocused={focusedFieldId === field.fieldId}
                  onFieldClick={onFieldClick}
                />
              ))}
            </div>
          </div>

          {/* Calculation Result */}
          <div className="bg-muted/50 rounded-md p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              Calculation Result
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Calculated</div>
                <div className="font-mono text-lg font-semibold">
                  {typeof check.calculatedResult === 'number' 
                    ? check.calculatedResult.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    : check.calculatedResult}
                </div>
              </div>
              <div className={cn(
                "p-2 rounded-full",
                isPassed ? "bg-emerald-500/20" : "bg-red-500/20"
              )}>
                {isPassed ? (
                  <Equal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="text-red-600 dark:text-red-400 font-bold text-sm">≠</span>
                )}
              </div>
              <div className="flex-1 text-right">
                <div className="text-xs text-muted-foreground">Expected</div>
                <div className="font-mono text-lg font-semibold">
                  {typeof check.expectedValue === 'number' 
                    ? check.expectedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    : check.expectedValue}
                </div>
              </div>
            </div>
            {!isPassed && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="text-xs text-red-600 dark:text-red-400">
                  Difference: {Math.abs(check.calculatedResult - check.expectedValue).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface FieldCardProps {
  field: BusinessCheckField
  isFocused: boolean
  onFieldClick?: (reference: HighlightReference, fieldId?: string) => void
}

function FieldCard({ field, isFocused, onFieldClick }: FieldCardProps) {
  const [isExpanded, setIsExpanded] = useState(field.isMultiOccurrence)

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card overflow-hidden transition-all",
        isFocused && "ring-2 ring-primary"
      )}
    >
      {/* Field Header */}
      <div className="px-3 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          {field.isMultiOccurrence ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{field.fieldName}</span>
          {field.isMultiOccurrence && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <Sigma className="h-2.5 w-2.5 mr-0.5" />
              {field.aggregationType}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {field.isMultiOccurrence && field.aggregatedValue !== undefined && (
            <span className="font-mono text-sm font-semibold">
              {field.aggregatedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          )}
          {!field.isMultiOccurrence && field.values[0] && (
            <span className="font-mono text-sm font-semibold">
              {typeof field.values[0].value === 'number' 
                ? field.values[0].value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                : field.values[0].value}
            </span>
          )}
        </div>
      </div>

      {/* Multi-occurrence Values */}
      {field.isMultiOccurrence && isExpanded && (
        <div className="border-t border-border">
          {field.values.map((valueItem, index) => (
            <button
              key={index}
              onClick={() => valueItem.reference && onFieldClick?.(valueItem.reference, field.fieldId)}
              className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-8">
                  {valueItem.instanceLabel || `#${index + 1}`}
                </span>
                {valueItem.reference && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <FileText className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      Page {valueItem.reference.page}: "{valueItem.reference.text}"
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <span className="font-mono text-sm">
                {typeof valueItem.value === 'number' 
                  ? valueItem.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                  : valueItem.value}
              </span>
            </button>
          ))}
          <div className="px-3 py-1.5 bg-muted/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {field.aggregationType} of {field.values.length} values
            </span>
            <span className="font-mono font-semibold">
              = {field.aggregatedValue?.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          </div>
        </div>
      )}

      {/* Single occurrence reference link */}
      {!field.isMultiOccurrence && field.values[0]?.reference && (
        <button
          onClick={() => field.values[0].reference && onFieldClick?.(field.values[0].reference, field.fieldId)}
          className="w-full px-3 py-1.5 text-left hover:bg-muted/50 transition-colors border-t border-border"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>Page {field.values[0].reference.page}: "{field.values[0].reference.text}"</span>
          </div>
        </button>
      )}
    </div>
  )
}
