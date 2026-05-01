import { TransparencyIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useViewportAwarePopoverPlacement } from '../hooks/use-viewport-aware-popover'
import EditorRangeSlider from './editor-range-slider'
import { floatingToolbarIconButton, floatingToolbarPopoverClass } from './floating-toolbar-shell'

const PANEL_ESTIMATE_H = 120

type Props = {
  opacityPct: number
  onChange: (opacityPct: number) => void
}

export default function TransparencyToolbarPopover({ opacityPct, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pickPanel = useCallback(() => panelRef.current, [])
  const { openUpward, shiftX } = useViewportAwarePopoverPlacement(
    open,
    rootRef,
    PANEL_ESTIMATE_H,
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
        className={[floatingToolbarIconButton(open, { wide: true }), 'gap-1 px-2'].join(' ')}
        aria-label={`Transparency, ${opacityPct}%`}
        title="Transparency"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(o => !o)}
      >
        <HugeiconsIcon icon={TransparencyIcon} size={18} strokeWidth={1.75} />
        <span className="min-w-[2.25rem] text-left text-xs font-medium tabular-nums text-neutral-700">
          {opacityPct}%
        </span>
      </button>
      {open ? (
        <div
          ref={panelRef}
          className={[
            'absolute left-1/2 z-[70] min-w-[13.5rem] p-3',
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2',
            floatingToolbarPopoverClass,
          ].join(' ')}
          style={{
            transform: `translateX(calc(-50% + ${shiftX}px))`,
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-neutral-800">Opacity</span>
            <span className="text-[13px] tabular-nums text-neutral-600">{opacityPct}%</span>
          </div>
          <EditorRangeSlider
            min={0}
            max={100}
            value={opacityPct}
            onChange={onChange}
            aria-label="Opacity"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={opacityPct}
            trackClassName="w-full"
          />
        </div>
      ) : null}
    </div>
  )
}
