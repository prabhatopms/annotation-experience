"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"

export type PanelId = "extractions" | "business-checks" | "taxonomy" | "measure"
export type DropZoneType = "right" | "bottom-full" | "bottom-left" | "bottom-center" | "bottom-right"
// Alias for backward compatibility
export type DropZone = DropZoneType

export interface PanelConfig {
  id: PanelId
  title: string
  icon: React.ReactNode
  isOpen: boolean
  width: number
  height: number
  minWidth: number
  minHeight: number
  zone: DropZoneType
  order: number
}

interface DragState {
  panelId: PanelId | null
  startX: number
  startY: number
  currentX: number
  currentY: number
  isDragging: boolean
}

interface ResizeState {
  panelId: PanelId | null
  edge: "left" | "right" | "top" | "bottom" | null
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  isResizing: boolean
}

interface DropIndicator {
  zone: DropZoneType | null
  show: boolean
  rect: { x: number; y: number; width: number; height: number } | null
}

interface PanelManagerContextType {
  panels: PanelConfig[]
  dragState: DragState
  resizeState: ResizeState
  dropIndicator: DropIndicator
  hoveredPanelId: PanelId | null
  
  // Panel operations
  openPanel: (id: PanelId) => void
  closePanel: (id: PanelId) => void
  updatePanelSize: (id: PanelId, width?: number, height?: number) => void
  movePanelToZone: (id: PanelId, zone: DropZoneType) => void
  reorderPanels: (sourceId: PanelId, targetId: PanelId, position: "before" | "after") => void
  
  // Drag operations
  startDrag: (panelId: PanelId, x: number, y: number) => void
  updateDrag: (x: number, y: number) => void
  endDrag: () => void
  
  // Resize operations
  startResize: (panelId: PanelId, edge: ResizeState["edge"], x: number, y: number) => void
  updateResize: (x: number, y: number) => void
  endResize: () => void
  
  // Hover state
  setHoveredPanel: (id: PanelId | null) => void
  
  // Drop indicator
  updateDropIndicator: (zone: DropZoneType | null, rect?: DropIndicator["rect"]) => void
  
  // Helpers
  getPanelsByZone: (zone: DropZoneType) => PanelConfig[]
  getRightPanels: () => PanelConfig[]
  getBottomPanels: () => PanelConfig[]
}

const PanelManagerContext = createContext<PanelManagerContextType | null>(null)

export function usePanelManager() {
  const context = useContext(PanelManagerContext)
  if (!context) {
    throw new Error("usePanelManager must be used within PanelManagerProvider")
  }
  return context
}

interface PanelManagerProviderProps {
  children: React.ReactNode
  initialPanels?: Partial<PanelConfig>[]
}

export function PanelManagerProvider({ children, initialPanels }: PanelManagerProviderProps) {
  const [panels, setPanels] = useState<PanelConfig[]>([
    {
      id: "extractions",
      title: "Extractions",
      icon: null,
      isOpen: true,
      width: 400,
      height: 300,
      minWidth: 280,
      minHeight: 200,
      zone: "right",
      order: 0,
    },
    {
      id: "business-checks",
      title: "Business Checks",
      icon: null,
      isOpen: false,
      width: 320,
      height: 300,
      minWidth: 280,
      minHeight: 200,
      zone: "right",
      order: 1,
    },
    {
      id: "taxonomy",
      title: "Taxonomy",
      icon: null,
      isOpen: false,
      width: 320,
      height: 300,
      minWidth: 280,
      minHeight: 200,
      zone: "right",
      order: 2,
    },
    {
      id: "measure",
      title: "Measure",
      icon: null,
      isOpen: false,
      width: 320,
      height: 300,
      minWidth: 280,
      minHeight: 200,
      zone: "right",
      order: 3,
    },
  ])

  const [dragState, setDragState] = useState<DragState>({
    panelId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
  })

  const [resizeState, setResizeState] = useState<ResizeState>({
    panelId: null,
    edge: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    isResizing: false,
  })

  const [dropIndicator, setDropIndicator] = useState<DropIndicator>({
    zone: null,
    show: false,
    rect: null,
  })

  const [hoveredPanelId, setHoveredPanelId] = useState<PanelId | null>(null)

  const openPanel = useCallback((id: PanelId) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, isOpen: true } : p))
  }, [])

  const closePanel = useCallback((id: PanelId) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, isOpen: false } : p))
  }, [])

  const updatePanelSize = useCallback((id: PanelId, width?: number, height?: number) => {
    setPanels(prev => prev.map(p => {
      if (p.id !== id) return p
      return {
        ...p,
        width: width !== undefined ? Math.max(p.minWidth, width) : p.width,
        height: height !== undefined ? Math.max(p.minHeight, height) : p.height,
      }
    }))
  }, [])

  const movePanelToZone = useCallback((id: PanelId, zone: DropZoneType) => {
    setPanels(prev => {
      const panelsInZone = prev.filter(p => p.zone === zone && p.isOpen)
      const maxOrder = panelsInZone.length > 0 ? Math.max(...panelsInZone.map(p => p.order)) + 1 : 0
      return prev.map(p => p.id === id ? { ...p, zone, order: maxOrder } : p)
    })
  }, [])

  const reorderPanels = useCallback((sourceId: PanelId, targetId: PanelId, position: "before" | "after") => {
    setPanels(prev => {
      const sourcePanel = prev.find(p => p.id === sourceId)
      const targetPanel = prev.find(p => p.id === targetId)
      if (!sourcePanel || !targetPanel) return prev
      
      // Move source to same zone as target
      const newZone = targetPanel.zone
      const panelsInZone = prev
        .filter(p => p.zone === newZone && p.isOpen && p.id !== sourceId)
        .sort((a, b) => a.order - b.order)
      
      const targetIndex = panelsInZone.findIndex(p => p.id === targetId)
      const insertIndex = position === "before" ? targetIndex : targetIndex + 1
      
      // Recalculate orders
      const reorderedPanels = [...panelsInZone]
      reorderedPanels.splice(insertIndex, 0, { ...sourcePanel, zone: newZone })
      
      return prev.map(p => {
        const reorderedIndex = reorderedPanels.findIndex(rp => rp.id === p.id)
        if (reorderedIndex !== -1) {
          return { ...p, zone: newZone, order: reorderedIndex }
        }
        return p
      })
    })
  }, [])

  const startDrag = useCallback((panelId: PanelId, x: number, y: number) => {
    setDragState({
      panelId,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      isDragging: true,
    })
  }, [])

  const updateDrag = useCallback((x: number, y: number) => {
    setDragState(prev => ({ ...prev, currentX: x, currentY: y }))
  }, [])

  const endDrag = useCallback(() => {
    if (dragState.panelId && dropIndicator.zone) {
      movePanelToZone(dragState.panelId, dropIndicator.zone)
    }
    setDragState({
      panelId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
    })
    setDropIndicator({ zone: null, show: false, rect: null })
  }, [dragState.panelId, dropIndicator.zone, movePanelToZone])

  const startResize = useCallback((panelId: PanelId, edge: ResizeState["edge"], x: number, y: number) => {
    const panel = panels.find(p => p.id === panelId)
    if (!panel) return
    
    setResizeState({
      panelId,
      edge,
      startX: x,
      startY: y,
      startWidth: panel.width,
      startHeight: panel.height,
      isResizing: true,
    })
  }, [panels])

  const updateResize = useCallback((x: number, y: number) => {
    if (!resizeState.isResizing || !resizeState.panelId || !resizeState.edge) return
    
    const deltaX = x - resizeState.startX
    const deltaY = y - resizeState.startY
    
    let newWidth = resizeState.startWidth
    let newHeight = resizeState.startHeight
    
    if (resizeState.edge === "left") {
      newWidth = resizeState.startWidth - deltaX
    } else if (resizeState.edge === "right") {
      newWidth = resizeState.startWidth + deltaX
    } else if (resizeState.edge === "top") {
      newHeight = resizeState.startHeight - deltaY
    } else if (resizeState.edge === "bottom") {
      newHeight = resizeState.startHeight + deltaY
    }
    
    updatePanelSize(resizeState.panelId, newWidth, newHeight)
  }, [resizeState, updatePanelSize])

  const endResize = useCallback(() => {
    setResizeState({
      panelId: null,
      edge: null,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
      isResizing: false,
    })
  }, [])

  const setHoveredPanel = useCallback((id: PanelId | null) => {
    setHoveredPanelId(id)
  }, [])

  const updateDropIndicator = useCallback((zone: DropZoneType | null, rect?: DropIndicator["rect"]) => {
    setDropIndicator({ zone, show: zone !== null, rect: rect || null })
  }, [])

  const getPanelsByZone = useCallback((zone: DropZoneType) => {
    return panels
      .filter(p => p.zone === zone && p.isOpen)
      .sort((a, b) => a.order - b.order)
  }, [panels])

  const getRightPanels = useCallback(() => {
    return panels
      .filter(p => p.zone === "right" && p.isOpen)
      .sort((a, b) => a.order - b.order)
  }, [panels])

  const getBottomPanels = useCallback(() => {
    return panels
      .filter(p => p.zone.startsWith("bottom") && p.isOpen)
      .sort((a, b) => a.order - b.order)
  }, [panels])

  // Global mouse event handlers for drag and resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        updateDrag(e.clientX, e.clientY)
      }
      if (resizeState.isResizing) {
        updateResize(e.clientX, e.clientY)
      }
    }

    const handleMouseUp = () => {
      if (dragState.isDragging) {
        endDrag()
      }
      if (resizeState.isResizing) {
        endResize()
      }
    }

    if (dragState.isDragging || resizeState.isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = resizeState.isResizing 
        ? (resizeState.edge === "left" || resizeState.edge === "right" ? "ew-resize" : "ns-resize")
        : "grabbing"
      document.body.style.userSelect = "none"
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [dragState.isDragging, resizeState.isResizing, updateDrag, updateResize, endDrag, endResize, resizeState.edge])

  return (
    <PanelManagerContext.Provider
      value={{
        panels,
        dragState,
        resizeState,
        dropIndicator,
        hoveredPanelId,
        openPanel,
        closePanel,
        updatePanelSize,
        movePanelToZone,
        reorderPanels,
        startDrag,
        updateDrag,
        endDrag,
        startResize,
        updateResize,
        endResize,
        setHoveredPanel,
        updateDropIndicator,
        getPanelsByZone,
        getRightPanels,
        getBottomPanels,
      }}
    >
      {children}
    </PanelManagerContext.Provider>
  )
}
