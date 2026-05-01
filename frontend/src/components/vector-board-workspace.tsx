import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  CircleIcon,
  Cursor01Icon,
  CursorAddSelection01Icon,
  CursorRemoveSelection01Icon,
  Delete02Icon,
  Pen01Icon,
  PenTool03Icon,
  SquareIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  appendClonedStrokesToActiveLayer,
  applyScaleStrokesInDoc,
  applyTranslateStrokesInDoc,
  applyZOrderInDoc,
  createVectorBoardLayer,
  type DocStrokeSelection,
  duplicateSelectionsInPlace,
  emptyVectorBoardDocument,
  findStrokesIntersectingRect,
  findTopStrokeAt,
  getActiveLayer,
  getStrokesForSelections,
  normBoundsForSelections,
  parseVectorStrokeClipboardText,
  removeStrokesFromDoc,
  updateStrokeInDocFull,
  updateVectorStrokeInDoc,
  type VectorBoardDocument,
  type VectorBoardStroke,
  type VectorStrokeKind,
  vectorDocHasRenderableStrokes,
  vectorStrokeOutlineIsVisible,
} from '../lib/avnac-vector-board-document'
import {
  applySmoothPlacementHandles,
  ctrlInAbs,
  ctrlOutAbs,
  findNearestPointOnPenPath,
  splitPenBezierSegment,
  type VectorPenAnchor,
} from '../lib/avnac-vector-pen-bezier'
import type { BgValue } from './background-popover'
import {
  FloatingToolbarDivider,
  FloatingToolbarShell,
  floatingToolbarIconButton,
} from './floating-toolbar-shell'
import PaintPopoverControl from './paint-popover-control'
import StrokeToolbarPopover from './stroke-toolbar-popover'

const VECTOR_CLIPBOARD_PASTE_OFFSET_N = 0.02

const GRID_STEP = 24
const POINT_EPS = 0.002
const DRAFT_SHAPE_EDGE = 'rgba(15,23,42,0.32)'
const PEN_HIT_R = 0.017
const PEN_HIT_R_SQ = PEN_HIT_R * PEN_HIT_R
const PEN_CORNER_DRAG = 0.005

type HugeiconSvgShape = readonly (readonly [string, { readonly [key: string]: string | number }])[]

function hugeiconToCursorCss(
  icon: HugeiconSvgShape,
  hotspotX: number,
  hotspotY: number,
  color: string,
  fallback: string,
): string {
  const inner = icon
    .map(([tag, raw]) => {
      const attrs = Object.entries(raw)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => {
          const kebab = k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
          const val = String(v).replace(/currentColor/g, color)
          return `${kebab}="${val}"`
        })
        .join(' ')
      return `<${tag} ${attrs} />`
    })
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">${inner}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}, ${fallback}`
}

const CURSOR_MOVE = hugeiconToCursorCss(Cursor01Icon, 7, 2, '#1e293b', 'default')

const CURSOR_PEN_ADD = hugeiconToCursorCss(CursorAddSelection01Icon, 10, 4, '#1e293b', 'crosshair')

const CURSOR_PEN_REMOVE = hugeiconToCursorCss(
  CursorRemoveSelection01Icon,
  10,
  4,
  '#dc2626',
  'not-allowed',
)

function pointerAltKey(e: Pick<PointerEvent, 'altKey' | 'getModifierState'>): boolean {
  return e.altKey || (typeof e.getModifierState === 'function' && e.getModifierState('Alt'))
}

function releasePointerIfCaptured(el: HTMLElement | null, pointerId: number) {
  if (!el || pointerId < 0) return
  try {
    if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId)
  } catch {
    /* ignore */
  }
}

function strokePaintVisible(stroke: string): boolean {
  return Boolean(stroke) && stroke !== 'transparent'
}

function bgValuePreferSolid(v: BgValue): string {
  if (v.type === 'solid') return v.color
  return v.stops[0]?.color ?? '#1a1a1a'
}

type DrawTool = 'move' | 'pencil' | 'pen' | 'rect' | 'ellipse'

type MarqueeRect = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type ResizeHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const RESIZE_HANDLE_IDS: ResizeHandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

const RESIZE_HANDLE_CURSORS: Record<ResizeHandleId, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
}

function handlePositionInBounds(
  id: ResizeHandleId,
  b: { minX: number; minY: number; maxX: number; maxY: number },
): [number, number] {
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  switch (id) {
    case 'nw':
      return [b.minX, b.minY]
    case 'n':
      return [cx, b.minY]
    case 'ne':
      return [b.maxX, b.minY]
    case 'e':
      return [b.maxX, cy]
    case 'se':
      return [b.maxX, b.maxY]
    case 's':
      return [cx, b.maxY]
    case 'sw':
      return [b.minX, b.maxY]
    case 'w':
      return [b.minX, cy]
  }
}

function anchorForHandle(
  id: ResizeHandleId,
  b: { minX: number; minY: number; maxX: number; maxY: number },
): [number, number] {
  switch (id) {
    case 'nw':
      return [b.maxX, b.maxY]
    case 'n':
      return [(b.minX + b.maxX) / 2, b.maxY]
    case 'ne':
      return [b.minX, b.maxY]
    case 'e':
      return [b.minX, (b.minY + b.maxY) / 2]
    case 'se':
      return [b.minX, b.minY]
    case 's':
      return [(b.minX + b.maxX) / 2, b.minY]
    case 'sw':
      return [b.maxX, b.minY]
    case 'w':
      return [b.maxX, (b.minY + b.maxY) / 2]
  }
}

type ShapeDraftTool = 'rect' | 'ellipse'

type ShapeDraft = {
  kind: 'shape'
  tool: ShapeDraftTool
  a: [number, number]
  b?: [number, number]
}

type PenBezierDrag =
  | {
      type: 'place'
      anchorIndex: number
      startX: number
      startY: number
    }
  | {
      type: 'handle'
      anchorIndex: number
      which: 'in' | 'out'
    }

type PenBezierDraftState = {
  kind: 'pen-bezier'
  anchors: VectorPenAnchor[]
  selectedAnchor: number | null
  drag: PenBezierDrag | null
}

type PolylineDraftState = {
  kind: 'polyline'
  tool: 'pencil'
  points: [number, number][]
}

type DraftState = PolylineDraftState | PenBezierDraftState | ShapeDraft

function hitTestPenBezier(
  d: PenBezierDraftState,
  nx: number,
  ny: number,
):
  | { type: 'handle'; anchorIndex: number; which: 'in' | 'out' }
  | { type: 'anchor'; anchorIndex: number }
  | null {
  for (let i = d.anchors.length - 1; i >= 0; i--) {
    const a = d.anchors[i]!
    if (a.outX != null && a.outY != null) {
      const dx = nx - a.outX
      const dy = ny - a.outY
      if (dx * dx + dy * dy <= PEN_HIT_R_SQ) {
        return { type: 'handle', anchorIndex: i, which: 'out' }
      }
    }
    if (a.inX != null && a.inY != null) {
      const dx = nx - a.inX
      const dy = ny - a.inY
      if (dx * dx + dy * dy <= PEN_HIT_R_SQ) {
        return { type: 'handle', anchorIndex: i, which: 'in' }
      }
    }
  }
  for (let i = d.anchors.length - 1; i >= 0; i--) {
    const a = d.anchors[i]!
    const dx = nx - a.x
    const dy = ny - a.y
    if (dx * dx + dy * dy <= PEN_HIT_R_SQ * 1.44) {
      return { type: 'anchor', anchorIndex: i }
    }
  }
  return null
}

function removePenAnchorAt(anchors: VectorPenAnchor[], idx: number): VectorPenAnchor[] {
  if (idx < 0 || idx >= anchors.length) return anchors
  const copy = anchors.map(a => ({ ...a }))
  copy.splice(idx, 1)
  if (idx > 0) {
    const prev = copy[idx - 1]!
    delete prev.outX
    delete prev.outY
  }
  if (idx < copy.length) {
    const next = copy[idx]!
    delete next.inX
    delete next.inY
  }
  return copy
}

/** Trace pen Bézier through anchors; `closed` adds segment from last → first. */
function tracePenBezierPath(
  ctx: CanvasRenderingContext2D,
  anchors: VectorPenAnchor[],
  w: number,
  h: number,
  closed: boolean,
) {
  if (anchors.length < 2) return
  ctx.moveTo(anchors[0]!.x * w, anchors[0]!.y * h)
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]!
    const b = anchors[i + 1]!
    const [x1, y1] = ctrlOutAbs(a)
    const [x2, y2] = ctrlInAbs(b)
    ctx.bezierCurveTo(x1 * w, y1 * h, x2 * w, y2 * h, b.x * w, b.y * h)
  }
  if (closed && anchors.length >= 2) {
    const last = anchors[anchors.length - 1]!
    const first = anchors[0]!
    const [lx1, ly1] = ctrlOutAbs(last)
    const [lx2, ly2] = ctrlInAbs(first)
    ctx.bezierCurveTo(lx1 * w, ly1 * h, lx2 * w, ly2 * h, first.x * w, first.y * h)
  }
}

function paintHandleDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const s = 4
  ctx.fillStyle = '#2563eb'
  ctx.strokeStyle = '#1e40af'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, cy - s)
  ctx.lineTo(cx + s, cy)
  ctx.lineTo(cx, cy + s)
  ctx.lineTo(cx - s, cy)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function paintPenBezierDraft(
  ctx: CanvasRenderingContext2D,
  draft: PenBezierDraftState,
  w: number,
  h: number,
  strokeColor: string,
  strokeWidthPx: number,
  fillColor: string,
  removeHintIndex: number | null,
  closeHover: boolean,
  viewScale: number,
) {
  const { anchors, selectedAnchor } = draft
  if (anchors.length >= 2) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (closeHover && fillColor && fillColor !== 'transparent' && anchors.length >= 3) {
      ctx.beginPath()
      tracePenBezierPath(ctx, anchors, w, h, true)
      ctx.fillStyle = fillColor
      ctx.globalAlpha = 0.35
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.beginPath()
    tracePenBezierPath(ctx, anchors, w, h, false)
    if (strokeWidthPx > 0) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidthPx
    } else {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.82)'
      ctx.lineWidth = Math.max(0.75, 1 / Math.max(0.001, viewScale))
    }
    ctx.stroke()
  }

  if (closeHover && anchors.length >= 2) {
    const last = anchors[anchors.length - 1]!
    const first = anchors[0]!
    ctx.save()
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.9)'
    ctx.lineWidth = Math.max(1, strokeWidthPx || 1)
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(last.x * w, last.y * h)
    const [cx1, cy1] = ctrlOutAbs(last)
    const [cx2, cy2] = ctrlInAbs(first)
    ctx.bezierCurveTo(cx1 * w, cy1 * h, cx2 * w, cy2 * h, first.x * w, first.y * h)
    ctx.stroke()
    ctx.restore()
  }

  const ax = (x: number) => x * w
  const ay = (y: number) => y * h
  for (let i = 0; i < anchors.length; i++) {
    const p = anchors[i]!
    if (p.inX != null && p.inY != null) {
      ctx.strokeStyle = 'rgba(100,116,139,0.9)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ax(p.x), ay(p.y))
      ctx.lineTo(ax(p.inX), ay(p.inY))
      ctx.stroke()
      paintHandleDiamond(ctx, ax(p.inX), ay(p.inY))
    }
    if (p.outX != null && p.outY != null) {
      ctx.strokeStyle = 'rgba(100,116,139,0.9)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ax(p.x), ay(p.y))
      ctx.lineTo(ax(p.outX), ay(p.outY))
      ctx.stroke()
      paintHandleDiamond(ctx, ax(p.outX), ay(p.outY))
    }
    const r = selectedAnchor === i ? 5 : 4
    ctx.fillStyle = selectedAnchor === i ? '#2563eb' : '#ffffff'
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(ax(p.x), ay(p.y), r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (removeHintIndex === i) {
      const cx = ax(p.x)
      const cy = ay(p.y)
      const k = 6
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 1.75
      ctx.beginPath()
      ctx.moveTo(cx - k, cy - k)
      ctx.lineTo(cx + k, cy + k)
      ctx.moveTo(cx + k, cy - k)
      ctx.lineTo(cx - k, cy + k)
      ctx.stroke()
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#f8f8f7'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(10,10,10,0.06)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= w; x += GRID_STEP) {
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, h)
  }
  for (let y = 0; y <= h; y += GRID_STEP) {
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(w, y + 0.5)
  }
  ctx.stroke()
}

function paintStroke(ctx: CanvasRenderingContext2D, s: VectorBoardStroke, w: number, h: number) {
  const m = Math.max(1, Math.min(w, h))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const hasFill = s.fill && s.fill.length > 0 && s.fill !== 'transparent'
  const drawStroke = vectorStrokeOutlineIsVisible(s)
  if (drawStroke) {
    ctx.strokeStyle = s.stroke
    ctx.lineWidth = Math.max(0, s.strokeWidthN * m)
  }

  if (s.kind === 'pen') {
    if (s.penAnchors && s.penAnchors.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(s.penAnchors[0]!.x * w, s.penAnchors[0]!.y * h)
      for (let i = 0; i < s.penAnchors.length - 1; i++) {
        const a = s.penAnchors[i]!
        const b = s.penAnchors[i + 1]!
        const [x1, y1] = ctrlOutAbs(a)
        const [x2, y2] = ctrlInAbs(b)
        ctx.bezierCurveTo(x1 * w, y1 * h, x2 * w, y2 * h, b.x * w, b.y * h)
      }
      if (s.penClosed === true && s.penAnchors.length >= 2) {
        const last = s.penAnchors[s.penAnchors.length - 1]!
        const first = s.penAnchors[0]!
        const [lx1, ly1] = ctrlOutAbs(last)
        const [lx2, ly2] = ctrlInAbs(first)
        ctx.bezierCurveTo(lx1 * w, ly1 * h, lx2 * w, ly2 * h, first.x * w, first.y * h)
      }
      if (hasFill && s.penClosed === true) {
        ctx.fillStyle = s.fill
        ctx.fill()
      }
      if (drawStroke) ctx.stroke()
      return
    }
    if (s.points.length < 2) return
    ctx.beginPath()
    ctx.moveTo(s.points[0]![0] * w, s.points[0]![1] * h)
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i]![0] * w, s.points[i]![1] * h)
    }
    if (s.penClosed === true && s.points.length >= 3) ctx.closePath()
    if (hasFill && s.penClosed === true && s.points.length >= 3) {
      ctx.fillStyle = s.fill
      ctx.fill()
    }
    if (drawStroke) ctx.stroke()
    return
  }

  if (s.kind === 'polygon') {
    if (s.points.length < 2) return
    ctx.beginPath()
    ctx.moveTo(s.points[0]![0] * w, s.points[0]![1] * h)
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i]![0] * w, s.points[i]![1] * h)
    }
    if (s.points.length >= 3) ctx.closePath()
    if (hasFill) {
      ctx.fillStyle = s.fill
      ctx.fill()
    }
    if (drawStroke) ctx.stroke()
    return
  }

  if (s.points.length < 2) return
  const [ax, ay] = s.points[0]!
  const [bx, by] = s.points[1]!
  const x0 = ax * w
  const y0 = ay * h
  const x1 = bx * w
  const y1 = by * h

  if (s.kind === 'line') {
    if (!drawStroke) return
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    return
  }

  if (s.kind === 'rect') {
    const minX = Math.min(x0, x1)
    const maxX = Math.max(x0, x1)
    const minY = Math.min(y0, y1)
    const maxY = Math.max(y0, y1)
    ctx.beginPath()
    ctx.rect(minX, minY, maxX - minX, maxY - minY)
    if (hasFill) {
      ctx.fillStyle = s.fill
      ctx.fill()
    }
    if (drawStroke) ctx.stroke()
    return
  }

  if (s.kind === 'ellipse') {
    const minX = Math.min(ax, bx)
    const maxX = Math.max(ax, bx)
    const minY = Math.min(ay, by)
    const maxY = Math.max(ay, by)
    const cx = ((minX + maxX) / 2) * w
    const cy = ((minY + maxY) / 2) * h
    const rx = ((maxX - minX) / 2) * w
    const ry = ((maxY - minY) / 2) * h
    if (rx < 0.5 || ry < 0.5) return
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    if (hasFill) {
      ctx.fillStyle = s.fill
      ctx.fill()
    }
    if (drawStroke) ctx.stroke()
    return
  }

  if (s.kind === 'arrow') {
    if (!drawStroke) return
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    let dx = x1 - x0
    let dy = y1 - y0
    const len = Math.hypot(dx, dy)
    if (len < 2) return
    dx /= len
    dy /= len
    const head = Math.min(len * 0.35, 28)
    const wing = head * 0.45
    const bx0 = x1 - dx * head
    const by0 = y1 - dy * head
    const px = -dy
    const py = dx
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(bx0 + px * wing, by0 + py * wing)
    ctx.moveTo(x1, y1)
    ctx.lineTo(bx0 - px * wing, by0 - py * wing)
    ctx.stroke()
  }
}

function paintDocument(
  ctx: CanvasRenderingContext2D,
  doc: VectorBoardDocument,
  w: number,
  h: number,
) {
  for (const layer of doc.layers) {
    if (!layer.visible) continue
    for (const s of layer.strokes) paintStroke(ctx, s, w, h)
  }
}

/** Thumbnail / list preview: light background + document strokes (no grid). */
export function renderVectorBoardDocumentPreview(
  ctx: CanvasRenderingContext2D,
  doc: VectorBoardDocument,
  w: number,
  h: number,
) {
  ctx.fillStyle = '#f8f8f7'
  ctx.fillRect(0, 0, w, h)
  paintDocument(ctx, doc, w, h)
}

function paintDraft(
  ctx: CanvasRenderingContext2D,
  draft: DraftState | null,
  w: number,
  h: number,
  strokeColor: string,
  strokeWidthPx: number,
  fillColor: string,
  penRemoveHintIndex: number | null,
  penCloseHover: boolean,
  viewScale: number,
) {
  if (!draft) return
  if (draft.kind === 'pen-bezier') {
    paintPenBezierDraft(
      ctx,
      draft,
      w,
      h,
      strokeColor,
      strokeWidthPx,
      fillColor,
      penRemoveHintIndex,
      penCloseHover,
      viewScale,
    )
    return
  }

  if (draft.kind === 'polyline') {
    const baseLw = Math.max(0, strokeWidthPx)
    if (baseLw <= 0) return
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = baseLw
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (draft.points.length < 2) return
    ctx.beginPath()
    ctx.moveTo(draft.points[0]![0] * w, draft.points[0]![1] * h)
    for (let i = 1; i < draft.points.length; i++) {
      ctx.lineTo(draft.points[i]![0] * w, draft.points[i]![1] * h)
    }
    ctx.stroke()
    return
  }

  const sh = draft
  const baseLw = Math.max(0, strokeWidthPx)
  const guideLw = baseLw > 0 ? baseLw : 1
  ctx.strokeStyle = strokeColor
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const b = sh.b ?? sh.a
  const x0 = sh.a[0] * w
  const y0 = sh.a[1] * h
  const x1 = b[0] * w
  const y1 = b[1] * h

  if (sh.tool === 'rect') {
    const minX = Math.min(x0, x1)
    const maxX = Math.max(x0, x1)
    const minY = Math.min(y0, y1)
    const maxY = Math.max(y0, y1)
    ctx.beginPath()
    ctx.rect(minX, minY, maxX - minX, maxY - minY)
    if (fillColor && fillColor !== 'transparent') {
      ctx.fillStyle = fillColor
      ctx.globalAlpha = 0.35
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.lineWidth = guideLw
    ctx.strokeStyle = DRAFT_SHAPE_EDGE
    ctx.stroke()
    return
  }

  if (sh.tool === 'ellipse') {
    const ax = sh.a[0]
    const ay = sh.a[1]
    const bx = b[0]
    const by = b[1]
    const minX = Math.min(ax, bx)
    const maxX = Math.max(ax, bx)
    const minY = Math.min(ay, by)
    const maxY = Math.max(ay, by)
    const cx = ((minX + maxX) / 2) * w
    const cy = ((minY + maxY) / 2) * h
    const rx = ((maxX - minX) / 2) * w
    const ry = ((maxY - minY) / 2) * h
    if (rx < 0.5 || ry < 0.5) return
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    if (fillColor && fillColor !== 'transparent') {
      ctx.fillStyle = fillColor
      ctx.globalAlpha = 0.35
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.lineWidth = guideLw
    ctx.strokeStyle = DRAFT_SHAPE_EDGE
    ctx.stroke()
  }
}

function constrainShapeEnd(
  a: [number, number],
  b: [number, number],
  w: number,
  h: number,
): [number, number] {
  const dxp = (b[0] - a[0]) * w
  const dyp = (b[1] - a[1]) * h
  const m = Math.max(Math.abs(dxp), Math.abs(dyp))
  const sx = dxp < 0 ? -1 : 1
  const sy = dyp < 0 ? -1 : 1
  return [a[0] + (sx * m) / Math.max(1, w), a[1] + (sy * m) / Math.max(1, h)]
}

function paintMarqueeRect(
  ctx: CanvasRenderingContext2D,
  rect: MarqueeRect | null,
  w: number,
  h: number,
  viewScale: number,
) {
  if (!rect) return
  const x0 = rect.minX * w
  const y0 = rect.minY * h
  const rw = (rect.maxX - rect.minX) * w
  const rh = (rect.maxY - rect.minY) * h
  if (rw <= 0 || rh <= 0) return
  ctx.save()
  ctx.fillStyle = 'rgba(37,99,235,0.08)'
  ctx.strokeStyle = 'rgba(37,99,235,0.75)'
  ctx.lineWidth = 1 / viewScale
  ctx.fillRect(x0, y0, rw, rh)
  ctx.strokeRect(x0, y0, rw, rh)
  ctx.restore()
}

function paintTransformHandles(
  ctx: CanvasRenderingContext2D,
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null,
  w: number,
  h: number,
  viewScale: number,
) {
  if (!bounds) return
  const x0 = bounds.minX * w
  const y0 = bounds.minY * h
  const x1 = bounds.maxX * w
  const y1 = bounds.maxY * h
  ctx.save()
  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 1 / viewScale
  ctx.strokeRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0))
  const s = 8 / viewScale
  const half = s / 2
  for (const id of RESIZE_HANDLE_IDS) {
    const [hx, hy] = handlePositionInBounds(id, bounds)
    const px = hx * w - half
    const py = hy * h - half
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 1 / viewScale
    ctx.fillRect(px, py, s, s)
    ctx.strokeRect(px, py, s, s)
  }
  ctx.restore()
}

function paintPenEditOverlay(
  ctx: CanvasRenderingContext2D,
  doc: VectorBoardDocument,
  sel: DocStrokeSelection | null,
  w: number,
  h: number,
  viewScale: number,
  addHint: { x: number; y: number } | null,
) {
  if (!sel) return
  const layer = doc.layers.find(l => l.id === sel.layerId)
  if (!layer?.visible) return
  const stroke = layer.strokes.find(s => s.id === sel.strokeId)
  if (!stroke || stroke.kind !== 'pen' || !stroke.penAnchors) return
  const anchors = stroke.penAnchors
  if (anchors.length === 0) return
  ctx.save()
  if (anchors.length >= 2) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = vectorStrokeOutlineIsVisible(stroke)
      ? 'rgba(100, 116, 139, 0.42)'
      : 'rgba(71, 85, 105, 0.88)'
    ctx.lineWidth = Math.max(0.75, 1 / Math.max(0.001, viewScale))
    ctx.beginPath()
    tracePenBezierPath(ctx, anchors, w, h, stroke.penClosed === true)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(37,99,235,0.5)'
  ctx.lineWidth = 1 / viewScale
  for (const a of anchors) {
    if (a.inX != null && a.inY != null) {
      ctx.beginPath()
      ctx.moveTo(a.x * w, a.y * h)
      ctx.lineTo(a.inX * w, a.inY * h)
      ctx.stroke()
    }
    if (a.outX != null && a.outY != null) {
      ctx.beginPath()
      ctx.moveTo(a.x * w, a.y * h)
      ctx.lineTo(a.outX * w, a.outY * h)
      ctx.stroke()
    }
  }
  const r = 3 / viewScale
  for (const a of anchors) {
    if (a.inX != null && a.inY != null) {
      ctx.fillStyle = '#2563eb'
      ctx.beginPath()
      ctx.arc(a.inX * w, a.inY * h, r, 0, Math.PI * 2)
      ctx.fill()
    }
    if (a.outX != null && a.outY != null) {
      ctx.fillStyle = '#2563eb'
      ctx.beginPath()
      ctx.arc(a.outX * w, a.outY * h, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const sz = 6 / viewScale
  const half = sz / 2
  for (const a of anchors) {
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 1 / viewScale
    ctx.fillRect(a.x * w - half, a.y * h - half, sz, sz)
    ctx.strokeRect(a.x * w - half, a.y * h - half, sz, sz)
  }
  if (addHint) {
    const hx = addHint.x * w
    const hy = addHint.y * h
    const hr = 4 / viewScale
    ctx.beginPath()
    ctx.arc(hx, hy, hr, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 1.25 / viewScale
    ctx.strokeStyle = '#2563eb'
    ctx.stroke()
  }
  ctx.restore()
}

type Props = {
  open: boolean
  boardName: string
  document: VectorBoardDocument
  onDocumentChange: (doc: VectorBoardDocument) => void
  onSave: () => void
  onSaveAndPlace: () => void
  onClose: () => void
}

export default function VectorBoardWorkspace({
  open,
  boardName,
  document,
  onDocumentChange,
  onSave,
  onSaveAndPlace,
  onClose,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<DrawTool>('pencil')
  const [strokeColor, setStrokeColor] = useState('#1a1a1a')
  const [fillColor, setFillColor] = useState('#94a3b8')
  const [strokeWidthPx, setStrokeWidthPx] = useState(0)
  const [draft, setDraft] = useState<DraftState | null>(null)
  const draftRef = useRef<DraftState | null>(null)
  const [penRemoveHintIndex, setPenRemoveHintIndex] = useState<number | null>(null)
  const [penCloseHover, setPenCloseHover] = useState(false)
  const [docSelection, setDocSelection] = useState<DocStrokeSelection[]>([])
  const moveDragRef = useRef<{
    selections: DocStrokeSelection[]
    last: [number, number]
    pointerId: number
  } | null>(null)
  const marqueeRef = useRef<{
    start: [number, number]
    current: [number, number]
    baseSelection: DocStrokeSelection[]
    additive: boolean
    pointerId: number
  } | null>(null)
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null)
  const [saveSplitOpen, setSaveSplitOpen] = useState(false)
  const saveSplitRef = useRef<HTMLDivElement>(null)
  const documentRef = useRef(document)
  documentRef.current = document

  const [viewScale, setViewScale] = useState(1)
  const [viewTx, setViewTx] = useState(0)
  const [viewTy, setViewTy] = useState(0)
  const viewRef = useRef({ scale: 1, tx: 0, ty: 0 })
  viewRef.current = { scale: viewScale, tx: viewTx, ty: viewTy }

  const spaceDownRef = useRef(false)
  const panDragRef = useRef<{
    startX: number
    startY: number
    startTx: number
    startTy: number
    pointerId: number
  } | null>(null)

  const historyRef = useRef<{
    stack: VectorBoardDocument[]
    index: number
  }>({ stack: [document], index: 0 })

  const resizeDragRef = useRef<{
    handle: ResizeHandleId
    snapshotDoc: VectorBoardDocument
    snapshotSelections: DocStrokeSelection[]
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
    anchor: [number, number]
    startPt: [number, number]
    pointerId: number
  } | null>(null)

  const [penEditSelection, setPenEditSelection] = useState<DocStrokeSelection | null>(null)
  const penEditSelectionRef = useRef<DocStrokeSelection | null>(null)
  penEditSelectionRef.current = penEditSelection
  const [penEditAddHint, setPenEditAddHint] = useState<{
    x: number
    y: number
    segmentIndex: number
    t: number
  } | null>(null)
  const penEditAddHintRef = useRef<typeof penEditAddHint>(null)
  penEditAddHintRef.current = penEditAddHint

  const penEditDragRef = useRef<{
    type: 'anchor' | 'handle-in' | 'handle-out'
    anchorIndex: number
    pointerId: number
    last: [number, number]
  } | null>(null)

  const lastCanvasPointerClientRef = useRef<{ x: number; y: number } | null>(null)
  const altKeyHeldRef = useRef(false)

  const primarySelection = docSelection.length > 0 ? docSelection[docSelection.length - 1]! : null
  const selectionSyncKey = primarySelection
    ? `${primarySelection.layerId}:${primarySelection.strokeId}`
    : null

  const selectedStrokeForUi = useMemo(() => {
    if (!primarySelection) return null
    const layer = document.layers.find(l => l.id === primarySelection.layerId)
    return layer?.strokes.find(s => s.id === primarySelection.strokeId) ?? null
  }, [document, primarySelection])

  useEffect(() => {
    if (!open || !selectionSyncKey || !primarySelection) return
    const layer = documentRef.current.layers.find(l => l.id === primarySelection.layerId)
    const s = layer?.strokes.find(x => x.id === primarySelection.strokeId)
    if (!s) return
    const canvas = canvasRef.current
    const rw = canvas?.getBoundingClientRect().width ?? 1
    const rh = canvas?.getBoundingClientRect().height ?? 1
    const m = Math.max(1, Math.min(rw, rh))
    const nextStroke = s.stroke && strokePaintVisible(s.stroke) ? s.stroke : '#1a1a1a'
    const nextFill = s.fill && s.fill !== 'transparent' ? s.fill : '#94a3b8'
    const nextW = Math.min(16, Math.max(0, Math.round(s.strokeWidthN * m)))
    setStrokeColor(nextStroke)
    setFillColor(nextFill)
    setStrokeWidthPx(nextW)
  }, [open, selectionSyncKey, primarySelection])

  const paintFrame = useCallback(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const dpr = window.devicePixelRatio || 1
    const { width, height } = wrap.getBoundingClientRect()
    const w = Math.max(1, Math.floor(width))
    const h = Math.max(1, Math.floor(height))
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.translate(viewTx, viewTy)
    ctx.scale(viewScale, viewScale)
    drawGrid(ctx, w, h)
    paintDocument(ctx, document, w, h)
    paintDraft(
      ctx,
      draftRef.current,
      w,
      h,
      strokeColor,
      strokeWidthPx,
      fillColor,
      penRemoveHintIndex,
      penCloseHover,
      viewScale,
    )
    paintMarqueeRect(ctx, marqueeRect, w, h, viewScale)
    if (!penEditSelection && !draftRef.current) {
      const selBounds = normBoundsForSelections(document, docSelection)
      paintTransformHandles(ctx, selBounds, w, h, viewScale)
    }
    paintPenEditOverlay(ctx, document, penEditSelection, w, h, viewScale, penEditAddHint)
    ctx.restore()
  }, [
    document,
    strokeColor,
    strokeWidthPx,
    fillColor,
    penRemoveHintIndex,
    penCloseHover,
    docSelection,
    marqueeRect,
    viewScale,
    viewTx,
    viewTy,
    penEditSelection,
    penEditAddHint,
  ])

  useLayoutEffect(() => {
    if (!open) return
    paintFrame()
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => paintFrame())
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [open, paintFrame])

  useEffect(() => {
    draftRef.current = draft
    if (open) paintFrame()
  }, [draft, open, paintFrame])

  useEffect(() => {
    if (!open) {
      const m = moveDragRef.current
      if (m) releasePointerIfCaptured(canvasRef.current, m.pointerId)
      const mq = marqueeRef.current
      if (mq) releasePointerIfCaptured(canvasRef.current, mq.pointerId)
      const rd = resizeDragRef.current
      if (rd) releasePointerIfCaptured(canvasRef.current, rd.pointerId)
      const ped = penEditDragRef.current
      if (ped) releasePointerIfCaptured(canvasRef.current, ped.pointerId)
      const pn = panDragRef.current
      if (pn) releasePointerIfCaptured(canvasRef.current, pn.pointerId)
      setDocSelection([])
      setMarqueeRect(null)
      setPenEditSelection(null)
      moveDragRef.current = null
      marqueeRef.current = null
      resizeDragRef.current = null
      penEditDragRef.current = null
      panDragRef.current = null
      spaceDownRef.current = false
    }
  }, [open])

  useEffect(() => {
    if (tool !== 'move') {
      setPenEditSelection(null)
    }
  }, [tool])

  useEffect(() => {
    if (!penEditSelection) setPenEditAddHint(null)
  }, [penEditSelection])

  useEffect(() => {
    const m = moveDragRef.current
    if (m) releasePointerIfCaptured(canvasRef.current, m.pointerId)
    moveDragRef.current = null
    if (tool !== 'pen' && draftRef.current?.kind === 'pen-bezier') {
      draftRef.current = null
      setDraft(null)
    }
    setPenRemoveHintIndex(null)
    setPenCloseHover(false)
    const c = canvasRef.current
    if (c) {
      if (tool === 'pen') c.style.cursor = CURSOR_PEN_ADD
      else if (tool === 'move') c.style.cursor = CURSOR_MOVE
      else c.style.cursor = 'crosshair'
    }
  }, [tool])

  useEffect(() => {
    if (!open) setSaveSplitOpen(false)
  }, [open])

  useEffect(() => {
    if (!saveSplitOpen) return
    const onDown = (e: MouseEvent) => {
      if (saveSplitRef.current?.contains(e.target as Node)) return
      setSaveSplitOpen(false)
    }
    window.document.addEventListener('mousedown', onDown)
    return () => window.document.removeEventListener('mousedown', onDown)
  }, [saveSplitOpen])

  const toNorm = useCallback((clientX: number, clientY: number): [number, number] | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const r = canvas.getBoundingClientRect()
    const v = viewRef.current
    const worldX = (clientX - r.left - v.tx) / v.scale
    const worldY = (clientY - r.top - v.ty) / v.scale
    const x = worldX / Math.max(1, r.width)
    const y = worldY / Math.max(1, r.height)
    return [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]
  }, [])

  const toNormUnclamped = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const r = canvas.getBoundingClientRect()
      const v = viewRef.current
      const worldX = (clientX - r.left - v.tx) / v.scale
      const worldY = (clientY - r.top - v.ty) / v.scale
      return [worldX / Math.max(1, r.width), worldY / Math.max(1, r.height)]
    },
    [],
  )

  const updatePenHoverCursor = useCallback(
    (clientX: number, clientY: number, altHeld: boolean) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const penEdit = penEditSelectionRef.current
      if (tool === 'move' && penEdit) {
        if (penEditDragRef.current) {
          setPenEditAddHint(null)
          return
        }
        const r = canvas.getBoundingClientRect()
        const w = Math.max(1, r.width)
        const h = Math.max(1, r.height)
        const ptu = toNormUnclamped(clientX, clientY)
        if (!ptu) {
          setPenEditAddHint(null)
          return
        }
        const layer = documentRef.current.layers.find(l => l.id === penEdit.layerId)
        const stroke = layer?.strokes.find(s => s.id === penEdit.strokeId)
        if (stroke?.kind !== 'pen' || !stroke.penAnchors) {
          setPenEditAddHint(null)
          canvas.style.cursor = CURSOR_MOVE
          return
        }
        const anchors = stroke.penAnchors
        const vs = viewRef.current.scale
        const hitRpx = 8
        const hitR = hitRpx / (vs * Math.min(w, h))
        const hitR2 = hitR * hitR
        if (altHeld) {
          for (let i = anchors.length - 1; i >= 0; i--) {
            const a = anchors[i]!
            const dx = ptu[0] - a.x
            const dy = ptu[1] - a.y
            if (dx * dx + dy * dy <= hitR2) {
              setPenEditAddHint(null)
              canvas.style.cursor = CURSOR_PEN_REMOVE
              return
            }
          }
          setPenEditAddHint(null)
          canvas.style.cursor = CURSOR_MOVE
          return
        }
        // Prefer move cursor when directly over an anchor or control handle.
        for (let i = anchors.length - 1; i >= 0; i--) {
          const a = anchors[i]!
          const dxA = ptu[0] - a.x
          const dyA = ptu[1] - a.y
          if (dxA * dxA + dyA * dyA <= hitR2) {
            setPenEditAddHint(null)
            canvas.style.cursor = CURSOR_MOVE
            return
          }
          if (a.outX != null && a.outY != null) {
            const dxO = ptu[0] - a.outX
            const dyO = ptu[1] - a.outY
            if (dxO * dxO + dyO * dyO <= hitR2) {
              setPenEditAddHint(null)
              canvas.style.cursor = CURSOR_MOVE
              return
            }
          }
          if (a.inX != null && a.inY != null) {
            const dxI = ptu[0] - a.inX
            const dyI = ptu[1] - a.inY
            if (dxI * dxI + dyI * dyI <= hitR2) {
              setPenEditAddHint(null)
              canvas.style.cursor = CURSOR_MOVE
              return
            }
          }
        }
        // Near the curve: show add cursor + preview dot at insertion point.
        if (anchors.length >= 2) {
          const near = findNearestPointOnPenPath(
            anchors,
            stroke.penClosed === true,
            ptu[0],
            ptu[1],
            w * vs,
            h * vs,
          )
          const THRESH_PX = 6
          if (near && near.dist <= THRESH_PX) {
            setPenEditAddHint({
              x: near.x,
              y: near.y,
              segmentIndex: near.segmentIndex,
              t: near.t,
            })
            canvas.style.cursor = CURSOR_PEN_ADD
            return
          }
        }
        setPenEditAddHint(null)
        canvas.style.cursor = CURSOR_MOVE
        return
      }
      setPenEditAddHint(null)

      if (tool !== 'pen') return

      const pt = toNorm(clientX, clientY)
      if (!pt) return
      const cur = draftRef.current
      if (cur?.kind === 'pen-bezier' && altHeld) {
        const hit = hitTestPenBezier(cur, pt[0], pt[1])
        if (hit?.type === 'anchor') {
          setPenRemoveHintIndex(hit.anchorIndex)
          setPenCloseHover(false)
          canvas.style.cursor = CURSOR_PEN_REMOVE
        } else {
          setPenRemoveHintIndex(null)
          setPenCloseHover(false)
          canvas.style.cursor = CURSOR_PEN_ADD
        }
      } else if (cur?.kind === 'pen-bezier' && !altHeld && cur.anchors.length >= 2) {
        const hit = hitTestPenBezier(cur, pt[0], pt[1])
        const ch = hit?.type === 'anchor' && hit.anchorIndex === 0
        setPenCloseHover(ch)
        setPenRemoveHintIndex(null)
        canvas.style.cursor = CURSOR_PEN_ADD
      } else {
        setPenRemoveHintIndex(null)
        setPenCloseHover(false)
        canvas.style.cursor = CURSOR_PEN_ADD
      }
    },
    [tool, toNorm, toNormUnclamped],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Alt' && ev.code !== 'AltLeft' && ev.code !== 'AltRight') {
        return
      }
      const last = lastCanvasPointerClientRef.current
      if (!last) return
      const altHeld = ev.type === 'keydown'
      altKeyHeldRef.current = altHeld
      updatePenHoverCursor(last.x, last.y, altHeld)
    }
    const onBlur = () => {
      altKeyHeldRef.current = false
      const last = lastCanvasPointerClientRef.current
      if (last) updatePenHoverCursor(last.x, last.y, false)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onKey, true)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onKey, true)
      window.removeEventListener('blur', onBlur)
    }
  }, [open, updatePenHoverCursor])

  const commit = useCallback(
    (doc: VectorBoardDocument) => {
      documentRef.current = doc
      const h = historyRef.current
      const truncated = h.stack.slice(0, h.index + 1)
      truncated.push(doc)
      const MAX = 200
      const trimmed = truncated.length > MAX ? truncated.slice(truncated.length - MAX) : truncated
      historyRef.current = { stack: trimmed, index: trimmed.length - 1 }
      onDocumentChange(doc)
    },
    [onDocumentChange],
  )

  const commitLive = useCallback(
    (doc: VectorBoardDocument) => {
      documentRef.current = doc
      onDocumentChange(doc)
    },
    [onDocumentChange],
  )

  const undoVector = useCallback(() => {
    const h = historyRef.current
    if (h.index <= 0) return
    const nextIndex = h.index - 1
    const doc = h.stack[nextIndex]!
    historyRef.current = { ...h, index: nextIndex }
    documentRef.current = doc
    setDocSelection(prev =>
      prev.filter(sel => {
        const L = doc.layers.find(l => l.id === sel.layerId)
        return L?.strokes.some(s => s.id === sel.strokeId)
      }),
    )
    setPenEditSelection(null)
    onDocumentChange(doc)
  }, [onDocumentChange])

  const redoVector = useCallback(() => {
    const h = historyRef.current
    if (h.index >= h.stack.length - 1) return
    const nextIndex = h.index + 1
    const doc = h.stack[nextIndex]!
    historyRef.current = { ...h, index: nextIndex }
    documentRef.current = doc
    setDocSelection(prev =>
      prev.filter(sel => {
        const L = doc.layers.find(l => l.id === sel.layerId)
        return L?.strokes.some(s => s.id === sel.strokeId)
      }),
    )
    setPenEditSelection(null)
    onDocumentChange(doc)
  }, [onDocumentChange])

  useEffect(() => {
    if (!open) return
    historyRef.current = { stack: [documentRef.current], index: 0 }
    setViewScale(1)
    setViewTx(0)
    setViewTy(0)
  }, [open])

  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    const v = viewRef.current
    const nextScale = Math.max(0.2, Math.min(8, v.scale * factor))
    if (Math.abs(nextScale - v.scale) < 1e-6) return
    const worldX = (cx - v.tx) / v.scale
    const worldY = (cy - v.ty) / v.scale
    const nextTx = cx - worldX * nextScale
    const nextTy = cy - worldY * nextScale
    setViewScale(nextScale)
    setViewTx(nextTx)
    setViewTy(nextTy)
  }, [])

  const zoomAtCenter = useCallback(
    (factor: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const r = canvas.getBoundingClientRect()
      zoomAt(r.width / 2, r.height / 2, factor)
    },
    [zoomAt],
  )

  const resetView = useCallback(() => {
    setViewScale(1)
    setViewTx(0)
    setViewTy(0)
  }, [])

  const fitView = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const r = canvas.getBoundingClientRect()
    const b = normBoundsForSelections(
      documentRef.current,
      documentRef.current.layers.flatMap(L =>
        L.visible ? L.strokes.map(s => ({ layerId: L.id, strokeId: s.id })) : [],
      ),
    )
    if (!b) {
      resetView()
      return
    }
    const padNorm = 0.05
    const minX = Math.max(0, b.minX - padNorm)
    const minY = Math.max(0, b.minY - padNorm)
    const maxX = Math.min(1, b.maxX + padNorm)
    const maxY = Math.min(1, b.maxY + padNorm)
    const worldW = (maxX - minX) * r.width
    const worldH = (maxY - minY) * r.height
    if (worldW <= 0 || worldH <= 0) {
      resetView()
      return
    }
    const nextScale = Math.max(0.2, Math.min(8, Math.min(r.width / worldW, r.height / worldH)))
    const cx = ((minX + maxX) / 2) * r.width
    const cy = ((minY + maxY) / 2) * r.height
    setViewScale(nextScale)
    setViewTx(r.width / 2 - cx * nextScale)
    setViewTy(r.height / 2 - cy * nextScale)
  }, [resetView])

  useEffect(() => {
    const c = canvasRef.current
    if (!c || !open) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const r = c.getBoundingClientRect()
        const cx = e.clientX - r.left
        const cy = e.clientY - r.top
        const factor = Math.exp(-e.deltaY * 0.01)
        zoomAt(cx, cy, factor)
        return
      }
      e.preventDefault()
      setViewTx(tx => tx - e.deltaX)
      setViewTy(ty => ty - e.deltaY)
    }
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }, [open, zoomAt])

  const appendPoint = useCallback((pts: [number, number][], p: [number, number]) => {
    const last = pts[pts.length - 1]
    if (!last) return [...pts, p]
    const dx = p[0] - last[0]
    const dy = p[1] - last[1]
    if (dx * dx + dy * dy < POINT_EPS * POINT_EPS) return pts
    return [...pts, p]
  }, [])

  const commitStrokeToActiveLayer = useCallback(
    (stroke: VectorBoardStroke) => {
      const active = getActiveLayer(document)
      if (!active) return
      commit({
        ...document,
        layers: document.layers.map(L =>
          L.id !== active.id ? L : { ...L, strokes: [...L.strokes, stroke] },
        ),
      })
      setDocSelection([{ layerId: active.id, strokeId: stroke.id }])
      setPenEditSelection(null)
    },
    [document, commit],
  )

  const strokeWidthNFromCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return 0
    const r = canvas.getBoundingClientRect()
    const m = Math.max(1, Math.min(r.width, r.height))
    return strokeWidthPx / m
  }, [strokeWidthPx])

  const commitPenBezierDraft = useCallback(
    (closed = false) => {
      const d = draftRef.current
      if (d?.kind !== 'pen-bezier' || d.anchors.length < 2) return
      const fill = closed && fillColor && fillColor !== 'transparent' ? fillColor : ''
      commitStrokeToActiveLayer({
        id: crypto.randomUUID(),
        kind: 'pen',
        points: [],
        penAnchors: d.anchors.map(q => ({ ...q })),
        penClosed: closed ? true : undefined,
        stroke: strokeColor,
        strokeWidthN: strokeWidthNFromCanvas(),
        fill,
      })
      draftRef.current = null
      setDraft(null)
      setPenRemoveHintIndex(null)
      setPenCloseHover(false)
    },
    [commitStrokeToActiveLayer, fillColor, strokeColor, strokeWidthNFromCanvas],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Enter' && tool === 'pen') {
        const cur = draftRef.current
        if (cur?.kind === 'pen-bezier' && cur.anchors.length >= 2) {
          e.preventDefault()
          commitPenBezierDraft()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, tool, commitPenBezierDraft])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable="true"]')) return

      if (e.key === ' ' || e.code === 'Space') {
        if (!spaceDownRef.current) {
          spaceDownRef.current = true
          const c = canvasRef.current
          if (c && !panDragRef.current) c.style.cursor = 'grab'
        }
        if (!draftRef.current) e.preventDefault()
        return
      }

      if (e.key === 'Escape') {
        if (penEditSelectionRef.current) {
          e.preventDefault()
          setPenEditSelection(null)
          return
        }
      }

      if (draftRef.current) return

      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault()
          e.stopPropagation()
          if (e.shiftKey) redoVector()
          else undoVector()
          return
        }
        if ((e.key === '=' || e.key === '+') && !e.shiftKey) {
          e.preventDefault()
          zoomAtCenter(1.2)
          return
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault()
          zoomAtCenter(1 / 1.2)
          return
        }
        if (e.key === '0') {
          e.preventDefault()
          resetView()
          return
        }
        if (e.key === '1') {
          e.preventDefault()
          fitView()
          return
        }
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault()
          const all: DocStrokeSelection[] = []
          for (const L of documentRef.current.layers) {
            for (const s of L.strokes) {
              all.push({ layerId: L.id, strokeId: s.id })
            }
          }
          setDocSelection(all)
          return
        }
        if (e.key === 'd' || e.key === 'D') {
          if (docSelection.length === 0) {
            e.preventDefault()
            return
          }
          e.preventDefault()
          const dup = duplicateSelectionsInPlace(documentRef.current, docSelection)
          if (dup) {
            commit(dup.doc)
            setDocSelection(dup.newSelections)
          }
          return
        }
        if (e.key === ']') {
          if (docSelection.length === 0) return
          e.preventDefault()
          e.stopPropagation()
          commit(
            applyZOrderInDoc(documentRef.current, docSelection, e.shiftKey ? 'front' : 'forward'),
          )
          return
        }
        if (e.key === '[') {
          if (docSelection.length === 0) return
          e.preventDefault()
          e.stopPropagation()
          commit(
            applyZOrderInDoc(documentRef.current, docSelection, e.shiftKey ? 'back' : 'backward'),
          )
          return
        }
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (docSelection.length === 0) return
        e.preventDefault()
        e.stopPropagation()
        const next = removeStrokesFromDoc(documentRef.current, docSelection)
        commit(next)
        setDocSelection([])
        setPenEditSelection(null)
        return
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
        const k = e.key.toLowerCase()
        let nextTool: DrawTool | null = null
        if (k === 'v' && !e.shiftKey) nextTool = 'move'
        else if (k === 'p' && e.shiftKey) nextTool = 'pencil'
        else if (k === 'p' && !e.shiftKey) nextTool = 'pen'
        else if (k === 'r' && !e.shiftKey) nextTool = 'rect'
        else if (k === 'o' && !e.shiftKey) nextTool = 'ellipse'
        if (nextTool) {
          e.preventDefault()
          e.stopPropagation()
          setTool(nextTool)
          return
        }
      }

      if (
        (e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight') &&
        docSelection.length > 0 &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault()
        e.stopPropagation()
        const canvas = canvasRef.current
        const r = canvas?.getBoundingClientRect()
        const rw = r ? Math.max(1, r.width) : 1
        const rh = r ? Math.max(1, r.height) : 1
        const step = e.shiftKey ? 10 : 1
        let dxp = 0
        let dyp = 0
        if (e.key === 'ArrowLeft') dxp = -step
        if (e.key === 'ArrowRight') dxp = step
        if (e.key === 'ArrowUp') dyp = -step
        if (e.key === 'ArrowDown') dyp = step
        const moved = applyTranslateStrokesInDoc(
          documentRef.current,
          docSelection,
          dxp / rw,
          dyp / rh,
        )
        commit(moved)
        return
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'c' || e.key === 'C') {
          if (docSelection.length === 0) return
          const strokes = getStrokesForSelections(documentRef.current, docSelection)
          if (strokes.length === 0) return
          e.preventDefault()
          e.stopPropagation()
          const payload = JSON.stringify({
            avnacVectorStrokeClip: true,
            v: 1,
            strokes,
          })
          void navigator.clipboard.writeText(payload).catch(() => {})
          return
        }
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault()
          e.stopPropagation()
          void (async () => {
            let text: string
            try {
              text = await navigator.clipboard.readText()
            } catch {
              return
            }
            const strokes = parseVectorStrokeClipboardText(text)
            if (!strokes) return
            const appended = appendClonedStrokesToActiveLayer(
              documentRef.current,
              strokes,
              VECTOR_CLIPBOARD_PASTE_OFFSET_N,
              VECTOR_CLIPBOARD_PASTE_OFFSET_N,
            )
            if (!appended) return
            commit(appended.doc)
            const layer = getActiveLayer(appended.doc)
            if (layer) {
              setDocSelection(
                appended.newStrokeIds.map(strokeId => ({
                  layerId: layer.id,
                  strokeId,
                })),
              )
            }
          })()
        }
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        spaceDownRef.current = false
        const c = canvasRef.current
        if (c && !panDragRef.current) {
          if (tool === 'pen') c.style.cursor = CURSOR_PEN_ADD
          else if (tool === 'move') c.style.cursor = CURSOR_MOVE
          else c.style.cursor = 'crosshair'
        }
      }
    }

    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [open, docSelection, commit, undoVector, redoVector, zoomAtCenter, resetView, fitView, tool])

  const shapeFill = useCallback(() => {
    if (tool === 'rect' || tool === 'ellipse' || tool === 'pen') {
      return fillColor && fillColor !== 'transparent' ? fillColor : ''
    }
    return ''
  }, [tool, fillColor])

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    const r = canvas?.getBoundingClientRect()

    if (e.button === 1 || (e.button === 0 && spaceDownRef.current)) {
      panDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTx: viewRef.current.tx,
        startTy: viewRef.current.ty,
        pointerId: e.pointerId,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      if (canvas) canvas.style.cursor = 'grabbing'
      e.preventDefault()
      return
    }

    if (e.button !== 0) return

    if (tool === 'move' && penEditSelection) {
      const pt = toNormUnclamped(e.clientX, e.clientY)
      if (pt && r) {
        const layer = documentRef.current.layers.find(l => l.id === penEditSelection.layerId)
        const stroke = layer?.strokes.find(s => s.id === penEditSelection.strokeId)
        if (stroke?.kind === 'pen' && stroke.penAnchors) {
          const hitR = 8 / (viewRef.current.scale * Math.min(r.width, r.height))
          const hitR2 = hitR * hitR
          for (let i = stroke.penAnchors.length - 1; i >= 0; i--) {
            const a = stroke.penAnchors[i]!
            if (a.outX != null && a.outY != null) {
              const dx = pt[0] - a.outX
              const dy = pt[1] - a.outY
              if (dx * dx + dy * dy <= hitR2) {
                penEditDragRef.current = {
                  type: 'handle-out',
                  anchorIndex: i,
                  pointerId: e.pointerId,
                  last: pt,
                }
                ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                return
              }
            }
            if (a.inX != null && a.inY != null) {
              const dx = pt[0] - a.inX
              const dy = pt[1] - a.inY
              if (dx * dx + dy * dy <= hitR2) {
                penEditDragRef.current = {
                  type: 'handle-in',
                  anchorIndex: i,
                  pointerId: e.pointerId,
                  last: pt,
                }
                ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                return
              }
            }
          }
          for (let i = stroke.penAnchors.length - 1; i >= 0; i--) {
            const a = stroke.penAnchors[i]!
            const dx = pt[0] - a.x
            const dy = pt[1] - a.y
            if (dx * dx + dy * dy <= hitR2) {
              if (pointerAltKey(e)) {
                const nextAnchors = stroke.penAnchors
                  .slice(0, i)
                  .concat(stroke.penAnchors.slice(i + 1))
                if (nextAnchors.length === 0) {
                  const removed = removeStrokesFromDoc(documentRef.current, [penEditSelection])
                  commit(removed)
                  setPenEditSelection(null)
                  setDocSelection([])
                } else {
                  commit(
                    updateStrokeInDocFull(
                      documentRef.current,
                      penEditSelection.layerId,
                      penEditSelection.strokeId,
                      { penAnchors: nextAnchors },
                    ),
                  )
                }
                return
              }
              penEditDragRef.current = {
                type: 'anchor',
                anchorIndex: i,
                pointerId: e.pointerId,
                last: pt,
              }
              ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
              return
            }
          }
          if (!pointerAltKey(e) && stroke.penAnchors.length >= 2) {
            const near = findNearestPointOnPenPath(
              stroke.penAnchors,
              stroke.penClosed === true,
              pt[0],
              pt[1],
              r.width * viewRef.current.scale,
              r.height * viewRef.current.scale,
            )
            if (near && near.dist <= 6) {
              const nextAnchors = splitPenBezierSegment(
                stroke.penAnchors,
                near.segmentIndex,
                near.t,
                stroke.penClosed === true,
              )
              if (nextAnchors) {
                commit(
                  updateStrokeInDocFull(
                    documentRef.current,
                    penEditSelection.layerId,
                    penEditSelection.strokeId,
                    { penAnchors: nextAnchors },
                  ),
                )
                const newAnchorIndex = near.segmentIndex + 1
                penEditDragRef.current = {
                  type: 'anchor',
                  anchorIndex: newAnchorIndex,
                  pointerId: e.pointerId,
                  last: [near.x, near.y],
                }
                ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                setPenEditAddHint(null)
                return
              }
            }
          }
        }
      }
      setPenEditSelection(null)
    }

    if (tool === 'move' && docSelection.length > 0 && r) {
      const selBounds = normBoundsForSelections(documentRef.current, docSelection)
      if (selBounds) {
        const pt = toNormUnclamped(e.clientX, e.clientY)
        if (pt) {
          const hitPxR = 10
          for (const id of RESIZE_HANDLE_IDS) {
            const [hx, hy] = handlePositionInBounds(id, selBounds)
            const dxp = (pt[0] - hx) * r.width * viewRef.current.scale
            const dyp = (pt[1] - hy) * r.height * viewRef.current.scale
            if (Math.hypot(dxp, dyp) <= hitPxR) {
              const anchor = anchorForHandle(id, selBounds)
              resizeDragRef.current = {
                handle: id,
                snapshotDoc: documentRef.current,
                snapshotSelections: docSelection,
                bounds: selBounds,
                anchor,
                startPt: pt,
                pointerId: e.pointerId,
              }
              ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
              if (canvas) canvas.style.cursor = RESIZE_HANDLE_CURSORS[id]
              return
            }
          }
        }
      }
    }

    const p = toNorm(e.clientX, e.clientY)
    if (!p) return

    if (tool === 'move') {
      const hit = findTopStrokeAt(document, p[0], p[1])
      if (!hit) {
        if (e.shiftKey) {
          marqueeRef.current = {
            start: p,
            current: p,
            baseSelection: docSelection,
            additive: true,
            pointerId: e.pointerId,
          }
        } else {
          setDocSelection([])
          marqueeRef.current = {
            start: p,
            current: p,
            baseSelection: [],
            additive: false,
            pointerId: e.pointerId,
          }
        }
        setMarqueeRect({
          minX: p[0],
          minY: p[1],
          maxX: p[0],
          maxY: p[1],
        })
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        return
      }

      const hitSel: DocStrokeSelection = {
        layerId: hit.layerId,
        strokeId: hit.stroke.id,
      }
      const alreadySelected = docSelection.some(
        s => s.layerId === hitSel.layerId && s.strokeId === hitSel.strokeId,
      )

      let nextSelection: DocStrokeSelection[]
      if (e.shiftKey) {
        nextSelection = alreadySelected
          ? docSelection.filter(
              s => !(s.layerId === hitSel.layerId && s.strokeId === hitSel.strokeId),
            )
          : [...docSelection, hitSel]
      } else {
        nextSelection = alreadySelected ? docSelection : [hitSel]
      }

      if (pointerAltKey(e) && nextSelection.length > 0) {
        const dup = duplicateSelectionsInPlace(documentRef.current, nextSelection)
        if (dup) {
          commitLive(dup.doc)
          nextSelection = dup.newSelections
        }
      }

      setDocSelection(nextSelection)

      const clickedStaysSelected = nextSelection.some(
        s => s.layerId === hitSel.layerId && s.strokeId === hitSel.strokeId,
      )
      if (clickedStaysSelected && nextSelection.length > 0) {
        moveDragRef.current = {
          selections: nextSelection,
          last: p,
          pointerId: e.pointerId,
        }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        const c = canvasRef.current
        if (c) c.style.cursor = 'grabbing'
      }
      return
    }

    const active = getActiveLayer(document)
    if (!active?.visible) return

    if (tool === 'pen') {
      const cur = draftRef.current
      if (cur?.kind === 'pen-bezier') {
        const hit = hitTestPenBezier(cur, p[0], p[1])
        if (hit?.type === 'handle') {
          const next: PenBezierDraftState = {
            ...cur,
            selectedAnchor: hit.anchorIndex,
            drag: {
              type: 'handle',
              anchorIndex: hit.anchorIndex,
              which: hit.which,
            },
          }
          draftRef.current = next
          setDraft(next)
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          return
        }
        if (hit?.type === 'anchor') {
          if (pointerAltKey(e)) {
            const nextAnchors = removePenAnchorAt(cur.anchors, hit.anchorIndex)
            if (nextAnchors.length === 0) {
              draftRef.current = null
              setDraft(null)
            } else {
              const next: PenBezierDraftState = {
                ...cur,
                anchors: nextAnchors,
                selectedAnchor: null,
                drag: null,
              }
              draftRef.current = next
              setDraft(next)
            }
            setPenRemoveHintIndex(null)
            setPenCloseHover(false)
            return
          }
          if (hit.anchorIndex === 0 && cur.anchors.length >= 2) {
            commitPenBezierDraft(true)
            return
          }
          const next: PenBezierDraftState = {
            ...cur,
            selectedAnchor: hit.anchorIndex,
            drag: null,
          }
          draftRef.current = next
          setDraft(next)
          return
        }
      }
      const prevAnchors =
        draftRef.current?.kind === 'pen-bezier' ? draftRef.current.anchors.map(a => ({ ...a })) : []
      const anchors: VectorPenAnchor[] = [...prevAnchors, { x: p[0], y: p[1] }]
      const next: PenBezierDraftState = {
        kind: 'pen-bezier',
        anchors,
        selectedAnchor: null,
        drag: {
          type: 'place',
          anchorIndex: anchors.length - 1,
          startX: p[0],
          startY: p[1],
        },
      }
      draftRef.current = next
      setDraft(next)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    if (tool === 'pencil') {
      const next: PolylineDraftState = {
        kind: 'polyline',
        tool: 'pencil',
        points: [p],
      }
      draftRef.current = next
      setDraft(next)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    if (tool === 'rect' || tool === 'ellipse') {
      const next: ShapeDraft = { kind: 'shape', tool, a: p }
      draftRef.current = next
      setDraft(next)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    lastCanvasPointerClientRef.current = { x: e.clientX, y: e.clientY }
    altKeyHeldRef.current = pointerAltKey(e)

    if (panDragRef.current) {
      const pan = panDragRef.current
      setViewTx(pan.startTx + (e.clientX - pan.startX))
      setViewTy(pan.startTy + (e.clientY - pan.startY))
      return
    }

    if (resizeDragRef.current) {
      const rd = resizeDragRef.current
      const cur = toNormUnclamped(e.clientX, e.clientY)
      if (!cur) return
      const handle = rd.handle
      const affectsX =
        handle === 'nw' ||
        handle === 'ne' ||
        handle === 'se' ||
        handle === 'sw' ||
        handle === 'e' ||
        handle === 'w'
      const affectsY =
        handle === 'nw' ||
        handle === 'ne' ||
        handle === 'se' ||
        handle === 'sw' ||
        handle === 'n' ||
        handle === 's'
      const origHx = handlePositionInBounds(handle, rd.bounds)
      let originX: number
      let originY: number
      let sx = 1
      let sy = 1
      if (pointerAltKey(e)) {
        originX = (rd.bounds.minX + rd.bounds.maxX) / 2
        originY = (rd.bounds.minY + rd.bounds.maxY) / 2
      } else {
        originX = rd.anchor[0]
        originY = rd.anchor[1]
      }
      if (affectsX) {
        const origDx = origHx[0] - originX
        const curDx = cur[0] - originX
        if (Math.abs(origDx) > 1e-9) sx = curDx / origDx
      }
      if (affectsY) {
        const origDy = origHx[1] - originY
        const curDy = cur[1] - originY
        if (Math.abs(origDy) > 1e-9) sy = curDy / origDy
      }
      if (e.shiftKey) {
        if (affectsX && affectsY) {
          const m = Math.max(Math.abs(sx), Math.abs(sy))
          sx = (sx < 0 ? -1 : 1) * m
          sy = (sy < 0 ? -1 : 1) * m
        } else if (affectsX) {
          sy = Math.abs(sx) * (sy < 0 ? -1 : 1)
        } else if (affectsY) {
          sx = Math.abs(sy) * (sx < 0 ? -1 : 1)
        }
      }
      if (affectsX && !affectsY) sy = 1
      if (affectsY && !affectsX) sx = 1
      const scaled = applyScaleStrokesInDoc(
        rd.snapshotDoc,
        rd.snapshotSelections,
        originX,
        originY,
        sx,
        sy,
      )
      commitLive(scaled)
      return
    }

    if (penEditDragRef.current) {
      const ped = penEditDragRef.current
      const pt2 = toNormUnclamped(e.clientX, e.clientY)
      if (!pt2 || !penEditSelection) return
      const layer = documentRef.current.layers.find(l => l.id === penEditSelection.layerId)
      const stroke = layer?.strokes.find(s => s.id === penEditSelection.strokeId)
      if (!stroke?.penAnchors) return
      const idx = ped.anchorIndex
      const anchors = stroke.penAnchors.map(a => ({ ...a }))
      const a = anchors[idx]
      if (!a) return
      if (ped.type === 'anchor') {
        const ddx = pt2[0] - ped.last[0]
        const ddy = pt2[1] - ped.last[1]
        a.x += ddx
        a.y += ddy
        if (a.inX != null) a.inX += ddx
        if (a.inY != null) a.inY += ddy
        if (a.outX != null) a.outX += ddx
        if (a.outY != null) a.outY += ddy
      } else if (ped.type === 'handle-in') {
        a.inX = pt2[0]
        a.inY = pt2[1]
      } else {
        a.outX = pt2[0]
        a.outY = pt2[1]
      }
      ped.last = pt2
      commitLive(
        updateStrokeInDocFull(
          documentRef.current,
          penEditSelection.layerId,
          penEditSelection.strokeId,
          { penAnchors: anchors },
        ),
      )
      return
    }

    const pt = toNorm(e.clientX, e.clientY)

    if (tool === 'move' && moveDragRef.current && pt) {
      const m = moveDragRef.current
      const ddx = pt[0] - m.last[0]
      const ddy = pt[1] - m.last[1]
      m.last = pt
      const moved = applyTranslateStrokesInDoc(documentRef.current, m.selections, ddx, ddy)
      commitLive(moved)
      return
    }

    if (tool === 'move' && marqueeRef.current && pt) {
      const mq = marqueeRef.current
      mq.current = pt
      const minX = Math.min(mq.start[0], pt[0])
      const minY = Math.min(mq.start[1], pt[1])
      const maxX = Math.max(mq.start[0], pt[0])
      const maxY = Math.max(mq.start[1], pt[1])
      setMarqueeRect({ minX, minY, maxX, maxY })
      const hits = findStrokesIntersectingRect(documentRef.current, {
        minX,
        minY,
        maxX,
        maxY,
      })
      if (mq.additive) {
        const seen = new Set<string>()
        const merged: DocStrokeSelection[] = []
        for (const s of [...mq.baseSelection, ...hits]) {
          const key = `${s.layerId}:${s.strokeId}`
          if (seen.has(key)) continue
          seen.add(key)
          merged.push(s)
        }
        setDocSelection(merged)
      } else {
        setDocSelection(hits)
      }
      return
    }

    if ((tool === 'pen' || (tool === 'move' && penEditSelection)) && canvas) {
      updatePenHoverCursor(e.clientX, e.clientY, pointerAltKey(e))
    } else if (tool !== 'pen') {
      setPenRemoveHintIndex(null)
      setPenCloseHover(false)
    }

    const d = draftRef.current
    if (!d) return
    if (!pt) return

    if (d.kind === 'pen-bezier' && d.drag) {
      if (d.drag.type === 'place') {
        const nextAnchors = d.anchors.map(a => ({ ...a }))
        applySmoothPlacementHandles(nextAnchors, d.drag.anchorIndex, pt[0], pt[1])
        const nd: PenBezierDraftState = {
          ...d,
          anchors: nextAnchors,
        }
        draftRef.current = nd
        setDraft(nd)
        return
      }
      if (d.drag.type === 'handle') {
        const nextAnchors = d.anchors.map(a => ({ ...a }))
        const a = nextAnchors[d.drag.anchorIndex]!
        if (d.drag.which === 'in') {
          a.inX = pt[0]
          a.inY = pt[1]
          a.outX = 2 * a.x - pt[0]
          a.outY = 2 * a.y - pt[1]
        } else {
          a.outX = pt[0]
          a.outY = pt[1]
          a.inX = 2 * a.x - pt[0]
          a.inY = 2 * a.y - pt[1]
        }
        const nd: PenBezierDraftState = { ...d, anchors: nextAnchors }
        draftRef.current = nd
        setDraft(nd)
        return
      }
    }

    if (d.kind === 'pen-bezier') return

    if (d.kind === 'polyline') {
      const next = appendPoint(d.points, pt)
      const nd: PolylineDraftState = { ...d, points: next }
      draftRef.current = nd
      setDraft(nd)
      return
    }

    if (d.kind !== 'shape') return
    const sh = d
    let b = pt
    if (e.shiftKey) {
      const rect = canvas?.getBoundingClientRect()
      const rw = rect ? Math.max(1, rect.width) : 1
      const rh = rect ? Math.max(1, rect.height) : 1
      b = constrainShapeEnd(sh.a, pt, rw, rh)
    }
    const nd: ShapeDraft = {
      kind: 'shape',
      tool: sh.tool,
      a: sh.a,
      b,
    }
    draftRef.current = nd
    setDraft(nd)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const el = e.target as HTMLElement
    const releaseCapture = () => {
      if (typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId)
      }
    }

    if (panDragRef.current) {
      panDragRef.current = null
      releaseCapture()
      const c = canvasRef.current
      if (c) c.style.cursor = spaceDownRef.current ? 'grab' : 'default'
      return
    }

    if (resizeDragRef.current) {
      resizeDragRef.current = null
      releaseCapture()
      commit(documentRef.current)
      const c = canvasRef.current
      if (c) c.style.cursor = tool === 'move' ? CURSOR_MOVE : 'default'
      return
    }

    if (penEditDragRef.current) {
      penEditDragRef.current = null
      releaseCapture()
      commit(documentRef.current)
      return
    }

    if (tool === 'move' && moveDragRef.current) {
      moveDragRef.current = null
      releaseCapture()
      commit(documentRef.current)
      const c = canvasRef.current
      if (c) c.style.cursor = CURSOR_MOVE
      return
    }

    if (tool === 'move' && marqueeRef.current) {
      marqueeRef.current = null
      setMarqueeRect(null)
      releaseCapture()
      const c = canvasRef.current
      if (c) c.style.cursor = CURSOR_MOVE
      return
    }

    const d = draftRef.current
    if (!d) return

    if (d.kind === 'pen-bezier') {
      const el = e.target as HTMLElement
      if (typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId)
      }
      const pt = toNorm(e.clientX, e.clientY)
      if (d.drag?.type === 'place' && pt) {
        const moved = Math.hypot(pt[0] - d.drag.startX, pt[1] - d.drag.startY)
        const nextAnchors = d.anchors.map(a => ({ ...a }))
        const i = d.drag.anchorIndex
        if (moved < PEN_CORNER_DRAG && i >= 0) {
          const B = nextAnchors[i]!
          delete B.inX
          delete B.inY
          delete B.outX
          delete B.outY
          if (i > 0) {
            const A = nextAnchors[i - 1]!
            delete A.outX
            delete A.outY
          }
        }
        const nd: PenBezierDraftState = {
          ...d,
          anchors: nextAnchors,
          drag: null,
        }
        draftRef.current = nd
        setDraft(nd)
        return
      }
      if (d.drag?.type === 'handle') {
        const nd: PenBezierDraftState = { ...d, drag: null }
        draftRef.current = nd
        setDraft(nd)
        return
      }
      return
    }

    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)

    draftRef.current = null
    setDraft(null)

    const swN = strokeWidthNFromCanvas()
    const fill = shapeFill()

    if (d.kind === 'polyline') {
      if (d.points.length < 2) return
      commitStrokeToActiveLayer({
        id: crypto.randomUUID(),
        kind: 'pen',
        points: d.points,
        stroke: strokeColor,
        strokeWidthN: swN,
        fill: '',
      })
      return
    }

    const sh = d
    const canvas = canvasRef.current
    const r = canvas?.getBoundingClientRect()
    const w = r ? Math.max(1, r.width) : 1
    const h = r ? Math.max(1, r.height) : 1
    const vs = Math.max(0.0001, viewRef.current.scale)
    const b0 = sh.b ?? sh.a
    const dxPx = (b0[0] - sh.a[0]) * w * vs
    const dyPx = (b0[1] - sh.a[1]) * h * vs
    const MIN_DRAG_PX = 3
    const DEFAULT_SIZE_PX = 100
    let a = sh.a
    let b = b0
    if (Math.abs(dxPx) < MIN_DRAG_PX && Math.abs(dyPx) < MIN_DRAG_PX) {
      const halfW = DEFAULT_SIZE_PX / 2 / (w * vs)
      const halfH = DEFAULT_SIZE_PX / 2 / (h * vs)
      a = [sh.a[0] - halfW, sh.a[1] - halfH]
      b = [sh.a[0] + halfW, sh.a[1] + halfH]
    }

    const kind: VectorStrokeKind = sh.tool
    commitStrokeToActiveLayer({
      id: crypto.randomUUID(),
      kind,
      points: [a, b],
      stroke: '',
      strokeWidthN: 0,
      fill,
    })
  }

  const clearActiveLayer = () => {
    const active = getActiveLayer(document)
    if (!active) return
    setDocSelection(prev => prev.filter(s => s.layerId !== active.id))
    commit({
      ...document,
      layers: document.layers.map(L => (L.id !== active.id ? L : { ...L, strokes: [] })),
    })
  }

  const clearAll = () => {
    setDocSelection([])
    commit(emptyVectorBoardDocument())
  }

  const addLayer = () => {
    const n = document.layers.length + 1
    const L = createVectorBoardLayer(`Layer ${n}`)
    commit({
      ...document,
      layers: [...document.layers, L],
      activeLayerId: L.id,
    })
  }

  const deleteLayer = (id: string) => {
    if (document.layers.length <= 1) return
    const next = document.layers.filter(l => l.id !== id)
    let activeLayerId = document.activeLayerId
    if (activeLayerId === id) activeLayerId = next[0]!.id
    commit({ ...document, layers: next, activeLayerId })
  }

  const moveLayer = (id: string, dir: -1 | 1) => {
    const i = document.layers.findIndex(l => l.id === id)
    if (i < 0) return
    const j = i + dir
    if (j < 0 || j >= document.layers.length) return
    const copy = [...document.layers]
    const t = copy[i]!
    copy[i] = copy[j]!
    copy[j] = t
    commit({ ...document, layers: copy })
  }

  const setLayerVisible = (id: string, visible: boolean) => {
    commit({
      ...document,
      layers: document.layers.map(L => (L.id !== id ? L : { ...L, visible })),
    })
  }

  if (!open) return null

  const canPlace = vectorDocHasRenderableStrokes(document)
  const fillAppliesToSelected =
    selectedStrokeForUi &&
    (selectedStrokeForUi.kind === 'rect' ||
      selectedStrokeForUi.kind === 'ellipse' ||
      selectedStrokeForUi.kind === 'polygon' ||
      (selectedStrokeForUi.kind === 'pen' && selectedStrokeForUi.penClosed === true))
  const showFill =
    tool === 'rect' ||
    tool === 'ellipse' ||
    tool === 'pen' ||
    (tool === 'move' && Boolean(fillAppliesToSelected))

  return (
    <div
      data-avnac-chrome
      className="pointer-events-auto fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={boardName}
      onClick={onClose}
    >
      <div
        className="flex h-[min(90vh,920px)] w-[min(96vw,1400px)] overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.2)]"
        onClick={e => e.stopPropagation()}
      >
        <aside className="flex w-[13.5rem] shrink-0 flex-col border-r border-black/[0.06] bg-neutral-50/90">
          <div className="border-b border-black/[0.06] px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Layers
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto p-2">
            {document.layers.map(L => {
              const active = L.id === document.activeLayerId
              return (
                <div
                  key={L.id}
                  className={[
                    'flex flex-col rounded-xl border px-2 py-1.5',
                    active
                      ? 'border-[var(--accent)]/60 bg-[var(--accent)]/15'
                      : 'border-transparent bg-white/80',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-black/[0.06]"
                      title={L.visible ? 'Hide' : 'Show'}
                      aria-label={L.visible ? 'Hide layer' : 'Show layer'}
                      onClick={() => setLayerVisible(L.id, !L.visible)}
                    >
                      <HugeiconsIcon
                        icon={L.visible ? ViewIcon : ViewOffSlashIcon}
                        size={16}
                        strokeWidth={1.75}
                      />
                    </button>
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-neutral-800"
                      onClick={() =>
                        commit({
                          ...document,
                          activeLayerId: L.id,
                        })
                      }
                    >
                      {L.name}
                    </button>
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      className="rounded p-1 text-neutral-500 hover:bg-black/[0.06] hover:text-neutral-800"
                      title="Move down"
                      onClick={() => moveLayer(L.id, -1)}
                    >
                      <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-neutral-500 hover:bg-black/[0.06] hover:text-neutral-800"
                      title="Move up"
                      onClick={() => moveLayer(L.id, 1)}
                    >
                      <HugeiconsIcon icon={ArrowUp01Icon} size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      disabled={document.layers.length <= 1}
                      className="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                      title="Delete layer"
                      onClick={() => deleteLayer(L.id)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t border-black/[0.06] p-2">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] bg-white py-2 text-[13px] font-medium text-neutral-800 hover:bg-black/[0.03]"
              onClick={addLayer}
            >
              <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.75} />
              Add layer
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3 sm:px-5">
            <h2 className="m-0 min-w-0 truncate text-base font-semibold text-neutral-900 sm:text-lg">
              {boardName}
            </h2>
            <button
              type="button"
              className={floatingToolbarIconButton(false)}
              onClick={onClose}
              aria-label="Close vector workspace"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-b border-black/[0.06] bg-[linear-gradient(180deg,rgba(250,250,249,0.9)_0%,rgba(255,255,255,0.5)_100%)] px-4 py-3 sm:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <FloatingToolbarShell role="toolbar" aria-label="Drawing tools">
                  <div className="flex flex-wrap items-center gap-0.5 py-1 pl-1 pr-2">
                    {(
                      [
                        ['move', 'Move', 'V', Cursor01Icon],
                        ['pencil', 'Pencil', 'Shift+P', Pen01Icon],
                        ['pen', 'Pen', 'P', PenTool03Icon],
                        ['rect', 'Rectangle', 'R', SquareIcon],
                        ['ellipse', 'Ellipse', 'O', CircleIcon],
                      ] as const
                    ).map(([id, label, shortcut, icon]) => (
                      <button
                        key={id}
                        type="button"
                        className={floatingToolbarIconButton(tool === id)}
                        title={`${label} (${shortcut})`}
                        aria-label={`${label} (${shortcut})`}
                        aria-keyshortcuts={shortcut}
                        aria-pressed={tool === id}
                        onClick={() => setTool(id)}
                      >
                        <HugeiconsIcon icon={icon} size={18} strokeWidth={1.75} />
                      </button>
                    ))}
                  </div>
                </FloatingToolbarShell>
                <FloatingToolbarShell role="toolbar" aria-label="Stroke and fill">
                  <div className="flex flex-wrap items-center gap-0.5 py-1 pl-1 pr-2">
                    <StrokeToolbarPopover
                      strokeWidthMax={16}
                      strokeWidthPx={strokeWidthPx}
                      strokePaint={{ type: 'solid', color: strokeColor }}
                      onStrokeWidthChange={px => {
                        setStrokeWidthPx(px)
                        if (docSelection.length > 0) {
                          const canvas = canvasRef.current
                          const rw = canvas?.getBoundingClientRect().width ?? 1
                          const rh = canvas?.getBoundingClientRect().height ?? 1
                          const m = Math.max(1, Math.min(rw, rh))
                          let next = document
                          for (const sel of docSelection) {
                            next = updateVectorStrokeInDoc(next, sel.layerId, sel.strokeId, {
                              strokeWidthN: px / m,
                            })
                          }
                          commit(next)
                        }
                      }}
                      onStrokePaintChange={v => {
                        const hex = bgValuePreferSolid(v)
                        setStrokeColor(hex)
                        if (docSelection.length > 0) {
                          let next = document
                          for (const sel of docSelection) {
                            next = updateVectorStrokeInDoc(next, sel.layerId, sel.strokeId, {
                              stroke: hex,
                            })
                          }
                          commit(next)
                        }
                      }}
                    />
                    {showFill ? (
                      <>
                        <FloatingToolbarDivider />
                        <PaintPopoverControl
                          compact
                          value={{ type: 'solid', color: fillColor }}
                          onChange={v => {
                            const hex = bgValuePreferSolid(v)
                            setFillColor(hex)
                            if (docSelection.length > 0) {
                              const fill = hex && hex !== 'transparent' ? hex : ''
                              let next = document
                              for (const sel of docSelection) {
                                next = updateVectorStrokeInDoc(next, sel.layerId, sel.strokeId, {
                                  fill,
                                })
                              }
                              commit(next)
                            }
                          }}
                          title="Fill color"
                          ariaLabel="Fill color"
                        />
                      </>
                    ) : null}
                  </div>
                </FloatingToolbarShell>
              </div>
              <div className="ml-auto flex shrink-0 items-center">
                <FloatingToolbarShell aria-label="Board actions">
                  <div className="flex flex-wrap items-center justify-end gap-0.5 py-1 pl-1 pr-2">
                    <button
                      type="button"
                      className={[
                        floatingToolbarIconButton(false, { wide: true }),
                        'px-2.5 text-[13px] font-medium',
                      ].join(' ')}
                      onClick={clearActiveLayer}
                    >
                      Clear layer
                    </button>
                    <FloatingToolbarDivider />
                    <button
                      type="button"
                      className={[
                        floatingToolbarIconButton(false, { wide: true }),
                        'px-2.5 text-[13px] font-medium',
                      ].join(' ')}
                      onClick={clearAll}
                    >
                      Clear all
                    </button>
                    <FloatingToolbarDivider />
                    <div ref={saveSplitRef} className="relative shrink-0">
                      <div className="flex h-8 overflow-hidden rounded-lg">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center justify-center bg-neutral-900 px-3 text-[13px] font-semibold text-white outline-none transition-colors hover:bg-neutral-800"
                          onClick={() => {
                            setSaveSplitOpen(false)
                            onSave()
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="flex w-8 shrink-0 items-center justify-center border-l border-white/20 bg-neutral-900 text-white outline-none transition-colors hover:bg-neutral-800"
                          aria-expanded={saveSplitOpen}
                          aria-haspopup="menu"
                          title="More save options"
                          onClick={() => setSaveSplitOpen(o => !o)}
                        >
                          <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                      {saveSplitOpen ? (
                        <div
                          className="absolute right-0 top-full z-[80] mt-1 min-w-[14rem] rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
                          role="menu"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            disabled={!canPlace}
                            className={[
                              'flex w-full px-3 py-2 text-left text-[13px] font-medium transition-colors',
                              canPlace
                                ? 'text-neutral-800 hover:bg-black/[0.05]'
                                : 'cursor-not-allowed text-neutral-400',
                            ].join(' ')}
                            onClick={() => {
                              if (!canPlace) return
                              setSaveSplitOpen(false)
                              onSaveAndPlace()
                            }}
                          >
                            Save and place on canvas
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </FloatingToolbarShell>
              </div>
            </div>
          </div>

          <div ref={wrapRef} className="relative min-h-0 flex-1 bg-neutral-200/40 p-3 sm:p-4">
            <canvas
              ref={canvasRef}
              className="block h-full w-full max-w-none touch-none rounded-lg border border-black/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]"
              aria-label="Vector drawing canvas"
              style={{ touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onDoubleClick={e => {
                if (tool !== 'move') return
                const p = toNorm(e.clientX, e.clientY)
                if (!p) return
                const hit = findTopStrokeAt(document, p[0], p[1])
                if (
                  hit &&
                  hit.stroke.kind === 'pen' &&
                  hit.stroke.penAnchors &&
                  hit.stroke.penAnchors.length > 0
                ) {
                  setPenEditSelection({
                    layerId: hit.layerId,
                    strokeId: hit.stroke.id,
                  })
                  setDocSelection([{ layerId: hit.layerId, strokeId: hit.stroke.id }])
                  requestAnimationFrame(() => {
                    const last = lastCanvasPointerClientRef.current
                    if (last) {
                      updatePenHoverCursor(last.x, last.y, altKeyHeldRef.current)
                    }
                  })
                }
              }}
              onPointerLeave={() => {
                setPenRemoveHintIndex(null)
                setPenCloseHover(false)
                const c = canvasRef.current
                if (c) {
                  if (tool === 'pen') c.style.cursor = CURSOR_PEN_ADD
                  else if (tool === 'move') c.style.cursor = CURSOR_MOVE
                  else c.style.cursor = 'crosshair'
                }
              }}
            />
            <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-md border border-black/[0.08] bg-white/90 px-2 py-1 text-[11px] font-medium text-neutral-600 shadow-sm backdrop-blur-sm">
              {Math.round(viewScale * 100)}%
            </div>
            <div className="pointer-events-auto absolute bottom-3 left-3 flex items-center gap-1 rounded-md border border-black/[0.08] bg-white/90 px-1 py-1 text-[11px] text-neutral-600 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                className="rounded px-1.5 py-0.5 hover:bg-black/[0.06]"
                title="Zoom out"
                onClick={() => zoomAtCenter(1 / 1.2)}
              >
                −
              </button>
              <button
                type="button"
                className="rounded px-1.5 py-0.5 hover:bg-black/[0.06]"
                title="Reset zoom"
                onClick={resetView}
              >
                1:1
              </button>
              <button
                type="button"
                className="rounded px-1.5 py-0.5 hover:bg-black/[0.06]"
                title="Fit to content"
                onClick={fitView}
              >
                Fit
              </button>
              <button
                type="button"
                className="rounded px-1.5 py-0.5 hover:bg-black/[0.06]"
                title="Zoom in"
                onClick={() => zoomAtCenter(1.2)}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
