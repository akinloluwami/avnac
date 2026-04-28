import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  HelpCircleIcon,
  Image01Icon,
  TextFontIcon,
} from '@hugeicons/core-free-icons'
import type {
  Dispatch,
  RefObject,
  SetStateAction,
} from 'react'

import CanvasZoomSlider from '../canvas-zoom-slider'
import ShapesPopover, {
  iconForShapesQuickAdd,
  type PopoverShapeKind,
  type ShapesQuickAddKind,
} from '../shapes-popover'

function toolbarIconBtn(disabled?: boolean) {
  const base =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-600 outline-none transition-colors hover:bg-black/[0.06]'
  if (disabled) return `${base} pointer-events-none cursor-not-allowed opacity-35`
  return base
}

export function EditorBottomTools({
  addShapeFromKind,
  addText,
  imageInputRef,
  maxZoom,
  minZoom,
  onZoomFitRequest,
  onZoomSliderChange,
  ready,
  setShapesPopoverOpen,
  setShapesQuickAddKind,
  setShortcutsOpen,
  shapeToolSplitRef,
  shapesPopoverOpen,
  shapesQuickAddKind,
  zoomPercent,
}: {
  addShapeFromKind: (kind: PopoverShapeKind) => void
  addText: () => void
  imageInputRef: RefObject<HTMLInputElement | null>
  maxZoom: number
  minZoom: number
  onZoomFitRequest: () => void
  onZoomSliderChange: (pct: number) => void
  ready: boolean
  setShapesPopoverOpen: Dispatch<SetStateAction<boolean>>
  setShapesQuickAddKind: Dispatch<SetStateAction<ShapesQuickAddKind>>
  setShortcutsOpen: Dispatch<SetStateAction<boolean>>
  shapeToolSplitRef: RefObject<HTMLDivElement | null>
  shapesPopoverOpen: boolean
  shapesQuickAddKind: ShapesQuickAddKind
  zoomPercent: number | null
}) {
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] right-3 z-30 sm:right-4">
        {ready && zoomPercent !== null ? (
          <CanvasZoomSlider
            value={zoomPercent}
            min={minZoom}
            max={maxZoom}
            onChange={onZoomSliderChange}
            onFitRequest={onZoomFitRequest}
          />
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-2 pt-24">
        <div
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-black/[0.08] bg-white/85 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.8)_inset] backdrop-blur-xl"
          role="toolbar"
          aria-label="Editor tools"
        >
          <div
            ref={shapeToolSplitRef}
            className="relative flex items-stretch rounded-full border border-black/[0.06] bg-black/[0.02]"
          >
            <button
              type="button"
              disabled={!ready}
              className={`${toolbarIconBtn(!ready)} rounded-l-full rounded-r-none border-0`}
              onClick={() => addShapeFromKind(shapesQuickAddKind === 'generic' ? 'rect' : shapesQuickAddKind)}
              aria-label="Add shape"
              title="Add shape"
            >
              <HugeiconsIcon
                icon={iconForShapesQuickAdd(shapesQuickAddKind)}
                size={20}
                strokeWidth={1.75}
              />
            </button>
            <button
              type="button"
              disabled={!ready}
              className={`${toolbarIconBtn(!ready)} rounded-l-none rounded-r-full border-0 border-l border-black/[0.06]`}
              onClick={() => setShapesPopoverOpen((open) => !open)}
              aria-expanded={shapesPopoverOpen}
              aria-haspopup="menu"
              aria-label="More shapes"
            >
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={16}
                strokeWidth={1.75}
                className={`transition-transform duration-200 ${
                  shapesPopoverOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
            <ShapesPopover
              open={shapesPopoverOpen}
              disabled={!ready}
              anchorRef={shapeToolSplitRef}
              onClose={() => setShapesPopoverOpen(false)}
              onPick={(kind) => {
                setShapesQuickAddKind(kind)
                addShapeFromKind(kind)
                setShapesPopoverOpen(false)
              }}
            />
          </div>
          <button
            type="button"
            disabled={!ready}
            className={toolbarIconBtn(!ready)}
            onClick={addText}
            aria-label="Add text"
            title="Add text"
          >
            <HugeiconsIcon icon={TextFontIcon} size={20} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            disabled={!ready}
            className={toolbarIconBtn(!ready)}
            onClick={() => imageInputRef.current?.click()}
            aria-label="Add image"
            title="Add image"
          >
            <HugeiconsIcon icon={Image01Icon} size={20} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            disabled={!ready}
            className={toolbarIconBtn(!ready)}
            onClick={() => setShortcutsOpen(true)}
            aria-label="Keyboard shortcuts"
            title="Shortcuts (?)"
          >
            <HugeiconsIcon icon={HelpCircleIcon} size={20} strokeWidth={1.75} />
          </button>
          {!ready ? (
            <span className="px-3 text-xs text-[var(--text-muted)]">Loading...</span>
          ) : null}
        </div>
      </div>
    </>
  )
}
