import {
  ArrowRight01Icon,
  AspectRatioIcon,
  Link01Icon,
  Unlink01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ARTBOARD_PRESETS } from '../data/artboard-presets'
import {
  measureHorizontalFlyoutInContainer,
  useViewportAwarePopoverPlacement,
} from '../hooks/use-viewport-aware-popover'
import {
  floatingToolbarIconButton,
  floatingToolbarPopoverClass,
  floatingToolbarPopoverMenuClass,
} from './floating-toolbar-shell'

const PANEL_ESTIMATE_H = 220
const CANVAS_MIN = 100
const CANVAS_MAX = 16000

type Props = {
  width: number
  height: number
  onResize: (width: number, height: number) => void
  viewportRef: RefObject<HTMLElement | null>
  disabled?: boolean
}

export default function ArtboardResizeToolbarControl({
  width,
  height,
  onResize,
  viewportRef,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [presetOpen, setPresetOpen] = useState(false)
  const [linked, setLinked] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const presetFlyoutRef = useRef<HTMLDivElement>(null)
  const pickPanel = useCallback(() => panelRef.current, [])
  const [presetFlyoutShift, setPresetFlyoutShift] = useState({ x: 0, y: 0 })

  const [sizeDraftW, setSizeDraftW] = useState(String(width))
  const [sizeDraftH, setSizeDraftH] = useState(String(height))
  const aspectRatio = useMemo(() => {
    if (width <= 0 || height <= 0) return 1
    return width / height
  }, [width, height])

  const currentPreset = ARTBOARD_PRESETS.find(p => p.width === width && p.height === height) ?? null

  useEffect(() => {
    setSizeDraftW(String(width))
    setSizeDraftH(String(height))
  }, [width, height])

  const { openUpward, shiftX } = useViewportAwarePopoverPlacement(
    open,
    rootRef,
    PANEL_ESTIMATE_H,
    pickPanel,
    'center',
  )

  useLayoutEffect(() => {
    if (!open || !presetOpen) {
      setPresetFlyoutShift({ x: 0, y: 0 })
      return
    }
    function sync() {
      const viewport = viewportRef.current
      const panel = presetFlyoutRef.current
      if (!viewport || !panel) return
      const { shiftX: sx, shiftY: sy } = measureHorizontalFlyoutInContainer(viewport, panel)
      setPresetFlyoutShift({ x: sx, y: sy })
    }
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [open, presetOpen, viewportRef])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
      setPresetOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) setPresetOpen(false)
  }, [open])

  const clampValue = useCallback((n: number) => {
    return Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.round(n)))
  }, [])

  const commitResize = useCallback(
    (nextWidth: number, nextHeight: number) => {
      const cw = clampValue(nextWidth)
      const ch = clampValue(nextHeight)
      setSizeDraftW(String(cw))
      setSizeDraftH(String(ch))
      if (cw === width && ch === height) return
      onResize(cw, ch)
    },
    [clampValue, height, onResize, width],
  )

  const applyWidthDraft = useCallback(
    (raw: string) => {
      const parsed = Number.parseInt(raw, 10)
      if (!Number.isFinite(parsed)) {
        setSizeDraftW(String(width))
        setSizeDraftH(String(height))
        return
      }
      const nextWidth = clampValue(parsed)
      const nextHeight = linked ? clampValue(nextWidth / aspectRatio) : height
      commitResize(nextWidth, nextHeight)
    },
    [aspectRatio, clampValue, commitResize, height, linked, width],
  )

  const applyHeightDraft = useCallback(
    (raw: string) => {
      const parsed = Number.parseInt(raw, 10)
      if (!Number.isFinite(parsed)) {
        setSizeDraftW(String(width))
        setSizeDraftH(String(height))
        return
      }
      const nextHeight = clampValue(parsed)
      const nextWidth = linked ? clampValue(nextHeight * aspectRatio) : width
      commitResize(nextWidth, nextHeight)
    },
    [aspectRatio, clampValue, commitResize, height, linked, width],
  )

  const label = `${width}×${height}`
  const isDisabled = !!disabled

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={isDisabled}
        className={[
          floatingToolbarIconButton(open, { wide: true }),
          'gap-1 px-2',
          isDisabled ? 'pointer-events-none opacity-40' : '',
        ].join(' ')}
        aria-label={`Artboard size, ${label}px`}
        title="Resize artboard"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (!isDisabled) setOpen(o => !o)
        }}
      >
        <HugeiconsIcon icon={AspectRatioIcon} size={18} strokeWidth={1.75} />
        <span className="max-w-[5.5rem] truncate text-left text-xs font-medium tabular-nums text-neutral-700 sm:max-w-none">
          {label}
        </span>
      </button>
      {open && !isDisabled ? (
        <div
          ref={panelRef}
          className={[
            'absolute left-1/2 z-[70] w-[min(18rem,calc(100vw-2rem))] p-3',
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2',
            floatingToolbarPopoverMenuClass,
          ].join(' ')}
          style={{
            transform: `translateX(calc(-50% + ${shiftX}px))`,
          }}
        >
          <p className="mb-2 text-[13px] font-medium text-neutral-800">Artboard size</p>
          <div className="relative -mx-3 mb-3 w-auto shrink-0">
            <div className="relative w-full shrink-0">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] font-medium text-neutral-800 hover:bg-black/[0.05]"
                aria-label="Artboard preset"
                aria-expanded={presetOpen}
                aria-haspopup="menu"
                onClick={() => setPresetOpen(value => !value)}
              >
                <span className="min-w-0 truncate">
                  {currentPreset?.label ?? 'Custom dimensions'}
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  strokeWidth={1.75}
                  className={`shrink-0 transition-transform ${presetOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {presetOpen ? (
                <div
                  ref={presetFlyoutRef}
                  role="menu"
                  className={[
                    'absolute left-full top-0 z-[61] ml-1.5 min-w-[14rem] py-1',
                    floatingToolbarPopoverClass,
                  ].join(' ')}
                  style={{
                    transform:
                      presetFlyoutShift.x !== 0 || presetFlyoutShift.y !== 0
                        ? `translate(${presetFlyoutShift.x}px, ${presetFlyoutShift.y}px)`
                        : undefined,
                  }}
                >
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={!currentPreset}
                    className={[
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] outline-none transition-colors hover:bg-black/[0.05]',
                      currentPreset ? 'text-neutral-700' : 'bg-black/[0.04] text-neutral-900',
                    ].join(' ')}
                    onClick={() => setPresetOpen(false)}
                  >
                    <span className="truncate">Custom dimensions</span>
                    {!currentPreset ? (
                      <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                        Current
                      </span>
                    ) : null}
                  </button>
                  {ARTBOARD_PRESETS.map(preset => {
                    const active = currentPreset?.id === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        className={[
                          'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] outline-none transition-colors hover:bg-black/[0.05]',
                          active ? 'bg-black/[0.04] text-neutral-900' : 'text-neutral-700',
                        ].join(' ')}
                        onClick={() => {
                          setPresetOpen(false)
                          onResize(preset.width, preset.height)
                        }}
                      >
                        <span className="truncate">{preset.label}</span>
                        {active ? (
                          <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-500">
                            Current
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>
          <div className="mb-2 text-[12px] font-medium text-neutral-700">Custom size</div>
          <div className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2">
            <label className="block text-[12px] font-medium text-neutral-700">
              Width
              <DimensionInput
                value={sizeDraftW}
                min={CANVAS_MIN}
                max={CANVAS_MAX}
                ariaLabel="Artboard width"
                onDraftChange={setSizeDraftW}
                onCommit={applyWidthDraft}
                onScrub={value => {
                  const nextWidth = clampValue(value)
                  const nextHeight = linked
                    ? clampValue(nextWidth / aspectRatio)
                    : Number.parseInt(sizeDraftH, 10) || height
                  commitResize(nextWidth, nextHeight)
                }}
              />
            </label>
            <div className="flex h-9 items-center justify-center pb-[2px] text-neutral-300">×</div>
            <label className="block text-[12px] font-medium text-neutral-700">
              Height
              <DimensionInput
                value={sizeDraftH}
                min={CANVAS_MIN}
                max={CANVAS_MAX}
                ariaLabel="Artboard height"
                onDraftChange={setSizeDraftH}
                onCommit={applyHeightDraft}
                onScrub={value => {
                  const nextHeight = clampValue(value)
                  const nextWidth = linked
                    ? clampValue(nextHeight * aspectRatio)
                    : Number.parseInt(sizeDraftW, 10) || width
                  commitResize(nextWidth, nextHeight)
                }}
              />
            </label>
            <button
              type="button"
              className={[
                'mt-1 flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                linked
                  ? 'border-black/15 bg-black/[0.05] text-neutral-900'
                  : 'border-black/10 bg-white text-neutral-600 hover:border-black/15',
              ].join(' ')}
              aria-label={linked ? 'Unlink dimensions' : 'Link dimensions'}
              aria-pressed={linked}
              title={linked ? 'Unlink dimensions' : 'Link dimensions'}
              onClick={() => setLinked(value => !value)}
            >
              <HugeiconsIcon
                icon={linked ? Link01Icon : Unlink01Icon}
                size={15}
                strokeWidth={1.75}
              />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type DimensionInputProps = {
  value: string
  min: number
  max: number
  ariaLabel: string
  onDraftChange: (value: string) => void
  onCommit: (value: string) => void
  onScrub: (value: number) => void
}

function DimensionInput({
  value,
  min,
  max,
  ariaLabel,
  onDraftChange,
  onCommit,
  onScrub,
}: DimensionInputProps) {
  const [editing, setEditing] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startValue: number
    active: boolean
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const numericValue = Number.parseInt(value, 10)
  const displayValue = Number.isFinite(numericValue)
    ? Math.max(min, Math.min(max, numericValue))
    : min

  return editing ? (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={e => onDraftChange(e.target.value)}
      onBlur={() => {
        setEditing(false)
        onCommit(value)
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          setEditing(false)
          onCommit(value)
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setEditing(false)
        }
      }}
      className="mt-1 box-border h-9 w-full rounded-lg border border-black/20 bg-white px-2 text-center font-mono text-[13px] tabular-nums text-neutral-900 outline-none focus:ring-2 focus:ring-black/15"
      aria-label={ariaLabel}
    />
  ) : (
    <div
      role="spinbutton"
      aria-valuenow={displayValue}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={`${ariaLabel} — drag horizontally to change, double-click to type`}
      title="Drag to change size · Shift for faster steps · Double-click to type"
      className="mt-1 flex h-9 w-full cursor-ew-resize select-none items-center justify-center rounded-lg border border-black/10 bg-white px-2 font-mono text-[13px] tabular-nums text-neutral-900 touch-none transition-colors hover:border-black/18"
      onPointerDown={e => {
        if (editing || e.button !== 0) return
        e.preventDefault()
        dragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startValue: displayValue,
          active: false,
        }
      }}
      onPointerMove={e => {
        const drag = dragRef.current
        if (!drag || e.pointerId !== drag.pointerId) return
        const dx = e.clientX - drag.startX
        if (!drag.active) {
          if (Math.abs(dx) < 4) return
          drag.active = true
          e.currentTarget.setPointerCapture(e.pointerId)
        }
        const sensitivity = e.shiftKey ? 4 : 1
        onScrub(drag.startValue + dx * sensitivity)
      }}
      onPointerUp={e => {
        const drag = dragRef.current
        if (!drag || e.pointerId !== drag.pointerId) return
        if (drag.active) {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {
            /* already released */
          }
        }
        dragRef.current = null
      }}
      onPointerCancel={e => {
        const drag = dragRef.current
        if (!drag || e.pointerId !== drag.pointerId) return
        dragRef.current = null
      }}
      onDoubleClick={e => {
        e.preventDefault()
        setEditing(true)
      }}
    >
      {displayValue}
    </div>
  )
}
