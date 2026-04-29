import { useMemo } from 'react'

import {
  getObjectRotatedBounds,
} from '../../lib/avnac-scene'
import CanvasElementToolbar, { type CanvasAlignKind } from '../canvas-element-toolbar'
import { SceneObjectView } from './object-view'
import {
  SelectionBoundsOverlay,
  SelectionOverlay,
  SnapGuidesOverlay,
} from './selection-overlays'
import { useEditorStore } from './editor-store'
import { useVectorBoardControlsContext } from './use-vector-board-controls'
import { useCanvasStageContext } from './canvas-stage-context'

const EMPTY_ALIGN_STATE: Record<CanvasAlignKind, boolean> = {
  left: false,
  centerH: false,
  right: false,
  top: false,
  centerV: false,
  bottom: false,
}

export function CanvasStage() {
  const { actions, refs, state } = useCanvasStageContext()
  const {
    alignElementToArtboard,
    alignSelectedElements,
    commitTextDraft,
    copyElementToClipboard,
    deleteSelection,
    duplicateElement,
    groupSelection,
    onArtboardPointerEnter,
    onArtboardPointerLeave,
    onArtboardPointerMove,
    onObjectHoverChange,
    onObjectPointerDown,
    onRotateHandlePointerDown,
    onSelectionHandlePointerDown,
    onTextDoubleClick,
    onTextDraftChange,
    onViewportPointerDown,
    pasteFromClipboard,
    toggleElementLock,
    ungroupSelection,
  } = actions
  const {
    artboardInnerRef,
    artboardOuterRef,
    elementToolbarRef,
    viewportRef,
  } = refs
  const {
    backgroundActive,
    backgroundHovered,
    editingSelectedText,
    elementToolbarAlignAlready,
    elementToolbarCanAlignElements,
    elementToolbarCanGroup,
    elementToolbarCanUngroup,
    elementToolbarLayout,
    elementToolbarLockedDisplay,
    hasObjectSelected,
    marqueeRect,
    ready,
    scale,
    selectedObjects,
    selectedSingle,
    selectionBounds,
    snapGuides,
    textDraft,
    textEditingId,
  } = state
  const artboard = useEditorStore((storeState) => {
    const { doc, activePageId } = storeState
    const page = doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0]
    return page.artboard
  })
  const bg = useEditorStore((state) => {
    const page = state.doc.pages.find((p) => p.id === state.activePageId) ?? state.doc.pages[0]
    return page.bg
  })
  const objects = useEditorStore((state) => {
    const page = state.doc.pages.find((p) => p.id === state.activePageId) ?? state.doc.pages[0]
    return page.objects
  })
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const hoveredId = useEditorStore((state) => state.hoveredId)
  const { boardDocs } = useVectorBoardControlsContext()
  const artboardW = artboard.width
  const artboardH = artboard.height
  const hoveredObject = useMemo(
    () =>
      hoveredId
        ? objects.find((obj) => obj.id === hoveredId && obj.visible) ?? null
        : null,
    [hoveredId, objects],
  )

  return (
    <div className="flex min-h-min w-full flex-1 flex-col items-center justify-center px-4 pb-4 pt-0 sm:px-6 sm:pb-6 sm:pt-1">
      <div className="relative z-0 -mt-4 inline-block sm:-mt-5">
        {ready && hasObjectSelected && elementToolbarLayout && !editingSelectedText ? (
          <CanvasElementToolbar
            ref={elementToolbarRef}
            style={{
              left: elementToolbarLayout.left,
              top: elementToolbarLayout.top,
            }}
            placement={elementToolbarLayout.placement}
            viewportRef={viewportRef}
            locked={elementToolbarLockedDisplay}
            onDuplicate={duplicateElement}
            onToggleLock={toggleElementLock}
            onDelete={deleteSelection}
            onCopy={copyElementToClipboard}
            onPaste={pasteFromClipboard}
            onAlign={alignElementToArtboard}
            alignAlreadySatisfied={elementToolbarAlignAlready ?? EMPTY_ALIGN_STATE}
            canGroup={elementToolbarCanGroup}
            canAlignElements={elementToolbarCanAlignElements}
            canUngroup={elementToolbarCanUngroup}
            onGroup={groupSelection}
            onAlignElements={alignSelectedElements}
            onUngroup={ungroupSelection}
          />
        ) : null}

        <div
          ref={artboardOuterRef}
          className="relative rounded-sm"
          style={{
            width: artboardW * scale,
            height: artboardH * scale,
            lineHeight: 0,
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          <div
            ref={artboardInnerRef}
            className="absolute left-0 top-0 select-none overflow-visible rounded-sm bg-white"
            style={{
              width: artboardW,
              height: artboardH,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              background: bg.type === 'solid' ? bg.color : bg.css,
            }}
            onPointerEnter={onArtboardPointerEnter}
            onPointerMove={onArtboardPointerMove}
            onPointerDown={onViewportPointerDown}
            onPointerLeave={onArtboardPointerLeave}
          >
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
              {objects
                .filter((obj) => obj.visible)
                .map((obj) => (
                  <SceneObjectView
                    key={obj.id}
                    obj={obj}
                    vectorBoardDocs={boardDocs}
                    textEditingId={textEditingId}
                    textDraft={textDraft}
                    onObjectPointerDown={onObjectPointerDown}
                    onObjectHoverChange={onObjectHoverChange}
                    onTextDoubleClick={onTextDoubleClick}
                    onTextDraftChange={onTextDraftChange}
                    onTextDraftCommit={commitTextDraft}
                  />
                ))}
            </div>
            <SnapGuidesOverlay
              guides={snapGuides}
              scale={scale}
              artboardW={artboardW}
              artboardH={artboardH}
            />
            {hoveredObject &&
            selectedIds.length === 0 &&
            textEditingId == null ? (
              <SelectionBoundsOverlay
                bounds={getObjectRotatedBounds(hoveredObject)}
                scale={scale}
              />
            ) : null}
            {!hoveredObject &&
            selectedIds.length === 0 &&
            textEditingId == null &&
            (backgroundActive || backgroundHovered) ? (
              <SelectionBoundsOverlay
                bounds={{ left: 0, top: 0, width: artboardW, height: artboardH }}
                scale={scale}
              />
            ) : null}
            {selectedObjects.length > 1 && selectionBounds ? (
              <SelectionBoundsOverlay bounds={selectionBounds} scale={scale} />
            ) : null}
            {marqueeRect && (marqueeRect.width > 0 || marqueeRect.height > 0) ? (
              <SelectionBoundsOverlay
                bounds={marqueeRect}
                scale={scale}
                dashed
                fill
              />
            ) : null}
            {selectedSingle && !selectedSingle.locked && !editingSelectedText ? (
              <SelectionOverlay
                object={selectedSingle}
                scale={scale}
                onHandlePointerDown={onSelectionHandlePointerDown}
                onRotatePointerDown={onRotateHandlePointerDown}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
