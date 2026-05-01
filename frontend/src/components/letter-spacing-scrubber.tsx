import { LetterSpacingIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useViewportAwarePopoverPlacement } from '../hooks/use-viewport-aware-popover'
import EditorRangeSlider from './editor-range-slider'
import { floatingToolbarIconButton, floatingToolbarPopoverClass } from './floating-toolbar-shell'

const PANEL_ESTIMATE_H = 180

type LetterSpacingToolbarPopoverProps = {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  lineHeight: number
  onLineHeightChange: (value: number) => void
}

export default function LetterSpacingToolbarPopover({
  value,
  min = -40,
  max = 200,
  onChange,
  lineHeight,
  onLineHeightChange,
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

  const lineHeightLabel = `${Number(lineHeight.toFixed(2))}x`

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className={floatingToolbarIconButton(open)}
        aria-label={`Text spacing. Letter spacing ${value} pixels, line spacing ${lineHeightLabel}`}
        title="Text spacing"
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
          <div className="space-y-3">
            <div>
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

            <div className="pt-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-neutral-800">Line spacing</span>
                <span className="text-[13px] tabular-nums text-neutral-600">{lineHeightLabel}</span>
              </div>
              <EditorRangeSlider
                min={0.6}
                max={4}
                step={0.01}
                value={lineHeight}
                onChange={onLineHeightChange}
                aria-label="Line spacing"
                aria-valuemin={0.6}
                aria-valuemax={4}
                aria-valuenow={lineHeight}
                trackClassName="w-full"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
