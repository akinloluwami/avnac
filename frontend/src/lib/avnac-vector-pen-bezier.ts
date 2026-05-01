export type VectorPenAnchor = {
  x: number
  y: number
  inX?: number
  inY?: number
  outX?: number
  outY?: number
}

export function ctrlOutAbs(a: VectorPenAnchor): [number, number] {
  return [a.outX ?? a.x, a.outY ?? a.y]
}

export function ctrlInAbs(b: VectorPenAnchor): [number, number] {
  return [b.inX ?? b.x, b.inY ?? b.y]
}

function cubicSample(
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
): [number, number] {
  const u = 1 - t
  const u2 = u * u
  const u3 = u2 * u
  const t2 = t * t
  const t3 = t2 * t
  return [
    u3 * p0[0] + 3 * u2 * t * p1[0] + 3 * u * t2 * p2[0] + t3 * p3[0],
    u3 * p0[1] + 3 * u2 * t * p1[1] + 3 * u * t2 * p2[1] + t3 * p3[1],
  ]
}

/** Polyline samples along the full pen path (normalized coords). */
export function samplePenAnchorsToPolyline(
  anchors: VectorPenAnchor[],
  stepsPerSegment = 20,
  closed = false,
): [number, number][] {
  if (anchors.length < 2) return []
  const out: [number, number][] = []
  const segCount = closed ? anchors.length : anchors.length - 1
  for (let i = 0; i < segCount; i++) {
    const a = anchors[i]!
    const b = anchors[(i + 1) % anchors.length]!
    const p0: [number, number] = [a.x, a.y]
    const p1 = ctrlOutAbs(a)
    const p2 = ctrlInAbs(b)
    const p3: [number, number] = [b.x, b.y]
    const n = Math.max(2, stepsPerSegment)
    for (let s = 0; s < n; s++) {
      const t = s / n
      out.push(cubicSample(t, p0, p1, p2, p3))
    }
  }
  if (!closed) {
    const last = anchors[anchors.length - 1]!
    out.push([last.x, last.y])
  } else if (out.length > 0) {
    const f = out[0]!
    const last = out[out.length - 1]!
    if ((f[0] - last[0]) * (f[0] - last[0]) + (f[1] - last[1]) * (f[1] - last[1]) > 1e-16) {
      out.push([f[0], f[1]])
    }
  }
  return out
}

export function penAnchorsToPathCommands(
  anchors: VectorPenAnchor[],
  scale: number,
  closed = false,
): [string, ...number[]][] | null {
  if (anchors.length < 2) return null
  const S = scale
  const cmds: [string, ...number[]][] = [['M', anchors[0]!.x * S, anchors[0]!.y * S]]
  const segCount = closed ? anchors.length : anchors.length - 1
  for (let i = 0; i < segCount; i++) {
    const a = anchors[i]!
    const b = anchors[(i + 1) % anchors.length]!
    const [ox, oy] = ctrlOutAbs(a)
    const [ix, iy] = ctrlInAbs(b)
    cmds.push(['C', ox * S, oy * S, ix * S, iy * S, b.x * S, b.y * S])
  }
  if (closed) {
    cmds.push(['Z'])
  }
  return cmds
}

export function applySmoothPlacementHandles(
  anchors: VectorPenAnchor[],
  anchorIndex: number,
  mx: number,
  my: number,
): void {
  const B = anchors[anchorIndex]
  if (!B) return
  // Drag direction is the OUT handle (tangent leaving this anchor forward).
  // IN handle mirrors across the anchor (tangent coming into it from previous).
  B.outX = mx
  B.outY = my
  if (anchorIndex <= 0) {
    delete B.inX
    delete B.inY
    return
  }
  B.inX = 2 * B.x - mx
  B.inY = 2 * B.y - my
}

export function stripAnchorHandles(a: VectorPenAnchor): void {
  delete a.inX
  delete a.inY
  delete a.outX
  delete a.outY
}

export type NearestPathHit = {
  segmentIndex: number
  t: number
  x: number
  y: number
  dist: number
}

/**
 * Find the closest point on a pen path to the given query point in pixel space.
 * `scaleX`/`scaleY` convert from normalized anchor units into pixels so the
 * returned `dist` can be compared against a screen-pixel threshold directly.
 */
export function findNearestPointOnPenPath(
  anchors: VectorPenAnchor[],
  closed: boolean,
  nx: number,
  ny: number,
  scaleX: number,
  scaleY: number,
): NearestPathHit | null {
  if (anchors.length < 2) return null
  const segCount = closed ? anchors.length : anchors.length - 1
  if (segCount <= 0) return null
  const COARSE = 32
  const FINE = 24
  let best: NearestPathHit | null = null
  for (let i = 0; i < segCount; i++) {
    const a = anchors[i]!
    const b = anchors[(i + 1) % anchors.length]!
    const p0: [number, number] = [a.x, a.y]
    const p1 = ctrlOutAbs(a)
    const p2 = ctrlInAbs(b)
    const p3: [number, number] = [b.x, b.y]
    for (let s = 0; s <= COARSE; s++) {
      const t = s / COARSE
      const pt = cubicSample(t, p0, p1, p2, p3)
      const dx = (pt[0] - nx) * scaleX
      const dy = (pt[1] - ny) * scaleY
      const d = Math.hypot(dx, dy)
      if (best === null || d < best.dist) {
        best = { segmentIndex: i, t, x: pt[0], y: pt[1], dist: d }
      }
    }
  }
  if (best) {
    const a = anchors[best.segmentIndex]!
    const b = anchors[(best.segmentIndex + 1) % anchors.length]!
    const p0: [number, number] = [a.x, a.y]
    const p1 = ctrlOutAbs(a)
    const p2 = ctrlInAbs(b)
    const p3: [number, number] = [b.x, b.y]
    const range = 1 / COARSE
    const t0 = Math.max(0, best.t - range)
    const t1 = Math.min(1, best.t + range)
    for (let s = 0; s <= FINE; s++) {
      const t = t0 + (t1 - t0) * (s / FINE)
      const pt = cubicSample(t, p0, p1, p2, p3)
      const dx = (pt[0] - nx) * scaleX
      const dy = (pt[1] - ny) * scaleY
      const d = Math.hypot(dx, dy)
      if (d < best.dist) {
        best = { segmentIndex: best.segmentIndex, t, x: pt[0], y: pt[1], dist: d }
      }
    }
  }
  return best
}

/**
 * Split the cubic between `anchors[segmentIndex]` and the next anchor at
 * parameter `t` via De Casteljau, inserting a new smooth anchor at the split.
 * Returns a new anchor array or null if the split is invalid.
 */
export function splitPenBezierSegment(
  anchors: VectorPenAnchor[],
  segmentIndex: number,
  t: number,
  closed: boolean,
): VectorPenAnchor[] | null {
  if (anchors.length < 2) return null
  const segCount = closed ? anchors.length : anchors.length - 1
  if (segmentIndex < 0 || segmentIndex >= segCount) return null
  const tc = Math.min(0.9999, Math.max(0.0001, t))
  const a = anchors[segmentIndex]!
  const bIndex = (segmentIndex + 1) % anchors.length
  const b = anchors[bIndex]!
  const p0: [number, number] = [a.x, a.y]
  const p1 = ctrlOutAbs(a)
  const p2 = ctrlInAbs(b)
  const p3: [number, number] = [b.x, b.y]
  const lerp = (u: [number, number], v: [number, number], k: number): [number, number] => [
    u[0] + (v[0] - u[0]) * k,
    u[1] + (v[1] - u[1]) * k,
  ]
  const q0 = lerp(p0, p1, tc)
  const q1 = lerp(p1, p2, tc)
  const q2 = lerp(p2, p3, tc)
  const r0 = lerp(q0, q1, tc)
  const r1 = lerp(q1, q2, tc)
  const s = lerp(r0, r1, tc)

  const out = anchors.map(x => ({ ...x }))
  const A = out[segmentIndex]!
  const B = out[bIndex]!

  // Straight segments stay straight: when a had no out handle, skip writing it
  // unless the new control actually differs from the anchor.
  const EPS = 1e-9
  const hadOut = a.outX != null || a.outY != null
  if (hadOut || Math.abs(q0[0] - A.x) > EPS || Math.abs(q0[1] - A.y) > EPS) {
    A.outX = q0[0]
    A.outY = q0[1]
  }
  const hadIn = b.inX != null || b.inY != null
  if (hadIn || Math.abs(q2[0] - B.x) > EPS || Math.abs(q2[1] - B.y) > EPS) {
    B.inX = q2[0]
    B.inY = q2[1]
  }

  const N: VectorPenAnchor = { x: s[0], y: s[1] }
  if (Math.abs(r0[0] - s[0]) > EPS || Math.abs(r0[1] - s[1]) > EPS) {
    N.inX = r0[0]
    N.inY = r0[1]
  }
  if (Math.abs(r1[0] - s[0]) > EPS || Math.abs(r1[1] - s[1]) > EPS) {
    N.outX = r1[0]
    N.outY = r1[1]
  }

  // Insert after A. For closed paths where bIndex === 0, inserting at the end
  // is equivalent; splicing at segmentIndex + 1 works in both open and closed
  // cases because the next anchor is always at (segmentIndex + 1) % length.
  const insertAt = segmentIndex + 1
  out.splice(insertAt, 0, N)
  return out
}
