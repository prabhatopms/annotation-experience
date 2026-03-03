"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Sparkles,
  Calendar,
  Hash,
  Pencil,
  History,
  Search,
  FolderOpen,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExtractedField, FieldGroupMeta } from "@/lib/types"

interface FieldEdit {
  timestamp: Date
  previousValue: string
  newValue: string
  field: "name" | "instructions" | "dataType" | "extractionType"
  editedBy: string
}

interface TaxonomyPanelProps {
  fields: ExtractedField[]
  focusedFieldId?: string | null
  focusedGroupName?: string | null
  groupMeta?: Record<string, FieldGroupMeta>
  onFieldUpdate?: (fieldId: string, updates: Partial<ExtractedField>) => void
  onGroupMetaUpdate?: (groupName: string, updates: Partial<FieldGroupMeta>) => void
}

// Get unique fields by name (dedupe multi-occurrence fields)
function getUniqueFields(fields: ExtractedField[]): ExtractedField[] {
  const seen = new Map<string, ExtractedField>()
  for (const field of fields) {
    const key = `${field.group}-${field.name}`
    if (!seen.has(key)) {
      seen.set(key, field)
    }
  }
  return Array.from(seen.values())
}

// Get field type info (combining extraction type and data type)
function getFieldTypeInfo(field: ExtractedField) {
  const isInferred = field.extractionType === "inferred" || field.isInferred
  
  if (field.dataType === "date") {
    return {
      icon: <Calendar className="h-3.5 w-3.5" />,
      label: "Date",
      color: "text-emerald-600 dark:text-emerald-400",
    }
  }
  if (field.dataType === "number") {
    return {
      icon: <Hash className="h-3.5 w-3.5" />,
      label: "Number",
      color: "text-amber-600 dark:text-amber-400",
    }
  }
  // Text types - exact or inferred
  if (isInferred) {
    return {
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: "Inferred Text",
      color: "text-purple-600 dark:text-purple-400",
    }
  }
  return {
    icon: <FileText className="h-3.5 w-3.5" />,
    label: "Exact Text",
    color: "text-blue-600 dark:text-blue-400",
  }
}

export function TaxonomyPanel({
  fields,
  focusedFieldId,
  focusedGroupName,
  groupMeta = {},
  onFieldUpdate,
  onGroupMetaUpdate,
}: TaxonomyPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [editingInstructions, setEditingInstructions] = useState("")
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null)
  const [editingGroupInstructions, setEditingGroupInstructions] = useState("")
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [selectedFieldForHistory, setSelectedFieldForHistory] = useState<ExtractedField | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const groupTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Mock edit history
  const [editHistory] = useState<Record<string, FieldEdit[]>>({
    "mishap-date": [
      { timestamp: new Date("2024-01-15"), previousValue: "Extract date", newValue: "Extract the exact date when the mishap/incident occurred.", field: "instructions", editedBy: "John D." },
      { timestamp: new Date("2024-01-10"), previousValue: "Incident Date", newValue: "Mishap Date", field: "name", editedBy: "Sarah M." },
    ],
  })

  // Get unique fields (dedupe multi-occurrence) - memoized to prevent infinite loops
  const uniqueFields = useMemo(() => getUniqueFields(fields), [fields])

  // Group fields by group name
  const groupedFields = useMemo(() => {
    return uniqueFields.reduce((acc, field) => {
      if (!acc[field.group]) {
        acc[field.group] = []
      }
      acc[field.group].push(field)
      return acc
    }, {} as Record<string, ExtractedField[]>)
  }, [uniqueFields])

  // Filter groups and fields based on search
  const filteredGroups = Object.entries(groupedFields).filter(([groupName, groupFields]) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    if (groupName.toLowerCase().includes(query)) return true
    return groupFields.some(f => 
      f.name.toLowerCase().includes(query) || 
      f.instructions?.toLowerCase().includes(query)
    )
  })

  // Expand group and field containing focused field
  useEffect(() => {
    if (focusedFieldId) {
      const field = fields.find(f => f.id === focusedFieldId)
      if (field) {
        setExpandedGroups(prev => new Set([...prev, field.group]))
        setExpandedFields(prev => new Set([...prev, field.id]))
      }
    }
  }, [focusedFieldId, fields])

  // Expand and focus on a group when requested
  useEffect(() => {
    if (focusedGroupName) {
      setExpandedGroups(prev => new Set([...prev, focusedGroupName]))
    }
  }, [focusedGroupName])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  const toggleField = (fieldId: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev)
      if (next.has(fieldId)) {
        next.delete(fieldId)
      } else {
        next.add(fieldId)
      }
      return next
    })
  }

  const startEditingInstructions = (field: ExtractedField) => {
    setEditingFieldId(field.id)
    setEditingInstructions(field.instructions || getDefaultInstructions(field))
    // Expand field if not expanded
    setExpandedFields(prev => new Set([...prev, field.id]))
    // Focus textarea after render
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const saveInstructions = (fieldId: string) => {
    if (onFieldUpdate) {
      onFieldUpdate(fieldId, { instructions: editingInstructions })
    }
    setEditingFieldId(null)
  }

  const cancelEditingInstructions = () => {
    setEditingFieldId(null)
    setEditingInstructions("")
  }

  const handleViewHistory = (field: ExtractedField) => {
    setSelectedFieldForHistory(field)
    setHistoryDialogOpen(true)
  }

  const getDefaultInstructions = (field: ExtractedField) => {
    return `Extract the ${field.name.toLowerCase()} value from the document. Look for explicit mentions or contextual indicators.`
  }

  const getDefaultGroupInstructions = (groupName: string) => {
    return `Extract all fields related to ${groupName.toLowerCase()} from the document.`
  }

  const startEditingGroupInstructions = (groupName: string) => {
    setEditingGroupName(groupName)
    const meta = groupMeta[groupName]
    setEditingGroupInstructions(meta?.instructions || getDefaultGroupInstructions(groupName))
    setTimeout(() => groupTextareaRef.current?.focus(), 50)
  }

  const saveGroupInstructions = (groupName: string) => {
    onGroupMetaUpdate?.(groupName, { instructions: editingGroupInstructions })
    setEditingGroupName(null)
  }

  const cancelEditingGroupInstructions = () => {
    setEditingGroupName(null)
    setEditingGroupInstructions("")
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {Object.keys(groupedFields).length} Groups, {uniqueFields.length} Fields
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Field Groups */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <FolderOpen className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-xs">No fields found</span>
            </div>
          ) : (
            <div className="py-1">
              {filteredGroups.map(([groupName, groupFields]) => {
                const isGroupExpanded = expandedGroups.has(groupName)
                const isGroupFocused = focusedGroupName === groupName
                const filteredFieldsInGroup = searchQuery 
                  ? groupFields.filter(f => 
                      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      f.instructions?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : groupFields

                return (
                  <Collapsible
                    key={groupName}
                    open={isGroupExpanded}
                    onOpenChange={() => toggleGroup(groupName)}
                  >
                    {/* Group Header */}
                    <CollapsibleTrigger className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors",
                      isGroupFocused && "ring-1 ring-primary/50 bg-primary/5 rounded-md"
                    )}>
                      <div className="flex items-center justify-center w-5 h-5">
                        {isGroupExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-sm font-semibold flex-1 text-left">{groupName}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                        {groupFields.length}
                      </Badge>
                    </CollapsibleTrigger>

                    {/* Group Content */}
                    <CollapsibleContent>
                      {/* Group Instructions */}
                      <div className="mx-3 mb-2 mt-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Group Instructions
                          </span>
                          <div className="flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5">
                                  <History className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Edit history</TooltipContent>
                            </Tooltip>
                            {editingGroupName !== groupName && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startEditingGroupInstructions(groupName)
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">Edit instructions</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        {editingGroupName === groupName ? (
                          <div className="space-y-2">
                            <Textarea
                              ref={groupTextareaRef}
                              value={editingGroupInstructions}
                              onChange={(e) => setEditingGroupInstructions(e.target.value)}
                              className="text-xs min-h-[60px] resize-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => { e.stopPropagation(); cancelEditingGroupInstructions() }}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => { e.stopPropagation(); saveGroupInstructions(groupName) }}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 rounded-md p-2">
                            {groupMeta[groupName]?.instructions || getDefaultGroupInstructions(groupName)}
                          </p>
                        )}
                      </div>

                      {/* Fields */}
                      <div className="pb-1">
                        {filteredFieldsInGroup.map((field) => {
                          const typeInfo = getFieldTypeInfo(field)
                          const isFocused = focusedFieldId === field.id
                          const isFieldExpanded = expandedFields.has(field.id)
                          const isEditing = editingFieldId === field.id
                          const fieldHistory = editHistory[field.id]
                          const instructions = field.instructions || getDefaultInstructions(field)

                          return (
                            <Collapsible
                              key={field.id}
                              open={isFieldExpanded}
                              onOpenChange={() => toggleField(field.id)}
                            >
                              {/* Field Row - Collapsed State */}
                              <div
                                className={cn(
                                  "ml-5 mr-2 rounded-md transition-colors",
                                  isFocused && "ring-1 ring-primary/50 bg-primary/5"
                                )}
                              >
                                <CollapsibleTrigger className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/40 rounded-md transition-colors">
                                  <div className="flex items-center justify-center w-4 h-4">
                                    {isFieldExpanded ? (
                                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div 
                                    className="w-2 h-2 rounded-full shrink-0" 
                                    style={{ backgroundColor: field.color }}
                                  />
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className={cn("flex items-center shrink-0", typeInfo.color)}>
                                        {typeInfo.icon}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">{typeInfo.label}</TooltipContent>
                                  </Tooltip>
                                  <span className="text-xs font-medium flex-1 text-left truncate">
                                    {field.name}
                                  </span>
                                </CollapsibleTrigger>

                                {/* Field Expanded Content */}
                                <CollapsibleContent>
                                  <div className="pl-8 pr-2 pb-2 space-y-3">
                                    {/* Field Type - Editable */}
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                        Field Type
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <Badge 
                                          variant="outline" 
                                          className={cn("text-[10px] h-5 gap-1", typeInfo.color)}
                                        >
                                          {typeInfo.icon}
                                          {typeInfo.label}
                                        </Badge>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Pencil className="h-2.5 w-2.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">Edit Field Type</TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                          Instructions
                                        </span>
                                        <div className="flex items-center gap-0.5">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleViewHistory(field)
                                                }}
                                              >
                                                <History className="h-3 w-3" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">
                                              {fieldHistory && fieldHistory.length > 0 ? "View Edit History" : "No edit history"}
                                            </TooltipContent>
                                          </Tooltip>
                                          {!isEditing && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-5 w-5"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    startEditingInstructions(field)
                                                  }}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="text-xs">Edit Instructions</TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </div>

                                      {isEditing ? (
                                        <div className="space-y-2">
                                          <Textarea
                                            ref={textareaRef}
                                            value={editingInstructions}
                                            onChange={(e) => setEditingInstructions(e.target.value)}
                                            className="text-xs min-h-[80px] resize-none"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 px-2 text-xs"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                cancelEditingInstructions()
                                              }}
                                            >
                                              <X className="h-3 w-3 mr-1" />
                                              Cancel
                                            </Button>
                                            <Button
                                              size="sm"
                                              className="h-6 px-2 text-xs"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                saveInstructions(field.id)
                                              }}
                                            >
                                              <Check className="h-3 w-3 mr-1" />
                                              Save
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 rounded-md p-2">
                                          {instructions}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          )}
        </div>

        {/* Edit History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Edit History</DialogTitle>
              {selectedFieldForHistory && (
                <p className="text-sm text-muted-foreground">{selectedFieldForHistory.name}</p>
              )}
            </DialogHeader>
            <div className="space-y-3 py-2 max-h-[300px] overflow-y-auto">
              {selectedFieldForHistory && editHistory[selectedFieldForHistory.id]?.map((edit, i) => (
                <div key={i} className="p-2.5 rounded-md border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className="text-[10px] capitalize">{edit.field}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {edit.timestamp.toLocaleDateString()} by {edit.editedBy}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0">From:</span>
                      <span className="line-through text-muted-foreground">{edit.previousValue}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0">To:</span>
                      <span>{edit.newValue}</span>
                    </div>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground text-center py-4">No edit history available</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
