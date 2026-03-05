"use client"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  ChevronDown,
  ChevronRight,
  Type,
  Hash,
  CalendarDays,
  LayoutGrid,
  Tag,
  Plus,
  Upload,
  Crosshair,
  Check,
} from "lucide-react"
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react"
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

const MOCK_VERSIONS = [
  { id: "v3.2", label: "v3.2  ·  2 days ago" },
  { id: "v3.1", label: "v3.1  ·  1 week ago" },
  { id: "v3.0", label: "v3.0  ·  3 weeks ago" },
  { id: "v2.9", label: "v2.9  ·  1 month ago" },
]

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
  onBulkDownload?: (docIds: string[]) => void
  onBulkDelete?: (docIds: string[]) => void
  currentVersion?: string
  versions?: { id: string; label: string }[]
  comparisonDocuments?: Document[]
  onDeltaVersionChange?: (versionId: string | null) => void
  onUploadDocuments?: (files: File[]) => void
  extractedFields?: ExtractedField[]
}

export function DocumentBrowser({
  documents,
  selectedDocumentId,
  onDocumentSelect,
  onResetDocument,
  onUpdateDocument,
  onBulkDownload,
  onBulkDelete,
  currentVersion,
  versions,
  comparisonDocuments,
  onDeltaVersionChange,
  onUploadDocuments,
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

  // Multi-select
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())

  // Per-doc tag editor
  const [tagEditorDocId, setTagEditorDocId] = useState<string | null>(null)
  const [tagEditorSearch, setTagEditorSearch] = useState("")
  const [newTagInput, setNewTagInput] = useState("")

  // Bulk tag editor
  const [bulkTagOpen, setBulkTagOpen] = useState(false)
  const [bulkTagSearch, setBulkTagSearch] = useState("")
  const [bulkNewTagInput, setBulkNewTagInput] = useState("")

  // Bulk delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Focus mode — show only a pinned subset of docs
  const [focusedDocIds, setFocusedDocIds] = useState<Set<string>>(new Set())
  const [focusSelectionMode, setFocusSelectionMode] = useState(false)

  // Group by bands when sort is active
  const [groupByEnabled, setGroupByEnabled] = useState(false)

  // Delta comparison
  const [deltaEnabled, setDeltaEnabled] = useState(false)
  const [deltaVersionId, setDeltaVersionId] = useState("")
  const defaultVersionId = (versions ?? MOCK_VERSIONS)[0]?.id ?? ""

  // Auto-enable delta with default version when a metric sort is selected; reset otherwise
  useEffect(() => {
    if (isMetricSort(sortField)) {
      setDeltaEnabled(true)
      setDeltaVersionId(defaultVersionId)
      onDeltaVersionChange?.(defaultVersionId || null)
    } else {
      setDeltaEnabled(false)
      setDeltaVersionId("")
      onDeltaVersionChange?.(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField])

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
    if (!sortField) return [...filtered].sort((a, b) =>
      new Date(b.lastEdited ?? 0).getTime() - new Date(a.lastEdited ?? 0).getTime()
    )

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

  // Apply focus filter on top of search/status/tag filters
  const visibleDocuments = useMemo(() =>
    focusedDocIds.size > 0
      ? filteredDocuments.filter((doc) => focusedDocIds.has(doc.id))
      : filteredDocuments,
    [filteredDocuments, focusedDocIds],
  )

  // Build flat list with optional band-header rows when a sort field is active
  const docItems = useMemo(() => {
    if (!sortField || !groupByEnabled) return visibleDocuments.map((doc) => ({ type: "doc" as const, doc }))
    const result: Array<{ type: "band"; label: string } | { type: "doc"; doc: Document }> = []
    let currentBand = ""
    for (const doc of visibleDocuments) {
      const band = getBandLabel(doc, sortField)
      if (band !== currentBand) {
        currentBand = band
        if (band) result.push({ type: "band", label: band })
      }
      result.push({ type: "doc", doc })
    }
    return result
  }, [visibleDocuments, sortField, groupByEnabled])

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

  // Returns the raw numeric value for a metric field (used for delta computation)
  const getRawMetricValue = (doc: Document, field: string): number | null => {
    if (sortScope !== "all-fields" && isMetricSort(field)) {
      return getFieldHash(sortScope, doc.id)
    }
    switch (field) {
      case "error-rate":
      case "doc-error-rate":
      case "doc-error-rate-excl-missing":
        return doc.errorRate ?? null
      case "total-error":
      case "total-errors":
        return doc.errorRate != null ? Math.round((doc.errorRate / 100) * doc.pages * 30) : null
      case "f1-score":
      case "precision":
      case "recall":
        return doc.errorRate != null ? Math.max(0, Math.round(100 - doc.errorRate)) : null
      default:
        return null
    }
  }

  // For these metrics, a higher value means improvement
  const isHigherBetter = (field: string) =>
    ["f1-score", "precision", "recall", "correct-values", "correct-missing",
      "total-annotations", "annotated-values", "annotated-as-missing"].includes(field)

  // Deterministic mock delta when no comparisonDocuments are provided (-10 to +10 range)
  const getMockDelta = (docId: string, versionId: string, field: string): number => {
    let h = 0
    for (const c of versionId + ":" + docId + ":" + field) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
    return ((Math.abs(h) % 21) - 10)
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
    field !== "" && !["name", "status", "uploaded-date"].includes(field)

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

  // ── Multi-select ──────────────────────────────────────────────────────────

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  // ── Per-doc tag management ────────────────────────────────────────────────

  const toggleDocTag = (docId: string, tag: string) => {
    const doc = documents.find((d) => d.id === docId)
    if (!doc) return
    const tags = doc.tags ?? []
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    onUpdateDocument?.(docId, { tags: next })
  }

  const commitNewTag = (docId: string, value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const doc = documents.find((d) => d.id === docId)
    if (!doc) return
    const tags = doc.tags ?? []
    if (!tags.includes(trimmed)) onUpdateDocument?.(docId, { tags: [...tags, trimmed] })
    setNewTagInput("")
  }

  // ── Bulk tag management ───────────────────────────────────────────────────

  const getBulkTagState = (tag: string): "all" | "some" | "none" => {
    const selected = Array.from(selectedDocIds)
      .map((id) => documents.find((d) => d.id === id))
      .filter((d): d is Document => !!d)
    if (!selected.length) return "none"
    const n = selected.filter((d) => d.tags?.includes(tag)).length
    if (n === 0) return "none"
    if (n === selected.length) return "all"
    return "some"
  }

  const toggleBulkTag = (tag: string) => {
    const shouldAdd = getBulkTagState(tag) !== "all"
    for (const docId of selectedDocIds) {
      const doc = documents.find((d) => d.id === docId)
      if (!doc) continue
      const tags = doc.tags ?? []
      if (shouldAdd && !tags.includes(tag)) onUpdateDocument?.(docId, { tags: [...tags, tag] })
      if (!shouldAdd && tags.includes(tag)) onUpdateDocument?.(docId, { tags: tags.filter((t) => t !== tag) })
    }
  }

  const commitBulkNewTag = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    for (const docId of selectedDocIds) {
      const doc = documents.find((d) => d.id === docId)
      if (!doc) continue
      const tags = doc.tags ?? []
      if (!tags.includes(trimmed)) onUpdateDocument?.(docId, { tags: [...tags, trimmed] })
    }
    setBulkNewTagInput("")
  }

  // ── Upload ──────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onUploadDocuments?.(files)
    e.target.value = ""
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.types.includes("Files")) setIsDragOver(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onUploadDocuments?.(files)
  }

  return (
    <div
      className="w-64 border-r border-border bg-card flex flex-col relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-and-drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-[#e9f1fa]/95 border-2 border-dashed border-[#0067df] rounded-sm pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-[#0067df]/10 flex items-center justify-center">
            <Upload className="h-5 w-5 text-[#0067df]" />
          </div>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-[#0067df] leading-5">Drop to upload</p>
            <p className="text-[11px] text-[#526069] leading-4">Files will be added to this project</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

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
                className="w-[302px] p-0"
              >
                {/* SORT BY header */}
                <div className="px-3 py-2.5 flex items-center border-b border-border">
                  <span className="text-xs font-semibold">Sort by</span>
                </div>

                {/* Search input */}
                <div className="px-3 py-2">
                  <div className="flex items-center border border-input rounded-md h-8 px-3 gap-2 bg-background">
                    <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <input
                      value={sortSearch}
                      onChange={(e) => setSortSearch(e.target.value)}
                      placeholder="Type to search"
                      className="flex-1 text-xs text-foreground placeholder:text-muted-foreground bg-transparent outline-none min-w-0"
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

                  return fields.map((f) => {
                    const isDefault = sortField === "" && f.value === "uploaded-date"
                    const isActive = sortField === f.value || isDefault
                    return (
                      <button
                        key={f.value}
                        onClick={() => { setSortField(f.value as typeof sortField); setSortSearch(""); setSortScope("all-fields") }}
                        className={cn("w-full flex items-center px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", isActive && "bg-primary/5")}
                      >
                        <span className={cn("text-xs text-muted-foreground", isActive && "font-medium text-foreground")}>
                          {f.label}
                        </span>
                      </button>
                    )
                  })
                })()}

                {/* More metrics — flyout when no search; inline matches when searching */}
                {!sortSearch ? (
                  <Popover open={moreMetricsOpen} onOpenChange={setMoreMetricsOpen}>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                        <span className={cn("text-xs text-muted-foreground", MORE_METRICS.some(m => m.value === sortField) && "font-medium text-foreground")}>
                          More metrics
                        </span>
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", moreMetricsOpen && "rotate-90")} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      sideOffset={4}
                      className="w-[280px] p-0"
                    >
                      <div className="px-3 py-2.5 flex items-center border-b border-border">
                        <span className="text-xs font-semibold">More metrics</span>
                      </div>
                      <div className="max-h-[360px] overflow-y-auto">
                        {MORE_METRICS.map((m) => (
                          <button
                            key={m.value}
                            onClick={() => { setSortField(m.value); setMoreMetricsOpen(false); setSortOpen(false); setSortScope("all-fields") }}
                            className={cn("w-full flex items-center px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", sortField === m.value && "bg-primary/5")}
                          >
                            <span className={cn("text-xs text-muted-foreground", sortField === m.value && "font-medium text-foreground")}>
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
                        className={cn("w-full flex items-center px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", sortField === m.value && "bg-primary/5")}
                      >
                        <span className={cn("text-xs text-muted-foreground", sortField === m.value && "font-medium text-foreground")}>
                          {m.label}
                        </span>
                      </button>
                    ))
                )}

                {/* Divider */}
                <div className="mx-3 my-1 border-t border-border" />

                {/* Direction */}
                {[
                  { value: "asc" as const, label: "Oldest on top" },
                  { value: "desc" as const, label: "Newest on top" },
                ].filter((d) => !sortSearch || d.label.toLowerCase().includes(sortSearch.toLowerCase()))
                  .map((d) => {
                    const isDirActive = (sortDirection === d.value && sortField !== "") || (sortField === "" && d.value === "desc")
                    return (
                    <button
                      key={d.value}
                      onClick={() => { setSortDirection(d.value); setSortSearch("") }}
                      className={cn("w-full flex items-center px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", isDirActive && "bg-primary/5")}
                    >
                      <span className={cn(
                        "text-xs text-muted-foreground",
                        isDirActive && "font-medium text-foreground",
                      )}>
                        {d.label}
                      </span>
                    </button>
                  )})}

                {/* Group by toggle */}
                <div className="mx-3 my-1 border-t border-border" />
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Group by sort criteria</span>
                  <Switch checked={groupByEnabled} onCheckedChange={setGroupByEnabled} />
                </div>

                {/* Compare to version — only visible when a metric sort is active */}
                {isMetricSort(sortField) && (
                  <>
                    <div className="mx-3 my-1 border-t border-border" />
                    <div className="px-3 pb-3">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs font-semibold">Compare to version</span>
                        <Switch
                          checked={deltaEnabled}
                          onCheckedChange={(checked) => {
                            setDeltaEnabled(checked)
                            if (checked) {
                              setDeltaVersionId(defaultVersionId)
                              onDeltaVersionChange?.(defaultVersionId || null)
                            } else {
                              setDeltaVersionId("")
                              onDeltaVersionChange?.(null)
                            }
                          }}
                        />
                      </div>
                      {deltaEnabled && (
                        <select
                          value={deltaVersionId}
                          onChange={(e) => {
                            setDeltaVersionId(e.target.value)
                            onDeltaVersionChange?.(e.target.value || null)
                          }}
                          className="mt-1 w-full h-8 text-xs text-foreground bg-muted border border-input rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                        >
                          {(versions ?? MOCK_VERSIONS).map((v) => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </>
                )}
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
                className="w-[240px] p-0"
              >
                {/* Level-1 header */}
                <div className="px-3 py-2.5 flex items-center justify-between border-b border-border">
                  <span className="text-xs font-semibold">Filter by</span>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* ── Status row → flyout ── */}
                <Popover open={statusFlyoutOpen} onOpenChange={setStatusFlyoutOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                      <span className={cn("text-xs text-muted-foreground", filterStatuses.size > 0 && "font-medium text-foreground")}>
                        Status
                      </span>
                      <div className="flex items-center gap-1.5">
                        {filterStatuses.size > 0 && (
                          <span className="text-[10px] font-semibold bg-muted rounded-md px-2 py-0.5 text-foreground">
                            {filterStatuses.size}
                          </span>
                        )}
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", statusFlyoutOpen && "rotate-90")} />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={4}
                    className="w-[240px] p-0"
                  >
                    <div className="px-3 py-2.5 flex items-center border-b border-border">
                      <span className="text-xs font-semibold">Status</span>
                    </div>
                    {statuses.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => toggleStatus(s.value)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        <span className={cn("h-4 w-4 flex-shrink-0 rounded-[4px] border flex items-center justify-center pointer-events-none", filterStatuses.has(s.value) ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                          {filterStatuses.has(s.value) && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* ── Tags row → flyout ── */}
                <Popover open={tagsFlyoutOpen} onOpenChange={(open) => { setTagsFlyoutOpen(open); if (!open) setTagSearch("") }}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                      <span className={cn("text-xs text-muted-foreground", (filterTags.size > 0 || filterTagEmpty) && "font-medium text-foreground")}>
                        Tags
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(filterTags.size > 0 || filterTagEmpty) && (
                          <span className="text-[10px] font-semibold bg-muted rounded-md px-2 py-0.5 text-foreground">
                            {filterTags.size + (filterTagEmpty ? 1 : 0)}
                          </span>
                        )}
                        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", tagsFlyoutOpen && "rotate-90")} />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={4}
                    className="w-[280px] p-0"
                  >
                    <div className="px-3 py-2.5 flex items-center border-b border-border">
                      <span className="text-xs font-semibold">Tags</span>
                    </div>

                    {/* Contains toggle */}
                    <div className="flex items-center gap-2.5 px-4 py-2">
                      <span className="text-xs font-semibold text-muted-foreground">Contains</span>
                      <div className="flex items-center bg-muted rounded-md p-[2px]">
                        <button
                          onClick={() => setTagContainsMode("any")}
                          className={cn(
                            "px-2 py-1 rounded text-[11px] font-semibold text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            tagContainsMode === "any" ? "bg-background shadow-sm" : "hover:bg-background/50",
                          )}
                        >
                          Any selected
                        </button>
                        <button
                          onClick={() => setTagContainsMode("all")}
                          className={cn(
                            "px-2 py-1 rounded text-[11px] font-semibold text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            tagContainsMode === "all" ? "bg-background shadow-sm" : "hover:bg-background/50",
                          )}
                        >
                          All selected
                        </button>
                      </div>
                    </div>

                    {/* Tag search */}
                    <div className="px-3 pb-2">
                      <div className="flex items-center border border-input rounded-md h-8 px-3 gap-2 bg-background">
                        <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <input
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          placeholder="Type to search tags"
                          className="flex-1 text-xs text-foreground placeholder:text-muted-foreground bg-transparent outline-none min-w-0"
                        />
                      </div>
                    </div>

                    {/* Tag list */}
                    <div className="max-h-[240px] overflow-y-auto">
                      <button
                        onClick={() => setFilterTagEmpty(!filterTagEmpty)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        <span className={cn("h-4 w-4 flex-shrink-0 rounded-[4px] border flex items-center justify-center pointer-events-none", filterTagEmpty ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                          {filterTagEmpty && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span className="text-xs italic text-muted-foreground">Empty (no tag assigned)</span>
                      </button>
                      <div className="mx-3 my-1 border-t border-border" />
                      {allTags.length > 0 && (
                        <button
                          onClick={toggleSelectAll}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        >
                          <span className={cn("h-4 w-4 flex-shrink-0 rounded-[4px] border flex items-center justify-center pointer-events-none", allTagsSelected ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                            {allTagsSelected && <Check className="h-2.5 w-2.5" />}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">Select all</span>
                        </button>
                      )}
                      {visibleTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        >
                          <span className={cn("h-4 w-4 flex-shrink-0 rounded-[4px] border flex items-center justify-center pointer-events-none", filterTags.has(tag) ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                            {filterTags.has(tag) && <Check className="h-2.5 w-2.5" />}
                          </span>
                          <span className="text-xs text-muted-foreground">{tag}</span>
                        </button>
                      ))}
                      {visibleTags.length === 0 && tagSearch && (
                        <p className="px-3 py-3 text-xs text-muted-foreground">No tags match "{tagSearch}"</p>
                      )}
                    </div>

                  </PopoverContent>
                </Popover>

                {/* ── Select to focus ── */}
                <div className="mx-3 my-1 border-t border-border" />
                <button
                  onClick={() => { setFilterOpen(false); setFocusSelectionMode(true) }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <Crosshair className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Select documents to focus</span>
                </button>

              </PopoverContent>
            </Popover>

            {/* Upload — low-key icon button, reveals on panel hover */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              title="Upload documents"
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
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

      {/* ── Active chips bar (sort + filters + delta + focus) ── */}
      {(isSortActive || activeFilterCount > 0 || (deltaEnabled && deltaVersionId && deltaVersionId !== defaultVersionId) || focusedDocIds.size > 0) && (
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
                  className="w-[320px] p-0 overflow-hidden"
                >
                  {/* Title */}
                  <div className="px-3 py-2.5 border-b border-border">
                    <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">
                      Sort against a field metric occurring on documents
                    </p>
                  </div>

                  {/* Search */}
                  <div className="px-3 py-2">
                    <div className="flex items-center border border-input rounded-md h-8 px-3 gap-2 bg-background">
                      <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <input
                        value={fieldSearch}
                        onChange={(e) => setFieldSearch(e.target.value)}
                        placeholder="Type to search field"
                        className="flex-1 text-xs text-foreground placeholder:text-muted-foreground bg-transparent outline-none"
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
                          "w-full flex items-center px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                          sortScope === "all-fields" ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                      >
                        <span className={cn(
                          "text-xs text-foreground",
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
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          >
                            <ChevronRight className={cn(
                              "h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform",
                              (isExpanded || !!fieldSearch) && "rotate-90"
                            )} />
                            <LayoutGrid className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 min-w-0 text-xs font-semibold text-foreground truncate">
                              {group.name}
                            </span>
                            <span className="flex-shrink-0 text-[10px] font-semibold text-foreground bg-muted rounded-md px-2 py-0.5">
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
                                  "w-full flex items-center gap-2 pl-14 pr-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                                  isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                                )}
                              >
                                <DataTypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className={cn(
                                  "text-xs text-foreground",
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
                      <p className="px-3 py-3 text-xs text-muted-foreground">No fields available</p>
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

          {/* Delta comparison chip row — icon outside, chip inside, same pattern as sort/filter */}
          {deltaEnabled && deltaVersionId && isMetricSort(sortField) && deltaVersionId !== defaultVersionId && (
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#526069] flex-shrink-0 w-4 text-center leading-4">Δ</span>
              <div className="flex items-center gap-1.5 bg-[#cfd8dd] rounded-full px-3 py-[2px]">
                <button
                  onClick={() => setSortOpen(true)}
                  className="text-[12px] font-semibold text-[#273139] underline decoration-solid leading-4 whitespace-nowrap hover:text-[#0067df] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:rounded-sm"
                >
                  current{currentVersion ? ` (${currentVersion})` : ""} vs {deltaVersionId}
                </button>
                <button
                  onClick={() => { setDeltaEnabled(false); setDeltaVersionId(""); onDeltaVersionChange?.(null) }}
                  className="flex-shrink-0 text-[#526069] hover:text-[#273139] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:rounded-sm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Focus chip row */}
          {focusedDocIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-[#526069] flex-shrink-0" />
              <div className="flex items-center gap-1.5 bg-[#cfd8dd] rounded-full px-3 py-[2px]">
                <span className="text-[12px] font-semibold text-[#273139] leading-4 whitespace-nowrap">
                  {focusedDocIds.size} {focusedDocIds.size === 1 ? "doc" : "docs"} focused
                </span>
                <button
                  onClick={() => setFocusedDocIds(new Set())}
                  className="flex-shrink-0 text-[#526069] hover:text-[#273139] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:rounded-sm"
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

        {/* ── Bulk action bar ── */}
        {selectedDocIds.size > 0 && !focusSelectionMode && (
          <div className="sticky top-0 z-30 flex items-center gap-2 px-3 h-10 bg-[#273139] border-b border-[#1a272e]">
            <button
              onClick={() => setSelectedDocIds(new Set())}
              className="flex-shrink-0 text-white/50 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-sm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <span className="text-[12px] font-semibold text-white flex-1 leading-4">
              {selectedDocIds.size} selected
            </span>
            {/* Bulk actions dropdown + tag editor popover anchored to the trigger */}
            <Popover
              open={bulkTagOpen}
              onOpenChange={(open) => {
                setBulkTagOpen(open)
                if (!open) { setBulkTagSearch(""); setBulkNewTagInput("") }
              }}
            >
              <PopoverAnchor asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 text-[12px] font-semibold text-white/70 hover:text-white transition-colors px-2 py-1 rounded-[3px] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30">
                      Bulk actions
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => {
                        setFocusedDocIds(new Set(selectedDocIds))
                        setSelectedDocIds(new Set())
                        setFocusSelectionMode(false)
                      }}
                      className="cursor-pointer text-xs"
                    >
                      <Crosshair className="h-3.5 w-3.5 mr-2" /> Focus on selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setBulkTagOpen(true)}
                      className="cursor-pointer text-xs"
                    >
                      <Tag className="h-3.5 w-3.5 mr-2" /> Edit tags
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onBulkDownload?.(Array.from(selectedDocIds))}
                      className="cursor-pointer text-xs"
                    >
                      <Download className="h-3.5 w-3.5 mr-2" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="cursor-pointer text-xs text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </PopoverAnchor>
              <PopoverContent
                side="top"
                align="end"
                sideOffset={8}
                className="w-[260px] p-0"
              >
                {/* Header */}
                <div className="px-3 py-2.5 flex items-center justify-between border-b border-border">
                  <span className="text-xs font-semibold">Tags</span>
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {selectedDocIds.size} docs
                  </span>
                </div>
                {/* Search */}
                <div className="px-3 pb-2">
                  <div className="flex items-center border border-input rounded-md h-8 px-3 gap-2 bg-background">
                    <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <input
                      value={bulkTagSearch}
                      onChange={(e) => setBulkTagSearch(e.target.value)}
                      placeholder="Search tags…"
                      className="flex-1 text-xs text-foreground placeholder:text-muted-foreground bg-transparent outline-none min-w-0"
                      autoFocus
                    />
                  </div>
                </div>
                {/* Tag list with tri-state checkboxes */}
                <div className="max-h-[220px] overflow-y-auto">
                  {allTags
                    .filter((t) => !bulkTagSearch || t.toLowerCase().includes(bulkTagSearch.toLowerCase()))
                    .map((tag) => {
                      const state = getBulkTagState(tag)
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleBulkTag(tag)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        >
                          <span className={cn("h-4 w-4 flex-shrink-0 rounded-[4px] border flex items-center justify-center pointer-events-none", state !== "none" ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                            {state === "all" && <Check className="h-2.5 w-2.5" />}
                            {state === "some" && <span className="h-0.5 w-2 bg-current rounded-full" />}
                          </span>
                          <span className="text-xs text-muted-foreground flex-1 truncate">{tag}</span>
                          {state === "some" && (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 flex-shrink-0">
                              partial
                            </span>
                          )}
                        </button>
                      )
                    })
                  }
                  {allTags.filter((t) => !bulkTagSearch || t.toLowerCase().includes(bulkTagSearch.toLowerCase())).length === 0 && (
                    <p className="px-3 py-3 text-xs text-muted-foreground">
                      {bulkTagSearch ? `No tags match "${bulkTagSearch}"` : "No tags yet"}
                    </p>
                  )}
                </div>
                {/* New tag input */}
                <div className="border-t border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center border border-input rounded-md h-8 px-3 bg-background">
                      <input
                        value={bulkNewTagInput}
                        onChange={(e) => setBulkNewTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitBulkNewTag(bulkNewTagInput) } }}
                        placeholder="New tag…"
                        className="flex-1 text-xs text-foreground placeholder:text-muted-foreground bg-transparent outline-none min-w-0"
                      />
                    </div>
                    <button
                      onClick={() => commitBulkNewTag(bulkNewTagInput)}
                      disabled={!bulkNewTagInput.trim()}
                      className="h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Focus selection mode banner */}
        {focusSelectionMode && (
          <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border-b border-border gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Crosshair className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-xs text-primary font-medium truncate">
                {selectedDocIds.size === 0 ? "Select documents to focus on" : `${selectedDocIds.size} doc${selectedDocIds.size === 1 ? "" : "s"} selected`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {selectedDocIds.size > 0 && (
                <button
                  onClick={() => { setFocusedDocIds(new Set(selectedDocIds)); setSelectedDocIds(new Set()); setFocusSelectionMode(false) }}
                  className="text-[11px] font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors px-2 py-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Focus
                </button>
              )}
              <button
                onClick={() => { setFocusSelectionMode(false); setSelectedDocIds(new Set()) }}
                className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

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
          const isDocChecked = selectedDocIds.has(doc.id)
          const isHovered = hoveredDocId === doc.id
          const isMenuOpen = menuOpenDocId === doc.id
          const showActions = isHovered || isMenuOpen
          const showCheckbox = focusSelectionMode || selectedDocIds.size > 0 || isHovered || isDocChecked
          const statusInfo = getStatusInfo(doc.status)
          const tagsText =
            doc.tags && doc.tags.length > 0
              ? doc.tags.slice(0, 2).join(", ") + (doc.tags.length > 2 ? `, +${doc.tags.length - 2} more` : "")
              : null
          const sortVal = sortField ? getSortValue(doc, sortField) : null
          const deltaActive = deltaEnabled && !!deltaVersionId && isMetricSort(sortField)
          const deltaNum = (() => {
            if (!deltaActive) return null
            const currentNum = getRawMetricValue(doc, sortField)
            if (currentNum == null) return null
            if (comparisonDocuments) {
              const compDoc = comparisonDocuments.find((d) => d.id === doc.id)
              if (!compDoc) return null
              const compNum = getRawMetricValue(compDoc, sortField)
              return compNum != null ? currentNum - compNum : null
            }
            return getMockDelta(doc.id, deltaVersionId, sortField)
          })()
          const deltaGood = deltaNum != null
            ? (isHigherBetter(sortField) ? deltaNum > 0 : deltaNum < 0)
            : false

          return (
            <div
              key={doc.id}
              className="relative group"
              onMouseEnter={() => setHoveredDocId(doc.id)}
              onMouseLeave={() => { if (!isMenuOpen) setHoveredDocId(null) }}
            >
              {/* Main row — div[role=button] avoids nested-button invalidity */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onDocumentSelect(doc.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDocumentSelect(doc.id) } }}
                className={cn(
                  "w-full text-left pl-4 pr-8 py-2.5 border-b border-border/50 border-l-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0067df] focus-visible:ring-inset",
                  isSelected
                    ? "border-l-[#0067df] bg-[#e9f1fa] hover:bg-[#dde8f5]"
                    : "border-l-transparent hover:bg-accent",
                )}
              >
                {/* Row 1: icon→checkbox + name + status */}
                <div className="flex items-center gap-1.5">

                  {/* Icon ↔ Checkbox transition */}
                  <div
                    onClick={(e) => { e.stopPropagation(); toggleDocSelection(doc.id) }}
                    className="flex-shrink-0 relative w-5 h-5 flex items-center justify-center cursor-pointer"
                  >
                    <span className={cn(
                      "absolute inset-0 flex items-center justify-center transition-opacity duration-100",
                      showCheckbox ? "opacity-0" : "opacity-100",
                    )}>
                      <FileText className="h-4 w-4 text-[#526069]" />
                    </span>
                    <span className={cn(
                      "absolute inset-0 flex items-center justify-center transition-opacity duration-100",
                      showCheckbox ? "opacity-100" : "opacity-0",
                    )}>
                      <Checkbox
                        checked={isDocChecked}
                        className="h-4 w-4 rounded-[2px] pointer-events-none"
                      />
                    </span>
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
                </div>

                {/* Row 2: tags / pages + sort value */}
                <div className="mt-1 pl-[26px] flex items-center gap-2">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {tagsText ? (
                      <span className="text-[11px] text-[#526069] truncate block">{tagsText}</span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">{doc.pages} {doc.pages === 1 ? "page" : "pages"}</span>
                    )}
                  </div>
                  {sortVal != null && (
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <span className="text-[12px] font-semibold text-[#0067df] leading-4 tabular-nums">{sortVal}</span>
                      {deltaNum != null && (
                        <span className={cn(
                          "text-[10px] font-semibold tabular-nums leading-4",
                          deltaNum === 0
                            ? "text-[#526069]"
                            : deltaGood ? "text-[#038108]" : "text-[#b45309]",
                        )}>
                          {deltaNum > 0 ? "▲" : deltaNum < 0 ? "▼" : "–"}
                          {deltaNum !== 0 ? Math.abs(deltaNum) : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Three-dot menu + tag editor (anchored here, triggered from menu item) */}
              <div
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 z-20 transition-opacity",
                  showActions || tagEditorDocId === doc.id
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Popover
                  open={tagEditorDocId === doc.id}
                  onOpenChange={(open) => {
                    setTagEditorDocId(open ? doc.id : null)
                    if (!open) { setTagEditorSearch(""); setNewTagInput("") }
                  }}
                >
                  <PopoverAnchor asChild>
                    <DropdownMenu
                      open={isMenuOpen}
                      onOpenChange={(open) => {
                        setMenuOpenDocId(open ? doc.id : null)
                        if (!open) setHoveredDocId(null)
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-[3px] hover:bg-[#526069]/10">
                          <MoreHorizontal className="h-3 w-3 text-[#526069]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => {}} className="cursor-pointer text-xs">
                          <Download className="h-3.5 w-3.5 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setTagEditorDocId(doc.id)}
                          className="cursor-pointer text-xs"
                        >
                          <Tag className="h-3.5 w-3.5 mr-2" />
                          Edit tags
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
                  </PopoverAnchor>

                  <PopoverContent
                    side="right"
                    align="center"
                    sideOffset={8}
                    className="w-[260px] p-0"
                  >
                    {/* Header */}
                    <div className="px-3 py-2.5 flex items-center border-b border-border">
                      <span className="text-xs font-semibold">Tags</span>
                    </div>
                    {/* Search */}
                    <div className="px-3 pb-2">
                      <div className="flex items-center border border-input rounded-md h-8 px-3 gap-2 bg-background">
                        <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <input
                          value={tagEditorSearch}
                          onChange={(e) => setTagEditorSearch(e.target.value)}
                          placeholder="Search tags…"
                          className="flex-1 text-xs text-foreground placeholder:text-muted-foreground bg-transparent outline-none min-w-0"
                          autoFocus
                        />
                      </div>
                    </div>
                    {/* Existing tags */}
                    <div className="max-h-[200px] overflow-y-auto">
                      {allTags
                        .filter((t) => !tagEditorSearch || t.toLowerCase().includes(tagEditorSearch.toLowerCase()))
                        .map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleDocTag(doc.id, tag)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          >
                            <span className={cn("h-4 w-4 flex-shrink-0 rounded-[4px] border flex items-center justify-center pointer-events-none", doc.tags?.includes(tag) ? "bg-primary border-primary text-primary-foreground" : "border-input")}>
                              {doc.tags?.includes(tag) && <Check className="h-2.5 w-2.5" />}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">{tag}</span>
                          </button>
                        ))
                      }
                      {allTags.filter((t) => !tagEditorSearch || t.toLowerCase().includes(tagEditorSearch.toLowerCase())).length === 0 && (
                        <p className="px-3 py-3 text-xs text-muted-foreground">
                          {tagEditorSearch ? `No tags match "${tagEditorSearch}"` : "No tags yet"}
                        </p>
                      )}
                    </div>
                    {/* New tag input */}
                    <div className="border-t border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center border border-input rounded-md h-8 px-3 bg-background">
                          <input
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitNewTag(doc.id, newTagInput) } }}
                            placeholder="New tag…"
                            className="flex-1 text-xs text-foreground placeholder:text-muted-foreground bg-transparent outline-none min-w-0"
                          />
                        </div>
                        <button
                          onClick={() => commitNewTag(doc.id, newTagInput)}
                          disabled={!newTagInput.trim()}
                          className="h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )
        })}

        {visibleDocuments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-foreground mb-1">No documents found</p>
            <p className="text-[10px] text-muted-foreground mb-3">
              {focusedDocIds.size > 0
                ? "Focused docs don't match current filters."
                : activeFilterCount > 0 ? "Try adjusting your filters." : "Try a different search."}
            </p>
            {(activeFilterCount > 0 || focusedDocIds.size > 0) && (
              <div className="flex flex-col gap-1.5 items-center">
                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={clearAllFilters}>
                    Clear filters
                  </Button>
                )}
                {focusedDocIds.size > 0 && (
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setFocusedDocIds(new Set())}>
                    Exit focus
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedDocIds.size} {selectedDocIds.size === 1 ? "document" : "documents"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected {selectedDocIds.size === 1 ? "document" : "documents"} and all associated annotations will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onBulkDelete?.(Array.from(selectedDocIds))
                setSelectedDocIds(new Set())
                setDeleteConfirmOpen(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
