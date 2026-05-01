import { RadiusIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useViewportAwarePopoverPlacement } from '../hooks/use-viewport-aware-popover'
import EditorRangeSlider from './editor-range-slider'
import { floatingToolbarIconButton, floatingToolbarPopoverClass } from './floating-toolbar-shell'

const PANEL_ESTIMATE_H = 120

type Props = {
  value: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
}

export default function CornerRadiusToolbarControl({ value, max, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pickPanel = useCallback(() => panelRef.current, [])
  const safeMax = Math.max(0, max)
  const sliderMax = Math.max(1, Math.ceil(safeMax))
  const isDisabled = disabled || safeMax <= 0
  const rounded = Math.round(Math.min(value, safeMax))

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
        disabled={isDisabled}
        className={[
          floatingToolbarIconButton(open, { wide: true }),
          'gap-1 px-2',
          isDisabled ? 'pointer-events-none opacity-40' : '',
        ].join(' ')}
        aria-label={`Corner radius, ${rounded}px`}
        title="Corner radius"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (!isDisabled) setOpen(o => !o)
        }}
      >
        <HugeiconsIcon icon={RadiusIcon} size={18} strokeWidth={1.75} />
        <span className="min-w-[2.25rem] text-left text-xs font-medium tabular-nums text-neutral-700">
          {rounded}px
        </span>
      </button>
      {open && !isDisabled ? (
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
            <span className="text-[13px] font-medium text-neutral-800">Corner radius</span>
            <span className="text-[13px] tabular-nums text-neutral-600">{rounded}px</span>
          </div>
          <EditorRangeSlider
            min={0}
            max={sliderMax}
            value={Math.min(value, sliderMax)}
            onChange={v => onChange(Math.min(v, safeMax))}
            aria-label="Corner radius"
            aria-valuemin={0}
            aria-valuemax={sliderMax}
            aria-valuenow={rounded}
            trackClassName="w-full"
          />
        </div>
      ) : null}
    </div>
  )
}
