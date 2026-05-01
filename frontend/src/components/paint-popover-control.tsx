import { useCallback, useEffect, useRef, useState } from 'react'
import { useViewportAwarePopoverPlacement } from '../hooks/use-viewport-aware-popover'
import BackgroundPopover, { type BgValue, bgValueToSwatch } from './background-popover'
import { floatingToolbarIconButton } from './floating-toolbar-shell'

/** Approximate max height of `BackgroundPopover` for viewport fitting. */
const PAINT_POPOVER_ESTIMATE_H = 440

type Props = {
  value: BgValue
  onChange: (v: BgValue) => void
  ariaLabel?: string
  title?: string
  /** When true, use the compact icon-button style (floating toolbars). */
  compact?: boolean
}

export default function PaintPopoverControl({
  value,
  onChange,
  ariaLabel = 'Color and gradient',
  title = 'Color and gradient',
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pickPanel = useCallback(() => panelRef.current, [])
  const { openUpward, shiftX } = useViewportAwarePopoverPlacement(
    open,
    rootRef,
    PAINT_POPOVER_ESTIMATE_H,
    pickPanel,
    'center',
  )

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className={
          compact
            ? floatingToolbarIconButton(open)
            : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 outline-none transition-colors hover:bg-black/[0.06]'
        }
        aria-label={ariaLabel}
        title={title}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(o => !o)}
      >
        <span
          className="h-5 w-5 rounded-md border border-black/15 shadow-inner"
          style={bgValueToSwatch(value)}
        />
      </button>
      {open ? (
        <div
          ref={panelRef}
          className={[
            'absolute left-1/2 z-[70]',
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2',
          ].join(' ')}
          style={{ transform: `translateX(calc(-50% + ${shiftX}px))` }}
        >
          <BackgroundPopover value={value} onChange={onChange} />
        </div>
      ) : null}
    </div>
  )
}
