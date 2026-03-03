"use client"

import { useCallback } from "react"
import { Tags, BarChart3, ShieldCheck } from "lucide-react"

import { DocumentBrowser } from "@/components/document-browser"
import { DocumentViewer } from "@/components/document-viewer"
import { ExtractionPanel } from "@/components/extraction-panel"
import { ConnectionLine } from "@/components/connection-line"
import { GlobalHeader } from "@/components/global-header"
import { SubHeader } from "@/components/sub-header"
import { BottomDropZonePlaceholder } from "@/components/bottom-drop-zone"
import { BusinessChecksPanel } from "@/components/business-checks-panel"
import { TaxonomyPanel } from "@/components/taxonomy-panel"
import {
  PanelManagerProvider,
  usePanelManager,
  type PanelId,
} from "@/components/panel-manager"
import {
  DraggablePanel,
  DropZoneIndicator,
  DragGhost,
  DropZone,
} from "@/components/draggable-panel"

import { AnnotationStoreProvider, useAnnotationStore } from "@/store/annotation-store"
import { LayoutStoreProvider, useLayoutStore } from "@/store/layout-store"
import { useRightPanelResize, useBottomPanelResize } from "@/hooks/use-panel-resize"
import { mockBusinessChecks } from "@/lib/mock-data"

// ── Root: wraps all providers ─────────────────────────────────────────────────

export function AnnotationInterface() {
  return (
    <AnnotationStoreProvider>
      <LayoutStoreProvider>
        <PanelManagerProvider>
          <AnnotationInterfaceContent />
        </PanelManagerProvider>
      </LayoutStoreProvider>
    </AnnotationStoreProvider>
  )
}

// ── Inner content: consumes all stores ────────────────────────────────────────

function AnnotationInterfaceContent() {
  const {
    state,
    selectedDocument,
    connectionField,
    selectDocument,
    updateDocument,
    resetDocument,
    updateField,
    annotateFields,
    resetAnnotations,
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
  } = useAnnotationStore()

  const { showDocumentBrowser, toggleDocumentBrowser, layoutPreset, setLayoutPreset, currentPage, setCurrentPage, zoom, setZoom } =
    useLayoutStore()

  const { panels, openPanel, getRightPanels, getBottomPanels, closePanel, movePanelToZone, updatePanelSize } =
    usePanelManager()

  const rightPanels = getRightPanels()
  const bottomPanels = getBottomPanels()

  // Resize hooks
  const { width: panelWidth, startResize: startRightResize } = useRightPanelResize({
    initialWidth: 400,
    onWidthChange: (w) => updatePanelSize("extractions", w),
  })

  const { height: bottomPanelHeight, startResize: startBottomResize } = useBottomPanelResize()

  const rightPanelsWidth = rightPanels.reduce((sum, p) => sum + p.width, 0)

  // ── Composed handlers that touch multiple concerns ─────────────────────

  const handleResetLayout = useCallback(() => {
    panels.forEach((p) => {
      if (p.id !== "extractions" && p.isOpen) closePanel(p.id)
    })
    // showDocumentBrowser is managed inside LayoutStore; restore default
    toggleDocumentBrowser()
  }, [panels, closePanel, toggleDocumentBrowser])

  const handleAddPanel = useCallback(
    (panelType: "taxonomy" | "measure" | "business-checks") => {
      const idMap: Record<string, PanelId> = {
        taxonomy: "taxonomy",
        measure: "measure",
        "business-checks": "business-checks",
      }
      openPanel(idMap[panelType])
    },
    [openPanel]
  )

  const handleBusinessCheckClick = useCallback(
    (fieldId: string) => {
      const relatedCheck = mockBusinessChecks.find((check) =>
        check.inputFields.some(
          (f) => f.fieldId === fieldId || f.fieldId.startsWith(fieldId.split("-")[0])
        )
      )
      if (relatedCheck) focusBusinessCheck(relatedCheck.id, fieldId)
      openPanel("business-checks")
    },
    [focusBusinessCheck, openPanel]
  )

  const handleEditField = useCallback(
    (fieldId: string) => {
      focusTaxonomy(fieldId, null)
      openPanel("taxonomy")
    },
    [focusTaxonomy, openPanel]
  )

  const handleEditGroup = useCallback(
    (groupName: string) => {
      focusTaxonomy(null, groupName)
      openPanel("taxonomy")
    },
    [focusTaxonomy, openPanel]
  )

  // Reference click also drives the viewer page
  const handleRefClick = useCallback(
    (reference: Parameters<typeof handleReferenceClick>[0], fieldId?: string) => {
      handleReferenceClick(reference, fieldId)
      setCurrentPage(reference.page)
    },
    [handleReferenceClick, setCurrentPage]
  )

  // Field select: clear connection/highlight when a different field is selected
  const handleFieldSelect = useCallback(
    (fieldId: string | null) => {
      setSelectedField(fieldId)
      if (fieldId && fieldId !== state.connectionFieldId) {
        setConnectionField(null)
        // setHighlightedRef handled in store via SET_HIGHLIGHTED_REF but we
        // clear it here as an explicit UI action
      }
    },
    [setSelectedField, setConnectionField, state.connectionFieldId]
  )

  // ── ExtractionPanel shared props ─────────────────────────────────────────
  const extractionPanelProps = {
    fields: state.extractedFields,
    activeFieldId: state.activeFieldId,
    selectedFieldId: state.selectedFieldId,
    selectionUpdateMode: state.selectionUpdateMode,
    onFieldUpdate: updateField,
    onAnnotate: annotateFields,
    onReferenceClick: handleRefClick,
    onFieldActivate: setActiveField,
    onFieldSelect: handleFieldSelect,
    onSelectionUpdateModeChange: setSelectionMode,
    onAddPanel: handleAddPanel,
    onBusinessCheckClick: handleBusinessCheckClick,
    businessChecks: mockBusinessChecks,
    onEditField: handleEditField,
    onEditGroup: handleEditGroup,
    groupMeta: state.groupMeta,
    onResetAnnotations: resetAnnotations,
    onRePredict: triggerPrediction,
    isPredicting: state.isPredicting,
  } as const

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/30">
      <GlobalHeader productName="DocuMind" />

      <SubHeader
        experienceName="Model Building"
        activeLayout={layoutPreset}
        onLayoutChange={setLayoutPreset}
        onResetLayout={handleResetLayout}
        modelScore={78}
        onBack={() => {}}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Connection line between focused field and its document highlight */}
        <ConnectionLine
          sourceId={state.connectionFieldId}
          targetRef={connectionField?.reference.text ?? null}
          color={connectionField?.color ?? "rgb(59, 130, 246)"}
          isActive={!!state.connectionFieldId && !!state.highlightedRef}
        />

        {/* Left – Document Browser */}
        {showDocumentBrowser && (
          <DocumentBrowser
            documents={state.documents}
            selectedDocumentId={state.selectedDocumentId}
            onDocumentSelect={selectDocument}
            extractedFields={state.extractedFields}
            onResetDocument={resetDocument}
            onUpdateDocument={updateDocument}
          />
        )}

        {/* Centre – Document Viewer */}
        <DocumentViewer
          document={selectedDocument}
          documents={state.documents}
          currentPage={currentPage}
          zoom={zoom}
          highlightedRef={state.highlightedRef}
          activeFieldId={state.activeFieldId}
          selectedFieldId={state.selectedFieldId}
          fields={state.extractedFields}
          showDocumentBrowser={showDocumentBrowser}
          onPageChange={setCurrentPage}
          onZoomChange={setZoom}
          onTextSelection={handleTextSelection}
          onDocumentSelect={selectDocument}
          onToggleDocumentBrowser={toggleDocumentBrowser}
        />

        {/* Right – Side panels */}
        {rightPanels.length > 0 && (
          <div
            className="relative flex h-full"
            style={{ width: rightPanelsWidth > 0 ? rightPanelsWidth : panelWidth }}
          >
            {/* Resize handle */}
            <div
              className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-20 group"
              onMouseDown={startRightResize}
            >
              <div className="absolute inset-y-0 left-0 w-0.5 bg-border group-hover:bg-primary/50" />
            </div>

            {/* Extractions panel (right-docked) */}
            {rightPanels.some((p) => p.id === "extractions") && (
              <div className="flex-1 min-w-0 border-l border-border">
                <ExtractionPanel
                  {...extractionPanelProps}
                  onDockToggle={() => movePanelToZone("extractions", "bottom-full")}
                  isDockedBottom={false}
                />
              </div>
            )}

            {/* Other right-docked floating panels */}
            {rightPanels
              .filter((p) => p.id !== "extractions")
              .map((panel) => (
                <DraggablePanel
                  key={panel.id}
                  id={panel.id}
                  title={panel.title}
                  icon={<PanelIcon id={panel.id} />}
                >
                  <PanelContent
                    panelId={panel.id}
                    state={state}
                    onFieldClick={handleRefClick}
                    onFieldUpdate={updateField}
                    onGroupMetaUpdate={updateGroupMeta}
                  />
                </DraggablePanel>
              ))}

            <DropZone zone="right" />
          </div>
        )}
      </div>

      {/* Bottom panels */}
      {bottomPanels.length > 0 ? (
        <div className="flex flex-col relative" style={{ height: bottomPanelHeight }}>
          {/* Resize handle */}
          <div
            className="absolute left-0 right-0 top-0 h-1.5 cursor-ns-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-20 group"
            onMouseDown={startBottomResize}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-border group-hover:bg-primary/50" />
          </div>

          <div className="flex flex-1 min-h-0 border-t border-border">
            {bottomPanels.map((panel) =>
              panel.id === "extractions" ? (
                <div
                  key={panel.id}
                  className="flex-1 min-w-0 border-r border-border last:border-r-0 h-full overflow-hidden"
                >
                  <ExtractionPanel
                    {...extractionPanelProps}
                    onDockToggle={() => movePanelToZone("extractions", "right")}
                    isDockedBottom
                  />
                </div>
              ) : (
                <DraggablePanel
                  key={panel.id}
                  id={panel.id}
                  title={panel.title}
                  icon={<PanelIcon id={panel.id} />}
                >
                  <PanelContent
                    panelId={panel.id}
                    state={state}
                    onFieldClick={handleRefClick}
                    onFieldUpdate={updateField}
                    onGroupMetaUpdate={updateGroupMeta}
                  />
                </DraggablePanel>
              )
            )}
          </div>

          <DropZone zone="bottom-full" className="absolute inset-0" />
        </div>
      ) : (
        <BottomDropZonePlaceholder />
      )}

      <DropZoneIndicator />
      <DragGhost />
    </div>
  )
}

// ── Small pure helpers ────────────────────────────────────────────────────────

function PanelIcon({ id }: { id: PanelId }) {
  if (id === "taxonomy") return <Tags className="h-3.5 w-3.5" />
  if (id === "measure") return <BarChart3 className="h-3.5 w-3.5" />
  if (id === "business-checks") return <ShieldCheck className="h-3.5 w-3.5" />
  return null
}

type AnnotationState = ReturnType<typeof useAnnotationStore>["state"]

interface PanelContentProps {
  panelId: PanelId
  state: AnnotationState
  onFieldClick: (ref: Parameters<typeof handleReferenceClick>[0], fieldId?: string) => void
  onFieldUpdate: ReturnType<typeof useAnnotationStore>["updateField"]
  onGroupMetaUpdate: ReturnType<typeof useAnnotationStore>["updateGroupMeta"]
}

// Avoid re-importing the hook type – just narrow the ref click signature inline
function PanelContent({
  panelId,
  state,
  onFieldClick,
  onFieldUpdate,
  onGroupMetaUpdate,
}: PanelContentProps) {
  if (panelId === "business-checks") {
    return (
      <BusinessChecksPanel
        businessChecks={mockBusinessChecks}
        focusedCheckId={state.focusedBusinessCheckId}
        focusedFieldId={state.focusedBusinessCheckFieldId}
        onFieldClick={onFieldClick}
      />
    )
  }
  if (panelId === "taxonomy") {
    return (
      <TaxonomyPanel
        fields={state.extractedFields}
        focusedFieldId={state.focusedTaxonomyFieldId}
        focusedGroupName={state.focusedTaxonomyGroupName}
        groupMeta={state.groupMeta}
        onFieldUpdate={onFieldUpdate}
        onGroupMetaUpdate={onGroupMetaUpdate}
      />
    )
  }
  return null
}

// Needed for the PanelContentProps type – grab the function signature from the hook
declare function handleReferenceClick(
  reference: import("@/lib/types").HighlightReference,
  fieldId?: string
): void
