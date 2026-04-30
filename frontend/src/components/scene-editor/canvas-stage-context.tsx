import {
  createContext,
  useContext,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'

import type {
  SceneObject,
  SceneText,
} from '../../lib/avnac-scene'
import type { CanvasAlignKind } from '../canvas-element-toolbar'
import type {
  MarqueeRect,
  ResizeHandleId,
  SceneSnapGuide,
} from '../../scene-engine/primitives'

type ElementToolbarLayout = {
  left: number
  top: number
  placement: 'above' | 'below'
}

export type CanvasStageContextValue = {
  actions: {
    activatePage: (pageId: string) => void
    addPage: (afterPageId?: string) => void
    alignElementToArtboard: (kind: CanvasAlignKind) => void
    alignSelectedElements: (kind: CanvasAlignKind) => void
    commitTextDraft: () => void
    copyElementToClipboard: () => void
    deleteSelection: () => void
    deletePage: (pageId?: string) => void
    duplicatePage: (sourcePageId?: string) => void
    duplicateElement: () => void
    groupSelection: () => void
    onArtboardPointerEnter: () => void
    onArtboardPointerLeave: () => void
    onArtboardPointerMove: () => void
    onObjectHoverChange: (id: string, hovering: boolean) => void
    onObjectPointerDown: (
      e: ReactPointerEvent<HTMLDivElement>,
      obj: SceneObject,
    ) => void
    onRotateHandlePointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void
    onSelectionHandlePointerDown: (
      e: ReactPointerEvent<HTMLButtonElement>,
      handle: ResizeHandleId,
    ) => void
    onTextDoubleClick: (textObj: SceneText) => void
    onTextDraftChange: (value: string) => void
    onViewportPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
    pasteFromClipboard: () => void
    toggleElementLock: () => void
    ungroupSelection: () => void
  }
  refs: {
    artboardInnerRef: RefObject<HTMLDivElement | null>
    artboardOuterRef: RefObject<HTMLDivElement | null>
    elementToolbarRef: RefObject<HTMLDivElement | null>
    viewportRef: RefObject<HTMLDivElement | null>
  }
  state: {
    backgroundActive: boolean
    backgroundHovered: boolean
    deletingPageIds: string[]
    editingSelectedText: boolean
    elementToolbarAlignAlready: Record<CanvasAlignKind, boolean> | null
    elementToolbarCanAlignElements: boolean
    elementToolbarCanGroup: boolean
    elementToolbarCanUngroup: boolean
    elementToolbarLayout: ElementToolbarLayout | null
    elementToolbarLockedDisplay: boolean
    hasObjectSelected: boolean
    marqueeRect: MarqueeRect | null
    ready: boolean
    scale: number
    selectedObjects: SceneObject[]
    selectedSingle: SceneObject | null
    selectionBounds: { left: number; top: number; width: number; height: number } | null
    snapGuides: SceneSnapGuide[]
    textDraft: string
    textEditingId: string | null
  }
}

const CanvasStageContext = createContext<CanvasStageContextValue | null>(null)

export function CanvasStageProvider({
  children,
  value,
}: {
  children: ReactNode
  value: CanvasStageContextValue
}) {
  return (
    <CanvasStageContext.Provider value={value}>
      {children}
    </CanvasStageContext.Provider>
  )
}

export function useCanvasStageContext() {
  const value = useContext(CanvasStageContext)
  if (!value) {
    throw new Error('useCanvasStageContext must be used within CanvasStageProvider')
  }
  return value
}
