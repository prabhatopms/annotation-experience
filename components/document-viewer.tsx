"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ChevronDown, PanelLeftClose, PanelLeft, LayoutGrid, Search, X } from "lucide-react"
import type { Document, HighlightReference, ExtractedField } from "@/lib/types"
import { useEffect, useRef, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DocumentViewerProps {
  document?: Document
  documents: Document[]
  currentPage: number
  zoom: number
  highlightedRef: HighlightReference | null
  activeFieldId: string | null
  selectedFieldId: string | null
  fields: ExtractedField[]
  showDocumentBrowser: boolean
  onPageChange: (page: number) => void
  onZoomChange: (zoom: number) => void
  onTextSelection: (selectedText: string, page: number, position: { x: number; y: number }) => void
  onDocumentSelect: (id: string) => void
  onToggleDocumentBrowser: () => void
}

export function DocumentViewer({
  document,
  documents,
  currentPage,
  zoom,
  highlightedRef,
  activeFieldId,
  selectedFieldId,
  fields,
  showDocumentBrowser,
  onPageChange,
  onZoomChange,
  onTextSelection,
  onDocumentSelect,
  onToggleDocumentBrowser,
}: DocumentViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [showPageThumbnails, setShowPageThumbnails] = useState(false)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Helper to get status badge styling
  const getStatusBadge = (status: "new" | "in-progress" | "annotated" | "annotated-editing") => {
    switch (status) {
      case "new":
        return { label: "Not started", className: "bg-muted text-muted-foreground border-border" }
      case "in-progress":
        return { label: "In progress", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-500/30" }
      case "annotated":
        return { label: "Annotated", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-500/30" }
      case "annotated-editing":
        return { label: "Annotated (editing)", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-500/30" }
    }
  }

  useEffect(() => {
    if (highlightedRef && viewerRef.current) {
      // Auto-scroll to highlighted reference
      const highlightElement = viewerRef.current.querySelector(`[data-ref-id="${highlightedRef.text}"]`)
      if (highlightElement) {
        highlightElement.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [highlightedRef])

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!activeFieldId) return

    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()

    if (selectedText && selectedText.length > 0) {
      // Get approximate position (in real app, use more precise calculations)
      const range = selection?.getRangeAt(0)
      const rect = range?.getBoundingClientRect()

      if (rect) {
        onTextSelection(selectedText, currentPage, {
          x: rect.left,
          y: rect.top,
        })

        // Clear selection
        selection?.removeAllRanges()
      }
    }
  }

  const getFieldByRefText = (refText: string) => {
    return fields.find((f) => f.reference.text === refText || f.initialReference.text === refText)
  }

  const getUnderlineStyle = (field: ExtractedField | undefined, refText: string) => {
    if (!field) return {}

    const isCurrentRef = field.reference.text === refText
    const isInitialRef = field.initialReference.text === refText
    const isSelected = selectedFieldId === field.id
    const isHighlighted = highlightedRef?.text === refText

    // When field is selected (hovered), show underline for current reference
    if (isSelected && isCurrentRef) {
      return {
        backgroundColor: field.color.replace("rgb", "rgba").replace(")", ", 0.25)"),
        borderBottom: `2px solid ${field.color}`,
        boxShadow: `0 0 0 2px ${field.color.replace("rgb", "rgba").replace(")", ", 0.3)")}`,
        padding: "2px 4px",
        margin: "-2px -4px",
      }
    }

    // When reference is clicked (highlighted), show strong highlight
    if (isHighlighted && (isCurrentRef || isInitialRef)) {
      return {
        backgroundColor: field.color.replace("rgb", "rgba").replace(")", ", 0.35)"),
        borderBottom: `3px solid ${field.color}`,
        boxShadow: `0 0 0 3px ${field.color.replace("rgb", "rgba").replace(")", ", 0.4)")}`,
        padding: "3px 5px",
        margin: "-3px -5px",
      }
    }

    // Default underline for all references
    if (isCurrentRef || isInitialRef) {
      return {
        borderBottom: `2px solid ${field.color}`,
      }
    }

    return {}
  }

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">Select a document to view</p>
      </div>
    )
  }

  // Scroll to page when currentPage changes
  const scrollToPage = (pageNum: number) => {
    const pageElement = pageRefs.current[pageNum - 1]
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // Handle scroll to detect current visible page
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const scrollTop = container.scrollTop
    const containerHeight = container.clientHeight
    
    // Find which page is most visible
    for (let i = 0; i < (document?.pages || 0); i++) {
      const pageElement = pageRefs.current[i]
      if (pageElement) {
        const rect = pageElement.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const pageTop = rect.top - containerRect.top
        const pageBottom = rect.bottom - containerRect.top
        
        // If page is at least 50% visible, consider it the current page
        if (pageTop < containerHeight / 2 && pageBottom > containerHeight / 2) {
          if (currentPage !== i + 1) {
            onPageChange(i + 1)
          }
          break
        }
      }
    }
  }

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col bg-muted/20">
        {/* Header */}
        <div className="h-12 border-b border-border bg-card px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Toggle Document Browser */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onToggleDocumentBrowser}
                >
                  {showDocumentBrowser ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeft className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {showDocumentBrowser ? "Hide document list" : "Show document list"}
              </TooltipContent>
            </Tooltip>

            {/* Document Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 px-3 gap-2 text-sm font-medium">
                  <span className="truncate max-w-[200px]">{document.name}</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 font-normal", getStatusBadge(document.status).className)}>
                    {getStatusBadge(document.status).label}
                  </Badge>
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                {documents.map((doc) => {
                  const statusBadge = getStatusBadge(doc.status)
                  return (
                    <DropdownMenuItem
                      key={doc.id}
                      onClick={() => onDocumentSelect(doc.id)}
                      className={cn(
                        "text-xs cursor-pointer flex items-center justify-between",
                        doc.id === document.id && "bg-accent"
                      )}
                    >
                      <span className="truncate flex-1">{doc.name}</span>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 font-normal ml-2", statusBadge.className)}>
                        {statusBadge.label}
                      </Badge>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search Toggle/Input */}
            {showSearch ? (
              <div className="flex items-center gap-1 ml-2">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search in document..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 w-48 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowSearch(false)
                      setSearchQuery("")
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery("")
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-1"
                    onClick={() => {
                      setShowSearch(true)
                      setTimeout(() => searchInputRef.current?.focus(), 0)
                    }}
                  >
                    <Search className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Search in document
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {activeFieldId && (
            <div className="mr-4 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-700 dark:text-blue-400">
              Selection Mode: Highlight text to update field
            </div>
          )}

          <div className="flex items-center gap-3 ml-4">
            {/* Page Thumbnails Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showPageThumbnails ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowPageThumbnails(!showPageThumbnails)}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {showPageThumbnails ? "Hide page thumbnails" : "Show page thumbnails"}
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border" />

            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const newPage = Math.max(1, currentPage - 1)
                  onPageChange(newPage)
                  scrollToPage(newPage)
                }}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2 min-w-[60px] text-center">
                {currentPage} / {document.pages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const newPage = Math.min(document.pages, currentPage + 1)
                  onPageChange(newPage)
                  scrollToPage(newPage)
                }}
                disabled={currentPage === document.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-4 w-px bg-border" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onZoomChange(Math.max(50, zoom - 10))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2 min-w-[45px] text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onZoomChange(Math.min(200, zoom + 10))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Document Display with optional thumbnails */}
        <div className="flex-1 flex overflow-hidden">
          {/* Page Thumbnails Panel */}
          {showPageThumbnails && (
            <div className="w-32 border-r border-border bg-muted/30 overflow-y-auto p-2 flex flex-col gap-2">
              {Array.from({ length: document.pages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => {
                    onPageChange(pageNum)
                    scrollToPage(pageNum)
                  }}
                  className={cn(
                    "relative rounded border-2 transition-all hover:border-primary/50",
                    currentPage === pageNum
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  )}
                >
                  {/* Thumbnail placeholder */}
                  <div className="aspect-[8.5/11] bg-white flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">{pageNum}</span>
                  </div>
                  {/* Page number label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-background/90 text-[10px] text-center py-0.5">
                    Page {pageNum}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Main document scroll area */}
          <div 
            ref={viewerRef} 
            className="flex-1 overflow-auto p-6"
            onScroll={handleScroll}
          >
            <div
              className="max-w-4xl mx-auto"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            >
              {/* Render all pages for scrolling */}
              {Array.from({ length: document.pages }, (_, i) => i + 1).map((pageNum) => (
                <div
                  key={pageNum}
                  ref={(el) => { pageRefs.current[pageNum - 1] = el }}
                  className={cn(
                    "bg-white shadow-lg mb-6",
                    activeFieldId ? "cursor-text" : ""
                  )}
                  onMouseUp={handleMouseUp}
                >
                  {/* Page 1 - Cover/Executive Summary */}
                  {pageNum === 1 && (
                    <div className="p-16 min-h-[1100px] relative border-b-2 border-gray-300">
                      <div className="space-y-6 text-sm text-gray-900 leading-relaxed">
                        {/* Header */}
                        <div className="text-center mb-12">
                          <div className="text-xs text-gray-600 mb-2">DEPARTMENT OF THE AIR FORCE</div>
                          <div className="text-xs text-gray-600 mb-4">AIR FORCE SPECIAL OPERATIONS COMMAND</div>
                          <h1 className="text-xl font-bold mb-6">AIRCRAFT ACCIDENT INVESTIGATION BOARD REPORT</h1>
                          <div className="text-sm font-semibold mb-2">
                            <span data-ref-id="MC-130H" data-ref-text="MC-130H" style={getUnderlineStyle(getFieldByRefText("MC-130H"), "MC-130H")}>
                              MC-130H
                            </span>
                            , TAIL NUMBER{" "}
                            <span data-ref-id="88-0194" data-ref-text="88-0194" style={getUnderlineStyle(getFieldByRefText("88-0194"), "88-0194")}>
                              88-0194
                            </span>
                          </div>
                          <div className="text-sm mb-2">1st Special Operations Wing</div>
                          <div className="text-sm font-semibold mb-6">
                            <span
                              data-ref-id="Hurlburt Field, FL"
                              data-ref-text="Hurlburt Field, FL"
                              style={getUnderlineStyle(getFieldByRefText("Hurlburt Field, FL"), "Hurlburt Field, FL")}
                            >
                              Hurlburt Field, FL
                            </span>
                          </div>
                          <div className="text-sm font-semibold">
                            <span
                              data-ref-id="5 November 2019"
                              data-ref-text="5 November 2019"
                              style={getUnderlineStyle(getFieldByRefText("5 November 2019"), "5 November 2019")}
                            >
                              5 November 2019
                            </span>
                          </div>
                        </div>

                        {/* Executive Summary */}
                        <div className="mb-8">
                          <h2 className="text-base font-bold mb-4 border-b border-gray-400 pb-2">EXECUTIVE SUMMARY</h2>
                          <p className="mb-4">
                            On{" "}
                            <span
                              data-ref-id="5 November 2019-exec"
                              data-ref-text="5 November 2019"
                              style={getUnderlineStyle(getFieldByRefText("5 November 2019"), "5 November 2019")}
                            >
                              5 November 2019
                            </span>
                            , at approximately 1230 local time (L), a parachute malfunction during a{" "}
                            <span
                              data-ref-id="Special Tactics (ST) Rodeo competition"
                              data-ref-text="Special Tactics (ST) Rodeo competition"
                              style={getUnderlineStyle(
                                getFieldByRefText("Special Tactics (ST) Rodeo competition"),
                                "Special Tactics (ST) Rodeo competition",
                              )}
                            >
                              Special Tactics (ST) Rodeo competition
                            </span>{" "}
                            training jump resulted in the death of the{" "}
                            <span
                              data-ref-id="Mishap Jumpmaster (MJM)"
                              data-ref-text="Mishap Jumpmaster (MJM)"
                              style={getUnderlineStyle(getFieldByRefText("Mishap Jumpmaster (MJM)"), "Mishap Jumpmaster (MJM)")}
                            >
                              Mishap Jumpmaster (MJM)
                            </span>
                            , assigned to the{" "}
                            <span
                              data-ref-id="23d Special Tactics Squadron"
                              data-ref-text="23d Special Tactics Squadron"
                              style={getUnderlineStyle(
                                getFieldByRefText("23d Special Tactics Squadron"),
                                "23d Special Tactics Squadron",
                              )}
                            >
                              23d Special Tactics Squadron
                            </span>
                            , Joint Base Lewis-McChord, Washington. The MJM{" "}
                            <span
                              data-ref-id="sustained fatal injuries"
                              data-ref-text="sustained fatal injuries"
                              style={getUnderlineStyle(
                                getFieldByRefText("sustained fatal injuries"),
                                "sustained fatal injuries",
                              )}
                            >
                              sustained fatal injuries
                            </span>{" "}
                            when his T-11R reserve parachute failed to deploy properly during an emergency activation.
                          </p>
                          <p className="mb-4">
                            The mishap occurred during routine training operations supporting the annual Special Tactics Rodeo
                            competition at Hurlburt Field, Florida. The jump was conducted from an{" "}
                            <span data-ref-id="MC-130H-exec" data-ref-text="MC-130H" style={getUnderlineStyle(getFieldByRefText("MC-130H"), "MC-130H")}>
                              MC-130H
                            </span>{" "}
                            aircraft, tail number{" "}
                            <span data-ref-id="88-0194-exec" data-ref-text="88-0194" style={getUnderlineStyle(getFieldByRefText("88-0194"), "88-0194")}>
                              88-0194
                            </span>
                            , assigned to the 15th Special Operations Squadron.
                          </p>
                        </div>

                        <div className="text-right text-xs text-gray-500 mt-12">Page 1 of 52</div>
                      </div>
                    </div>
                  )}

                  {/* Page 2 - Findings and Causes */}
                  {pageNum === 2 && (
                    <div className="p-16 min-h-[1100px] relative">
                      <div className="space-y-6 text-sm text-gray-900 leading-relaxed">
                        <h2 className="text-base font-bold mb-4 border-b border-gray-400 pb-2">FINDINGS AND CAUSES</h2>

                        <div className="mb-6">
                          <h3 className="text-sm font-bold mb-3">PRIMARY CAUSE</h3>
                          <p className="mb-3">
                            The Accident Investigation Board (AIB) President found by clear and convincing evidence the cause of
                            the mishap was an{" "}
                            <span
                              data-ref-id="incorrectly configured T-11R reserve parachute as a direct result of jumpmaster procedural knowledge"
                              data-ref-text="incorrectly configured T-11R reserve parachute as a direct result of jumpmaster procedural knowledge"
                              style={getUnderlineStyle(
                                getFieldByRefText(
                                  "incorrectly configured T-11R reserve parachute as a direct result of jumpmaster procedural knowledge",
                                ),
                                "incorrectly configured T-11R reserve parachute as a direct result of jumpmaster procedural knowledge",
                              )}
                            >
                              incorrectly configured T-11R reserve parachute as a direct result of jumpmaster procedural
                              knowledge
                            </span>{" "}
                            deficits. Specifically, the MJM's lack of{" "}
                            <span
                              data-ref-id="procedural knowledge on the T-11R Reserve inserts and side tuck-tabs"
                              data-ref-text="procedural knowledge on the T-11R Reserve inserts and side tuck-tabs"
                              style={getUnderlineStyle(
                                getFieldByRefText("procedural knowledge on the T-11R Reserve inserts and side tuck-tabs"),
                                "procedural knowledge on the T-11R Reserve inserts and side tuck-tabs",
                              )}
                            >
                              procedural knowledge on the T-11R Reserve inserts and side tuck-tabs
                            </span>{" "}
                            resulted in an improperly rigged reserve parachute that failed to deploy when activated.
                          </p>
                        </div>

                        <div className="mb-6">
                          <h3 className="text-sm font-bold mb-3">CONTRIBUTING FACTORS</h3>
                          <p className="mb-3">
                            The AIB President found by preponderance of evidence the following factors substantially contributed
                            to the mishap:
                          </p>
                          <ul className="list-disc ml-6 space-y-2">
                            <li>
                              <span
                                data-ref-id="The TO process failed to deliver information effectively"
                                data-ref-text="The TO process failed to deliver information effectively"
                                style={getUnderlineStyle(
                                  getFieldByRefText("The TO process failed to deliver information effectively"),
                                  "The TO process failed to deliver information effectively",
                                )}
                              >
                                The TO process failed to deliver information effectively
                              </span>{" "}
                              to the operational force regarding critical changes to reserve parachute rigging procedures.
                            </li>
                            <li>
                              Organizational leadership{" "}
                              <span
                                data-ref-id="lacked investment in time, intellect and resources for Training and Standards/Evaluations program management"
                                data-ref-text="lacked investment in time, intellect and resources for Training and Standards/Evaluations program management"
                                style={getUnderlineStyle(
                                  getFieldByRefText(
                                    "lacked investment in time, intellect and resources for Training and Standards/Evaluations program management",
                                  ),
                                  "lacked investment in time, intellect and resources for Training and Standards/Evaluations program management",
                                )}
                              >
                                lacked investment in time, intellect and resources for Training and Standards/Evaluations
                                program management
                              </span>
                              , resulting in inadequate oversight of training and qualification standards.
                            </li>
                            <li>
                              <span
                                data-ref-id="Inadequate organizational leadership led to insufficient command oversight of this event"
                                data-ref-text="Inadequate organizational leadership led to insufficient command oversight of this event"
                                style={getUnderlineStyle(
                                  getFieldByRefText(
                                    "Inadequate organizational leadership led to insufficient command oversight of this event",
                                  ),
                                  "Inadequate organizational leadership led to insufficient command oversight of this event",
                                )}
                              >
                                Inadequate organizational leadership led to insufficient command oversight of this event
                              </span>
                              , including approval processes and risk mitigation measures for high-risk training activities.
                            </li>
                          </ul>
                        </div>

                        <div className="mb-6">
                          <h3 className="text-sm font-bold mb-3">SAFETY OBSERVATIONS</h3>
                          <p>
                            The investigation identified several systemic issues within the Special Tactics community regarding
                            parachute operations training, technical order compliance, and risk management procedures. These
                            observations are detailed in the full report with corresponding safety recommendations.
                          </p>
                        </div>

                        <div className="text-right text-xs text-gray-500 mt-12">Page 2 of 52</div>
                      </div>
                    </div>
                  )}

                  {/* Remaining pages placeholder */}
                  {pageNum > 2 && (
                    <div className="p-16 min-h-[1100px] relative">
                      <div className="space-y-6 text-sm text-gray-900 leading-relaxed">
                        <div className="text-center text-gray-500 mt-64">
                          <p className="text-lg mb-2">Additional Report Content</p>
                          <p className="text-xs">Page {pageNum} of 52</p>
                          <p className="text-xs mt-4">
                            This section would contain detailed investigation findings, witness statements, technical analysis,
                            and recommendations.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
