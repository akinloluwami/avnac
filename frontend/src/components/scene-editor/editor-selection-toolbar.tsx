import { AiMagicIcon, CropIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import ArtboardResizeToolbarControl from '../artboard-resize-toolbar-control'
import BackgroundPopover, { bgValueToSwatch } from '../background-popover'
import CornerRadiusToolbarControl from '../corner-radius-toolbar-control'
import PaintPopoverControl from '../paint-popover-control'
import ShapeOptionsToolbar from '../shape-options-toolbar'
import TextFormatToolbar from '../text-format-toolbar'
import { Button, Divider, IconButton, Toolbar } from '../ui'
import { useEditorSelectionToolbar } from './editor-selection-toolbar-context'
import { useEditorStore } from './editor-store'

export function EditorSelectionToolbar() {
  const { actions, refs, state } = useEditorSelectionToolbar()
  const artboard = useEditorStore(storeState => storeState.doc.artboard)
  const bg = useEditorStore(storeState => storeState.doc.bg)
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
    removeImageBackground,
    toggleBackgroundPopover,
  } = actions
  const { backgroundPopoverAnchorRef, backgroundPopoverPanelRef, selectionToolsRef, viewportRef } =
    refs
  const {
    backgroundActive,
    backgroundPopoverOpenUpward,
    backgroundPopoverShiftX,
    bgPopoverOpen,
    elementToolbarLockedDisplay,
    hasObjectSelected,
    imageCornerToolbar,
    imageRemovalState,
    ready,
    selectionFillPaint,
    selectionEffectsFooterSlot,
    shapeToolbarModel,
    textToolbarValues,
  } = state

  const showTextToolbar = ready && !!textToolbarValues
  const showShapeToolbar = ready && !textToolbarValues && !!shapeToolbarModel
  const showEffectsToolbar = ready && hasObjectSelected && !textToolbarValues && !shapeToolbarModel
  const showBackgroundToolbar =
    ready && backgroundActive && !hasObjectSelected && !textToolbarValues && !shapeToolbarModel

  if (!showTextToolbar && !showShapeToolbar && !showEffectsToolbar && !showBackgroundToolbar) {
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
              shapeToolbarModel.meta.kind === 'rect' ? applyRectCornerRadius : undefined
            }
            footerSlot={selectionEffectsFooterSlot}
          />
        </div>
      ) : null}
      {showEffectsToolbar ? (
        <div className="pointer-events-auto">
          <Toolbar compact className="pl-2 pr-2" aria-label="Selection">
            {selectionFillPaint ? (
              <>
                <PaintPopoverControl
                  compact
                  value={selectionFillPaint}
                  onChange={applyPaintToSelection}
                  title="Fill color and gradient"
                  ariaLabel="Fill color and gradient"
                />
                <Divider orientation="vertical" />
              </>
            ) : null}
            {imageCornerToolbar ? (
              <>
                <IconButton
                  icon={CropIcon}
                  label="Crop image"
                  disabled={elementToolbarLockedDisplay}
                  className={elementToolbarLockedDisplay ? 'pointer-events-none opacity-40' : ''}
                  onClick={openImageCropModal}
                />
                <Button
                  disabled={elementToolbarLockedDisplay || imageRemovalState === 'running'}
                  variant="ghost"
                  size="xs"
                  className={[
                    'h-8 gap-1.5 rounded-lg px-2.5 text-[13px] font-medium',
                    elementToolbarLockedDisplay ? 'pointer-events-none opacity-40' : '',
                    imageRemovalState !== 'idle' ? 'bg-black/[0.08] text-neutral-900' : '',
                  ].join(' ')}
                  onClick={removeImageBackground}
                  aria-label="Remove background"
                  title="Remove background"
                  iconBefore={<HugeiconsIcon icon={AiMagicIcon} size={18} strokeWidth={1.75} />}
                >
                  {imageRemovalState === 'running'
                    ? 'Removing…'
                    : imageRemovalState === 'success'
                      ? 'Removed'
                      : 'Remove bg'}
                </Button>
                <Divider orientation="vertical" />
                <CornerRadiusToolbarControl
                  value={imageCornerToolbar.radius}
                  max={imageCornerToolbar.max}
                  onChange={applyImageCornerRadius}
                  disabled={elementToolbarLockedDisplay}
                />
                <Divider orientation="vertical" />
              </>
            ) : null}
            {selectionEffectsFooterSlot}
          </Toolbar>
        </div>
      ) : null}
      {showBackgroundToolbar ? (
        <div ref={backgroundPopoverAnchorRef} className="pointer-events-auto relative">
          <Toolbar compact className="px-2 py-1">
            <ArtboardResizeToolbarControl
              width={artboard.width}
              height={artboard.height}
              onResize={onArtboardResize}
              viewportRef={viewportRef}
            />
            <Divider orientation="vertical" />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2 rounded-lg px-3 text-sm"
              onClick={toggleBackgroundPopover}
              aria-label="Page background"
              aria-expanded={bgPopoverOpen}
              iconBefore={
                <span
                  className="size-4 rounded-full border border-black/10"
                  style={bgValueToSwatch(bg)}
                />
              }
            >
              Background
            </Button>
          </Toolbar>
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
