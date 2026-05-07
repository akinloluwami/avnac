import {
  createContext,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useContext,
} from 'react'

import type { SceneImage, SceneObject, SceneText } from '../../lib/avnac-scene'
import type { MarqueeRect, ResizeHandleId, SceneSnapGuide } from '../../scene-engine/primitives'
import type { CanvasAlignKind, CanvasSpacingAxis } from '../canvas-element-toolbar'

type ElementToolbarLayout = {
  left: number
  top: number
  placement: 'above' | 'below'
}

export type CanvasStageContextValue = {
  actions: {
    activatePage: (pageId: string, options?: { selectBackground?: boolean }) => void
    addPage: (afterPageId?: string) => void
    alignElementToArtboard: (kind: CanvasAlignKind) => void
    alignSelectedElements: (kind: CanvasAlignKind) => void
    commitTextDraft: () => void
    copyElementToClipboard: () => void
    deleteSelection: () => void
    deletePage: (pageId?: string) => void
    duplicatePage: (sourcePageId?: string) => void
    duplicateElement: () => void
    distributeGroupSpacing: (axis: CanvasSpacingAxis) => void
    groupSelection: () => void
    onArtboardPointerEnter: (e: ReactPointerEvent<HTMLDivElement>) => void
    onArtboardPointerLeave: () => void
    onArtboardPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void
    onObjectHoverChange: (id: string, hovering: boolean) => void
    onObjectPointerDown: (e: ReactPointerEvent<HTMLDivElement>, obj: SceneObject) => void
    onRotateHandlePointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void
    onSelectionHandlePointerDown: (
      e: ReactPointerEvent<HTMLButtonElement>,
      handle: ResizeHandleId,
    ) => void
    onTextDoubleClick: (textObj: SceneText) => void
    onTextDraftChange: (value: string) => void
    onViewportPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
    pasteFromClipboard: () => void
    setGroupSpacing: (axis: CanvasSpacingAxis, gap: number) => void
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
    elementToolbarCanDistributeGroupSpacing: boolean
    elementToolbarCanGroup: boolean
    elementToolbarCanSpaceGroup: boolean
    elementToolbarCanUngroup: boolean
    elementToolbarGroupSpacingValues: Record<CanvasSpacingAxis, number | null> | null
    elementToolbarLayout: ElementToolbarLayout | null
    elementToolbarLockedDisplay: boolean
    hasObjectSelected: boolean
    marqueeRect: MarqueeRect | null
    imageRemovalEffect: {
      object: SceneImage
      phase: 'running' | 'success'
    } | null
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
  return <CanvasStageContext.Provider value={value}>{children}</CanvasStageContext.Provider>
}

export function useCanvasStageContext() {
  const value = useContext(CanvasStageContext)
  if (!value) {
    throw new Error('useCanvasStageContext must be used within CanvasStageProvider')
  }
  return value
}
