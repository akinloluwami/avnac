import { useLayoutEffect, useRef } from 'react'
import type { VectorBoardDocument } from '../lib/avnac-vector-board-document'
import { renderVectorBoardDocumentPreview } from './vector-board-workspace'

type Props = {
  doc: VectorBoardDocument
  size?: number
  className?: string
}

export default function VectorBoardListPreview({ doc, size = 56, className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const c = ref.current
    if (!c) return
    const w = size
    const h = size
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.floor(w * dpr)
    c.height = Math.floor(h * dpr)
    c.style.width = `${w}px`
    c.style.height = `${h}px`
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    renderVectorBoardDocumentPreview(ctx, doc, w, h)
  }, [doc, size])

  return (
    <canvas
      ref={ref}
      className={['pointer-events-none block max-h-full max-w-full', className].join(' ')}
      aria-hidden
    />
  )
}
