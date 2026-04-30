import {
  createContext,
  useContext,
  type ReactNode,
  type RefObject,
} from 'react'

import type {
  ArrowLineStyle,
  ArrowPathType,
  AvnacShapeMeta,
} from '../../lib/avnac-shape-meta'
import type { BgValue } from '../background-popover'
import type { TextFormatToolbarValues } from '../text-format-toolbar'

export type SelectionShapeToolbarModel = {
  meta: AvnacShapeMeta
  paint: BgValue
  rectCornerRadius: number | undefined
  rectCornerRadiusMax: number | undefined
}

export type SelectionImageCornerToolbar = {
  radius: number
  max: number
}

type SelectionToolbarRefs = {
  backgroundPopoverAnchorRef: RefObject<HTMLDivElement | null>
  backgroundPopoverPanelRef: RefObject<HTMLDivElement | null>
  selectionToolsRef: RefObject<HTMLDivElement | null>
  viewportRef: RefObject<HTMLDivElement | null>
}

type SelectionToolbarState = {
  backgroundActive: boolean
  backgroundPopoverOpenUpward: boolean
  backgroundPopoverShiftX: number
  bgPopoverOpen: boolean
  elementToolbarLockedDisplay: boolean
  hasObjectSelected: boolean
  imageCornerToolbar: SelectionImageCornerToolbar | null
  ready: boolean
  selectionEffectsFooterSlot: ReactNode
  shapeToolbarModel: SelectionShapeToolbarModel | null
  textToolbarValues: TextFormatToolbarValues | null
}

type SelectionToolbarActions = {
  applyArrowLineStyle: (style: ArrowLineStyle) => void
  applyArrowPathType: (pathType: ArrowPathType) => void
  applyArrowRoundedEnds: (rounded: boolean) => void
  applyArrowStrokeWidth: (width: number) => void
  applyBackgroundPicked: (bg: BgValue) => void
  applyImageCornerRadius: (radius: number) => void
  applyPaintToSelection: (bg: BgValue) => void
  applyPolygonSides: (sides: number) => void
  applyRectCornerRadius: (radius: number) => void
  applyStarPoints: (points: number) => void
  onArtboardResize: (width: number, height: number) => void
  onTextFormatChange: (next: Partial<TextFormatToolbarValues>) => void
  openImageCropModal: () => void
  toggleBackgroundPopover: () => void
}

export type EditorSelectionToolbarContextValue = {
  actions: SelectionToolbarActions
  refs: SelectionToolbarRefs
  state: SelectionToolbarState
}

const EditorSelectionToolbarContext =
  createContext<EditorSelectionToolbarContextValue | null>(null)

export function EditorSelectionToolbarProvider({
  children,
  value,
}: {
  children: ReactNode
  value: EditorSelectionToolbarContextValue
}) {
  return (
    <EditorSelectionToolbarContext.Provider value={value}>
      {children}
    </EditorSelectionToolbarContext.Provider>
  )
}

export function useEditorSelectionToolbar() {
  const value = useContext(EditorSelectionToolbarContext)
  if (!value) {
    throw new Error(
      'useEditorSelectionToolbar must be used within EditorSelectionToolbarProvider',
    )
  }
  return value
}
