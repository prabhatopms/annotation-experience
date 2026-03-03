"use client"

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react"
import type {
  Document,
  ExtractedField,
  HighlightReference,
  SelectionUpdateMode,
  FieldGroupMeta,
} from "@/lib/types"
import { mockDocuments, mockExtractedFields, initialGroupMeta } from "@/lib/mock-data"

// ── State shape ───────────────────────────────────────────────────────────────

interface AnnotationState {
  documents: Document[]
  selectedDocumentId: string
  extractedFields: ExtractedField[]
  highlightedRef: HighlightReference | null
  selectedFieldId: string | null
  activeFieldId: string | null
  connectionFieldId: string | null
  selectionUpdateMode: SelectionUpdateMode
  groupMeta: Record<string, FieldGroupMeta>
  focusedBusinessCheckId: string | null
  focusedBusinessCheckFieldId: string | null
  focusedTaxonomyFieldId: string | null
  focusedTaxonomyGroupName: string | null
  isPredicting: boolean
}

const initialState: AnnotationState = {
  documents: mockDocuments,
  selectedDocumentId: "1",
  extractedFields: mockExtractedFields,
  highlightedRef: null,
  selectedFieldId: null,
  activeFieldId: null,
  connectionFieldId: null,
  selectionUpdateMode: "both",
  groupMeta: initialGroupMeta,
  focusedBusinessCheckId: null,
  focusedBusinessCheckFieldId: null,
  focusedTaxonomyFieldId: null,
  focusedTaxonomyGroupName: null,
  isPredicting: false,
}

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "SELECT_DOCUMENT"; id: string }
  | { type: "UPDATE_DOCUMENT"; docId: string; updates: Partial<Document> }
  | { type: "TRANSITION_TO_EDITING"; docId: string }
  | { type: "RESET_DOCUMENT"; docId: string }
  | { type: "UPDATE_FIELD"; fieldId: string; updates: Partial<ExtractedField> }
  | { type: "ANNOTATE_FIELDS"; fieldIds: string[] }
  | { type: "RESET_ANNOTATIONS" }
  | { type: "SET_HIGHLIGHTED_REF"; ref: HighlightReference | null }
  | { type: "SET_SELECTED_FIELD"; fieldId: string | null }
  | { type: "SET_ACTIVE_FIELD"; fieldId: string | null }
  | { type: "SET_CONNECTION_FIELD"; fieldId: string | null }
  | { type: "SET_SELECTION_MODE"; mode: SelectionUpdateMode }
  | { type: "UPDATE_GROUP_META"; groupName: string; updates: Partial<FieldGroupMeta> }
  | { type: "FOCUS_BUSINESS_CHECK"; checkId: string | null; fieldId: string | null }
  | { type: "FOCUS_TAXONOMY"; fieldId: string | null; groupName: string | null }
  | { type: "SET_PREDICTING"; value: boolean }

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: AnnotationState, action: Action): AnnotationState {
  switch (action.type) {
    case "SELECT_DOCUMENT":
      return { ...state, selectedDocumentId: action.id }

    case "UPDATE_DOCUMENT":
      return {
        ...state,
        documents: state.documents.map((doc) =>
          doc.id === action.docId ? { ...doc, ...action.updates } : doc
        ),
      }

    case "TRANSITION_TO_EDITING":
      return {
        ...state,
        documents: state.documents.map((doc) => {
          if (doc.id !== action.docId) return doc
          if (doc.status === "new") return { ...doc, status: "in-progress" as const }
          if (doc.status === "annotated") return { ...doc, status: "annotated-editing" as const }
          return doc
        }),
      }

    case "RESET_DOCUMENT":
      return {
        ...state,
        documents: state.documents.map((doc) =>
          doc.id === action.docId ? { ...doc, status: "new" as const } : doc
        ),
        // Reset field state if resetting the currently selected document
        ...(action.docId === state.selectedDocumentId
          ? {
              extractedFields: mockExtractedFields,
              activeFieldId: null,
              selectedFieldId: null,
              highlightedRef: null,
              connectionFieldId: null,
            }
          : {}),
      }

    case "UPDATE_FIELD": {
      const isRefOnlyMissing =
        action.updates.isReferenceMissing &&
        !action.updates.isMissing &&
        Object.keys(action.updates).length <= 1
      return {
        ...state,
        extractedFields: state.extractedFields.map((field) =>
          field.id === action.fieldId
            ? {
                ...field,
                ...action.updates,
                isModified: isRefOnlyMissing ? field.isModified : true,
              }
            : field
        ),
      }
    }

    case "ANNOTATE_FIELDS":
      return {
        ...state,
        extractedFields: state.extractedFields.map((field) =>
          action.fieldIds.includes(field.id) ? { ...field, isAnnotated: true } : field
        ),
        documents: state.documents.map((doc) =>
          doc.id === state.selectedDocumentId ? { ...doc, status: "annotated" as const } : doc
        ),
      }

    case "RESET_ANNOTATIONS":
      return {
        ...state,
        extractedFields: mockExtractedFields,
        activeFieldId: null,
        selectedFieldId: null,
        highlightedRef: null,
        connectionFieldId: null,
        documents: state.documents.map((doc) =>
          doc.id === state.selectedDocumentId ? { ...doc, status: "new" as const } : doc
        ),
      }

    case "SET_HIGHLIGHTED_REF":
      return { ...state, highlightedRef: action.ref }

    case "SET_SELECTED_FIELD":
      return { ...state, selectedFieldId: action.fieldId }

    case "SET_ACTIVE_FIELD":
      return { ...state, activeFieldId: action.fieldId }

    case "SET_CONNECTION_FIELD":
      return { ...state, connectionFieldId: action.fieldId }

    case "SET_SELECTION_MODE":
      return { ...state, selectionUpdateMode: action.mode }

    case "UPDATE_GROUP_META":
      return {
        ...state,
        groupMeta: {
          ...state.groupMeta,
          [action.groupName]: {
            name: action.groupName,
            fieldCount: state.groupMeta[action.groupName]?.fieldCount ?? 0,
            instructions: state.groupMeta[action.groupName]?.instructions ?? "",
            ...state.groupMeta[action.groupName],
            ...action.updates,
          },
        },
      }

    case "FOCUS_BUSINESS_CHECK":
      return {
        ...state,
        focusedBusinessCheckId: action.checkId,
        focusedBusinessCheckFieldId: action.fieldId,
      }

    case "FOCUS_TAXONOMY":
      return {
        ...state,
        focusedTaxonomyFieldId: action.fieldId,
        focusedTaxonomyGroupName: action.groupName,
      }

    case "SET_PREDICTING":
      return { ...state, isPredicting: action.value }

    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AnnotationContextValue {
  state: AnnotationState
  dispatch: Dispatch<Action>
  // Derived helpers
  selectedDocument: Document | undefined
  connectionField: ExtractedField | undefined
  // Composed action creators
  selectDocument: (id: string) => void
  updateDocument: (docId: string, updates: Partial<Document>) => void
  resetDocument: (docId: string) => void
  updateField: (fieldId: string, updates: Partial<ExtractedField>) => void
  annotateFields: (fieldIds: string[]) => void
  resetAnnotations: () => void
  setHighlightedRef: (ref: HighlightReference | null) => void
  setSelectedField: (fieldId: string | null) => void
  setActiveField: (fieldId: string | null) => void
  setConnectionField: (fieldId: string | null) => void
  setSelectionMode: (mode: SelectionUpdateMode) => void
  updateGroupMeta: (groupName: string, updates: Partial<FieldGroupMeta>) => void
  focusBusinessCheck: (checkId: string | null, fieldId: string | null) => void
  focusTaxonomy: (fieldId: string | null, groupName: string | null) => void
  triggerPrediction: () => void
  handleReferenceClick: (reference: HighlightReference, fieldId?: string) => void
  handleTextSelection: (selectedText: string, page: number, position: { x: number; y: number }) => void
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function AnnotationStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const predictionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Derived state ────────────────────────────────────────────────────────
  const selectedDocument = state.documents.find((d) => d.id === state.selectedDocumentId)
  const connectionField = state.connectionFieldId
    ? state.extractedFields.find((f) => f.id === state.connectionFieldId)
    : undefined

  // ── Action creators ──────────────────────────────────────────────────────
  const selectDocument = useCallback((id: string) => dispatch({ type: "SELECT_DOCUMENT", id }), [])

  const updateDocument = useCallback(
    (docId: string, updates: Partial<Document>) => dispatch({ type: "UPDATE_DOCUMENT", docId, updates }),
    []
  )

  const resetDocument = useCallback(
    (docId: string) => dispatch({ type: "RESET_DOCUMENT", docId }),
    []
  )

  const updateField = useCallback(
    (fieldId: string, updates: Partial<ExtractedField>) => {
      dispatch({ type: "UPDATE_FIELD", fieldId, updates })
      dispatch({ type: "TRANSITION_TO_EDITING", docId: state.selectedDocumentId })
      if ("instructions" in updates) triggerPrediction()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.selectedDocumentId]
  )

  const annotateFields = useCallback(
    (fieldIds: string[]) => dispatch({ type: "ANNOTATE_FIELDS", fieldIds }),
    []
  )

  const resetAnnotations = useCallback(() => dispatch({ type: "RESET_ANNOTATIONS" }), [])

  const setHighlightedRef = useCallback(
    (ref: HighlightReference | null) => dispatch({ type: "SET_HIGHLIGHTED_REF", ref }),
    []
  )

  const setSelectedField = useCallback(
    (fieldId: string | null) => dispatch({ type: "SET_SELECTED_FIELD", fieldId }),
    []
  )

  const setActiveField = useCallback(
    (fieldId: string | null) => dispatch({ type: "SET_ACTIVE_FIELD", fieldId }),
    []
  )

  const setConnectionField = useCallback(
    (fieldId: string | null) => dispatch({ type: "SET_CONNECTION_FIELD", fieldId }),
    []
  )

  const setSelectionMode = useCallback(
    (mode: SelectionUpdateMode) => dispatch({ type: "SET_SELECTION_MODE", mode }),
    []
  )

  const updateGroupMeta = useCallback(
    (groupName: string, updates: Partial<FieldGroupMeta>) => {
      dispatch({ type: "UPDATE_GROUP_META", groupName, updates })
      if ("instructions" in updates) triggerPrediction()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const focusBusinessCheck = useCallback(
    (checkId: string | null, fieldId: string | null) =>
      dispatch({ type: "FOCUS_BUSINESS_CHECK", checkId, fieldId }),
    []
  )

  const focusTaxonomy = useCallback(
    (fieldId: string | null, groupName: string | null) =>
      dispatch({ type: "FOCUS_TAXONOMY", fieldId, groupName }),
    []
  )

  const triggerPrediction = useCallback(() => {
    if (predictionTimerRef.current) clearTimeout(predictionTimerRef.current)
    dispatch({ type: "SET_PREDICTING", value: true })
    const duration = 3000 + Math.random() * 2000
    predictionTimerRef.current = setTimeout(
      () => dispatch({ type: "SET_PREDICTING", value: false }),
      duration
    )
  }, [])

  // ── Composed actions ─────────────────────────────────────────────────────
  const handleReferenceClick = useCallback(
    (reference: HighlightReference, fieldId?: string) => {
      setHighlightedRef(reference)
      // Navigate the viewer to the reference page – stored alongside the highlight ref
      // DocumentViewer reads currentPage from layout store; we expose the page via highlightedRef.page
      if (fieldId) setConnectionField(fieldId)
    },
    [setHighlightedRef, setConnectionField]
  )

  const handleTextSelection = useCallback(
    (selectedText: string, page: number, position: { x: number; y: number }) => {
      if (!state.activeFieldId) return
      const newReference: HighlightReference = { text: selectedText, page, position }

      if (state.selectionUpdateMode === "both") {
        updateField(state.activeFieldId, {
          value: selectedText,
          reference: newReference,
          editType: "selection",
          referenceOnlyUpdate: false,
          isMissing: false,
          isReferenceMissing: false,
        })
      } else {
        updateField(state.activeFieldId, {
          reference: newReference,
          referenceOnlyUpdate: true,
          isReferenceMissing: false,
        })
      }

      setHighlightedRef(newReference)
      setActiveField(null)
    },
    [state.activeFieldId, state.selectionUpdateMode, updateField, setHighlightedRef, setActiveField]
  )

  const value: AnnotationContextValue = {
    state,
    dispatch,
    selectedDocument,
    connectionField,
    selectDocument,
    updateDocument,
    resetDocument,
    updateField,
    annotateFields,
    resetAnnotations,
    setHighlightedRef,
    setSelectedField,
    setActiveField,
    setConnectionField,
    setSelectionMode,
    updateGroupMeta,
    focusBusinessCheck,
    focusTaxonomy,
    triggerPrediction,
    handleReferenceClick,
    handleTextSelection,
  }

  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAnnotationStore() {
  const ctx = useContext(AnnotationContext)
  if (!ctx) throw new Error("useAnnotationStore must be used inside <AnnotationStoreProvider>")
  return ctx
}
