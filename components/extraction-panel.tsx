"use client"

import { cn } from "@/lib/utils"

import { useCallback } from "react"

import React from "react"

import { PopoverContent } from "@/components/ui/popover"
import { PopoverTrigger } from "@/components/ui/popover"
import { Popover } from "@/components/ui/popover"
import { useEffect } from "react"
import { useRef } from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertCircle,
  RotateCcw,
  MousePointerClick,
  MoreVertical,
  Copy,
  Eye,
  Trash2,
  Settings2,
  Type,
  Hash,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Plus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Star,
  Table,
  List,
  Filter,
  CheckSquare,
  X,
  PanelBottom,
  PanelRight,
  GripVertical,
  Tags,
  BarChart3,
  FileX,
  Unlink,
  MoreHorizontal,
  Pencil,
  FolderPlus,
  LayoutGrid,
  Search,
  FileText,
  Gauge,
  ListTree,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { FieldHistoryModal, type FieldHistoryEntry } from "@/components/field-history-modal"
import { FieldDetailsPopover } from "@/components/field-details-popover"
import { GroupDetailsPopover } from "@/components/group-details-popover"
import type { ExtractedField, HighlightReference, SelectionUpdateMode, BusinessCheck, FieldGroupMeta } from "@/lib/types"

interface ExtractionPanelProps {
  fields: ExtractedField[]
  activeFieldId: string | null
  selectedFieldId: string | null
  selectionUpdateMode: SelectionUpdateMode
  businessChecks?: BusinessCheck[]
  groupMeta?: Record<string, FieldGroupMeta>
  onFieldUpdate: (fieldId: string, updates: Partial<ExtractedField>) => void
  onAnnotate: (fieldIds: string[]) => void
  onReferenceClick: (reference: HighlightReference, fieldId?: string) => void
  onFieldActivate: (fieldId: string | null) => void
  onFieldSelect: (fieldId: string | null) => void
  onSelectionUpdateModeChange: (mode: SelectionUpdateMode) => void
  onAddPanel?: (panelType: "taxonomy" | "measure" | "business-checks") => void
  onDockToggle?: () => void
  isDockedBottom?: boolean
  onBusinessCheckClick?: (fieldId: string) => void
  onEditField?: (fieldId: string) => void
  onEditGroup?: (groupName: string) => void
  onResetAnnotations?: () => void
  onRePredict?: () => void
  isPredicting?: boolean // controlled externally: true while model is regenerating
}

export function ExtractionPanel({
  fields,
  activeFieldId,
  selectedFieldId,
  selectionUpdateMode,
  businessChecks = [],
  groupMeta = {},
  onFieldUpdate,
  onAnnotate,
  onReferenceClick,
  onFieldActivate,
  onFieldSelect,
  onSelectionUpdateModeChange,
  onAddPanel,
  onDockToggle,
  isDockedBottom = false,
  onBusinessCheckClick,
  onEditField,
  onEditGroup,
  onResetAnnotations,
  onRePredict,
  isPredicting = false,
}: ExtractionPanelProps) {

  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [showAnnotated, setShowAnnotated] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedFieldForHistory, setSelectedFieldForHistory] = useState<ExtractedField | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [collapsedSubGroups, setCollapsedSubGroups] = useState<Set<string>>(new Set())
  const [showReferences, setShowReferences] = useState(false)
  const [condensedView, setCondensedView] = useState(false)
  const [tableView, setTableView] = useState(false)
  const [tableViewGroups, setTableViewGroups] = useState<Set<string>>(new Set())

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterSearch, setFilterSearch] = useState("")
  const [filterWarnings, setFilterWarnings] = useState(false)
  const [filterBusinessCheck, setFilterBusinessCheck] = useState<"" | "pass" | "fail">("")
  const [filterAnnotationStatus, setFilterAnnotationStatus] = useState<"" | "annotated" | "not-annotated">("")
  const [filterExtractedInDoc, setFilterExtractedInDoc] = useState(false)
  const [filterFieldNames, setFilterFieldNames] = useState<Set<string>>(new Set())
  const [filterFieldPickerOpen, setFilterFieldPickerOpen] = useState(false)
  const [filterScore, setFilterScore] = useState<"" | "great" | "good" | "moderate" | "bad">("")
  const filterPopoverRef = React.useRef<HTMLDivElement>(null)

  // Prediction banner state: "idle" | "loading" | "done"
  const [predictionBanner, setPredictionBanner] = useState<"idle" | "loading" | "done">("idle")
  const predictionTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track isPredicting prop transitions
  React.useEffect(() => {
    if (isPredicting) {
      // Clear any existing auto-dismiss timer
      if (predictionTimerRef.current) clearTimeout(predictionTimerRef.current)
      setPredictionBanner("loading")
    } else if (predictionBanner === "loading" && !isPredicting) {
      // Transition from loading to done
      setPredictionBanner("done")
      predictionTimerRef.current = setTimeout(() => {
        setPredictionBanner("idle")
      }, 4000)
    }
    return () => {
      if (predictionTimerRef.current) clearTimeout(predictionTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPredicting])
  const [fieldPickerSide, setFieldPickerSide] = React.useState<"right" | "left">("right")

  React.useEffect(() => {
    if (filterFieldPickerOpen && filterPopoverRef.current) {
      const rect = filterPopoverRef.current.getBoundingClientRect()
      const spaceRight = window.innerWidth - rect.right
      const spaceLeft = rect.left
      setFieldPickerSide(spaceRight >= 240 ? "right" : spaceLeft >= 240 ? "left" : "right")
    }
  }, [filterFieldPickerOpen])

  // Helper to find business check for a field
  const getBusinessCheckForField = useCallback((fieldId: string): BusinessCheck | null => {
    return businessChecks.find(check =>
      check.inputFields.some(f => 
        f.fieldId === fieldId || 
        fieldId.startsWith(f.fieldId.split('-')[0])
      )
    ) || null
  }, [businessChecks])

  // Build hierarchical field tree for the field name picker
  const fieldTree = React.useMemo(() => {
    const tree: Record<string, Record<string, { id: string; name: string }[]>> = {}
    for (const f of fields) {
      if (!tree[f.group]) tree[f.group] = {}
      const sub = f.subGroup || "default"
      if (!tree[f.group][sub]) tree[f.group][sub] = []
      tree[f.group][sub].push({ id: f.id, name: f.name })
    }
    return tree
  }, [fields])

  // Filter logic
  const filterField = useCallback((field: ExtractedField): boolean => {
    // Search filter
    if (filterSearch) {
      const q = filterSearch.toLowerCase()
      const matchesName = field.name.toLowerCase().includes(q)
      const matchesValue = field.value.toLowerCase().includes(q)
      const matchesGroup = field.group.toLowerCase().includes(q)
      if (!matchesName && !matchesValue && !matchesGroup) return false
    }
    // Extracted in this document filter
    if (filterExtractedInDoc) {
      if (!field.extractedInDocument) return false
    }
    // Field name filter
    if (filterFieldNames.size > 0) {
      if (!filterFieldNames.has(field.id)) return false
    }
    // Warnings filter
    if (filterWarnings) {
      const hasWarning = (field.isModified && field.value !== field.initialPrediction) || field.isMissing
      if (!hasWarning) return false
    }
    // Business check filter
    if (filterBusinessCheck) {
      if (field.validationStatus !== filterBusinessCheck) return false
    }
    // Score filter
    if (filterScore) {
      if (field.fieldScore !== filterScore) return false
    }
    // Annotation status filter
    if (filterAnnotationStatus === "annotated") {
      if (!field.isAnnotated) return false
    } else if (filterAnnotationStatus === "not-annotated") {
      if (field.isAnnotated) return false
    }
    return true
  }, [filterSearch, filterWarnings, filterBusinessCheck, filterAnnotationStatus, filterExtractedInDoc, filterFieldNames, filterScore])

  const activeFilterCount = [
    filterSearch.length > 0,
    filterWarnings,
    filterBusinessCheck !== "",
    filterAnnotationStatus !== "",
    filterExtractedInDoc,
    filterFieldNames.size > 0,
    filterScore !== "",
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setFilterSearch("")
    setFilterWarnings(false)
    setFilterBusinessCheck("")
    setFilterAnnotationStatus("")
    setFilterExtractedInDoc(false)
    setFilterFieldNames(new Set())
    setFilterFieldPickerOpen(false)
    setFilterScore("")
  }

  // Score config helper
  const scoreConfig = {
    great: { label: "Great", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", dotClass: "bg-emerald-500" },
    good: { label: "Good", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400", dotClass: "bg-blue-500" },
    moderate: { label: "Moderate", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400", dotClass: "bg-amber-500" },
    bad: { label: "Bad", className: "bg-red-500/15 text-red-600 dark:text-red-400", dotClass: "bg-red-500" },
  } as const

  // Apply filters to fields, then group them
  const filteredFields = fields.filter(filterField)

  const fieldGroups = filteredFields.reduce(
    (acc, field) => {
      if (!acc[field.group]) {
        acc[field.group] = {}
      }
      const subGroup = field.subGroup || "default"
      if (!acc[field.group][subGroup]) {
        acc[field.group][subGroup] = []
      }
      acc[field.group][subGroup].push(field)
      return acc
    },
    {} as Record<string, Record<string, ExtractedField[]>>,
  )

  const handleSelectField = (fieldId: string) => {
    setSelectedFields((prev) => (prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]))
  }

  const handleSelectAll = () => {
    const filteredIds = filteredFields.map((f) => f.id)
    const allFilteredSelected = filteredIds.every(id => selectedFields.includes(id))
    if (allFilteredSelected) {
      setSelectedFields(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      setSelectedFields(prev => [...new Set([...prev, ...filteredIds])])
    }
  }

  const handleAnnotateSelected = () => {
    if (selectedFields.length > 0) {
      onAnnotate(selectedFields)
      setSelectedFields([])
    }
  }

  const getMockHistory = (field: ExtractedField): FieldHistoryEntry[] => {
    return [
      {
        timestamp: "2024-01-15 14:23:11",
        user: "AI Model",
        action: "predicted",
        newValue: field.initialPrediction,
        reference: {
          text: field.reference.text,
          page: field.reference.page,
        },
      },
      {
        timestamp: "2024-01-15 14:25:33",
        user: "john.doe@company.com",
        action: "manual_edit",
        oldValue: field.initialPrediction,
        newValue: "Modified Value 1",
        reference: {
          text: field.reference.text,
          page: field.reference.page,
        },
      },
      {
        timestamp: "2024-01-15 14:27:45",
        user: "jane.smith@company.com",
        action: "text_selection",
        oldValue: "Modified Value 1",
        newValue: "Selected Text from Doc",
        reference: {
          text: "Selected Text from Doc",
          page: 1,
        },
      },
      {
        timestamp: "2024-01-15 14:28:12",
        user: "jane.smith@company.com",
        action: "manual_edit",
        oldValue: "Selected Text from Doc",
        newValue: field.value,
        reference: {
          text: field.reference.text,
          page: field.reference.page,
        },
      },
      {
        timestamp: "2024-01-15 14:30:00",
        user: "admin@company.com",
        action: "annotated",
        newValue: field.value,
      },
    ]
  }

  const handleViewHistory = (field: ExtractedField) => {
    setSelectedFieldForHistory(field)
    setHistoryModalOpen(true)
  }

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
  }

  const toggleSubGroupCollapse = (groupName: string, subGroupName: string) => {
    const key = `${groupName}:${subGroupName}`
    setCollapsedSubGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const toggleTableView = (groupName: string) => {
    setTableViewGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
  }

  const handleSelectGroup = (groupFields: Record<string, ExtractedField[]>) => {
    const allGroupFieldIds = Object.values(groupFields)
      .flat()
      .map((f) => f.id)
    const allSelected = allGroupFieldIds.every((id) => selectedFields.includes(id))

    if (allSelected) {
      setSelectedFields((prev) => prev.filter((id) => !allGroupFieldIds.includes(id)))
    } else {
      setSelectedFields((prev) => [...new Set([...prev, ...allGroupFieldIds])])
    }
  }

  const isGroupSelected = (groupFields: Record<string, ExtractedField[]>) => {
    const allGroupFieldIds = Object.values(groupFields)
      .flat()
      .map((f) => f.id)
    return allGroupFieldIds.length > 0 && allGroupFieldIds.every((id) => selectedFields.includes(id))
  }

  const isGroupPartiallySelected = (groupFields: Record<string, ExtractedField[]>) => {
    const allGroupFieldIds = Object.values(groupFields)
      .flat()
      .map((f) => f.id)
    const selectedCount = allGroupFieldIds.filter((id) => selectedFields.includes(id)).length
    return selectedCount > 0 && selectedCount < allGroupFieldIds.length
  }

  const handleSelectSubGroup = (subGroupFields: ExtractedField[]) => {
    const subGroupFieldIds = subGroupFields.map((f) => f.id)
    const allSelected = subGroupFieldIds.every((id) => selectedFields.includes(id))

    if (allSelected) {
      setSelectedFields((prev) => prev.filter((id) => !subGroupFieldIds.includes(id)))
    } else {
      setSelectedFields((prev) => [...new Set([...prev, ...subGroupFieldIds])])
    }
  }

  const isSubGroupSelected = (subGroupFields: ExtractedField[]) => {
    const subGroupFieldIds = subGroupFields.map((f) => f.id)
    return subGroupFieldIds.length > 0 && subGroupFieldIds.every((id) => selectedFields.includes(id))
  }

  const isSubGroupPartiallySelected = (subGroupFields: ExtractedField[]) => {
    const subGroupFieldIds = subGroupFields.map((f) => f.id)
    const selectedCount = subGroupFieldIds.filter((id) => selectedFields.includes(id)).length
    return selectedCount > 0 && selectedCount < subGroupFieldIds.length
  }

  const hasGroupWarnings = (groupFields: Record<string, ExtractedField[]>) => {
    return Object.values(groupFields)
      .flat()
      .some((field) => field.isModified && field.value !== field.initialPrediction)
  }

  const hasSubGroupWarnings = (subGroupFields: ExtractedField[]) => {
    return subGroupFields.some((field) => field.isModified && field.value !== field.initialPrediction)
  }

  // Calculate summary statistics (based on filtered results)
  const totalFields = filteredFields.length
  const totalWarnings = filteredFields.filter(
    (field) => (field.isModified && field.value !== field.initialPrediction) || field.isMissing
  ).length
  const businessChecksTotal = fields.filter((field) => field.validationStatus).length
  const businessChecksPassed = fields.filter((field) => field.validationStatus === "pass").length
  const businessChecksFailed = fields.filter((field) => field.validationStatus === "fail").length

  return (
    <TooltipProvider>
      <div className="w-full h-full border-l border-border bg-card flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-12 px-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Panel Title */}
            <h2 className="font-semibold text-sm">Extractions</h2>

            {/* Warnings Summary */}
            {totalWarnings > 0 && (
              <button
                onClick={() => { setFilterWarnings(!filterWarnings); setFilterOpen(false) }}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer",
                  filterWarnings ? "bg-amber-500/15" : "bg-muted/50 hover:bg-muted"
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium text-amber-600 dark:text-amber-400 text-xs">
                  {totalWarnings}
                </span>
              </button>
            )}

            {/* Business Checks Summary - Clickable */}
            {businessChecksTotal > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onAddPanel?.("business-checks")}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    {businessChecksPassed > 0 && (
                      <div className="flex items-center gap-0.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-medium text-emerald-700 dark:text-emerald-400 text-xs">
                          {businessChecksPassed}
                        </span>
                      </div>
                    )}
                    {businessChecksFailed > 0 && (
                      <div className="flex items-center gap-0.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        <span className="font-medium text-red-700 dark:text-red-400 text-xs">
                          {businessChecksFailed}
                        </span>
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Click to view business checks: {businessChecksPassed} passed, {businessChecksFailed} failed
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
              {/* Filter Button with Popover */}
              <Popover open={filterOpen} onOpenChange={(open) => { setFilterOpen(open); if (!open) setFilterFieldPickerOpen(false) }}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7 relative", activeFilterCount > 0 && "text-primary")}>
                    <Filter className="h-3.5 w-3.5" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent ref={filterPopoverRef} align="start" className="w-80 p-0 relative" sideOffset={8}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                    <span className="text-xs font-semibold">Filters</span>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {/* ── Document Scope ── */}
                    <div className="px-3 pt-2.5 pb-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Document</span>
                    </div>
                    <button
                      onClick={() => setFilterExtractedInDoc(!filterExtractedInDoc)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left",
                        filterExtractedInDoc && "bg-blue-500/5"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-5 h-5 rounded",
                        filterExtractedInDoc ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground"
                      )}>
                        <FileText className="h-3 w-3" />
                      </div>
                      <span className="flex-1">Extracted in this document</span>
                      {filterExtractedInDoc && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border-0">
                          {fields.filter(f => f.extractedInDocument).length}
                        </Badge>
                      )}
                    </button>

                    <div className="mx-3 my-1 border-t border-border" />

                    {/* ── Field Name ── */}
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Field</span>
                    </div>
                    <button
                      onClick={() => setFilterFieldPickerOpen(!filterFieldPickerOpen)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left",
                        filterFieldNames.size > 0 && "bg-primary/5"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-5 h-5 rounded",
                        filterFieldNames.size > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <ListTree className="h-3 w-3" />
                      </div>
                      <span className="flex-1">By field name</span>
                      {filterFieldNames.size > 0 ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] border-0">
                            {filterFieldNames.size}
                          </Badge>
                          <button
                            onClick={(e) => { e.stopPropagation(); setFilterFieldNames(new Set()); setFilterFieldPickerOpen(false) }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ) : (
                        <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform", filterFieldPickerOpen && "rotate-90")} />
                      )}
                    </button>

                    {/* Selected field names summary chips */}
                    {filterFieldNames.size > 0 && !filterFieldPickerOpen && (
                      <div className="flex flex-wrap gap-1 px-3 pb-2">
                        {Array.from(filterFieldNames).map(id => {
                          const f = fields.find(fi => fi.id === id)
                          if (!f) return null
                          return (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="text-[10px] h-5 gap-1 pr-1 cursor-pointer hover:bg-muted"
                              onClick={() => {
                                setFilterFieldNames(prev => {
                                  const next = new Set(prev)
                                  next.delete(id)
                                  return next
                                })
                              }}
                            >
                              <span className="font-medium">{f.name}</span>
                              <X className="h-2.5 w-2.5 ml-0.5" />
                            </Badge>
                          )
                        })}
                      </div>
                    )}

                    <div className="mx-3 my-1 border-t border-border" />

                    {/* ── Quality & Validation ── */}
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Quality & Validation</span>
                    </div>

                    {/* Warnings */}
                    <button
                      onClick={() => setFilterWarnings(!filterWarnings)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left",
                        filterWarnings && "bg-amber-500/5"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-5 h-5 rounded",
                        filterWarnings ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
                      )}>
                        <AlertCircle className="h-3 w-3" />
                      </div>
                      <span className="flex-1">Fields with warnings</span>
                      {filterWarnings && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0">
                          {fields.filter(f => (f.isModified && f.value !== f.initialPrediction) || f.isMissing).length}
                        </Badge>
                      )}
                    </button>

                    {/* Business Checks - Pass */}
                    <button
                      onClick={() => setFilterBusinessCheck(filterBusinessCheck === "pass" ? "" : "pass")}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left",
                        filterBusinessCheck === "pass" && "bg-emerald-500/5"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-5 h-5 rounded",
                        filterBusinessCheck === "pass" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      )}>
                        <ShieldCheck className="h-3 w-3" />
                      </div>
                      <span className="flex-1">Business checks: passed</span>
                      {filterBusinessCheck === "pass" && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0">
                          {fields.filter(f => f.validationStatus === "pass").length}
                        </Badge>
                      )}
                    </button>

                    {/* Business Checks - Fail */}
                    <button
                      onClick={() => setFilterBusinessCheck(filterBusinessCheck === "fail" ? "" : "fail")}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left",
                        filterBusinessCheck === "fail" && "bg-red-500/5"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-5 h-5 rounded",
                        filterBusinessCheck === "fail" ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-muted text-muted-foreground"
                      )}>
                        <ShieldAlert className="h-3 w-3" />
                      </div>
                      <span className="flex-1">Business checks: failed</span>
                      {filterBusinessCheck === "fail" && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 border-0">
                          {fields.filter(f => f.validationStatus === "fail").length}
                        </Badge>
                      )}
                    </button>

                    {/* Field Score */}
                    <div className="px-3 pt-1.5 pb-1">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex items-center justify-center w-5 h-5 rounded",
                          filterScore ? scoreConfig[filterScore].className : "bg-muted text-muted-foreground"
                        )}>
                          <Gauge className="h-3 w-3" />
                        </div>
                        <span className="text-xs flex-1">Field score</span>
                        {filterScore && (
                          <button
                            onClick={() => setFilterScore("")}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1.5 ml-7">
                        {(["great", "good", "moderate", "bad"] as const).map((score) => {
                          const config = scoreConfig[score]
                          const isActive = filterScore === score
                          const count = fields.filter(f => f.fieldScore === score).length
                          return (
                            <button
                              key={score}
                              onClick={() => setFilterScore(isActive ? "" : score)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all",
                                isActive
                                  ? `${config.className} border-current/20`
                                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                              )}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? config.dotClass : "bg-muted-foreground/40")} />
                              {config.label}
                              {isActive && <span className="ml-0.5">{count}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mx-3 my-1.5 border-t border-border" />

                    {/* ── Status ── */}
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Annotation Status</span>
                    </div>

                    <button
                      onClick={() => setFilterAnnotationStatus(filterAnnotationStatus === "annotated" ? "" : "annotated")}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left",
                        filterAnnotationStatus === "annotated" && "bg-primary/5"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-5 h-5 rounded",
                        filterAnnotationStatus === "annotated" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <CheckSquare className="h-3 w-3" />
                      </div>
                      <span className="flex-1">Annotated</span>
                      {filterAnnotationStatus === "annotated" && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] border-0">
                          {fields.filter(f => f.isAnnotated).length}
                        </Badge>
                      )}
                    </button>

                    <button
                      onClick={() => setFilterAnnotationStatus(filterAnnotationStatus === "not-annotated" ? "" : "not-annotated")}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/50 transition-colors text-left",
                        filterAnnotationStatus === "not-annotated" && "bg-primary/5"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-5 h-5 rounded",
                        filterAnnotationStatus === "not-annotated" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <X className="h-3 w-3" />
                      </div>
                      <span className="flex-1">Not annotated</span>
                      {filterAnnotationStatus === "not-annotated" && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] border-0">
                          {fields.filter(f => !f.isAnnotated).length}
                        </Badge>
                      )}
                    </button>
                  </div>

                  {/* Search Field at bottom */}
                  <div className="border-t border-border px-3 py-2.5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        placeholder="Search by field name or value..."
                        className="h-8 text-xs pl-7 pr-7"
                      />
                      {filterSearch && (
                        <button
                          onClick={() => setFilterSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Results count */}
                  {activeFilterCount > 0 && (
                    <div className="border-t border-border px-3 py-2 bg-muted/30">
                      <span className="text-[10px] text-muted-foreground">
                        Showing {filteredFields.length} of {fields.length} fields
                      </span>
                    </div>
                  )}

                  {/* Side-expanding field picker panel */}
                  {filterFieldPickerOpen && (
                    <div
                      className={cn(
                        "absolute top-0 w-56 bg-popover border border-border rounded-md shadow-md z-50",
                        fieldPickerSide === "right" ? "left-full ml-1" : "right-full mr-1"
                      )}
                      style={{ maxHeight: filterPopoverRef.current?.offsetHeight || 420 }}
                    >
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                        <span className="text-xs font-semibold">Fields</span>
                        {filterFieldNames.size > 0 && (
                          <button
                            onClick={() => setFilterFieldNames(new Set())}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto" style={{ maxHeight: (filterPopoverRef.current?.offsetHeight || 420) - 40 }}>
                        {Object.entries(fieldTree).map(([groupName, subGroups]) => (
                          <div key={groupName}>
                            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-popover/95 backdrop-blur-sm border-b border-border/50">
                              {groupName}
                            </div>
                            {Object.entries(subGroups).map(([subName, fieldList]) => (
                              <div key={`${groupName}-${subName}`}>
                                {subName !== "default" && (
                                  <div className="px-3 py-1 text-[10px] text-muted-foreground font-medium">{subName}</div>
                                )}
                                {fieldList.map((f) => {
                                  const isSelected = filterFieldNames.has(f.id)
                                  return (
                                    <button
                                      key={f.id}
                                      onClick={() => {
                                        setFilterFieldNames(prev => {
                                          const next = new Set(prev)
                                          if (next.has(f.id)) next.delete(f.id)
                                          else next.add(f.id)
                                          return next
                                        })
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors text-left",
                                        subName !== "default" && "pl-5",
                                        isSelected && "bg-primary/5"
                                      )}
                                    >
                                      <Checkbox checked={isSelected} className="h-3 w-3 pointer-events-none" />
                                      <span className="flex-1 truncate">{f.name}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* More Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Add Field Group */}
                  <DropdownMenuItem className="cursor-pointer">
                    <FolderPlus className="h-3.5 w-3.5 mr-2" />
                    Add Field Group
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Extractions Layout - Sub Menu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                      <LayoutGrid className="h-3.5 w-3.5 mr-2" />
                      Extractions Layout
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-48">
                        <DropdownMenuItem 
                          onClick={() => {
                            setTableView(false)
                            setCondensedView(false)
                          }}
                          className={cn("cursor-pointer", !tableView && !condensedView && "bg-accent")}
                        >
                          <List className="h-3.5 w-3.5 mr-2" />
                          List View
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            if (!showReferences) {
                              setTableView(false)
                              setCondensedView(true)
                            }
                          }}
                          disabled={showReferences}
                          className={cn("cursor-pointer", condensedView && !tableView && "bg-accent")}
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-2" />
                          Condensed View
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setTableView(true)
                            setCondensedView(false)
                          }}
                          className={cn("cursor-pointer", tableView && "bg-accent")}
                        >
                          <Table className="h-3.5 w-3.5 mr-2" />
                          Table View
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setShowReferences(!showReferences)}
                          className="cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          {showReferences ? "Hide" : "Show"} References
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />

                  {/* Reset Annotations */}
                  <DropdownMenuItem 
                    onClick={() => onResetAnnotations?.()}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                    Reset annotations
                  </DropdownMenuItem>

                  {/* Re-predict Extractions */}
                  <DropdownMenuItem 
                    onClick={() => onRePredict?.()}
                    className="cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Re-predict extractions
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Dock Toggle */}
                  <DropdownMenuItem 
                    onClick={() => onDockToggle?.()}
                    className="cursor-pointer"
                  >
                    {isDockedBottom ? (
                      <PanelRight className="h-3.5 w-3.5 mr-2" />
                    ) : (
                      <PanelBottom className="h-3.5 w-3.5 mr-2" />
                    )}
                    {isDockedBottom ? "Dock to Side" : "Dock to Bottom"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Add Panel Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onAddPanel?.("business-checks")} className="cursor-pointer">
                    <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                    Business Checks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddPanel?.("taxonomy")} className="cursor-pointer">
                    <Tags className="h-3.5 w-3.5 mr-2" />
                    Taxonomy
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Actions in header when docked to bottom */}
              {isDockedBottom && (
                <>
                  <div className="w-px h-5 bg-border mx-1" />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-transparent gap-1.5" 
                    onClick={handleSelectAll}
                  >
                    <Checkbox
                      checked={filteredFields.length > 0 && filteredFields.every(f => selectedFields.includes(f.id))}
                      ref={(el) => {
                        if (el) {
                          const filteredSelected = filteredFields.filter(f => selectedFields.includes(f.id)).length
                          el.indeterminate = filteredSelected > 0 && filteredSelected < filteredFields.length
                        }
                      }}
                      className="h-3.5 w-3.5 pointer-events-none"
                    />
                    <span>Select all</span>
                    <span className="text-muted-foreground">({selectedFields.length} of {totalFields})</span>
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAnnotateSelected}
                    disabled={selectedFields.length === 0}
                  >
                    Annotate
                  </Button>
                </>
              )}
          </div>
        </div>

        {/* Prediction banner */}
        {predictionBanner !== "idle" && (
          <div
            className={cn(
              "border-b transition-all duration-300 overflow-hidden",
              predictionBanner === "loading"
                ? "border-blue-200/50 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-emerald-200/50 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20"
            )}
          >
            <div className="px-4 py-2.5 flex items-center gap-2.5">
              {predictionBanner === "loading" ? (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40">
                  <Loader2 className="h-3 w-3 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground leading-tight">
                  {predictionBanner === "loading"
                    ? "Model update in progress..."
                    : "New extractions ready"}
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {predictionBanner === "loading"
                    ? "Recent edits triggered a model update predicting new extractions."
                    : "Extraction predictions have been updated successfully."}
                </p>
              </div>
              {predictionBanner === "done" && (
                <button
                  onClick={() => {
                    setPredictionBanner("idle")
                    if (predictionTimerRef.current) clearTimeout(predictionTimerRef.current)
                  }}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted/50"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {/* Progress bar for loading state */}
            {predictionBanner === "loading" && (
              <div className="h-0.5 bg-blue-100 dark:bg-blue-900/30 overflow-hidden">
                <div className="h-full bg-blue-500 dark:bg-blue-400 animate-progress-indeterminate" />
              </div>
            )}
          </div>
        )}

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="px-3 py-2 border-b border-primary/10 bg-primary/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">{filteredFields.length}</span> of {fields.length}
              </span>
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-2.5 w-2.5" />
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {filterSearch && (
                <Badge variant="secondary" className="h-5 text-[10px] gap-1 pr-1 font-normal cursor-pointer hover:bg-muted" onClick={() => setFilterSearch("")}>
                  Search: {filterSearch}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
              {filterExtractedInDoc && (
                <Badge variant="secondary" className="h-5 text-[10px] gap-1 pr-1 font-normal cursor-pointer hover:bg-muted" onClick={() => setFilterExtractedInDoc(false)}>
                  In this document
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
              {filterFieldNames.size > 0 && (
                Array.from(filterFieldNames).map(id => {
                  const f = fields.find(fi => fi.id === id)
                  return f ? (
                    <Badge key={id} variant="secondary" className="h-5 text-[10px] gap-1 pr-1 font-normal cursor-pointer hover:bg-muted" onClick={() => setFilterFieldNames(prev => { const n = new Set(prev); n.delete(id); return n })}>
                      {f.name}
                      <X className="h-2.5 w-2.5" />
                    </Badge>
                  ) : null
                })
              )}
              {filterWarnings && (
                <Badge variant="secondary" className="h-5 text-[10px] gap-1 pr-1 font-normal bg-amber-500/10 text-amber-700 dark:text-amber-400 cursor-pointer hover:bg-amber-500/20" onClick={() => setFilterWarnings(false)}>
                  Warnings
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
              {filterBusinessCheck && (
                <Badge variant="secondary" className={cn("h-5 text-[10px] gap-1 pr-1 font-normal cursor-pointer", filterBusinessCheck === "pass" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20")} onClick={() => setFilterBusinessCheck("")}>
                  Check: {filterBusinessCheck === "pass" ? "Passed" : "Failed"}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
              {filterScore && (
                <Badge variant="secondary" className={cn("h-5 text-[10px] gap-1 pr-1 font-normal cursor-pointer", scoreConfig[filterScore].className)} onClick={() => setFilterScore("")}>
                  Score: {scoreConfig[filterScore].label}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
              {filterAnnotationStatus && (
                <Badge variant="secondary" className="h-5 text-[10px] gap-1 pr-1 font-normal cursor-pointer hover:bg-muted" onClick={() => setFilterAnnotationStatus("")}>
                  {filterAnnotationStatus === "annotated" ? "Annotated" : "Not annotated"}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Field Groups */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Empty state when filters yield no results */}
          {activeFilterCount > 0 && filteredFields.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No matching fields</p>
              <p className="text-xs text-muted-foreground mb-3">
                Try adjusting your filters to see more results.
              </p>
              <Button variant="outline" size="sm" className="text-xs h-7 bg-transparent" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            </div>
          )}
          {Object.entries(fieldGroups).map(([groupName, subGroups]) => {
            const isCollapsed = collapsedGroups.has(groupName)
            const groupSelected = isGroupSelected(subGroups)
            const groupPartiallySelected = isGroupPartiallySelected(subGroups)
            const hasSubGroups = Object.keys(subGroups).length > 1 || !subGroups.default
            const showGroupWarning = isCollapsed && hasGroupWarnings(subGroups)

            return (
              <div key={groupName} className="border-b border-border">
                <div className="px-4 py-2 bg-muted/50 flex items-center gap-3">
                  <Checkbox
                    checked={groupSelected}
                    ref={(el) => {
                      if (el && groupPartiallySelected) {
                        el.indeterminate = true
                      }
                    }}
                    onCheckedChange={() => handleSelectGroup(subGroups)}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => toggleGroupCollapse(groupName)}
                  >
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>

                  <GroupDetailsPopover
                    groupName={groupName}
                    groupMeta={groupMeta[groupName] || null}
                    fields={Object.values(subGroups).flat()}
                    onEditGroup={() => onEditGroup?.(groupName)}
                  >
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-1 hover:text-foreground transition-colors">
                      {groupName}
                    </h3>
                  </GroupDetailsPopover>

                  {showGroupWarning && <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}

                  <div className="flex-1" />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="text-xs">
                        <Plus className="h-3 w-3 mr-2" />
                        Add Extraction
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs">
                        <Settings2 className="h-3 w-3 mr-2" />
                        Edit Group Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs text-destructive">
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          setTableView(prev => !prev)
                          setTableViewGroups(new Set())
                        }}
                      >
                        {tableView ? <List className="h-3.5 w-3.5" /> : <Table className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {tableView ? "List view" : "Table view"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Add new field to group
                    </TooltipContent>
                  </Tooltip>
                </div>

                {!isCollapsed && (
                  <div>
                    {tableView ? (
                      // Table View
                      <GroupTableView
                        groupName={groupName}
                        subGroups={hasSubGroups ? subGroups : { "#1": subGroups.default || [] }}
                        selectedFields={selectedFields}
                        activeFieldId={activeFieldId}
                        selectedFieldId={selectedFieldId}
                        showAnnotated={showAnnotated}
                        showReferences={showReferences}
                        condensedView={condensedView}
                        selectionUpdateMode={selectionUpdateMode}
                        onSelectField={handleSelectField}
                        onFieldUpdate={onFieldUpdate}
                        onReferenceClick={onReferenceClick}
                        onFieldActivate={onFieldActivate}
                        onFieldSelect={onFieldSelect}
                        onViewHistory={handleViewHistory}
                        onSelectionUpdateModeChange={onSelectionUpdateModeChange}
                        hasSubGroups={hasSubGroups}
                        onBusinessCheckClick={onBusinessCheckClick}
                        getBusinessCheckForField={getBusinessCheckForField}
                        onEditField={onEditField}
                      />
                    ) : hasSubGroups ? (
                      Object.entries(subGroups).map(([subGroupName, subGroupFields]) => {
                        const subGroupKey = `${groupName}:${subGroupName}`
                        const isSubGroupCollapsed = collapsedSubGroups.has(subGroupKey)
                        const subGroupSelected = isSubGroupSelected(subGroupFields)
                        const subGroupPartiallySelected = isSubGroupPartiallySelected(subGroupFields)
                        const showSubGroupWarning = isSubGroupCollapsed && hasSubGroupWarnings(subGroupFields)

                        return (
                          <div key={subGroupKey} className="border-t border-border/50">
                            <div className="pl-4 pr-4 py-2 bg-muted/30 flex items-center gap-2 group/subgroup">
                              <Checkbox
                                checked={subGroupSelected}
                                ref={(el) => {
                                  if (el && subGroupPartiallySelected) {
                                    el.indeterminate = true
                                  }
                                }}
                                onCheckedChange={() => handleSelectSubGroup(subGroupFields)}
                              />

                              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-0 group-hover/subgroup:opacity-100 transition-opacity cursor-grab">
                                <GripVertical className="h-3 w-3 text-muted-foreground" />
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                onClick={() => toggleSubGroupCollapse(groupName, subGroupName)}
                              >
                                {isSubGroupCollapsed ? (
                                  <ChevronRight className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>

                              <span className="text-xs font-medium text-muted-foreground flex-1">{subGroupName}</span>

                              {showSubGroupWarning && (
                                <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                              )}

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-4 w-4">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="text-xs">
                                    <Copy className="h-3 w-3 mr-2" />
                                    Duplicate Instance
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs">
                                    <Settings2 className="h-3 w-3 mr-2" />
                                    Edit Instance
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-xs text-destructive">
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete Instance
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {!isSubGroupCollapsed && (
                              <div className="divide-y divide-border/50">
                                {subGroupFields.map((field) => (
                                  <FieldRow
                                    key={field.id}
                                    field={field}
                                    isSelected={selectedFields.includes(field.id)}
                                    isActive={activeFieldId === field.id}
                                    isFieldSelected={selectedFieldId === field.id}
                                    showAnnotated={showAnnotated}
                                    showReferences={showReferences}
                                    condensedView={condensedView}
                                    selectionUpdateMode={selectionUpdateMode}
                                    onSelect={() => handleSelectField(field.id)}
                                    onUpdate={(updates) => onFieldUpdate(field.id, updates)}
                                    onReferenceClick={onReferenceClick}
                                    onActivate={() => onFieldActivate(field.id)}
                                    onDeactivate={() => onFieldActivate(null)}
                                    onFieldSelect={() => onFieldSelect(field.id)}
                                    onFieldDeselect={() => onFieldSelect(null)}
                                    onViewHistory={() => handleViewHistory(field)}
                                    onSelectionUpdateModeChange={onSelectionUpdateModeChange}
                                    onBusinessCheckClick={onBusinessCheckClick}
                                    businessCheck={getBusinessCheckForField(field.id)}
                                    onEditField={onEditField}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="divide-y divide-border/50">
                        {subGroups.default?.map((field) => (
                          <FieldRow
                            key={field.id}
                            field={field}
                            isSelected={selectedFields.includes(field.id)}
                            isActive={activeFieldId === field.id}
                            isFieldSelected={selectedFieldId === field.id}
                            showAnnotated={showAnnotated}
                            showReferences={showReferences}
                            condensedView={condensedView}
                            selectionUpdateMode={selectionUpdateMode}
                            onSelect={() => handleSelectField(field.id)}
                            onUpdate={(updates) => onFieldUpdate(field.id, updates)}
                            onReferenceClick={onReferenceClick}
                            onActivate={() => onFieldActivate(field.id)}
                            onDeactivate={() => onFieldActivate(null)}
                            onFieldSelect={() => onFieldSelect(field.id)}
                            onFieldDeselect={() => onFieldSelect(null)}
                            onViewHistory={() => handleViewHistory(field)}
                            onSelectionUpdateModeChange={onSelectionUpdateModeChange}
                            onBusinessCheckClick={onBusinessCheckClick}
                            businessCheck={getBusinessCheckForField(field.id)}
                            onEditField={onEditField}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer - hidden when docked to bottom (actions move to header) */}
        {!isDockedBottom && (
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-xs bg-transparent gap-1.5 flex-1" 
                onClick={handleSelectAll}
              >
                <Checkbox
                  checked={filteredFields.length > 0 && filteredFields.every(f => selectedFields.includes(f.id))}
                  ref={(el) => {
                    if (el) {
                      const filteredSelected = filteredFields.filter(f => selectedFields.includes(f.id)).length
                      el.indeterminate = filteredSelected > 0 && filteredSelected < filteredFields.length
                    }
                  }}
                  className="h-3.5 w-3.5 pointer-events-none"
                />
                <span>Select all</span>
                <span className="text-muted-foreground">({selectedFields.length} of {totalFields})</span>
              </Button>
              <Button
                size="sm"
                className="flex-1 h-9 text-xs"
                onClick={handleAnnotateSelected}
                disabled={selectedFields.length === 0}
              >
                Annotate
              </Button>
            </div>
          </div>
        )}

        {selectedFieldForHistory && (
          <FieldHistoryModal
            fieldName={selectedFieldForHistory.name}
            history={getMockHistory(selectedFieldForHistory)}
            open={historyModalOpen}
            onOpenChange={setHistoryModalOpen}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

interface GroupTableViewProps {
  groupName: string
  subGroups: Record<string, ExtractedField[]>
  selectedFields: string[]
  activeFieldId: string | null
  selectedFieldId: string | null
  showAnnotated: boolean
  showReferences: boolean
  condensedView: boolean
  selectionUpdateMode: SelectionUpdateMode
  hasSubGroups?: boolean
  onSelectField: (fieldId: string) => void
  onFieldUpdate: (fieldId: string, updates: Partial<ExtractedField>) => void
  onReferenceClick: (reference: HighlightReference, fieldId?: string) => void
  onFieldActivate: (fieldId: string | null) => void
  onFieldSelect: (fieldId: string | null) => void
  onViewHistory: (field: ExtractedField) => void
  onSelectionUpdateModeChange: (mode: SelectionUpdateMode) => void
  onBusinessCheckClick?: (fieldId: string) => void
  getBusinessCheckForField?: (fieldId: string) => BusinessCheck | null
  onEditField?: (fieldId: string) => void
}

function GroupTableView({
  groupName,
  subGroups,
  selectedFields,
  activeFieldId,
  selectedFieldId,
  showAnnotated,
  showReferences,
  condensedView,
  selectionUpdateMode,
  hasSubGroups = true,
  onSelectField,
  onFieldUpdate,
  onReferenceClick,
  onFieldActivate,
  onFieldSelect,
  onViewHistory,
  onSelectionUpdateModeChange,
  onBusinessCheckClick,
  getBusinessCheckForField,
  onEditField,
}: GroupTableViewProps) {
  // Get all field names (columns) from first subgroup
  const firstSubGroup = Object.values(subGroups)[0] || []
  
  // Get all subgroup names (rows/instances)
  const subGroupNames = Object.keys(subGroups).sort()
  
  // Track column widths and resizing
  // Default width based on showReferences state
  const getDefaultColumnWidth = () => (showReferences ? 300 : 200)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)
  
  // Update column widths when showReferences changes
  useEffect(() => {
    const defaultWidth = getDefaultColumnWidth()
    setColumnWidths((prev) => {
      const updated: Record<string, number> = {}
      for (const field of firstSubGroup) {
        updated[field.name] = prev[field.name] || defaultWidth
      }
      return updated
    })
  }, [showReferences])
  
  const getDataTypeIcon = (field: ExtractedField) => {
    // For string fields that are inferred, show with purple color and star
    if (field.dataType === "string" && field.isInferred) {
      return (
        <div className="relative flex-shrink-0">
          <Type className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <Star className="h-2 w-2 text-purple-600 dark:text-purple-400 absolute -top-0.5 -right-0.5 fill-purple-600 dark:fill-purple-400" />
        </div>
      )
    }
    
    switch (field.dataType) {
      case "string":
        return <Type className="h-3.5 w-3.5 text-muted-foreground" />
      case "number":
        return <Hash className="h-3.5 w-3.5 text-muted-foreground" />
      case "date":
        return <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
      default:
        return <Type className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }
  
  // Check if any field with this name has a validation status defined
  const hasBusinessCheck = (fieldName: string): boolean => {
    for (const fields of Object.values(subGroups)) {
      const field = fields.find(f => f.name === fieldName)
      if (field?.validationStatus) {
        return true
      }
    }
    return false
  }
  
  // Get the validation status for a field name
  const getFieldValidationStatus = (fieldName: string): "pass" | "fail" | undefined => {
    for (const fields of Object.values(subGroups)) {
      const field = fields.find(f => f.name === fieldName)
      if (field?.validationStatus) {
        return field.validationStatus
      }
    }
    return undefined
  }
  
  const handleResizeStart = (e: React.MouseEvent, fieldName: string) => {
    e.preventDefault()
    setResizingColumn(fieldName)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = columnWidths[fieldName] || 200
  }
  
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return
    const delta = e.clientX - resizeStartX.current
    const newWidth = Math.max(150, resizeStartWidth.current + delta)
    setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }))
  }, [resizingColumn])
  
  const handleResizeEnd = useCallback(() => {
    setResizingColumn(null)
  }, [])
  
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    
    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [resizingColumn, handleResizeMove, handleResizeEnd])
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted/30">
            <th className="border border-border p-2 text-left font-medium text-muted-foreground sticky left-0 bg-muted/30 z-10 w-16 min-w-16">
              Instance
            </th>
            {firstSubGroup.map((field) => {
              const fieldHasBusinessCheck = hasBusinessCheck(field.name)
              const width = columnWidths[field.name] || getDefaultColumnWidth()
              
              return (
                <th 
                  key={field.name} 
                  className="border border-border p-2 text-left relative select-none"
                  style={{ width: `${width}px`, minWidth: `${width}px` }}
                >
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-shrink-0">{getDataTypeIcon(field)}</div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {field.dataType === "string" && !field.isInferred && "Text field"}
                        {field.dataType === "string" && field.isInferred && "Text field (AI-inferred from context)"}
                        {field.dataType === "number" && "Numeric field"}
                        {field.dataType === "date" && "Date field"}
                      </TooltipContent>
                    </Tooltip>
<FieldDetailsPopover
  field={field}
  businessCheck={getBusinessCheckForField?.(field.id) || null}
  onEditField={() => onEditField?.(field.id)}
  onViewBusinessCheck={() => onBusinessCheckClick?.(field.id)}
  >
  <span className="font-semibold text-foreground hover:text-primary transition-colors cursor-help">{field.name}</span>
</FieldDetailsPopover>
                    {fieldHasBusinessCheck && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center">
                            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Business check enabled for this field
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  {/* Resize handle */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-20 transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, field.name)}
                  />
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {subGroupNames.map((subGroupName) => {
            const fields = subGroups[subGroupName] || []
            
            return (
              <tr key={subGroupName} className="hover:bg-accent/30">
                <td className="border border-border p-2 font-medium text-muted-foreground sticky left-0 bg-background z-10">
                  {subGroupName}
                </td>
                {fields.map((field) => {
                  const width = columnWidths[field.name] || getDefaultColumnWidth()
                  const fieldHasBusinessCheck = hasBusinessCheck(field.name)
                  return (
                    <td 
                      key={field.id} 
                      className="border border-border p-0"
                      style={{ width: `${width}px`, minWidth: `${width}px` }}
                    >
                      <FieldRow
                        field={field}
                        isSelected={selectedFields.includes(field.id)}
                        isActive={activeFieldId === field.id}
                        isFieldSelected={selectedFieldId === field.id}
                        showAnnotated={showAnnotated}
                        showReferences={showReferences}
                        condensedView={condensedView}
                        inTableView={true}
                        showBusinessCheck={fieldHasBusinessCheck}
                        selectionUpdateMode={selectionUpdateMode}
                        onSelect={() => onSelectField(field.id)}
                        onUpdate={(updates) => onFieldUpdate(field.id, updates)}
                        onReferenceClick={onReferenceClick}
                        onActivate={() => onFieldActivate(field.id)}
                        onDeactivate={() => onFieldActivate(null)}
                        onFieldSelect={() => onFieldSelect(field.id)}
                        onFieldDeselect={() => onFieldSelect(null)}
                        onViewHistory={() => onViewHistory(field)}
                        onSelectionUpdateModeChange={onSelectionUpdateModeChange}
                        onBusinessCheckClick={onBusinessCheckClick}
                        businessCheck={getBusinessCheckForField?.(field.id) || null}
                        onEditField={onEditField}
                      />
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface FieldRowProps {
  field: ExtractedField
  isSelected: boolean
  isActive: boolean
  isFieldSelected: boolean
  showAnnotated: boolean
  showReferences: boolean
  condensedView: boolean
  inTableView?: boolean
  showBusinessCheck?: boolean
  selectionUpdateMode: SelectionUpdateMode
  businessCheck?: BusinessCheck | null
  onSelect: () => void
  onUpdate: (updates: Partial<ExtractedField>) => void
  onReferenceClick: (reference: HighlightReference, fieldId?: string) => void
  onActivate: () => void
  onDeactivate: () => void
  onFieldSelect: () => void
  onFieldDeselect: () => void
  onViewHistory: () => void
  onSelectionUpdateModeChange: (mode: SelectionUpdateMode) => void
  onBusinessCheckClick?: (fieldId: string) => void
  onEditField?: (fieldId: string) => void
}

function FieldRow({
  field,
  isSelected,
  isActive,
  isFieldSelected,
  showAnnotated,
  showReferences,
  condensedView,
  inTableView = false,
  showBusinessCheck = false,
  selectionUpdateMode,
  businessCheck,
  onSelect,
  onUpdate,
  onReferenceClick,
  onActivate,
  onDeactivate,
  onFieldSelect,
  onFieldDeselect,
  onViewHistory,
  onSelectionUpdateModeChange,
  onBusinessCheckClick,
  onEditField,
}: FieldRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showInitialReference, setShowInitialReference] = useState(false)
  const [showReferenceHover, setShowReferenceHover] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [showReferencePopover, setShowReferencePopover] = useState(false)
  const [showValueUpdateIcon, setShowValueUpdateIcon] = useState(false)
  const [isRowHovered, setIsRowHovered] = useState(false)
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMarkFieldMissing = () => {
    onUpdate({ 
      value: "",
      isMissing: true,
      isModified: true,
      editType: "manual",
    })
  }

  const handleMarkReferenceMissing = () => {
    onUpdate({ 
      isReferenceMissing: true,
    })
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  const handleValueChange = (newValue: string) => {
    onUpdate({ value: newValue, editType: "manual" })
  }

  const handleResetToInitial = () => {
    onUpdate({
      value: field.initialPrediction,
      reference: field.initialReference,
      isModified: false,
      editType: undefined,
      referenceOnlyUpdate: false,
    })
  }

  const handleResetReferenceToInitial = () => {
    onUpdate({
      reference: field.initialReference,
      referenceOnlyUpdate: false,
    })
  }

  const valuesDifferFromPrediction = field.value !== field.initialPrediction
  const valuesDifferFromReference = field.value !== field.reference.text
  const showWarning = field.isModified && valuesDifferFromPrediction
  const editTypeLabel =
    field.editType === "manual"
      ? "Manually Edited"
      : field.editType === "selection" && !field.referenceOnlyUpdate
        ? "Text Selected"
        : null

  const getDataTypeIcon = () => {
    // For string fields that are inferred, show with purple color and star
    if (field.dataType === "string" && field.isInferred) {
      return (
        <div className="relative flex-shrink-0">
          <Type className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <Star className="h-2 w-2 text-purple-600 dark:text-purple-400 absolute -top-0.5 -right-0.5 fill-purple-600 dark:fill-purple-400" />
        </div>
      )
    }
    
    switch (field.dataType) {
      case "string":
        return <Type className="h-3.5 w-3.5 text-muted-foreground" />
      case "number":
        return <Hash className="h-3.5 w-3.5 text-muted-foreground" />
      case "date":
        return <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
      default:
        return <Type className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  const hasWarning = (field.isModified && field.value !== field.initialPrediction) || field.isMissing
  const displayValue = field.isMissing ? "" : field.value
  const displayPlaceholder = field.isMissing ? "Field marked as missing" : "Enter value..."

  return (
    <div
      data-field-id={field.id}
      className={cn(
        "relative flex gap-3 px-4 py-3 cursor-pointer transition-colors",
        isSelected && "bg-accent/50",
        isActive && "bg-blue-500/10",
        field.isAnnotated && "opacity-75",
        !isSelected && !isActive && "hover:bg-muted/40",
      )}
      onMouseEnter={() => { onFieldSelect(); setIsRowHovered(true) }}
      onMouseLeave={() => { onFieldDeselect(); setIsRowHovered(false) }}
      onClick={() => {
        // Trigger connection line for all view modes
        onReferenceClick(field.reference, field.id)
      }}
    >
      {/* Checkbox first */}
      <Checkbox checked={isSelected} onCheckedChange={onSelect} className="mt-0.5" />

      {/* Content with vertical color line */}
      <div className="flex flex-1 gap-3 min-w-0">
        {/* Color indicator as vertical line after checkbox, aligned with content */}
        <div className="w-1 flex-shrink-0 my-1" style={{ backgroundColor: field.color }} />

      {/* More actions dropdown - visible on hover or when menu is open */}
      {(isRowHovered || isActionsMenuOpen) && (
        <div className="absolute right-2 top-2 z-20">
          <DropdownMenu open={isActionsMenuOpen} onOpenChange={setIsActionsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 bg-background/90 hover:bg-accent shadow-sm border border-border/50" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="text-xs gap-2" onClick={(e) => { e.stopPropagation(); onEditField?.(field.id); setIsActionsMenuOpen(false) }}>
                <Pencil className="h-3 w-3" />
                Edit Field
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onClick={(e) => { e.stopPropagation(); handleMarkFieldMissing(); setIsActionsMenuOpen(false) }}>
                <FileX className="h-3 w-3" />
                Mark Field as Missing
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onClick={(e) => { e.stopPropagation(); handleMarkReferenceMissing(); setIsActionsMenuOpen(false) }}>
                <Unlink className="h-3 w-3" />
                Mark Reference as Missing
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

        <div className="flex-1 min-w-0">
          {/* Table View: Simplified layout without field name */}
          {inTableView ? (
            <div 
              className="p-2 cursor-pointer"
              onClick={() => {
                // Trigger connection when clicking table cell
                onReferenceClick(field.reference, field.id)
              }}
            >
              <div className="flex items-center gap-2">
                {/* Value field with expandable textarea */}
                <div 
                  className="relative flex-1 min-w-0"
                  onMouseEnter={() => {
                    setShowValueUpdateIcon(true)
                    if (!showReferences) {
                      if (hideTimeoutRef.current) {
                        clearTimeout(hideTimeoutRef.current)
                        hideTimeoutRef.current = null
                      }
                      setShowReferencePopover(true)
                    }
                  }}
                  onMouseLeave={() => {
                    setShowValueUpdateIcon(false)
                    if (!showReferences) {
                      hideTimeoutRef.current = setTimeout(() => {
                        setShowReferencePopover(false)
                      }, 200)
                    }
                  }}
                >
                  {showValueUpdateIcon && !isActive && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-1 top-1 h-5 w-5 z-30 bg-background/95 hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectionUpdateModeChange("both")
                            onActivate()
                          }}
                        >
                          <MousePointerClick className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Select text from document to update value and reference
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {isInputFocused ? (
                    <textarea
                      value={field.value}
                      onChange={(e) => handleValueChange(e.target.value)}
                      onBlur={() => setIsInputFocused(false)}
                      className="w-full px-2 py-1 text-xs border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      placeholder={displayPlaceholder}
                      rows={3}
                      autoFocus
                      style={{
                        paddingRight: editTypeLabel ? "130px" : "8px",
                        paddingLeft: showValueUpdateIcon ? "32px" : "8px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => handleValueChange(e.target.value)}
                      onFocus={() => {
                        // Check if text is overflowing
                        const inputEl = document.activeElement as HTMLInputElement
                        if (inputEl && inputEl.scrollWidth > inputEl.clientWidth) {
                          setIsInputFocused(true)
                        }
                      }}
                      className="w-full px-2 py-1 text-xs border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder={displayPlaceholder}
                      style={{
                        paddingRight: editTypeLabel ? "130px" : "8px",
                        paddingLeft: showValueUpdateIcon ? "32px" : "8px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {editTypeLabel && (
                    <Badge
                      variant="outline"
                      className="absolute right-1.5 top-1 text-[10px] px-1.5 py-0 h-4 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-500/30 pointer-events-none z-20"
                    >
                      {editTypeLabel}
                    </Badge>
                  )}
                  
                  {/* Popover for table view when references are hidden */}
                  {!showReferences && showReferencePopover && (
                    <div 
                      className="absolute z-30 left-0 top-full mt-2 p-2 rounded border border-border bg-popover shadow-lg min-w-[200px]"
                      onMouseEnter={() => {
                        if (hideTimeoutRef.current) {
                          clearTimeout(hideTimeoutRef.current)
                          hideTimeoutRef.current = null
                        }
                        setShowReferencePopover(true)
                      }}
                      onMouseLeave={() => {
                        setShowReferencePopover(false)
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Reference:</span>
                        {field.referenceOnlyUpdate && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-500/30">
                              Updated
                            </Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Revert to initial reference
                                    onUpdate({
                                      reference: field.initialReference,
                                      referenceOnlyUpdate: false,
                                    })
                                  }}
                                >
                                  <RotateCcw className="h-2.5 w-2.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Revert to original reference
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onReferenceClick(field.reference, field.id)
                          }}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline text-left break-all flex-1"
                        >
                          {field.reference.text}
                        </button>
                        {!isActive && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectionUpdateModeChange("reference-only")
                                  onActivate()
                                }}
                              >
                                <MousePointerClick className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Select text from document to update reference only
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1">
                        Page {field.reference.page}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Business check and actions on same row */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(showBusinessCheck || field.validationStatus) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onBusinessCheckClick?.(field.id)
                          }}
                          className="flex items-center hover:bg-muted rounded p-0.5 transition-colors cursor-pointer"
                        >
                          {field.validationStatus === "pass" ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : field.validationStatus === "fail" ? (
                            <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          ) : (
                            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {field.validationStatus === "pass" && "Business check: Passed - Click to view details"}
                        {field.validationStatus === "fail" && "Business check: Failed - Click to view details"}
                        {!field.validationStatus && "Business check: Not evaluated"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {field.isAnnotated && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    >
                      annotated
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-4 w-4">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="text-xs">
                        <Copy className="h-3 w-3 mr-2" />
                        Copy Value
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs" onClick={onViewHistory}>
                        <Eye className="h-3 w-3 mr-2" />
                        View History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs text-destructive">
                        <Trash2 className="h-3 w-3 mr-2" />
                        Clear Field
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Show reference row if references are visible */}
              {showReferences && (
                <div 
                  className="mt-1 flex items-center gap-1.5"
                  onMouseEnter={() => setShowReferenceHover(true)}
                  onMouseLeave={() => setShowReferenceHover(false)}
                >
                  <span className="text-[10px] text-muted-foreground">Reference:</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onReferenceClick(field.reference, field.id)
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[240px]"
                    title={field.reference.text}
                  >
                    {field.reference.text}
                  </button>
                  {showReferenceHover && !isActive && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectionUpdateModeChange("reference-only")
                            onActivate()
                          }}
                        >
                          <MousePointerClick className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Select text from document to update reference only
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
              
              {/* Warning component for table view */}
              {hasWarning && (
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-500/30 rounded p-1.5 flex items-center justify-between gap-2 mt-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-xs">
                        {field.isMissing
                          ? `Field marked as missing. Initial prediction: ${field.initialPrediction}`
                          : field.editType === "manual"
                          ? `Value differs from prediction (${field.prediction}) and reference (${field.reference.text})`
                          : `Value differs from prediction (${field.prediction})`}
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">Prediction:</span>
                    <Popover open={showInitialReference} onOpenChange={setShowInitialReference}>
                      <PopoverTrigger asChild>
                        <button className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline truncate text-left">
                          {field.prediction}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-64 p-2">
                        <div className="text-[10px] text-muted-foreground mb-1">Initial Reference:</div>
                        <button
                          onClick={() => onReferenceClick(field.initialReference)}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline text-left break-all"
                        >
                          {field.initialReference.text}
                        </button>
                        <div className="text-[9px] text-muted-foreground mt-1">Page {field.initialReference.page}</div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={handleResetToInitial}>
                          <RotateCcw className="h-2.5 w-2.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Reset to initial state
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4">
                          <Settings2 className="h-2.5 w-2.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Edit schema definitions and field instructions
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          ) : !showReferences && condensedView ? (
            /* Condensed View: Field name and value on same row */
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {/* Fixed width field name section */}
                <div className="flex items-center gap-2 w-48 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-shrink-0">{getDataTypeIcon()}</div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {field.dataType === "string" && !field.isInferred && "Text field"}
                      {field.dataType === "string" && field.isInferred && "Text field (AI-inferred from context)"}
                      {field.dataType === "number" && "Numeric field"}
                      {field.dataType === "date" && "Date field"}
                    </TooltipContent>
                  </Tooltip>
<FieldDetailsPopover
  field={field}
  businessCheck={businessCheck}
  onEditField={() => onEditField?.(field.id)}
  onViewBusinessCheck={() => onBusinessCheckClick?.(field.id)}
  >
  <span className="text-xs font-medium truncate hover:text-primary transition-colors">{field.name}</span>
</FieldDetailsPopover>
                  {field.validationStatus && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onBusinessCheckClick?.(field.id)
                          }}
                          className="flex items-center hover:bg-muted rounded p-0.5 transition-colors cursor-pointer"
                        >
                          {field.validationStatus === "pass" ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Business check: {field.validationStatus === "pass" ? "Passed" : "Failed"} - Click to view details
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {field.isAnnotated && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    >
                      annotated
                    </Badge>
                  )}
                </div>
                
                {/* Value field inline */}
                <div 
                  className="relative flex-1 min-w-0"
                  onMouseEnter={() => {
                    // Clear any pending hide timeout
                    if (hideTimeoutRef.current) {
                      clearTimeout(hideTimeoutRef.current)
                      hideTimeoutRef.current = null
                    }
                    setShowReferencePopover(true)
                    setShowValueUpdateIcon(true)
                  }}
                  onMouseLeave={() => {
                    // Delay hiding to allow user to move to popover
                    hideTimeoutRef.current = setTimeout(() => {
                      setShowReferencePopover(false)
                      setShowValueUpdateIcon(false)
                    }, 200)
                  }}
                >
                  {showValueUpdateIcon && !isActive && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-1 top-1 h-5 w-5 z-30 bg-background/95 hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectionUpdateModeChange("both")
                            onActivate()
                          }}
                        >
                          <MousePointerClick className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Select text from document to update value and reference
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={displayPlaceholder}
                    style={{
                      paddingRight: editTypeLabel ? "130px" : "8px",
                      paddingLeft: showValueUpdateIcon ? "32px" : "8px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {editTypeLabel && (
                    <Badge
                      variant="outline"
                      className="absolute right-1.5 top-1 text-[10px] px-1.5 py-0 h-4 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-500/30 pointer-events-none z-20"
                    >
                      {editTypeLabel}
                    </Badge>
                  )}
                  
                  {/* Popover for condensed view */}
                  {showReferencePopover && (
                    <div 
                      className="absolute z-30 left-0 top-full mt-2 p-2 rounded border border-border bg-popover shadow-lg min-w-[200px]"
                      onMouseEnter={() => {
                        if (hideTimeoutRef.current) {
                          clearTimeout(hideTimeoutRef.current)
                          hideTimeoutRef.current = null
                        }
                        setShowReferencePopover(true)
                        setShowValueUpdateIcon(true)
                      }}
                      onMouseLeave={() => {
                        setShowReferencePopover(false)
                        setShowValueUpdateIcon(false)
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Reference:</span>
                        {field.referenceOnlyUpdate && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-500/30">
                              Updated
                            </Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onUpdate({
                                      reference: field.initialReference,
                                      referenceOnlyUpdate: false,
                                    })
                                  }}
                                >
                                  <RotateCcw className="h-2.5 w-2.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Revert to original reference
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {field.isReferenceMissing ? (
                          <span className="text-[10px] text-muted-foreground italic flex-1">Reference missing</span>
                        ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onReferenceClick(field.reference, field.id)
                          }}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline text-left break-all flex-1"
                        >
                          {field.reference.text}
                        </button>
                        )}
                        {!isActive && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectionUpdateModeChange("reference-only")
                                  onActivate()
                                }}
                              >
                                <MousePointerClick className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {field.isReferenceMissing ? "Select text from document to set reference" : "Select text from document to update reference only"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {!field.isReferenceMissing && (
                      <div className="text-[9px] text-muted-foreground mt-1">
                        Page {field.reference.page}
                      </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* More menu for condensed view */}
                <div className="flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-4 w-4">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="text-xs">
                        <Copy className="h-3 w-3 mr-2" />
                        Copy Value
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs" onClick={onViewHistory}>
                        <Eye className="h-3 w-3 mr-2" />
                        View History
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs text-destructive">
                        <Trash2 className="h-3 w-3 mr-2" />
                        Clear Field
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Warning component for condensed view */}
              {hasWarning && (
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-500/30 rounded p-1.5 flex items-center justify-between gap-2 ml-48">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-xs">
                        {field.isMissing
                          ? `Field marked as missing. Initial prediction: ${field.initialPrediction}`
                          : field.editType === "manual"
                          ? `Value differs from prediction (${field.prediction}) and reference (${field.reference.text})`
                          : `Value differs from prediction (${field.prediction})`}
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">Prediction:</span>
                    <Popover open={showInitialReference} onOpenChange={setShowInitialReference}>
                      <PopoverTrigger asChild>
                        <button className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline truncate text-left">
                          {field.prediction}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-64 p-2">
                        <div className="text-[10px] text-muted-foreground mb-1">Initial Reference:</div>
                        <button
                          onClick={() => onReferenceClick(field.initialReference)}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline text-left break-all"
                        >
                          {field.initialReference.text}
                        </button>
                        <div className="text-[9px] text-muted-foreground mt-1">
                          Page {field.initialReference.page}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={handleResetToInitial}>
                          <RotateCcw className="h-2.5 w-2.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Reset to initial state
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4">
                          <Settings2 className="h-2.5 w-2.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Edit schema definitions and field instructions
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Default View: Field name and value stacked
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-shrink-0">{getDataTypeIcon()}</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {field.dataType === "string" && !field.isInferred && "Text field"}
                    {field.dataType === "string" && field.isInferred && "Text field (AI-inferred from context)"}
                    {field.dataType === "number" && "Numeric field"}
                    {field.dataType === "date" && "Date field"}
                  </TooltipContent>
                </Tooltip>
<FieldDetailsPopover
  field={field}
  businessCheck={businessCheck}
  onEditField={() => onEditField?.(field.id)}
  onViewBusinessCheck={() => onBusinessCheckClick?.(field.id)}
  >
  <span className="text-xs font-medium hover:text-primary transition-colors">{field.name}</span>
</FieldDetailsPopover>
                {field.validationStatus && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onBusinessCheckClick?.(field.id)
                        }}
                        className="flex items-center hover:bg-muted rounded p-0.5 transition-colors cursor-pointer"
                      >
                        {field.validationStatus === "pass" ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Business check: {field.validationStatus === "pass" ? "Passed" : "Failed"} - Click to view details
                    </TooltipContent>
                  </Tooltip>
                )}
                {field.isAnnotated && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                  >
                    annotated
                  </Badge>
                )}
                {/* Only show select icon when references are visible */}
                {showReferences && (
                  <div className="ml-auto flex items-center gap-1">
                    {!isActive ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => {
                              onSelectionUpdateModeChange("both")
                              onActivate()
                            }}
                          >
                            <MousePointerClick className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Select text from document to update value and reference
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 text-blue-600" onClick={onDeactivate}>
                            <MousePointerClick className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Cancel selection mode
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {/* More menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="text-xs">
                          <Copy className="h-3 w-3 mr-2" />
                          Copy Value
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs" onClick={onViewHistory}>
                          <Eye className="h-3 w-3 mr-2" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs text-destructive">
                          <Trash2 className="h-3 w-3 mr-2" />
                          Clear Field
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>

              <div 
                className="relative mb-2"
                onMouseEnter={() => {
                  if (!showReferences) {
                    // Clear any pending hide timeout
                    if (hideTimeoutRef.current) {
                      clearTimeout(hideTimeoutRef.current)
                      hideTimeoutRef.current = null
                    }
                    setShowReferencePopover(true)
                    setShowValueUpdateIcon(true)
                  }
                }}
                onMouseLeave={() => {
                  if (!showReferences) {
                    // Delay hiding to allow user to move to popover
                    hideTimeoutRef.current = setTimeout(() => {
                      setShowReferencePopover(false)
                      setShowValueUpdateIcon(false)
                    }, 200)
                  }
                }}
              >
                {/* Icon to update value and reference on hover - hidden references mode */}
                {!showReferences && showValueUpdateIcon && !isActive && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-1 top-1 h-5 w-5 z-30 bg-background/95 hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectionUpdateModeChange("both")
                          onActivate()
                        }}
                      >
                        <MousePointerClick className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Select text from document to update value and reference
                    </TooltipContent>
                  </Tooltip>
                )}
                
                <textarea
                  value={field.value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  rows={isInputFocused ? Math.min(Math.ceil(field.value.length / 50), 6) : 1}
                  className={`w-full px-2 py-1.5 text-xs border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none transition-all ${
                    isInputFocused ? "overflow-y-auto" : "whitespace-nowrap overflow-hidden text-ellipsis"
                  }`}
                  placeholder={displayPlaceholder}
                  style={{
                    minHeight: isInputFocused ? "auto" : "30px",
                    paddingRight: editTypeLabel ? "130px" : "8px",
                    paddingLeft: !showReferences && showValueUpdateIcon ? "32px" : "8px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {editTypeLabel && (
                  <Badge
                    variant="outline"
                    className="absolute right-1.5 top-1.5 text-[10px] px-1.5 py-0 h-4 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-500/30 pointer-events-none z-20"
                  >
                    {editTypeLabel}
                  </Badge>
                )}
                
                {/* Popover when references are hidden - moved below field */}
                {!showReferences && showReferencePopover && (
                  <div 
                    className="absolute z-30 left-0 top-full mt-2 p-2 rounded border border-border bg-popover shadow-lg min-w-[200px]"
                    onMouseEnter={() => {
                      // Clear any pending hide timeout when entering popover
                      if (hideTimeoutRef.current) {
                        clearTimeout(hideTimeoutRef.current)
                        hideTimeoutRef.current = null
                      }
                      setShowReferencePopover(true)
                      setShowValueUpdateIcon(true)
                    }}
                    onMouseLeave={() => {
                      // Hide immediately when leaving popover
                      setShowReferencePopover(false)
                      setShowValueUpdateIcon(false)
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Reference:</span>
                      {field.referenceOnlyUpdate && (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-500/30">
                            Updated
                          </Badge>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onUpdate({
                                    reference: field.initialReference,
                                    referenceOnlyUpdate: false,
                                  })
                                }}
                              >
                                <RotateCcw className="h-2.5 w-2.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Revert to original reference
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                      <div className="flex items-center gap-2">
                        {field.isReferenceMissing ? (
                          <span className="text-[10px] text-muted-foreground italic flex-1">Reference missing</span>
                        ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onReferenceClick(field.reference, field.id)
                          }}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline text-left break-all flex-1"
                        >
                          {field.reference.text}
                        </button>
                        )}
                        {!isActive && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectionUpdateModeChange("reference-only")
                                  onActivate()
                                }}
                            >
                              <MousePointerClick className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {field.isReferenceMissing ? "Select text from document to set reference" : "Select text from document to update reference only"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-1">
                      Page {field.reference.page}
                    </div>
                  </div>
                )}
              </div>

              {showReferences && (
                <div
                  className="mb-2 relative flex items-center gap-1.5"
                  onMouseEnter={() => setShowReferenceHover(true)}
                  onMouseLeave={() => setShowReferenceHover(false)}
                >
                  <span className="text-[10px] text-muted-foreground">Reference:</span>
                  {field.isReferenceMissing ? (
                    <span className="text-[10px] text-muted-foreground italic">Reference missing</span>
                  ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onReferenceClick(field.reference, field.id)
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[240px]"
                    title={field.reference.text}
                  >
                    {field.reference.text}
                  </button>
                  )}
                  {showReferenceHover && !isActive && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-3.5 w-3.5 ml-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectionUpdateModeChange("reference-only")
                            onActivate()
                          }}
                        >
                          <MousePointerClick className="h-2.5 w-2.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {field.isReferenceMissing ? "Select text from document to set reference" : "Select text from document to update reference only"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {field.referenceOnlyUpdate && (
                    <div className="ml-auto flex items-center gap-1">
                      <span className="text-[10px] px-1.5 py-0 italic text-gray-600 dark:text-gray-400">
                        updated from doc
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-3.5 w-3.5" onClick={(e) => {
                            e.stopPropagation()
                            handleResetReferenceToInitial()
                          }}>
                            <RotateCcw className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Reset to initial reference
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              )}

              {showWarning && (
                <div className="mt-2 p-1.5 rounded border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[220px]">
                        Value differs from original prediction. Consider refining schema or instructions.
                      </TooltipContent>
                    </Tooltip>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground">Prediction:</span>
                      <div className="relative">
                        <code
                          className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/80"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowInitialReference(!showInitialReference)
                          }}
                        >
                          {field.initialPrediction}
                        </code>
                        {showInitialReference && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowInitialReference(false)} />
                            <div className="absolute z-20 left-0 top-full mt-1 p-2 rounded border border-border bg-popover shadow-lg min-w-[200px]">
                              <div className="text-[10px] text-muted-foreground mb-1">Initial Reference:</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onReferenceClick(field.initialReference)
                                  setShowInitialReference(false)
                                }}
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline text-left break-all"
                              >
                                {field.initialReference.text}
                              </button>
                              <div className="text-[9px] text-muted-foreground mt-1">
                                Page {field.initialReference.page}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 ml-auto">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleResetToInitial}>
                            <RotateCcw className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Reset to prediction
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <Settings2 className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Edit schema definitions and field instructions
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
