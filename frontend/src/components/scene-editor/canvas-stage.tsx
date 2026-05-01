import { Copy01Icon, Delete02Icon, LayerAddIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMemo, useState } from 'react'

import { getObjectRotatedBounds } from '../../lib/avnac-scene'
import CanvasElementToolbar, { type CanvasAlignKind } from '../canvas-element-toolbar'
import { useCanvasStageContext } from './canvas-stage-context'
import { useEditorStore } from './editor-store'
import { SceneObjectView } from './object-view'
import {
  ImageRemovalOverlay,
  SelectionBoundsOverlay,
  SelectionOverlay,
  SnapGuidesOverlay,
} from './selection-overlays'
import { useVectorBoardControlsContext } from './use-vector-board-controls'

const EMPTY_ALIGN_STATE: Record<CanvasAlignKind, boolean> = {
  left: false,
  centerH: false,
  right: false,
  top: false,
  centerV: false,
  bottom: false,
}

const PAGE_CONTROLS_HEIGHT = 40
const PAGE_STACK_GAP = 48

function CanvasPageControls({
  artboardWidth,
  canDeletePage,
  pageId,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
}: {
  artboardWidth: number
  canDeletePage: boolean
  pageId: string
  onAddPage: (afterPageId?: string) => void
  onDeletePage: (pageId?: string) => void
  onDuplicatePage: (sourcePageId?: string) => void
}) {
  const buttonClass =
    'flex h-9 w-9 items-center justify-center rounded-lg bg-transparent text-neutral-700 transition-colors hover:bg-black/[0.05] hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900'

  return (
    <div
      data-avnac-chrome
      className="pointer-events-auto mb-1 flex h-9 items-center justify-end gap-1.5"
      style={{ width: artboardWidth }}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => onDuplicatePage(pageId)}
        aria-label="Duplicate page"
        title="Duplicate page"
      >
        <HugeiconsIcon icon={Copy01Icon} size={18} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onAddPage(pageId)}
        aria-label="Add new page"
        title="Add new page"
      >
        <HugeiconsIcon icon={LayerAddIcon} size={18} strokeWidth={1.75} />
      </button>
      {canDeletePage ? (
        <button
          type="button"
          className={buttonClass}
          onClick={() => onDeletePage(pageId)}
          aria-label="Delete page"
          title="Delete page"
        >
          <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  )
}

export function CanvasStage() {
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null)
  const { actions, refs, state } = useCanvasStageContext()
  const {
    activatePage,
    addPage,
    alignElementToArtboard,
    alignSelectedElements,
    commitTextDraft,
    copyElementToClipboard,
    deleteSelection,
    deletePage,
    duplicatePage,
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
  const { artboardInnerRef, artboardOuterRef, elementToolbarRef, viewportRef } = refs
  const {
    backgroundActive,
    backgroundHovered,
    deletingPageIds,
    editingSelectedText,
    elementToolbarAlignAlready,
    elementToolbarCanAlignElements,
    elementToolbarCanGroup,
    elementToolbarCanUngroup,
    elementToolbarLayout,
    elementToolbarLockedDisplay,
    hasObjectSelected,
    imageRemovalEffect,
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
  const doc = useEditorStore(storeState => storeState.doc)
  const selectedIds = useEditorStore(state => state.selectedIds)
  const hoveredId = useEditorStore(state => state.hoveredId)
  const { boardDocs } = useVectorBoardControlsContext()
  const pages = doc.pages.length > 0 ? doc.pages : []
  const canDeletePage = pages.length > 1
  const activePage = pages.find(page => page.id === doc.activePageId) ?? pages[0]
  const activeObjects = activePage?.objects ?? doc.objects
  const hoveredObject = useMemo(
    () =>
      hoveredId ? (activeObjects.find(obj => obj.id === hoveredId && obj.visible) ?? null) : null,
    [hoveredId, activeObjects],
  )
  const noop = () => {}

  return (
    <div className="flex min-h-full w-max min-w-full flex-col items-start px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-4">
      <div className="relative z-0 mx-auto my-auto flex flex-col">
        {pages.map(page => {
          const isActive = page.id === doc.activePageId
          const isDeleting = deletingPageIds.includes(page.id)
          const isLastPage = pages[pages.length - 1]?.id === page.id
          const showPageHover = hoveredPageId === page.id && !isDeleting
          const pageW = page.artboard.width
          const pageH = page.artboard.height
          const pageObjects = page.objects
          const pageSlotHeight =
            pageH * scale + PAGE_CONTROLS_HEIGHT + (isLastPage ? 0 : PAGE_STACK_GAP)

          return (
            <div
              key={page.id}
              className="relative inline-block"
              data-avnac-page-id={page.id}
              onPointerEnter={() => setHoveredPageId(page.id)}
              onPointerLeave={() => {
                setHoveredPageId(current => (current === page.id ? null : current))
              }}
              style={{
                height: isDeleting ? 0 : pageSlotHeight,
                opacity: isDeleting ? 0 : 1,
                overflow: isDeleting ? 'hidden' : 'visible',
                pointerEvents: isDeleting ? 'none' : undefined,
                transform: isDeleting ? 'translateX(-72px) scale(0.985)' : 'translateY(0) scale(1)',
                transformOrigin: 'center left',
                filter: isDeleting ? 'blur(8px)' : 'blur(0px)',
                transition: isDeleting
                  ? 'height 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease-out, transform 240ms cubic-bezier(0.4, 0, 0.2, 1), filter 220ms cubic-bezier(0.4, 0, 0.2, 1)'
                  : 'none',
                willChange: isDeleting ? 'height, opacity, transform, filter' : undefined,
              }}
            >
              <CanvasPageControls
                artboardWidth={pageW * scale}
                canDeletePage={canDeletePage}
                pageId={page.id}
                onAddPage={addPage}
                onDeletePage={deletePage}
                onDuplicatePage={duplicatePage}
              />
              <div
                ref={isActive ? artboardOuterRef : undefined}
                className="relative rounded-sm"
                style={{
                  width: pageW * scale,
                  height: pageH * scale,
                  lineHeight: 0,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                }}
                onPointerDown={
                  isActive
                    ? undefined
                    : e => {
                        if (e.button !== 0) return
                        activatePage(page.id)
                      }
                }
              >
                {isActive &&
                ready &&
                hasObjectSelected &&
                elementToolbarLayout &&
                !editingSelectedText ? (
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
                  ref={isActive ? artboardInnerRef : undefined}
                  className="absolute left-0 top-0 select-none overflow-visible rounded-sm bg-white"
                  style={{
                    width: pageW,
                    height: pageH,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    background: page.bg.type === 'solid' ? page.bg.color : page.bg.css,
                  }}
                  onPointerEnter={isActive ? onArtboardPointerEnter : undefined}
                  onPointerMove={isActive ? onArtboardPointerMove : undefined}
                  onPointerDown={isActive ? onViewportPointerDown : undefined}
                  onPointerLeave={isActive ? onArtboardPointerLeave : undefined}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                    {pageObjects
                      .filter(obj => obj.visible)
                      .map(obj => (
                        <SceneObjectView
                          key={obj.id}
                          obj={obj}
                          vectorBoardDocs={boardDocs}
                          textEditingId={isActive ? textEditingId : null}
                          textDraft={isActive ? textDraft : ''}
                          onObjectPointerDown={isActive ? onObjectPointerDown : noop}
                          onObjectHoverChange={isActive ? onObjectHoverChange : noop}
                          onTextDoubleClick={isActive ? onTextDoubleClick : noop}
                          onTextDraftChange={isActive ? onTextDraftChange : noop}
                          onTextDraftCommit={isActive ? commitTextDraft : noop}
                        />
                      ))}
                  </div>
                  {isActive ? (
                    <>
                      <SnapGuidesOverlay
                        guides={snapGuides}
                        scale={scale}
                        artboardW={pageW}
                        artboardH={pageH}
                      />
                      {hoveredObject && selectedIds.length === 0 && textEditingId == null ? (
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
                          bounds={{ left: 0, top: 0, width: pageW, height: pageH }}
                          scale={scale}
                        />
                      ) : null}
                      {selectedObjects.length > 1 && selectionBounds ? (
                        <SelectionBoundsOverlay bounds={selectionBounds} scale={scale} />
                      ) : null}
                      {imageRemovalEffect ? (
                        <ImageRemovalOverlay
                          object={imageRemovalEffect.object}
                          phase={imageRemovalEffect.phase}
                        />
                      ) : null}
                      {marqueeRect && (marqueeRect.width > 0 || marqueeRect.height > 0) ? (
                        <SelectionBoundsOverlay bounds={marqueeRect} scale={scale} dashed fill />
                      ) : null}
                      {selectedSingle && !selectedSingle.locked && !editingSelectedText ? (
                        <SelectionOverlay
                          object={selectedSingle}
                          scale={scale}
                          onHandlePointerDown={onSelectionHandlePointerDown}
                          onRotatePointerDown={onRotateHandlePointerDown}
                        />
                      ) : null}
                    </>
                  ) : null}
                </div>
                {showPageHover ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-[24] rounded-sm"
                    style={{
                      boxShadow:
                        '0 0 0 1.5px var(--accent), 0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent)',
                    }}
                  />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
