"use client"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Search,
  FileText,
  Filter,
  MoreHorizontal,
  RotateCcw,
  X,
  Download,
  Trash2,
  ArrowUpDown,
  ArrowDown,
  ChevronRight,
  Type,
  Hash,
  CalendarDays,
  LayoutGrid,
} from "lucide-react"
import React, { useState, useMemo, useCallback } from "react"
import type { Document, ExtractedField } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const MORE_METRICS = [
  { value: "f1-score",                    label: "F1 score (%)" },
  { value: "precision",                   label: "Precision (%)" },
  { value: "recall",                      label: "Recall (%)" },
  { value: "doc-error-rate",              label: "Doc error rate (%)" },
  { value: "doc-error-rate-excl-missing", label: "Doc error rate excl. missing (%)" },
  { value: "total-errors",                label: "Total errors" },
  { value: "total-predictions",           label: "Total predictions" },
  { value: "incorrect-values",            label: "Incorrect values (Errors)" },
  { value: "missed-predictions",          label: "Missed predictions (Errors)" },
  { value: "extra-predictions",           label: "Extra predictions (Errors)" },
  { value: "correct-values",              label: "Correct values" },
  { value: "correct-missing",             label: "Correct missing" },
  { value: "total-annotations",           label: "Total annotations" },
  { value: "annotated-values",            label: "Annotated values" },
  { value: "annotated-as-missing",        label: "Annotated as missing" },
  { value: "num-pages-with-error",        label: "Num of pages with error" },
  { value: "status",                      label: "Status" },
] as const

function getBandLabel(doc: Document, field: string): string {
  switch (field) {
    case "status":
      switch (doc.status) {
        case "new":               return "Not started"
        case "in-progress":       return "In progress"
        case "annotated":         return "Annotated"
        case "annotated-editing": return "Annotated (editing)"
        default:                  return doc.status
      }
    case "name": {
      const first = doc.name[0]?.toUpperCase() ?? "#"
      return /[A-Z]/.test(first) ? first : "#"
    }
    case "uploaded-date": {
      if (!doc.lastEdited) return "No date"
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const d = new Date(doc.lastEdited); d.setHours(0, 0, 0, 0)
      const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
      if (diff === 0) return "Today"
      if (diff === 1) return "Yesterday"
      if (diff < 7)  return "This week"
      if (diff < 30) return "This month"
      return "Earlier"
    }
    case "error-rate":
    case "doc-error-rate":
    case "doc-error-rate-excl-missing":
    case "total-error": {
      const rate = doc.errorRate ?? 0
      if (rate === 0)  return "No errors"
      if (rate <= 10)  return "Low (1–10%)"
      if (rate <= 25)  return "Medium (11–25%)"
      return "High (>25%)"
    }
    default:
      return ""
  }
}

interface DocumentBrowserProps {
  documents: Document[]
  selectedDocumentId: string
  onDocumentSelect: (id: string) => void
  onResetDocument?: (docId: string) => void
  onUpdateDocument?: (docId: string, updates: Partial<Document>) => void
  extractedFields?: ExtractedField[]
}

export function DocumentBrowser({
  documents,
  selectedDocumentId,
  onDocumentSelect,
  onResetDocument,
  extractedFields = [],
}: DocumentBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)

  // Status filter — multi-select
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set())

  // Tags filter — multi-select + Any/All mode + search + empty option
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set())
  const [filterTagEmpty, setFilterTagEmpty] = useState(false)
  const [tagContainsMode, setTagContainsMode] = useState<"any" | "all">("any")
  const [tagSearch, setTagSearch] = useState("")
  const [statusFlyoutOpen, setStatusFlyoutOpen] = useState(false)
  const [tagsFlyoutOpen, setTagsFlyoutOpen] = useState(false)

  // Sort state — field + direction
  const [sortOpen, setSortOpen] = useState(false)
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [sortSearch, setSortSearch] = useState("")
  const [moreMetricsOpen, setMoreMetricsOpen] = useState(false)
  // "all-fields" or a field ID string for individual field scope
  const [sortScope, setSortScope] = useState<string>("all-fields")
  const [sortScopeOpen, setSortScopeOpen] = useState(false)
  const [fieldSearch, setFieldSearch] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null)
  const [menuOpenDocId, setMenuOpenDocId] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    documents.forEach((doc) => doc.tags?.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [documents])

  const visibleTags = useMemo(
    () => (tagSearch ? allTags.filter((t) => t.toLowerCase().includes(tagSearch.toLowerCase())) : allTags),
    [allTags, tagSearch],
  )

  const allTagsSelected = filterTags.size === allTags.length && allTags.length > 0

  const toggleSelectAll = () => {
    if (allTagsSelected) {
      setFilterTags(new Set())
    } else {
      setFilterTags(new Set(allTags))
    }
  }

  const filterDocument = useCallback(
    (doc: Document): boolean => {
      if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (filterStatuses.size > 0 && !filterStatuses.has(doc.status)) return false

      const hasTagFilter = filterTags.size > 0 || filterTagEmpty
      if (hasTagFilter) {
        const docTags = doc.tags ?? []
        const docHasNoTags = docTags.length === 0

        if (filterTagEmpty && docHasNoTags) return true

        if (filterTags.size > 0) {
          if (tagContainsMode === "any") {
            if (!docTags.some((t) => filterTags.has(t))) return false
          } else {
            if (!Array.from(filterTags).every((t) => docTags.includes(t))) return false
          }
        } else if (filterTagEmpty && !docHasNoTags) {
          return false
        }
      }

      return true
    },
    [searchQuery, filterStatuses, filterTags, filterTagEmpty, tagContainsMode],
  )

  const filteredDocuments = useMemo(() => {
    const filtered = documents.filter(filterDocument)
    if (!sortField) return filtered

    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name)
      } else if (sortField === "error-rate" || sortField === "doc-error-rate" || sortField === "doc-error-rate-excl-missing") {
        cmp = (a.errorRate ?? 0) - (b.errorRate ?? 0)
      } else if (sortField === "uploaded-date") {
        cmp = new Date(a.lastEdited ?? 0).getTime() - new Date(b.lastEdited ?? 0).getTime()
      } else if (sortField === "status") {
        const order: Record<string, number> = { new: 0, "in-progress": 1, annotated: 2, "annotated-editing": 3 }
        cmp = (order[a.status] ?? 0) - (order[b.status] ?? 0)
      }
      // remaining metric fields have no mock data — preserve stable order
      return sortDirection === "asc" ? cmp : -cmp
    })
  }, [documents, filterDocument, sortField, sortDirection])

  // Build flat list with optional band-header rows when a sort field is active
  const docItems = useMemo(() => {
    if (!sortField) return filteredDocuments.map((doc) => ({ type: "doc" as const, doc }))
    const result: Array<{ type: "band"; label: string } | { type: "doc"; doc: Document }> = []
    let currentBand = ""
    for (const doc of filteredDocuments) {
      const band = getBandLabel(doc, sortField)
      if (band !== currentBand) {
        currentBand = band
        if (band) result.push({ type: "band", label: band })
      }
      result.push({ type: "doc", doc })
    }
    return result
  }, [filteredDocuments, sortField])

  const activeFilterCount = [filterStatuses.size > 0, filterTags.size > 0 || filterTagEmpty].filter(Boolean).length
  const isSortActive = sortField !== ""

  const clearAllFilters = () => {
    setFilterStatuses(new Set())
    setFilterTags(new Set())
    setFilterTagEmpty(false)
    setTagSearch("")
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "new":
        return { label: "Not started", badgeClassName: "bg-[#f4f5f7] text-[#273139] rounded-full" }
      case "in-progress":
        return { label: "In progress", badgeClassName: "bg-[#e9f1fa] text-[#1665b3] rounded-full" }
      case "annotated":
        return { label: "Annotated", badgeClassName: "bg-[#eeffe5] text-[#038108] rounded-full" }
      case "annotated-editing":
        return { label: "Annotated (editing)", badgeClassName: "bg-[#fff4e5] text-[#b45309] rounded-full" }
      default:
        return { label: status, badgeClassName: "" }
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getSortValue = (doc: Document, field: string): string | null => {
    // When a specific field is scoped, show that field's metric value
    if (sortScope !== "all-fields" && isMetricSort(field)) {
      const v = getFieldHash(sortScope, doc.id)
      const isPercent = ["error-rate", "doc-error-rate", "doc-error-rate-excl-missing",
        "f1-score", "precision", "recall"].includes(field)
      return isPercent ? `${v}%` : `${v}`
    }
    switch (field) {
      case "name":
      case "status":
        return null
      case "uploaded-date":
        return doc.lastEdited ? formatDate(doc.lastEdited) : null
      case "error-rate":
      case "doc-error-rate":
      case "doc-error-rate-excl-missing":
        return doc.errorRate != null ? `${doc.errorRate}%` : null
      case "total-error":
      case "total-errors":
        return doc.errorRate != null ? `${Math.round((doc.errorRate / 100) * doc.pages * 30)}` : null
      case "f1-score":
      case "precision":
      case "recall":
        return doc.errorRate != null ? `${Math.max(0, Math.round(100 - doc.errorRate))}%` : null
      default:
        return null
    }
  }

  const SORT_FIELD_LABELS: Record<string, string> = {
    name: "Name",
    "error-rate": "Error rate",
    "uploaded-date": "Uploaded date",
    "total-error": "Total error",
    ...Object.fromEntries(MORE_METRICS.map((m) => [m.value, m.label])),
  }

  // Metric sort fields support individual field scoping; non-metric ones don't
  const isMetricSort = (field: string) =>
    !["name", "status", "uploaded-date"].includes(field)

  // Derive field groups from extractedFields (unique groups, fields sorted by group order)
  const fieldGroups = useMemo(() => {
    const groupMap = new Map<string, { id: string; name: string; dataType: string }[]>()
    for (const f of extractedFields) {
      if (!groupMap.has(f.group)) groupMap.set(f.group, [])
      groupMap.get(f.group)!.push({ id: f.id, name: f.name, dataType: f.dataType })
    }
    return Array.from(groupMap.entries()).map(([name, fields]) => ({ name, fields }))
  }, [extractedFields])

  // Deterministic mock per-field-per-doc value (0-100 range)
  const getFieldHash = (fieldId: string, docId: string): number => {
    let h = 0
    for (const c of fieldId + ":" + docId) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
    return Math.abs(h) % 100
  }

  const statuses = [
    { value: "new", label: "Not started" },
    { value: "in-progress", label: "In progress" },
    { value: "annotated", label: "Annotated" },
    { value: "annotated-editing", label: "Annotated (editing)" },
  ]

  const toggleStatus = (value: string) => {
    setFilterStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const toggleTag = (tag: string) => {
    setFilterTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Documents</h2>
          <div className="flex items-center gap-1">
            {/* Sort */}
            <Popover open={sortOpen} onOpenChange={setSortOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-7 w-7 relative", isSortActive && "text-primary")}>
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {isSortActive && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      1
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-[302px] p-0 rounded-[3px] shadow-[0px_3px_5px_-1px_rgba(0,0,0,0.2),0px_6px_10px_0px_rgba(0,0,0,0.14),0px_1px_18px_0px_rgba(0,0,0,0.12)] border-0"
              >
                {/* SORT BY header */}
                <div className="px-4 h-8 flex items-center">
                  <span className="text-[12px] font-semibold leading-4 text-[#526069] uppercase tracking-wider">Sort by</span>
                </div>

                {/* Search input */}
                <div className="px-4 py-2">
                  <div className="flex items-center border border-[#526069] rounded-[3px] h-8 px-3 gap-2 bg-white">
                    <Search className="h-3.5 w-3.5 text-[#526069] flex-shrink-0" />
                    <input
                      value={sortSearch}
                      onChange={(e) => setSortSearch(e.target.value)}
                      placeholder="Type to search"
                      className="flex-1 text-[14px] leading-5 text-[#273139] placeholder:text-[#6b7882] bg-transparent outline-none min-w-0"
                    />
                  </div>
                </div>

                {/* Sort field options */}
                {(() => {
                  const fields = [
                    { value: "name", label: "Name" },
                    { value: "error-rate", label: "Error rate" },
                    { value: "uploaded-date", label: "Uploaded date" },
                    { value: "total-error", label: "Total error" },
                  ].filter((f) => !sortSearch || f.label.toLowerCase().includes(sortSearch.toLowerCase()))

                  return fields.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => { setSortField(f.value as typeof sortField); setSortSearch(""); setSortScope("all-fields") }}
                      className="w-full relative h-10 flex items-center px-4 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset"
                    >
                      {sortField === f.value && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#0067df]" />
                      )}
                      <span className={cn("text-[14px] leading-5 text-[#526069]", sortField === f.value && "font-medium")}>
                        {f.label}
                      </span>
                    </button>
                  ))
                })()}

                {/* More metrics — flyout when no search; inline matches when searching */}
                {!sortSearch ? (
                  <Popover open={moreMetricsOpen} onOpenChange={setMoreMetricsOpen}>
                    <PopoverTrigger asChild>
                      <button className="w-full relative h-10 flex items-center justify-between px-4 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset">
                        <span className={cn("text-[14px] leading-5 text-[#526069]", MORE_METRICS.some(m => m.value === sortField) && "font-medium text-[#273139]")}>
                          More metrics
                        </span>
                        <ChevronRight className={cn("h-4 w-4 text-[#526069] transition-transform", moreMetricsOpen && "rotate-90")} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      sideOffset={4}
                      className="w-[280px] p-0 rounded-[3px] shadow-[0px_3px_5px_-1px_rgba(0,0,0,0.2),0px_6px_10px_0px_rgba(0,0,0,0.14),0px_1px_18px_0px_rgba(0,0,0,0.12)] border-0"
                    >
                      <div className="px-4 h-8 flex items-center">
                        <span className="text-[12px] font-semibold leading-4 text-[#526069] uppercase tracking-wider">More metrics</span>
                      </div>
                      <div className="max-h-[360px] overflow-y-auto">
                        {MORE_METRICS.map((m) => (
                          <button
                            key={m.value}
                            onClick={() => { setSortField(m.value); setMoreMetricsOpen(false); setSortOpen(false); setSortScope("all-fields") }}
                            className="w-full relative h-10 flex items-center px-4 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset"
                          >
                            {sortField === m.value && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#0067df]" />}
                            <span className={cn("text-[14px] leading-5 text-[#526069]", sortField === m.value && "font-medium")}>
                              {m.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  // When searching: surface matching more-metrics items inline
                  MORE_METRICS
                    .filter((m) => m.label.toLowerCase().includes(sortSearch.toLowerCase()))
                    .map((m) => (
                      <button
                        key={m.value}
                        onClick={() => { setSortField(m.value); setSortSearch("") }}
                        className="w-full relative h-10 flex items-center px-4 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset"
                      >
                        {sortField === m.value && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#0067df]" />}
                        <span className={cn("text-[14px] leading-5 text-[#526069]", sortField === m.value && "font-medium")}>
                          {m.label}
                        </span>
                      </button>
                    ))
                )}

                {/* Divider */}
                <div className="py-2">
                  <div className="bg-[#cfd8dd] h-px" />
                </div>

                {/* Direction */}
                {[
                  { value: "asc" as const, label: "Oldest on top" },
                  { value: "desc" as const, label: "Newest on top" },
                ].filter((d) => !sortSearch || d.label.toLowerCase().includes(sortSearch.toLowerCase()))
                  .map((d) => (
                    <button
                      key={d.value}
                      onClick={() => { setSortDirection(d.value); setSortSearch("") }}
                      className="w-full relative h-10 flex items-center px-4 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset"
                    >
                      {sortDirection === d.value && sortField && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#0067df]" />
                      )}
                      <span className={cn(
                        "text-[14px] leading-5 text-[#526069]",
                        sortDirection === d.value && sortField && "font-medium",
                      )}>
                        {d.label}
                      </span>
                    </button>
                  ))}
              </PopoverContent>
            </Popover>

            {/* Filter */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-7 w-7 relative", activeFilterCount > 0 && "text-primary")}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-[240px] p-0 rounded-[3px] shadow-[0px_3px_5px_-1px_rgba(0,0,0,0.2),0px_6px_10px_0px_rgba(0,0,0,0.14),0px_1px_18px_0px_rgba(0,0,0,0.12)] border-0"
              >
                {/* Level-1 header */}
                <div className="px-4 h-8 flex items-center">
                  <span className="text-[12px] font-semibold leading-4 text-[#526069] uppercase tracking-wider">Filter by</span>
                </div>

                {/* ── Status row → flyout ── */}
                <Popover open={statusFlyoutOpen} onOpenChange={setStatusFlyoutOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full h-10 flex items-center justify-between px-4 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset">
                      <span className={cn("text-[14px] leading-5 text-[#526069]", filterStatuses.size > 0 && "font-medium text-[#273139]")}>
                        Status
                      </span>
                      <div className="flex items-center gap-1.5">
                        {filterStatuses.size > 0 && (
                          <span className="text-[10px] font-semibold bg-[#f4f5f7] rounded-lg px-2 py-0.5 text-[#273139]">
                            {filterStatuses.size}
                          </span>
                        )}
                        <ChevronRight className={cn("h-4 w-4 text-[#526069] transition-transform", statusFlyoutOpen && "rotate-90")} />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={4}
                    className="w-[240px] p-0 rounded-[3px] shadow-[0px_3px_5px_-1px_rgba(0,0,0,0.2),0px_6px_10px_0px_rgba(0,0,0,0.14),0px_1px_18px_0px_rgba(0,0,0,0.12)] border-0"
                  >
                    <div className="px-4 h-8 flex items-center">
                      <span className="text-[12px] font-semibold leading-4 text-[#526069] uppercase tracking-wider">Status</span>
                    </div>
                    {statuses.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => toggleStatus(s.value)}
                        className="w-full flex items-center gap-2 px-4 h-10 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset"
                      >
                        <Checkbox checked={filterStatuses.has(s.value)} className="h-4 w-4 pointer-events-none rounded-[2px]" />
                        <span className="text-[14px] leading-5 text-[#526069]">{s.label}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* ── Tags row → flyout ── */}
                <Popover open={tagsFlyoutOpen} onOpenChange={(open) => { setTagsFlyoutOpen(open); if (!open) setTagSearch("") }}>
                  <PopoverTrigger asChild>
                    <button className="w-full h-10 flex items-center justify-between px-4 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset">
                      <span className={cn("text-[14px] leading-5 text-[#526069]", (filterTags.size > 0 || filterTagEmpty) && "font-medium text-[#273139]")}>
                        Tags
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(filterTags.size > 0 || filterTagEmpty) && (
                          <span className="text-[10px] font-semibold bg-[#f4f5f7] rounded-lg px-2 py-0.5 text-[#273139]">
                            {filterTags.size + (filterTagEmpty ? 1 : 0)}
                          </span>
                        )}
                        <ChevronRight className={cn("h-4 w-4 text-[#526069] transition-transform", tagsFlyoutOpen && "rotate-90")} />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={4}
                    className="w-[280px] p-0 rounded-[3px] shadow-[0px_3px_5px_-1px_rgba(0,0,0,0.2),0px_6px_10px_0px_rgba(0,0,0,0.14),0px_1px_18px_0px_rgba(0,0,0,0.12)] border-0"
                  >
                    <div className="px-4 h-8 flex items-center">
                      <span className="text-[12px] font-semibold leading-4 text-[#526069] uppercase tracking-wider">Tags</span>
                    </div>

                    {/* Contains toggle */}
                    <div className="flex items-center gap-2.5 px-4 py-2">
                      <span className="text-[11px] font-semibold leading-4 text-[#273139]">Contains</span>
                      <div className="flex items-center bg-[#f4f5f7] rounded-[6px] p-[2px]">
                        <button
                          onClick={() => setTagContainsMode("any")}
                          className={cn(
                            "px-2 py-1 rounded-[4px] text-[11px] font-semibold leading-4 text-[#273139] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df]",
                            tagContainsMode === "any"
                              ? "bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_2px_1px_0px_rgba(0,0,0,0.12)]"
                              : "hover:bg-white/50",
                          )}
                        >
                          Any selected
                        </button>
                        <button
                          onClick={() => setTagContainsMode("all")}
                          className={cn(
                            "px-2 py-1 rounded-[4px] text-[11px] font-semibold leading-4 text-[#273139] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df]",
                            tagContainsMode === "all"
                              ? "bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.2),0px_1px_1px_0px_rgba(0,0,0,0.14),0px_2px_1px_0px_rgba(0,0,0,0.12)]"
                              : "hover:bg-white/50",
                          )}
                        >
                          All selected
                        </button>
                      </div>
                    </div>

                    {/* Tag search */}
                    <div className="px-4 pb-2">
                      <div className="flex items-center border border-[#526069] rounded-[3px] h-8 px-3 gap-2 bg-white">
                        <Search className="h-3.5 w-3.5 text-[#526069] flex-shrink-0" />
                        <input
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          placeholder="Type to search tags"
                          className="flex-1 text-[14px] leading-5 text-[#273139] placeholder:text-[#6b7882] bg-transparent outline-none min-w-0"
                        />
                      </div>
                    </div>

                    {/* Tag list */}
                    <div className="max-h-[240px] overflow-y-auto">
                      <button
                        onClick={() => setFilterTagEmpty(!filterTagEmpty)}
                        className="w-full flex items-center gap-2 px-4 h-10 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset"
                      >
                        <Checkbox checked={filterTagEmpty} className="h-4 w-4 pointer-events-none rounded-[2px]" />
                        <span className="text-[14px] leading-5 italic text-[#526069]">Empty (no tag assigned)</span>
                      </button>
                      <div className="bg-[#cfd8dd] h-px" />
                      {allTags.length > 0 && (
                        <button
                          onClick={toggleSelectAll}
                          className="w-full flex items-center gap-2 px-4 h-10 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset"
                        >
                          <Checkbox checked={allTagsSelected} className="h-4 w-4 pointer-events-none rounded-[2px]" />
                          <span className="text-[14px] font-semibold leading-5 text-[#526069]">Select all</span>
                        </button>
                      )}
                      {visibleTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className="w-full flex items-center gap-2 px-4 h-10 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset"
                        >
                          <Checkbox checked={filterTags.has(tag)} className="h-4 w-4 pointer-events-none rounded-[2px]" />
                          <span className="text-[14px] leading-5 text-[#526069]">{tag}</span>
                        </button>
                      ))}
                      {visibleTags.length === 0 && tagSearch && (
                        <p className="px-4 py-3 text-[13px] text-[#526069]">No tags match "{tagSearch}"</p>
                      )}
                    </div>

                  </PopoverContent>
                </Popover>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* ── Active chips bar (sort + filters) ── */}
      {(isSortActive || activeFilterCount > 0) && (
        <div className="px-3 py-3 border-b border-[#cfd8dd] flex flex-col gap-2">

          {/* Sort chip row */}
          {isSortActive && (
            <div className="flex items-center gap-2">
              {/* Direction indicator */}
              <ArrowDown
                className={cn(
                  "h-4 w-4 text-[#526069] flex-shrink-0 transition-transform",
                  sortDirection === "asc" && "rotate-180",
                )}
              />

              {/* Chip */}
              <div className="flex items-center gap-2 bg-[#cfd8dd] rounded-full px-3 py-[2px]">
                {/* Sort field label */}
                <button
                  onClick={() => setSortOpen(true)}
                  className="text-[12px] font-semibold text-[#273139] underline decoration-solid leading-4 whitespace-nowrap hover:text-[#0067df] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:rounded-sm"
                >
                  {SORT_FIELD_LABELS[sortField] ?? sortField}
                </button>

                {/* Scope label — only shown for metric sorts */}
                {isMetricSort(sortField) && (
                  <span className="text-[12px] font-normal text-[#526069] leading-4">of</span>
                )}
                {isMetricSort(sortField) ? (
              <Popover open={sortScopeOpen} onOpenChange={(open) => {
                setSortScopeOpen(open)
                if (!open) setFieldSearch("")
              }}>
                <PopoverTrigger asChild>
                  <button className="text-[12px] font-semibold text-[#273139] underline decoration-solid leading-4 whitespace-nowrap hover:text-[#0067df] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:rounded-sm">
                    {sortScope === "all-fields"
                      ? "All fields"
                      : (extractedFields.find(f => f.id === sortScope)?.name ?? "Field")}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={8}
                  className="w-[320px] p-0 rounded-[3px] shadow-[0px_3px_5px_-1px_rgba(0,0,0,0.2),0px_6px_10px_0px_rgba(0,0,0,0.14),0px_1px_18px_0px_rgba(0,0,0,0.12)] border-0 overflow-hidden"
                >
                  {/* Title */}
                  <div className="px-4 py-1">
                    <p className="text-[16px] font-semibold leading-6 text-[#273139] whitespace-pre-wrap">
                      Sort against a field metric occurring on documents
                    </p>
                  </div>

                  {/* Search */}
                  <div className="px-4 py-2">
                    <div className="flex items-center border border-[#526069] rounded-[3px] h-8 px-3 gap-2 bg-white">
                      <Search className="h-3.5 w-3.5 text-[#526069] flex-shrink-0" />
                      <input
                        value={fieldSearch}
                        onChange={(e) => setFieldSearch(e.target.value)}
                        placeholder="Type to search field"
                        className="flex-1 text-[14px] leading-5 text-[#273139] placeholder:text-[#6b7882] bg-transparent outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Field list */}
                  <div className="max-h-[360px] overflow-y-auto">
                    {/* All fields option */}
                    {(!fieldSearch || "all fields".includes(fieldSearch.toLowerCase())) && (
                      <button
                        onClick={() => { setSortScope("all-fields"); setSortScopeOpen(false); setFieldSearch("") }}
                        className={cn(
                          "w-full relative h-10 flex items-center px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset",
                          sortScope === "all-fields" ? "bg-[#e9f1fa]" : "hover:bg-accent"
                        )}
                      >
                        {sortScope === "all-fields" && (
                          <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#0067df]" />
                        )}
                        <span className={cn(
                          "text-[14px] leading-5 text-[#273139]",
                          sortScope === "all-fields" && "font-semibold"
                        )}>
                          All fields
                        </span>
                      </button>
                    )}

                    {/* Field groups */}
                    {fieldGroups.map((group) => {
                      const isExpanded = expandedGroups.has(group.name)
                      const visibleFields = fieldSearch
                        ? group.fields.filter(f => f.name.toLowerCase().includes(fieldSearch.toLowerCase()))
                        : (isExpanded ? group.fields : [])
                      const groupMatchesSearch = !fieldSearch ||
                        group.name.toLowerCase().includes(fieldSearch.toLowerCase()) ||
                        group.fields.some(f => f.name.toLowerCase().includes(fieldSearch.toLowerCase()))
                      if (!groupMatchesSearch) return null

                      return (
                        <React.Fragment key={group.name}>
                          {/* Group header row */}
                          <button
                            onClick={() => setExpandedGroups(prev => {
                              const next = new Set(prev)
                              if (next.has(group.name)) next.delete(group.name)
                              else next.add(group.name)
                              return next
                            })}
                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset"
                          >
                            <ChevronRight className={cn(
                              "h-4 w-4 text-[#526069] flex-shrink-0 transition-transform",
                              (isExpanded || !!fieldSearch) && "rotate-90"
                            )} />
                            <LayoutGrid className="h-4 w-4 text-[#526069] flex-shrink-0" />
                            <span className="flex-1 min-w-0 text-[14px] font-semibold leading-5 text-[#273139] truncate">
                              {group.name}
                            </span>
                            <span className="flex-shrink-0 text-[10px] font-semibold leading-4 text-[#273139] bg-[#f4f5f7] rounded-lg px-2 py-0.5">
                              {group.fields.length} fields
                            </span>
                          </button>

                          {/* Field rows (shown when expanded or searching) */}
                          {visibleFields.map((field) => {
                            const DataTypeIcon = field.dataType === "date" ? CalendarDays
                              : field.dataType === "number" ? Hash : Type
                            const isSelected = sortScope === field.id
                            return (
                              <button
                                key={field.id}
                                onClick={() => { setSortScope(field.id); setSortScopeOpen(false); setFieldSearch("") }}
                                className={cn(
                                  "w-full relative flex items-center gap-2 pl-14 pr-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset",
                                  isSelected ? "bg-[#e9f1fa]" : "hover:bg-accent"
                                )}
                              >
                                {isSelected && (
                                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#0067df]" />
                                )}
                                <DataTypeIcon className="h-4 w-4 text-[#526069] flex-shrink-0" />
                                <span className={cn(
                                  "text-[14px] leading-5 text-[#273139]",
                                  isSelected && "font-semibold"
                                )}>
                                  {field.name}
                                </span>
                              </button>
                            )
                          })}
                        </React.Fragment>
                      )
                    })}

                    {fieldGroups.length === 0 && (
                      <p className="px-4 py-3 text-[13px] text-[#526069]">No fields available</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}

                {/* Clear sort */}
                <button
                  onClick={() => { setSortField(""); setSortScope("all-fields") }}
                  className="hover:text-[#273139] text-[#526069] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:rounded-sm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Filter chips — single icon, all chips wrap together */}
          {activeFilterCount > 0 && (
            <div className="flex items-start gap-2">
              <Filter className="h-4 w-4 text-[#526069] flex-shrink-0 mt-[2px]" />
              <div className="flex flex-wrap gap-1.5">

                {filterStatuses.size > 0 && (
                  <div className="flex items-center gap-1.5 bg-[#cfd8dd] rounded-full px-3 py-[2px]">
                    <button
                      onClick={() => setFilterOpen(true)}
                      className="text-[12px] font-semibold text-[#273139] leading-4 hover:text-[#0067df] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:rounded-sm"
                    >
                      {Array.from(filterStatuses).map(s => getStatusInfo(s).label).join(", ")}
                    </button>
                    <button
                      onClick={() => setFilterStatuses(new Set())}
                      className="flex-shrink-0 text-[#526069] hover:text-[#273139] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:rounded-sm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {(filterTags.size > 0 || filterTagEmpty) && (() => {
                  const tagLabels = [...(filterTagEmpty ? ["Empty"] : []), ...Array.from(filterTags)]
                  const display = tagLabels.length > 2
                    ? `${tagLabels.slice(0, 2).join(", ")} +${tagLabels.length - 2} more`
                    : tagLabels.join(", ")
                  return (
                    <div className="flex items-center gap-1.5 bg-[#cfd8dd] rounded-full px-3 py-[2px]">
                      <button
                        onClick={() => setFilterOpen(true)}
                        className="text-[12px] font-semibold text-[#273139] leading-4 hover:text-[#0067df] transition-colors whitespace-nowrap"
                      >
                        {display}
                      </button>
                      <button
                        onClick={() => { setFilterTags(new Set()); setFilterTagEmpty(false) }}
                        className="flex-shrink-0 text-[#526069] hover:text-[#273139] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:rounded-sm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })()}

              </div>
            </div>
          )}

        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {docItems.map((item, idx) => {
          if (item.type === "band") {
            return (
              <div
                key={`band-${item.label}-${idx}`}
                className="px-3 py-[5px] text-[10px] font-semibold text-[#526069] uppercase tracking-wider bg-[#f4f5f7] border-b border-[#cfd8dd] sticky top-0 z-10"
              >
                {item.label}
              </div>
            )
          }

          const doc = item.doc
          const isSelected = selectedDocumentId === doc.id
          const isHovered = hoveredDocId === doc.id
          const isMenuOpen = menuOpenDocId === doc.id
          const showActions = isHovered || isMenuOpen
          const statusInfo = getStatusInfo(doc.status)
          const tagsText =
            doc.tags && doc.tags.length > 0
              ? doc.tags.slice(0, 2).join(", ") + (doc.tags.length > 2 ? `, +${doc.tags.length - 2} more` : "")
              : null

          return (
            <div
              key={doc.id}
              className="relative group"
              onMouseEnter={() => setHoveredDocId(doc.id)}
              onMouseLeave={() => { if (!isMenuOpen) setHoveredDocId(null) }}
            >
              <button
                onClick={() => onDocumentSelect(doc.id)}
                className={cn(
                  "w-full text-left pl-[8px] pr-3 py-2.5 border-b border-border/50 border-l-4 transition-colors",
                  isSelected
                    ? "border-l-[#0067df] bg-[#e9f1fa] hover:bg-[#dde8f5]"
                    : "border-l-transparent hover:bg-accent",
                )}
              >
                {/* Row 1: File icon + name + status badge + more actions */}
                <div className="flex items-center gap-1.5">
                  <div className="flex-shrink-0 flex items-center justify-center w-5 h-5">
                    <FileText className="h-4 w-4 text-[#526069]" />
                  </div>

                  <Tooltip delayDuration={400}>
                    <TooltipTrigger asChild>
                      <p className="text-[12px] font-medium truncate flex-1 min-w-0">{doc.name}</p>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      align="start"
                      className="max-w-[260px] p-0 bg-white text-[#273139] border-[#cfd8dd] shadow-lg"
                      sideOffset={12}
                    >
                      <div className="p-3 space-y-2.5">
                        <p className="text-[13px] font-semibold leading-snug break-words text-[#273139]">{doc.name}</p>
                        <div className="space-y-1.5">
                          {doc.lastEdited && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[10px] text-[#526069]">Last edited</span>
                              <span className="text-[10px] font-medium text-[#273139]">{formatDate(doc.lastEdited)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-[#526069]">Pages</span>
                            <span className="text-[10px] font-medium text-[#273139]">{doc.pages}</span>
                          </div>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-[10px] text-[#526069] mt-0.5">Tags</span>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {doc.tags.map((tag) => (
                                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#f4f5f7] text-[#526069] font-medium">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  <span className={cn("flex-shrink-0 text-[10px] px-1.5 py-0.5 font-semibold whitespace-nowrap", statusInfo.badgeClassName)}>
                    {statusInfo.label}
                  </span>

                  <div
                    className={cn("flex-shrink-0 transition-opacity", showActions ? "opacity-100" : "opacity-0")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu
                      open={isMenuOpen}
                      onOpenChange={(open) => {
                        setMenuOpenDocId(open ? doc.id : null)
                        if (!open) setHoveredDocId(null)
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => {}} className="cursor-pointer text-xs">
                          <Download className="h-3.5 w-3.5 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onResetDocument?.(doc.id)} className="cursor-pointer text-xs">
                          <RotateCcw className="h-3.5 w-3.5 mr-2" />
                          Reset extractions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {}} className="cursor-pointer text-xs text-destructive focus:text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Row 2: Tags + optional sort value right-aligned */}
                {(() => {
                  const sortVal = sortField ? getSortValue(doc, sortField) : null
                  return (
                    <div className="mt-1 pl-[26px] flex items-center gap-2">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        {tagsText ? (
                          <span className="text-[11px] text-[#526069] truncate block">{tagsText}</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">{doc.pages} {doc.pages === 1 ? "page" : "pages"}</span>
                        )}
                      </div>
                      {sortVal != null && (
                        <span className="flex-shrink-0 text-[11px] text-[#526069] leading-4 tabular-nums">{sortVal}</span>
                      )}
                    </div>
                  )
                })()}
              </button>
            </div>
          )
        })}

        {filteredDocuments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-foreground mb-1">No documents found</p>
            <p className="text-[10px] text-muted-foreground mb-3">
              {activeFilterCount > 0 ? "Try adjusting your filters." : "Try a different search."}
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
