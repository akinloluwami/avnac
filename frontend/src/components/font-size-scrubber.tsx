import { useCallback, useEffect, useRef, useState } from 'react'

type FontSizeScrubberProps = {
  value: number
  min?: number
  max?: number
  onChange: (size: number) => void
}

export default function FontSizeScrubber({
  value,
  min = 8,
  max = 800,
  onChange,
}: FontSizeScrubberProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startValue: number
    active: boolean
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const clamp = useCallback((n: number) => Math.max(min, Math.min(max, Math.round(n))), [min, max])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const commitDraft = useCallback(() => {
    const n = Number(draft.replace(/,/g, '').trim())
    if (Number.isFinite(n)) onChange(clamp(n))
    setEditing(false)
  }, [clamp, draft, onChange])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing) return
    if (e.button !== 0) return
    e.preventDefault()
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startValue: value,
      active: false,
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startX
    if (!d.active) {
      if (Math.abs(dx) < 4) return
      d.active = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const sens = e.shiftKey ? 2 : 0.5
    onChange(clamp(d.startValue + dx * sens))
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    if (d.active) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }
    dragRef.current = null
  }

  const display = Math.round(value)

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitDraft()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setEditing(false)
          }
        }}
        className="h-8 w-14 rounded-lg border border-black/20 bg-white px-1.5 text-center text-xs tabular-nums text-neutral-900 outline-none focus:ring-2 focus:ring-black/15"
        aria-label="Font size"
      />
    )
  }

  return (
    <div
      role="spinbutton"
      aria-valuenow={display}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label="Font size — drag horizontally to change, double-click to type"
      title="Drag to change size · Shift for faster steps · Double-click to type"
      className="flex h-8 min-w-[2.75rem] cursor-ew-resize select-none items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-xs tabular-nums text-neutral-900 touch-none hover:border-black/18"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={e => {
        e.preventDefault()
        setDraft(String(display))
        setEditing(true)
      }}
    >
      {display}
    </div>
  )
}
