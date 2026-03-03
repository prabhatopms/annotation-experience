export interface Document {
  id: string
  name: string
  status: "new" | "in-progress" | "annotated" | "annotated-editing"
  pages: number
  tags?: string[]
  errorRate?: number // 0-100, percentage of fields with errors
  lastEdited?: string // ISO date string
  isFlagged?: boolean
}

export interface HighlightReference {
  text: string
  page: number
  position: {
    x: number
    y: number
  }
}

export interface ExtractedField {
  id: string
  group: string
  subGroup?: string // Added subGroup to support nested instances like Human Factors #1, #2, #3
  name: string
  dataType: "string" | "number" | "date"
  extractionType: "exact" | "inferred" | "calculated" // How the value was extracted
  isInferred: boolean // true if AI inferred from context, false if exact match
  value: string
  reference: HighlightReference // This is now the "value reference" - updates when new text is selected
  prediction: string
  initialPrediction: string
  initialReference: HighlightReference // Added to track the original reference that the prediction was based on
  isModified: boolean
  isAnnotated: boolean
  color: string
  editType?: "manual" | "selection"
  referenceOnlyUpdate?: boolean // Added to track if only reference was updated
  validationStatus?: "pass" | "fail" // Business check validation status
  instructions?: string // User-provided instructions for AI extraction
  isMissing?: boolean // Field value marked as missing
  isReferenceMissing?: boolean // Reference marked as missing
  fieldScore?: "great" | "good" | "moderate" | "bad" // F1 / accuracy score tier from extraction performance analysis
  extractedInDocument?: boolean // Whether this field was found/extracted in the current document
}

export interface FieldGroupMeta {
  name: string
  instructions: string
  fieldCount: number
}

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

export type SelectionUpdateMode = "both" | "reference-only"

export type PanelPosition = "right" | "bottom"

// Business Checks Types
export interface BusinessCheckField {
  fieldId: string
  fieldName: string
  isMultiOccurrence: boolean
  values: {
    value: string | number
    instanceLabel?: string // e.g., "#1", "#2" for multi-occurrence
    reference?: HighlightReference
  }[]
  aggregationType?: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX"
  aggregatedValue?: number
}

export interface BusinessCheck {
  id: string
  name: string
  expression: string // Human-readable expression, e.g., "Account Capital Earnings = SUM(YTD ROI) + Earning Gains - Tax Liabilities"
  inputFields: BusinessCheckField[]
  calculatedResult: number
  expectedValue: number
  status: "pass" | "fail"
  tolerance?: number // Optional tolerance for pass/fail comparison
  description?: string
}
