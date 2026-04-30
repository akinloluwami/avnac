import { HugeiconsIcon } from '@hugeicons/react'
import { CropIcon } from '@hugeicons/core-free-icons'

import ArtboardResizeToolbarControl from '../artboard-resize-toolbar-control'
import BackgroundPopover, {
  bgValueToSwatch,
} from '../background-popover'
import CornerRadiusToolbarControl from '../corner-radius-toolbar-control'
import {
  FloatingToolbarDivider,
  FloatingToolbarShell,
  floatingToolbarIconButton,
} from '../floating-toolbar-shell'
import ShapeOptionsToolbar from '../shape-options-toolbar'
import TextFormatToolbar from '../text-format-toolbar'
import { useEditorSelectionToolbar } from './editor-selection-toolbar-context'
import { useEditorStore } from './editor-store'

function backgroundTopBtn(disabled?: boolean) {
  const base =
    'flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-neutral-700 outline-none transition-colors hover:bg-black/[0.06]'
  if (disabled) return `${base} pointer-events-none cursor-not-allowed opacity-35`
  return base
}

export function EditorSelectionToolbar() {
  const { actions, refs, state } = useEditorSelectionToolbar()
  const artboard = useEditorStore((storeState) => storeState.doc.artboard)
  const bg = useEditorStore((storeState) => storeState.doc.bg)
  const {
    applyArrowLineStyle,
    applyArrowPathType,
    applyArrowRoundedEnds,
    applyArrowStrokeWidth,
    applyBackgroundPicked,
    applyImageCornerRadius,
    applyPaintToSelection,
    applyPolygonSides,
    applyRectCornerRadius,
    applyStarPoints,
    onArtboardResize,
    onTextFormatChange,
    openImageCropModal,
    toggleBackgroundPopover,
  } = actions
  const {
    backgroundPopoverAnchorRef,
    backgroundPopoverPanelRef,
    selectionToolsRef,
    viewportRef,
  } = refs
  const {
    backgroundActive,
    backgroundPopoverOpenUpward,
    backgroundPopoverShiftX,
    bgPopoverOpen,
    elementToolbarLockedDisplay,
    hasObjectSelected,
    imageCornerToolbar,
    ready,
    selectionEffectsFooterSlot,
    shapeToolbarModel,
    textToolbarValues,
  } = state

  const showTextToolbar = ready && !!textToolbarValues
  const showShapeToolbar = ready && !textToolbarValues && !!shapeToolbarModel
  const showEffectsToolbar =
    ready && hasObjectSelected && !textToolbarValues && !shapeToolbarModel
  const showBackgroundToolbar =
    ready &&
    backgroundActive &&
    !hasObjectSelected &&
    !textToolbarValues &&
    !shapeToolbarModel

  if (
    !showTextToolbar &&
    !showShapeToolbar &&
    !showEffectsToolbar &&
    !showBackgroundToolbar
  ) {
    return null
  }

  return (
    <div
      ref={selectionToolsRef}
      className="pointer-events-none absolute left-1/2 -top-3 z-30 -translate-x-1/2"
    >
      {showTextToolbar ? (
        <div className="pointer-events-auto">
          <TextFormatToolbar
            values={textToolbarValues}
            onChange={onTextFormatChange}
            footerSlot={selectionEffectsFooterSlot}
          />
        </div>
      ) : null}
      {showShapeToolbar ? (
        <div className="pointer-events-auto">
          <ShapeOptionsToolbar
            meta={shapeToolbarModel.meta}
            paintValue={shapeToolbarModel.paint}
            onPaintChange={applyPaintToSelection}
            onPolygonSides={applyPolygonSides}
            onStarPoints={applyStarPoints}
            onArrowLineStyle={applyArrowLineStyle}
            onArrowRoundedEnds={applyArrowRoundedEnds}
            onArrowStrokeWidth={applyArrowStrokeWidth}
            onArrowPathType={applyArrowPathType}
            rectCornerRadius={shapeToolbarModel.rectCornerRadius}
            rectCornerRadiusMax={shapeToolbarModel.rectCornerRadiusMax}
            onRectCornerRadius={
              shapeToolbarModel.meta.kind === 'rect'
                ? applyRectCornerRadius
                : undefined
            }
            footerSlot={selectionEffectsFooterSlot}
          />
        </div>
      ) : null}
      {showEffectsToolbar ? (
        <div className="pointer-events-auto">
          <FloatingToolbarShell role="toolbar" aria-label="Selection">
            <div className="flex items-center py-1 pl-2 pr-2">
              {imageCornerToolbar ? (
                <>
                  <button
                    type="button"
                    disabled={elementToolbarLockedDisplay}
                    className={[
                      floatingToolbarIconButton(false),
                      elementToolbarLockedDisplay
                        ? 'pointer-events-none opacity-40'
                        : '',
                    ].join(' ')}
                    onClick={openImageCropModal}
                    aria-label="Crop image"
                    title="Crop image"
                  >
                    <HugeiconsIcon icon={CropIcon} size={20} strokeWidth={1.75} />
                  </button>
                  <CornerRadiusToolbarControl
                    value={imageCornerToolbar.radius}
                    max={imageCornerToolbar.max}
                    onChange={applyImageCornerRadius}
                    disabled={elementToolbarLockedDisplay}
                  />
                  <FloatingToolbarDivider />
                </>
              ) : null}
              {selectionEffectsFooterSlot}
            </div>
          </FloatingToolbarShell>
        </div>
      ) : null}
      {showBackgroundToolbar ? (
        <div ref={backgroundPopoverAnchorRef} className="pointer-events-auto relative">
          <div className="flex items-center rounded-full border border-black/[0.08] bg-white/90 px-2 py-1 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <ArtboardResizeToolbarControl
              width={artboard.width}
              height={artboard.height}
              onResize={onArtboardResize}
              viewportRef={viewportRef}
            />
            <FloatingToolbarDivider />
            <button
              type="button"
              className={backgroundTopBtn(false)}
              onClick={toggleBackgroundPopover}
              aria-label="Page background"
              aria-expanded={bgPopoverOpen}
            >
              <span
                className="size-4 rounded-full border border-black/10"
                style={bgValueToSwatch(bg)}
              />
              Background
            </button>
          </div>
          {bgPopoverOpen ? (
            <div
              ref={backgroundPopoverPanelRef}
              className={[
                'absolute left-1/2 z-[60]',
                backgroundPopoverOpenUpward ? 'bottom-full mb-2' : 'top-full mt-2',
              ].join(' ')}
              style={{
                transform: `translateX(calc(-50% + ${backgroundPopoverShiftX}px))`,
              }}
            >
              <BackgroundPopover value={bg} onChange={applyBackgroundPicked} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
