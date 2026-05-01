import {
  ArrowDown01Icon,
  BendToolIcon,
  DashedLine01Icon,
  SolidLine01Icon,
  StraightEdgeIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  useStablePickPanel,
  useViewportAwarePopoverPlacement,
} from '../hooks/use-viewport-aware-popover'
import {
  type ArrowLineStyle,
  type ArrowPathType,
  type AvnacShapeMeta,
  isAvnacStrokeLineLike,
} from '../lib/avnac-shape-meta'
import type { BgValue } from './background-popover'
import CornerRadiusToolbarControl from './corner-radius-toolbar-control'
import EditorRangeSlider from './editor-range-slider'
import {
  FloatingToolbarDivider,
  FloatingToolbarShell,
  floatingToolbarIconButton,
  floatingToolbarPopoverClass,
} from './floating-toolbar-shell'
import PaintPopoverControl from './paint-popover-control'

type Props = {
  meta: AvnacShapeMeta
  paintValue: BgValue
  onPaintChange: (v: BgValue) => void
  onPolygonSides: (sides: number) => void
  onStarPoints: (points: number) => void
  onArrowLineStyle: (style: ArrowLineStyle) => void
  onArrowRoundedEnds: (rounded: boolean) => void
  onArrowStrokeWidth: (w: number) => void
  onArrowPathType: (pathType: ArrowPathType) => void
  rectCornerRadius?: number
  rectCornerRadiusMax?: number
  onRectCornerRadius?: (px: number) => void
  footerSlot?: ReactNode
}

function smallLabel(className = '') {
  return `text-[10px] font-medium uppercase tracking-wide text-neutral-500 ${className}`
}

function DottedLineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="3" cy="12" r="1.5" fill="currentColor" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" />
      <circle cx="13" cy="12" r="1.5" fill="currentColor" />
      <circle cx="18" cy="12" r="1.5" fill="currentColor" />
      <circle cx="23" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

const LINE_STYLES: { style: ArrowLineStyle; label: string }[] = [
  { style: 'solid', label: 'Solid' },
  { style: 'dashed', label: 'Dashed' },
  { style: 'dotted', label: 'Dotted' },
]

function lineStyleIcon(style: ArrowLineStyle) {
  if (style === 'solid')
    return <HugeiconsIcon icon={SolidLine01Icon} size={18} strokeWidth={1.75} />
  if (style === 'dashed')
    return <HugeiconsIcon icon={DashedLine01Icon} size={18} strokeWidth={1.75} />
  return <DottedLineIcon />
}

export default function ShapeOptionsToolbar({
  meta,
  paintValue,
  onPaintChange,
  onPolygonSides,
  onStarPoints,
  onArrowLineStyle,
  onArrowRoundedEnds,
  onArrowStrokeWidth,
  onArrowPathType,
  rectCornerRadius,
  rectCornerRadiusMax,
  onRectCornerRadius,
  footerSlot,
}: Props) {
  const [strokePanelOpen, setStrokePanelOpen] = useState(false)
  const [lineTypePanelOpen, setLineTypePanelOpen] = useState(false)
  const arrowRootRef = useRef<HTMLDivElement>(null)
  const strokePanelRef = useRef<HTMLDivElement>(null)
  const lineTypePanelRef = useRef<HTMLDivElement>(null)

  const arrowPopoverOpen = strokePanelOpen || lineTypePanelOpen
  const arrowPopoverEstimateH = strokePanelOpen ? 300 : 160
  const pickArrowPanel = useStablePickPanel(strokePanelOpen, strokePanelRef, lineTypePanelRef)
  const { openUpward: arrowPopoverUp, shiftX: arrowPopoverShiftX } =
    useViewportAwarePopoverPlacement(
      arrowPopoverOpen,
      arrowRootRef,
      arrowPopoverEstimateH,
      pickArrowPanel,
    )

  useEffect(() => {
    if (!strokePanelOpen && !lineTypePanelOpen) return
    const onDoc = (e: MouseEvent) => {
      if (arrowRootRef.current?.contains(e.target as Node)) return
      setStrokePanelOpen(false)
      setLineTypePanelOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [strokePanelOpen, lineTypePanelOpen])

  if (meta.kind === 'rect') {
    return (
      <FloatingToolbarShell role="toolbar" aria-label="Shape options">
        <div className="flex items-center py-1 pl-2 pr-3">
          <PaintPopoverControl
            compact
            value={paintValue}
            onChange={onPaintChange}
            title="Fill color and gradient"
            ariaLabel="Fill color and gradient"
          />
          {onRectCornerRadius !== undefined &&
          rectCornerRadius !== undefined &&
          rectCornerRadiusMax !== undefined ? (
            <>
              <FloatingToolbarDivider />
              <CornerRadiusToolbarControl
                value={rectCornerRadius}
                max={rectCornerRadiusMax}
                onChange={onRectCornerRadius}
              />
            </>
          ) : null}
          {footerSlot ? (
            <>
              <FloatingToolbarDivider />
              {footerSlot}
            </>
          ) : null}
        </div>
      </FloatingToolbarShell>
    )
  }

  if (meta.kind === 'ellipse') {
    return (
      <FloatingToolbarShell role="toolbar" aria-label="Shape options">
        <div className="flex items-center py-1 pl-2 pr-3">
          <PaintPopoverControl
            compact
            value={paintValue}
            onChange={onPaintChange}
            title="Fill color and gradient"
            ariaLabel="Fill color and gradient"
          />
          {footerSlot ? (
            <>
              <FloatingToolbarDivider />
              {footerSlot}
            </>
          ) : null}
        </div>
      </FloatingToolbarShell>
    )
  }

  if (meta.kind === 'line' && !isAvnacStrokeLineLike(meta)) {
    return (
      <FloatingToolbarShell role="toolbar" aria-label="Line options">
        <div className="flex items-center py-1 pl-2 pr-3">
          <PaintPopoverControl
            compact
            value={paintValue}
            onChange={onPaintChange}
            title="Stroke color and gradient"
            ariaLabel="Stroke color and gradient"
          />
          {footerSlot ? (
            <>
              <FloatingToolbarDivider />
              {footerSlot}
            </>
          ) : null}
        </div>
      </FloatingToolbarShell>
    )
  }

  if (meta.kind === 'polygon') {
    const sides = meta.polygonSides ?? 6
    return (
      <FloatingToolbarShell role="toolbar" aria-label="Polygon options">
        <div className="flex items-center gap-1 py-1 pl-2 pr-3">
          <PaintPopoverControl
            compact
            value={paintValue}
            onChange={onPaintChange}
            title="Fill color and gradient"
            ariaLabel="Fill color and gradient"
          />
          <FloatingToolbarDivider />
          <span className={smallLabel()}>Sides</span>
          <input
            type="number"
            min={3}
            max={32}
            value={sides}
            onChange={e => {
              const v = Number(e.target.value)
              if (Number.isFinite(v)) onPolygonSides(Math.round(v))
            }}
            className="w-12 rounded-md border border-black/12 bg-neutral-50 px-1.5 py-0.5 text-center text-xs tabular-nums text-neutral-900 outline-none focus:border-black/25"
          />
          <EditorRangeSlider
            min={3}
            max={16}
            value={Math.min(16, sides)}
            onChange={onPolygonSides}
            aria-label="Polygon sides"
            trackClassName="w-24"
          />
          {footerSlot ? (
            <>
              <FloatingToolbarDivider />
              {footerSlot}
            </>
          ) : null}
        </div>
      </FloatingToolbarShell>
    )
  }

  if (meta.kind === 'star') {
    const pts = meta.starPoints ?? 5
    return (
      <FloatingToolbarShell role="toolbar" aria-label="Star options">
        <div className="flex items-center gap-1 py-1 pl-2 pr-3">
          <PaintPopoverControl
            compact
            value={paintValue}
            onChange={onPaintChange}
            title="Fill color and gradient"
            ariaLabel="Fill color and gradient"
          />
          <FloatingToolbarDivider />
          <span className={smallLabel()}>Points</span>
          <input
            type="number"
            min={3}
            max={24}
            value={pts}
            onChange={e => {
              const v = Number(e.target.value)
              if (Number.isFinite(v)) onStarPoints(Math.round(v))
            }}
            className="w-12 rounded-md border border-black/12 bg-neutral-50 px-1.5 py-0.5 text-center text-xs tabular-nums text-neutral-900 outline-none focus:border-black/25"
          />
          <EditorRangeSlider
            min={3}
            max={12}
            value={Math.min(12, pts)}
            onChange={onStarPoints}
            aria-label="Star points"
            trackClassName="w-24"
          />
          {footerSlot ? (
            <>
              <FloatingToolbarDivider />
              {footerSlot}
            </>
          ) : null}
        </div>
      </FloatingToolbarShell>
    )
  }

  if (isAvnacStrokeLineLike(meta)) {
    const lineStyle = meta.arrowLineStyle ?? 'solid'
    const rounded = meta.arrowRoundedEnds ?? false
    const strokeW = meta.arrowStrokeWidth ?? 10
    const pathType = meta.arrowPathType ?? 'straight'
    const strokeOptionsLabel = meta.kind === 'line' ? 'Line options' : 'Arrow options'

    return (
      <div ref={arrowRootRef} className="relative">
        <FloatingToolbarShell role="toolbar" aria-label={strokeOptionsLabel}>
          <div className="flex items-center gap-1 py-1 pl-2 pr-2">
            <PaintPopoverControl
              compact
              value={paintValue}
              onChange={onPaintChange}
              title="Stroke color and gradient"
              ariaLabel="Stroke color and gradient"
            />

            <FloatingToolbarDivider />

            <button
              type="button"
              className={floatingToolbarIconButton(lineTypePanelOpen, {
                wide: true,
              })}
              aria-expanded={lineTypePanelOpen}
              aria-haspopup="dialog"
              aria-label="Line type"
              title="Line type"
              onClick={() => {
                setLineTypePanelOpen(o => !o)
                setStrokePanelOpen(false)
              }}
            >
              <HugeiconsIcon
                icon={pathType === 'curved' ? BendToolIcon : StraightEdgeIcon}
                size={18}
                strokeWidth={1.75}
              />
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={12}
                strokeWidth={1.75}
                className={`transition-transform ${lineTypePanelOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <FloatingToolbarDivider />

            <button
              type="button"
              className={floatingToolbarIconButton(strokePanelOpen, {
                wide: true,
              })}
              aria-expanded={strokePanelOpen}
              aria-haspopup="dialog"
              aria-label="Stroke style"
              title="Stroke style"
              onClick={() => {
                setStrokePanelOpen(o => !o)
                setLineTypePanelOpen(false)
              }}
            >
              {lineStyleIcon(lineStyle)}
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={12}
                strokeWidth={1.75}
                className={`transition-transform ${strokePanelOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {footerSlot ? (
              <>
                <FloatingToolbarDivider />
                {footerSlot}
              </>
            ) : null}
          </div>
        </FloatingToolbarShell>

        {lineTypePanelOpen ? (
          <div
            ref={lineTypePanelRef}
            role="dialog"
            aria-label="Line type"
            style={{
              transform: `translateX(calc(-50% + ${arrowPopoverShiftX}px))`,
            }}
            className={[
              'absolute left-1/2 z-[60] min-w-[11rem] px-2 py-2',
              arrowPopoverUp ? 'bottom-full mb-2' : 'top-full mt-2',
              floatingToolbarPopoverClass,
            ].join(' ')}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-neutral-800 hover:bg-black/[0.05]"
              onClick={() => {
                onArrowPathType('straight')
                setLineTypePanelOpen(false)
              }}
            >
              <HugeiconsIcon
                icon={StraightEdgeIcon}
                size={18}
                strokeWidth={1.75}
                className="shrink-0 text-neutral-600"
              />
              <span className="flex-1">Straight</span>
              {pathType === 'straight' ? (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={16}
                  strokeWidth={1.75}
                  className="shrink-0 text-neutral-700"
                />
              ) : null}
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px] font-medium text-neutral-800 hover:bg-black/[0.05]"
              onClick={() => {
                onArrowPathType('curved')
                setLineTypePanelOpen(false)
              }}
            >
              <HugeiconsIcon
                icon={BendToolIcon}
                size={18}
                strokeWidth={1.75}
                className="shrink-0 text-neutral-600"
              />
              <span className="flex-1">Curved</span>
              {pathType === 'curved' ? (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={16}
                  strokeWidth={1.75}
                  className="shrink-0 text-neutral-700"
                />
              ) : null}
            </button>
          </div>
        ) : null}

        {strokePanelOpen ? (
          <div
            ref={strokePanelRef}
            role="dialog"
            aria-label="Stroke style options"
            style={{
              transform: `translateX(calc(-50% + ${arrowPopoverShiftX}px))`,
            }}
            className={[
              'absolute left-1/2 z-[60] w-[min(18rem,calc(100vw-2rem))] px-4 py-3.5',
              arrowPopoverUp ? 'bottom-full mb-2' : 'top-full mt-2',
              floatingToolbarPopoverClass,
            ].join(' ')}
          >
            <div className="flex items-center gap-1.5">
              {LINE_STYLES.map(({ style, label }) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onArrowLineStyle(style)}
                  className={`flex h-10 flex-1 items-center justify-center rounded-lg border text-neutral-600 transition-colors ${
                    lineStyle === style
                      ? 'border-black/15 bg-black/[0.08] text-neutral-900'
                      : 'border-black/[0.08] hover:bg-black/[0.05]'
                  }`}
                  aria-label={label}
                  title={label}
                >
                  {lineStyleIcon(style)}
                </button>
              ))}
            </div>

            <label className="mt-3 flex cursor-pointer items-center justify-between">
              <span className="text-[13px] font-medium text-neutral-700">Rounded end points</span>
              <button
                type="button"
                role="switch"
                aria-checked={rounded}
                onClick={() => onArrowRoundedEnds(!rounded)}
                className={`relative h-6 w-10 rounded-full transition-colors ${
                  rounded ? 'bg-neutral-900' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    rounded ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>

            <div className="mt-3 flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700">Stroke weight</span>
              <div className="flex items-center gap-2">
                <EditorRangeSlider
                  min={1}
                  max={80}
                  value={strokeW}
                  onChange={onArrowStrokeWidth}
                  aria-label="Stroke weight"
                  trackClassName="min-w-0 flex-1"
                />
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={strokeW}
                  onChange={e => {
                    const v = Number(e.target.value)
                    if (Number.isFinite(v)) onArrowStrokeWidth(v)
                  }}
                  className="w-12 rounded-md border border-black/12 bg-neutral-50 px-1.5 py-1 text-center text-xs tabular-nums text-neutral-900 outline-none focus:border-black/25"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return null
}
