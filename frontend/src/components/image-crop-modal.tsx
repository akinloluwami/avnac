import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MIN_SIDE = 12
const HANDLE_PX = 9

type CropRect = { x: number; y: number; w: number; h: number }

export type ImageCropModalApplyPayload = {
  cropX: number
  cropY: number
  width: number
  height: number
}

type Props = {
  open: boolean
  imageSrc: string
  initialCrop: CropRect
  onCancel: () => void
  onApply: (rect: ImageCropModalApplyPayload) => void
}

type DragKind = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

function clampCrop(r: CropRect, nw: number, nh: number): CropRect {
  let { x, y, w, h } = r
  x = Math.max(0, Math.min(x, nw - MIN_SIDE))
  y = Math.max(0, Math.min(y, nh - MIN_SIDE))
  w = Math.max(MIN_SIDE, Math.min(w, nw - x))
  h = Math.max(MIN_SIDE, Math.min(h, nh - y))
  return { x, y, w, h }
}

export default function ImageCropModal({ open, imageSrc, initialCrop, onCancel, onApply }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const initialCropRef = useRef(initialCrop)
  initialCropRef.current = initialCrop

  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [crop, setCrop] = useState<CropRect>(initialCrop)
  const [boxPx, setBoxPx] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const [, layoutBump] = useReducer((n: number) => n + 1, 0)

  const dragRef = useRef<{
    kind: DragKind
    startClientX: number
    startClientY: number
    start: CropRect
    scale: number
  } | null>(null)

  useEffect(() => {
    if (!open) {
      setNatural({ w: 0, h: 0 })
      return
    }
    setCrop({ ...initialCrop })
  }, [open, initialCrop.x, initialCrop.y, initialCrop.w, initialCrop.h])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  useEffect(() => {
    if (!open) return
    const onResize = () => layoutBump()
    window.addEventListener('resize', onResize)
    const el = wrapRef.current
    let ro: ResizeObserver | null = null
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => layoutBump())
      ro.observe(el)
    }
    return () => {
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
    }
  }, [open])

  const onImgLoad = useCallback(() => {
    const el = imgRef.current
    if (!el) return
    const nw = el.naturalWidth
    const nh = el.naturalHeight
    if (nw <= 0 || nh <= 0) return
    setNatural({ w: nw, h: nh })
    const ic = initialCropRef.current
    setCrop(clampCrop({ x: ic.x, y: ic.y, w: ic.w, h: ic.h }, nw, nh))
    layoutBump()
  }, [])

  useLayoutEffect(() => {
    const img = imgRef.current
    if (!open || !img || natural.w <= 0) {
      setBoxPx({ left: 0, top: 0, width: 0, height: 0 })
      return
    }
    const rw = img.getBoundingClientRect().width
    const scale = rw / natural.w
    setBoxPx({
      left: crop.x * scale,
      top: crop.y * scale,
      width: crop.w * scale,
      height: crop.h * scale,
    })
  }, [open, natural.w, crop.x, crop.y, crop.w, crop.h, layoutBump])

  const onPointerDownCrop = useCallback(
    (e: React.PointerEvent, kind: DragKind) => {
      e.preventDefault()
      e.stopPropagation()
      const img = imgRef.current
      if (!img || natural.w <= 0) return
      const scale = img.getBoundingClientRect().width / natural.w
      dragRef.current = {
        kind,
        startClientX: e.clientX,
        startClientY: e.clientY,
        start: { ...crop },
        scale,
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [crop, natural.w],
  )

  useEffect(() => {
    if (!open) return

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || natural.w <= 0 || natural.h <= 0) return
      const dx = (e.clientX - d.startClientX) / d.scale
      const dy = (e.clientY - d.startClientY) / d.scale
      const s = d.start
      const next: CropRect = { ...s }

      if (d.kind === 'move') {
        next.x = s.x + dx
        next.y = s.y + dy
      } else {
        if (d.kind.includes('e')) {
          next.w = s.w + dx
        }
        if (d.kind.includes('w')) {
          next.x = s.x + dx
          next.w = s.w - dx
        }
        if (d.kind.includes('s')) {
          next.h = s.h + dy
        }
        if (d.kind.includes('n')) {
          next.y = s.y + dy
          next.h = s.h - dy
        }
      }

      if (next.w < MIN_SIDE) {
        if (d.kind.includes('w')) next.x = s.x + s.w - MIN_SIDE
        next.w = MIN_SIDE
      }
      if (next.h < MIN_SIDE) {
        if (d.kind.includes('n')) next.y = s.y + s.h - MIN_SIDE
        next.h = MIN_SIDE
      }

      setCrop(clampCrop(next, natural.w, natural.h))
    }

    const onUp = () => {
      dragRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [open, natural.w, natural.h])

  const shade = (_dir: string, style: CSSProperties) => (
    <div className="pointer-events-none absolute bg-black/55" style={style} aria-hidden />
  )

  if (!open || typeof document === 'undefined') return null

  const nw = natural.w
  const imgReady = nw > 0 && imgRef.current

  const boxStyle: CSSProperties = imgReady
    ? {
        left: boxPx.left,
        top: boxPx.top,
        width: boxPx.width,
        height: boxPx.height,
      }
    : { display: 'none' }

  const handle = (kind: DragKind, className: string) => (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      className={`absolute z-10 box-border rounded-sm border-2 border-white bg-[var(--accent,#6366f1)] shadow ${className}`}
      style={{ width: HANDLE_PX, height: HANDLE_PX, margin: -HANDLE_PX / 2 }}
      onPointerDown={e => onPointerDownCrop(e, kind)}
    />
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <h2 className="m-0 text-base font-semibold text-[var(--text)]">Crop image</h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-black/5 hover:text-neutral-800"
            aria-label="Close"
            onClick={onCancel}
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.75} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div ref={wrapRef} className="relative mx-auto inline-block max-w-full">
            <img
              key={imageSrc}
              ref={imgRef}
              src={imageSrc}
              alt=""
              className="block max-h-[65vh] max-w-full object-contain"
              draggable={false}
              onLoad={onImgLoad}
            />
            {imgReady ? (
              <div className="pointer-events-none absolute inset-0">
                {shade('t', {
                  left: 0,
                  right: 0,
                  top: 0,
                  height: boxPx.top,
                })}
                {shade('b', {
                  left: 0,
                  right: 0,
                  top: boxPx.top + boxPx.height,
                  bottom: 0,
                })}
                {shade('l', {
                  left: 0,
                  width: boxPx.left,
                  top: boxPx.top,
                  height: boxPx.height,
                })}
                {shade('r', {
                  left: boxPx.left + boxPx.width,
                  right: 0,
                  top: boxPx.top,
                  height: boxPx.height,
                })}
              </div>
            ) : null}
            {imgReady ? (
              <div
                className="pointer-events-auto absolute z-[1] cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                style={boxStyle}
                onPointerDown={e => onPointerDownCrop(e, 'move')}
              >
                {handle('nw', 'left-0 top-0 cursor-nwse-resize')}
                {handle('n', 'left-1/2 top-0 -translate-x-1/2 cursor-ns-resize')}
                {handle('ne', 'right-0 top-0 cursor-nesw-resize')}
                {handle('e', 'right-0 top-1/2 -translate-y-1/2 cursor-ew-resize')}
                {handle('se', 'right-0 bottom-0 cursor-nwse-resize')}
                {handle('s', 'bottom-0 left-1/2 -translate-x-1/2 cursor-ns-resize')}
                {handle('sw', 'bottom-0 left-0 cursor-nesw-resize')}
                {handle('w', 'left-0 top-1/2 -translate-y-1/2 cursor-ew-resize')}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-black/10 px-4 py-3">
          <button
            type="button"
            className="rounded-lg border border-black/10 bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-black/[0.04]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={nw <= 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:pointer-events-none disabled:opacity-40"
            onClick={() =>
              onApply({
                cropX: crop.x,
                cropY: crop.y,
                width: crop.w,
                height: crop.h,
              })
            }
          >
            <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={1.75} />
            Apply crop
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
