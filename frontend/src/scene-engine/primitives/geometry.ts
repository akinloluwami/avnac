import type { MarqueeRect, ResizeHandleId } from './types'

const ROTATION_SNAP_DEG = 15

export function clampDimension(v: number | undefined, fallback: number) {
  if (!Number.isFinite(v)) return fallback
  return Math.min(16000, Math.max(100, Math.round(v!)))
}

export function angleFromPoints(x1: number, y1: number, x2: number, y2: number) {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
}

export function snapAngle(angle: number, step = ROTATION_SNAP_DEG) {
  return Math.round(angle / step) * step
}

export function pointerSceneDelta(
  x: number,
  y: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (-angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}

export function rotateDeltaToScene(
  x: number,
  y: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}

export function getHandleLocalPosition(
  handle: ResizeHandleId,
  width: number,
  height: number,
): { x: number; y: number } {
  const hw = width / 2
  const hh = height / 2
  switch (handle) {
    case 'nw':
      return { x: -hw, y: -hh }
    case 'n':
      return { x: 0, y: -hh }
    case 'ne':
      return { x: hw, y: -hh }
    case 'e':
      return { x: hw, y: 0 }
    case 'se':
      return { x: hw, y: hh }
    case 's':
      return { x: 0, y: hh }
    case 'sw':
      return { x: -hw, y: hh }
    case 'w':
      return { x: -hw, y: 0 }
  }
}

export function oppositeHandle(handle: ResizeHandleId): ResizeHandleId {
  switch (handle) {
    case 'nw':
      return 'se'
    case 'n':
      return 's'
    case 'ne':
      return 'sw'
    case 'e':
      return 'w'
    case 'se':
      return 'nw'
    case 's':
      return 'n'
    case 'sw':
      return 'ne'
    case 'w':
      return 'e'
  }
}

export function isCornerHandle(handle: ResizeHandleId): boolean {
  return handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw'
}

export function isSideHandle(handle: ResizeHandleId): boolean {
  return handle === 'n' || handle === 'e' || handle === 's' || handle === 'w'
}

export function cursorForHandle(
  handle: ResizeHandleId,
): 'ns-resize' | 'ew-resize' | 'nwse-resize' | 'nesw-resize' {
  switch (handle) {
    case 'n':
    case 's':
      return 'ns-resize'
    case 'e':
    case 'w':
      return 'ew-resize'
    case 'nw':
    case 'se':
      return 'nwse-resize'
    case 'ne':
    case 'sw':
      return 'nesw-resize'
  }
}

export function constrainAspectRatioBounds(
  handle: ResizeHandleId,
  anchor: { x: number; y: number },
  pointer: { x: number; y: number },
  width: number,
  height: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const MIN_SIZE = 12
  const baseW = Math.max(1, width)
  const baseH = Math.max(1, height)
  const scale = Math.max(
    MIN_SIZE / baseW,
    MIN_SIZE / baseH,
    Math.abs(pointer.x - anchor.x) / baseW,
    Math.abs(pointer.y - anchor.y) / baseH,
  )
  const nextW = baseW * scale
  const nextH = baseH * scale
  const xDir = handle === 'ne' || handle === 'se' ? 1 : -1
  const yDir = handle === 'sw' || handle === 'se' ? 1 : -1
  return {
    minX: xDir > 0 ? anchor.x : anchor.x - nextW,
    maxX: xDir > 0 ? anchor.x + nextW : anchor.x,
    minY: yDir > 0 ? anchor.y : anchor.y - nextH,
    maxY: yDir > 0 ? anchor.y + nextH : anchor.y,
  }
}

export function rectFromPoints(x1: number, y1: number, x2: number, y2: number): MarqueeRect {
  const left = Math.min(x1, x2)
  const top = Math.min(y1, y2)
  return {
    left,
    top,
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

export function boundsIntersect(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
): boolean {
  return (
    a.left <= b.left + b.width &&
    a.left + a.width >= b.left &&
    a.top <= b.top + b.height &&
    a.top + a.height >= b.top
  )
}

export function mergeUniqueIds(base: string[], extra: string[]): string[] {
  const seen = new Set(base)
  const next = [...base]
  for (const id of extra) {
    if (seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }
  return next
}
