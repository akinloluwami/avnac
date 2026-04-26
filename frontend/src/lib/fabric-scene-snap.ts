import type { Canvas, FabricObject, TPointerEvent } from 'fabric'

type TMat2D = [number, number, number, number, number, number]

export type SceneSnapGuide = { axis: 'v' | 'h'; pos: number }

type Options = {
  width: number
  height: number
  threshold?: number
  fabricMod: typeof import('fabric')
  /** CSS color used to paint guide lines on the canvas overlay. */
  guideColor?: string
}

const DEFAULT_GUIDE_COLOR = 'rgba(255, 88, 0, 0.95)'

/**
 * Once a guide is engaged, the cursor must drag this far past the engage
 * threshold before the snap releases. Cursor-anchored: applies to the
 * intended (un-snapped) position, not the corrected one.
 */
const SNAP_RELEASE_MULTIPLIER = 2.2

/** Once snapped, a different candidate must beat the current guide by this much. */
const SNAP_SWITCH_HYSTERESIS_PX = 4

function collectTargets(
  canvas: Canvas,
  moving: FabricObject,
  fabricMod: typeof import('fabric'),
): FabricObject[] {
  return canvas.getObjects().filter((o) => {
    if (o === moving) return false
    if (
      fabricMod.ActiveSelection &&
      moving instanceof fabricMod.ActiveSelection
    ) {
      return !moving.getObjects().includes(o)
    }
    return true
  })
}

type IntendedRect = { left: number; top: number; width: number; height: number }

type SnapResult = {
  guides: SceneSnapGuide[]
  /** Correction in canvas units, added to the intended top-left to get the final position. */
  dx: number
  dy: number
}

function computeSnapForRect(
  intended: IntendedRect,
  targets: FabricObject[],
  width: number,
  height: number,
  threshold: number,
  prevGuideX: number | null,
  prevGuideY: number | null,
): SnapResult {
  const midX = width / 2
  const midY = height / 2

  const left = intended.left
  const right = intended.left + intended.width
  const top = intended.top
  const bottom = intended.top + intended.height
  const cx = left + intended.width / 2
  const cy = top + intended.height / 2

  let bestDx = 0
  let bestXScore = Infinity
  let guideX: number | null = null
  const releaseThresholdX = threshold * SNAP_RELEASE_MULTIPLIER

  const tryX = (myX: number, theirX: number) => {
    const d = theirX - myX
    const ad = Math.abs(d)
    const sticky = prevGuideX !== null && Math.abs(theirX - prevGuideX) < 0.5
    const limit = sticky ? releaseThresholdX : threshold
    if (ad > limit) return
    const score = ad - (sticky ? SNAP_SWITCH_HYSTERESIS_PX : 0)
    if (score < bestXScore) {
      bestXScore = score
      bestDx = d
      guideX = theirX
    }
  }

  for (const o of targets) {
    const b = o.getBoundingRect()
    const ox = b.left
    const oc = b.left + b.width / 2
    const or = b.left + b.width
    for (const tx of [ox, oc, or]) {
      tryX(left, tx)
      tryX(cx, tx)
      tryX(right, tx)
    }
  }
  tryX(left, 0)
  tryX(cx, midX)
  tryX(right, width)

  let bestDy = 0
  let bestYScore = Infinity
  let guideY: number | null = null
  const releaseThresholdY = threshold * SNAP_RELEASE_MULTIPLIER

  const tryY = (myY: number, theirY: number) => {
    const d = theirY - myY
    const ad = Math.abs(d)
    const sticky = prevGuideY !== null && Math.abs(theirY - prevGuideY) < 0.5
    const limit = sticky ? releaseThresholdY : threshold
    if (ad > limit) return
    const score = ad - (sticky ? SNAP_SWITCH_HYSTERESIS_PX : 0)
    if (score < bestYScore) {
      bestYScore = score
      bestDy = d
      guideY = theirY
    }
  }

  for (const o of targets) {
    const b = o.getBoundingRect()
    const oy = b.top
    const oc = b.top + b.height / 2
    const ob = b.top + b.height
    for (const ty of [oy, oc, ob]) {
      tryY(top, ty)
      tryY(cy, ty)
      tryY(bottom, ty)
    }
  }
  tryY(top, 0)
  tryY(cy, midY)
  tryY(bottom, height)

  const guides: SceneSnapGuide[] = []
  if (guideX !== null) guides.push({ axis: 'v', pos: guideX })
  if (guideY !== null) guides.push({ axis: 'h', pos: guideY })

  return { guides, dx: bestDx, dy: bestDy }
}

function drawGuidesOnOverlay(
  canvas: Canvas,
  guides: SceneSnapGuide[],
  artboardW: number,
  artboardH: number,
  color: string,
) {
  if (guides.length === 0) return
  const ctx = canvas.getSelectionContext()
  const vpt = canvas.viewportTransform as TMat2D | undefined
  if (!ctx || !vpt) return
  const zoom = Math.max(Math.abs(vpt[0]), Math.abs(vpt[3]), 1e-6)
  const lineWidth = 1 / zoom

  ctx.save()
  ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5])
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = color
  ctx.beginPath()
  for (const g of guides) {
    if (g.axis === 'v') {
      ctx.moveTo(g.pos, 0)
      ctx.lineTo(g.pos, artboardH)
    } else {
      ctx.moveTo(0, g.pos)
      ctx.lineTo(artboardW, g.pos)
    }
  }
  ctx.stroke()
  ctx.restore()
}

type DragState = {
  target: FabricObject
  startPointerX: number
  startPointerY: number
  /** Bounding rect of the target at drag start, in scene coords. */
  startBR: { left: number; top: number; width: number; height: number }
  /** Offset from object's `left/top` to its bounding-rect top-left at drag start. */
  leftToBRX: number
  topToBRY: number
  /** Cached scene-pointer at last move, used by object:moving handler. */
  lastPointerX: number
  lastPointerY: number
}

export function installSceneSnap(
  canvas: Canvas,
  { width, height, threshold: thOpt, fabricMod, guideColor }: Options,
) {
  const threshold =
    thOpt ?? Math.max(20, Math.round(Math.min(width, height) * 0.006))
  const color = guideColor ?? DEFAULT_GUIDE_COLOR

  let activeGuides: SceneSnapGuide[] = []
  let lastGuideX: number | null = null
  let lastGuideY: number | null = null
  let drag: DragState | null = null

  const captureDragStart = (target: FabricObject, pointerX: number, pointerY: number) => {
    const br = target.getBoundingRect()
    drag = {
      target,
      startPointerX: pointerX,
      startPointerY: pointerY,
      startBR: { left: br.left, top: br.top, width: br.width, height: br.height },
      leftToBRX: br.left - (target.left ?? 0),
      topToBRY: br.top - (target.top ?? 0),
      lastPointerX: pointerX,
      lastPointerY: pointerY,
    }
    lastGuideX = null
    lastGuideY = null
  }

  const onMouseDown = (opt: { e: TPointerEvent; target?: FabricObject }) => {
    const target = opt.target
    if (!target) {
      drag = null
      return
    }
    const p = canvas.getScenePoint(opt.e)
    captureDragStart(target, p.x, p.y)
  }

  const onMouseMove = (opt: { e: TPointerEvent }) => {
    if (!drag) return
    const p = canvas.getScenePoint(opt.e)
    drag.lastPointerX = p.x
    drag.lastPointerY = p.y
  }

  const onMoving = (opt: { target: FabricObject }) => {
    const target = opt.target
    if (!drag || drag.target !== target) {
      const br = target.getBoundingRect()
      drag = {
        target,
        startPointerX: 0,
        startPointerY: 0,
        startBR: { left: br.left, top: br.top, width: br.width, height: br.height },
        leftToBRX: br.left - (target.left ?? 0),
        topToBRY: br.top - (target.top ?? 0),
        lastPointerX: 0,
        lastPointerY: 0,
      }
      return
    }

    const dxPointer = drag.lastPointerX - drag.startPointerX
    const dyPointer = drag.lastPointerY - drag.startPointerY

    const intended: IntendedRect = {
      left: drag.startBR.left + dxPointer,
      top: drag.startBR.top + dyPointer,
      width: drag.startBR.width,
      height: drag.startBR.height,
    }

    const targets = collectTargets(canvas, target, fabricMod)
    const { guides, dx, dy } = computeSnapForRect(
      intended,
      targets,
      width,
      height,
      threshold,
      lastGuideX,
      lastGuideY,
    )

    const finalBRLeft = intended.left + dx
    const finalBRTop = intended.top + dy
    const finalLeft = finalBRLeft - drag.leftToBRX
    const finalTop = finalBRTop - drag.topToBRY

    const curLeft = target.left ?? 0
    const curTop = target.top ?? 0
    if (curLeft !== finalLeft || curTop !== finalTop) {
      target.set({ left: finalLeft, top: finalTop })
      target.setCoords()
    }

    activeGuides = guides
    lastGuideX = guides.find((g) => g.axis === 'v')?.pos ?? null
    lastGuideY = guides.find((g) => g.axis === 'h')?.pos ?? null
  }

  const endDrag = () => {
    drag = null
    if (
      activeGuides.length === 0 &&
      lastGuideX === null &&
      lastGuideY === null
    ) {
      return
    }
    activeGuides = []
    lastGuideX = null
    lastGuideY = null
    canvas.requestRenderAll()
  }

  const beforeRender = () => {
    const topCtx = canvas.contextTop
    if (!topCtx) return
    canvas.clearContext(topCtx)
  }

  const afterRender = () => {
    drawGuidesOnOverlay(canvas, activeGuides, width, height, color)
  }

  canvas.on('mouse:down', onMouseDown)
  canvas.on('mouse:move', onMouseMove)
  canvas.on('object:moving', onMoving)
  canvas.on('object:modified', endDrag)
  canvas.on('selection:cleared', endDrag)
  canvas.on('mouse:up', endDrag)
  canvas.on('before:render', beforeRender)
  canvas.on('after:render', afterRender)

  return () => {
    canvas.off('mouse:down', onMouseDown)
    canvas.off('mouse:move', onMouseMove)
    canvas.off('object:moving', onMoving)
    canvas.off('object:modified', endDrag)
    canvas.off('selection:cleared', endDrag)
    canvas.off('mouse:up', endDrag)
    canvas.off('before:render', beforeRender)
    canvas.off('after:render', afterRender)
    activeGuides = []
    lastGuideX = null
    lastGuideY = null
    drag = null
    canvas.requestRenderAll()
  }
}
