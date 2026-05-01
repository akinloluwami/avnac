import { LetterSpacingIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useViewportAwarePopoverPlacement } from '../hooks/use-viewport-aware-popover'
import EditorRangeSlider from './editor-range-slider'
import { floatingToolbarIconButton, floatingToolbarPopoverClass } from './floating-toolbar-shell'

const PANEL_ESTIMATE_H = 120

type LetterSpacingToolbarPopoverProps = {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

export default function LetterSpacingToolbarPopover({
  value,
  min = -40,
  max = 200,
  onChange,
}: LetterSpacingToolbarPopoverProps) {
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
        className={floatingToolbarIconButton(open)}
        aria-label={`Letter spacing, ${value} pixels`}
        title="Letter spacing"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(o => !o)}
      >
        <HugeiconsIcon icon={LetterSpacingIcon} size={16} strokeWidth={1.75} />
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
            <span className="text-[13px] font-medium text-neutral-800">Letter spacing</span>
            <span className="text-[13px] tabular-nums text-neutral-600">{value}px</span>
          </div>
          <EditorRangeSlider
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            aria-label="Letter spacing"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            trackClassName="w-full"
          />
        </div>
      ) : null}
    </div>
  )
}
