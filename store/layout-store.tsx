"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

type LayoutPreset = "annotate" | "measure" | "schema"

interface LayoutState {
  showDocumentBrowser: boolean
  layoutPreset: LayoutPreset
  panelWidth: number
  bottomPanelHeight: number
  currentPage: number
  zoom: number
}

interface LayoutContextValue extends LayoutState {
  setShowDocumentBrowser: (show: boolean) => void
  toggleDocumentBrowser: () => void
  setLayoutPreset: (preset: LayoutPreset) => void
  setPanelWidth: (width: number) => void
  setBottomPanelHeight: (height: number) => void
  setCurrentPage: (page: number) => void
  setZoom: (zoom: number) => void
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

export function LayoutStoreProvider({ children }: { children: ReactNode }) {
  const [showDocumentBrowser, setShowDocumentBrowser] = useState(true)
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("annotate")
  const [panelWidth, setPanelWidth] = useState(400)
  const [bottomPanelHeight, setBottomPanelHeight] = useState(256)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)

  const toggleDocumentBrowser = useCallback(
    () => setShowDocumentBrowser((v) => !v),
    []
  )

  return (
    <LayoutContext.Provider
      value={{
        showDocumentBrowser,
        layoutPreset,
        panelWidth,
        bottomPanelHeight,
        currentPage,
        zoom,
        setShowDocumentBrowser,
        toggleDocumentBrowser,
        setLayoutPreset,
        setPanelWidth,
        setBottomPanelHeight,
        setCurrentPage,
        setZoom,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayoutStore() {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error("useLayoutStore must be used inside <LayoutStoreProvider>")
  return ctx
}
