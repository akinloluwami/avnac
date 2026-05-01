import { samplePenAnchorsToPolyline, type VectorPenAnchor } from './avnac-vector-pen-bezier'

export const VECTOR_BOARD_DOC_VERSION = 2 as const

export const AVNAC_VECTOR_BOARD_DRAG_MIME = 'application/avnac-vector-board'

export type { VectorPenAnchor }

export type VectorStrokeKind = 'pen' | 'line' | 'rect' | 'ellipse' | 'arrow' | 'polygon'

export type VectorBoardStroke = {
  id: string
  kind: VectorStrokeKind
  /** Normalized 0–1 in workspace. Interpretation depends on `kind`. */
  points: [number, number][]
  /**
   * Cubic Bézier pen path. When length ≥ 2, used instead of polyline `points` for kind `pen`.
   */
  penAnchors?: VectorPenAnchor[]
  /** When true, last anchor connects back to the first (closed loop). */
  penClosed?: boolean
  stroke: string
  strokeWidthN: number
  /** Fill for closed shapes (rect, ellipse, polygon). Empty = no fill. */
  fill: string
}

export type VectorBoardLayer = {
  id: string
  name: string
  visible: boolean
  strokes: VectorBoardStroke[]
}

export type VectorBoardDocumentV2 = {
  v: typeof VECTOR_BOARD_DOC_VERSION
  layers: VectorBoardLayer[]
  activeLayerId: string
}

/** Legacy v1 shape kept for migration only. */
export type VectorBoardDocumentV1 = {
  v: 1
  strokes: Omit<VectorBoardStroke, 'kind' | 'fill'>[]
}

export type VectorBoardDocument = VectorBoardDocumentV2

export function createVectorBoardLayer(name: string): VectorBoardLayer {
  return {
    id: crypto.randomUUID(),
    name,
    visible: true,
    strokes: [],
  }
}

export function emptyVectorBoardDocument(): VectorBoardDocument {
  const layer = createVectorBoardLayer('Layer 1')
  return {
    v: VECTOR_BOARD_DOC_VERSION,
    layers: [layer],
    activeLayerId: layer.id,
  }
}

function parsePenAnchors(raw: unknown): VectorPenAnchor[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const out: VectorPenAnchor[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const x = typeof o.x === 'number' ? o.x : Number.NaN
    const y = typeof o.y === 'number' ? o.y : Number.NaN
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const a: VectorPenAnchor = { x, y }
    const num = (k: string) => (typeof o[k] === 'number' ? (o[k] as number) : undefined)
    const ix = num('inX')
    const iy = num('inY')
    const ox = num('outX')
    const oy = num('outY')
    if (ix !== undefined && iy !== undefined) {
      a.inX = ix
      a.inY = iy
    }
    if (ox !== undefined && oy !== undefined) {
      a.outX = ox
      a.outY = oy
    }
    out.push(a)
  }
  return out.length > 0 ? out : undefined
}

function strokeFromUnknown(s: Record<string, unknown>): VectorBoardStroke | null {
  const pointsRaw = s.points
  const penAnchors = parsePenAnchors(s.penAnchors)
  const points = Array.isArray(pointsRaw)
    ? (pointsRaw as unknown[]).filter(
        (p): p is [number, number] =>
          Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number',
      )
    : []
  if (points.length === 0 && (!penAnchors || penAnchors.length < 2)) return null
  const id = typeof s.id === 'string' ? s.id : crypto.randomUUID()
  const stroke = typeof s.stroke === 'string' ? s.stroke : '#1a1a1a'
  const strokeWidthN = typeof s.strokeWidthN === 'number' ? s.strokeWidthN : 0
  const kind = (typeof s.kind === 'string' ? s.kind : 'pen') as VectorStrokeKind
  const fill = typeof s.fill === 'string' ? s.fill : ''
  const row: VectorBoardStroke = {
    id,
    kind,
    points,
    stroke,
    strokeWidthN,
    fill,
  }
  if (penAnchors) row.penAnchors = penAnchors
  if (s.penClosed === true) row.penClosed = true
  return row
}

function migrateV1ToV2(raw: VectorBoardDocumentV1): VectorBoardDocument {
  const layer = createVectorBoardLayer('Layer 1')
  layer.strokes = raw.strokes
    .map(s =>
      strokeFromUnknown({
        ...s,
        kind: 'pen',
        fill: '',
      } as Record<string, unknown>),
    )
    .filter((x): x is VectorBoardStroke => x != null)
  return {
    v: VECTOR_BOARD_DOC_VERSION,
    layers: [layer],
    activeLayerId: layer.id,
  }
}

export function migrateVectorBoardDocument(raw: unknown): VectorBoardDocument {
  if (!raw || typeof raw !== 'object') return emptyVectorBoardDocument()
  const o = raw as Record<string, unknown>
  if (o.v === 2 && Array.isArray(o.layers)) {
    const layers: VectorBoardLayer[] = []
    for (const row of o.layers) {
      if (!row || typeof row !== 'object') continue
      const L = row as Record<string, unknown>
      const id = typeof L.id === 'string' ? L.id : crypto.randomUUID()
      const name = typeof L.name === 'string' ? L.name : 'Layer'
      const visible = typeof L.visible === 'boolean' ? L.visible : true
      const strokesRaw = Array.isArray(L.strokes) ? L.strokes : []
      const strokes = strokesRaw
        .map(s =>
          s && typeof s === 'object' ? strokeFromUnknown(s as Record<string, unknown>) : null,
        )
        .filter((x): x is VectorBoardStroke => x != null)
      layers.push({ id, name, visible, strokes })
    }
    if (layers.length === 0) return emptyVectorBoardDocument()
    let activeLayerId = typeof o.activeLayerId === 'string' ? o.activeLayerId : layers[0]!.id
    if (!layers.some(l => l.id === activeLayerId)) {
      activeLayerId = layers[0]!.id
    }
    return { v: VECTOR_BOARD_DOC_VERSION, layers, activeLayerId }
  }
  if (o.v === 1 && Array.isArray(o.strokes)) {
    return migrateV1ToV2({
      v: 1,
      strokes: o.strokes as VectorBoardDocumentV1['strokes'],
    })
  }
  return emptyVectorBoardDocument()
}

export function getActiveLayer(doc: VectorBoardDocument): VectorBoardLayer | undefined {
  return doc.layers.find(l => l.id === doc.activeLayerId)
}

export function flattenVisibleStrokes(doc: VectorBoardDocument): VectorBoardStroke[] {
  return doc.layers.filter(l => l.visible).flatMap(l => l.strokes)
}

export function vectorDocHasRenderableStrokes(doc: VectorBoardDocument): boolean {
  return flattenVisibleStrokes(doc).some(s => strokeIsRenderable(s))
}

export function strokeIsRenderable(s: VectorBoardStroke): boolean {
  if (s.kind === 'pen') {
    if (s.penAnchors && s.penAnchors.length >= 2) return true
    return s.points.length >= 2
  }
  if (s.kind === 'polygon') return s.points.length >= 2
  if (s.kind === 'line' || s.kind === 'rect' || s.kind === 'ellipse' || s.kind === 'arrow') {
    return s.points.length >= 2
  }
  return false
}

/** Distance from normalized point to stroke (for eraser), in normalized space. */
export function distanceToStroke(nx: number, ny: number, s: VectorBoardStroke): number {
  const pts = strokeToWorldPoints(s)
  if (pts.length < 2) return Infinity
  let best = Infinity
  for (let i = 1; i < pts.length; i++) {
    const d = distToSegment(nx, ny, pts[i - 1]!, pts[i]!)
    if (d < best) best = d
  }
  if (s.kind === 'pen' && s.penClosed === true && pts.length >= 2) {
    const d = distToSegment(nx, ny, pts[pts.length - 1]!, pts[0]!)
    if (d < best) best = d
  }
  if (s.kind === 'rect' || s.kind === 'ellipse') {
    const [a, b] = [pts[0]!, pts[pts.length - 1]!]
    const minX = Math.min(a[0], b[0])
    const maxX = Math.max(a[0], b[0])
    const minY = Math.min(a[1], b[1])
    const maxY = Math.max(a[1], b[1])
    if (s.kind === 'rect') {
      const dEdge = Math.min(
        distToSegment(nx, ny, [minX, minY], [maxX, minY]),
        distToSegment(nx, ny, [maxX, minY], [maxX, maxY]),
        distToSegment(nx, ny, [maxX, maxY], [minX, maxY]),
        distToSegment(nx, ny, [minX, maxY], [minX, minY]),
      )
      best = Math.min(best, dEdge)
    } else {
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const rx = (maxX - minX) / 2
      const ry = (maxY - minY) / 2
      if (rx > 1e-6 && ry > 1e-6) {
        const dx = (nx - cx) / rx
        const dy = (ny - cy) / ry
        const q = dx * dx + dy * dy
        const edge = Math.abs(Math.sqrt(Math.max(q, 1e-12)) - 1) * Math.min(rx, ry)
        best = Math.min(best, edge)
      }
    }
  }
  return best
}

export const VECTOR_SELECT_HIT_NORM = 0.022

/** True when outline should paint: visible stroke color and non-zero width (Canvas treats lineWidth 0 as a hairline). */
export function vectorStrokeOutlineIsVisible(s: VectorBoardStroke): boolean {
  const wn = typeof s.strokeWidthN === 'number' ? s.strokeWidthN : 0
  return Boolean(s.stroke) && s.stroke !== 'transparent' && Number.isFinite(wn) && wn > 0
}

export function findTopStrokeAt(
  doc: VectorBoardDocument,
  nx: number,
  ny: number,
  threshold = VECTOR_SELECT_HIT_NORM,
): { layerId: string; stroke: VectorBoardStroke } | null {
  const order = [...doc.layers].reverse()
  for (const layer of order) {
    if (!layer.visible) continue
    const strokes = [...layer.strokes].reverse()
    for (const s of strokes) {
      if (!strokeIsRenderable(s)) continue
      if (strokeHitAtNorm(nx, ny, s, threshold)) {
        return { layerId: layer.id, stroke: s }
      }
    }
  }
  return null
}

export function translateVectorStroke(
  s: VectorBoardStroke,
  dx: number,
  dy: number,
): VectorBoardStroke {
  const mapPt = (p: [number, number]): [number, number] => [p[0] + dx, p[1] + dy]
  const next: VectorBoardStroke = {
    ...s,
    points: s.points.map(mapPt),
  }
  if (s.penAnchors && s.penAnchors.length > 0) {
    next.penAnchors = s.penAnchors.map(a => ({
      ...a,
      x: a.x + dx,
      y: a.y + dy,
      inX: a.inX != null ? a.inX + dx : undefined,
      inY: a.inY != null ? a.inY + dy : undefined,
      outX: a.outX != null ? a.outX + dx : undefined,
      outY: a.outY != null ? a.outY + dy : undefined,
    }))
  }
  return next
}

export function scaleVectorStroke(
  s: VectorBoardStroke,
  ax: number,
  ay: number,
  sx: number,
  sy: number,
): VectorBoardStroke {
  const mapPt = (p: [number, number]): [number, number] => [
    ax + (p[0] - ax) * sx,
    ay + (p[1] - ay) * sy,
  ]
  const next: VectorBoardStroke = {
    ...s,
    points: s.points.map(mapPt),
  }
  if (s.penAnchors && s.penAnchors.length > 0) {
    next.penAnchors = s.penAnchors.map(a => ({
      ...a,
      x: ax + (a.x - ax) * sx,
      y: ay + (a.y - ay) * sy,
      inX: a.inX != null ? ax + (a.inX - ax) * sx : undefined,
      inY: a.inY != null ? ay + (a.inY - ay) * sy : undefined,
      outX: a.outX != null ? ax + (a.outX - ax) * sx : undefined,
      outY: a.outY != null ? ay + (a.outY - ay) * sy : undefined,
    }))
  }
  const avg = (Math.abs(sx) + Math.abs(sy)) / 2
  if (Number.isFinite(s.strokeWidthN) && avg > 0) {
    next.strokeWidthN = s.strokeWidthN * avg
  }
  return next
}

export function applyTranslateStrokeInDoc(
  doc: VectorBoardDocument,
  layerId: string,
  strokeId: string,
  dx: number,
  dy: number,
): VectorBoardDocument {
  return {
    ...doc,
    layers: doc.layers.map(L =>
      L.id !== layerId
        ? L
        : {
            ...L,
            strokes: L.strokes.map(s => (s.id !== strokeId ? s : translateVectorStroke(s, dx, dy))),
          },
    ),
  }
}

export type DocStrokeSelection = { layerId: string; strokeId: string }

function selectionSetKey(sel: DocStrokeSelection): string {
  return `${sel.layerId}:${sel.strokeId}`
}

function buildSelectionSet(sels: DocStrokeSelection[]): Set<string> {
  const s = new Set<string>()
  for (const sel of sels) s.add(selectionSetKey(sel))
  return s
}

export function applyTranslateStrokesInDoc(
  doc: VectorBoardDocument,
  selections: DocStrokeSelection[],
  dx: number,
  dy: number,
): VectorBoardDocument {
  if (selections.length === 0) return doc
  const index = buildSelectionSet(selections)
  return {
    ...doc,
    layers: doc.layers.map(L => ({
      ...L,
      strokes: L.strokes.map(s =>
        index.has(`${L.id}:${s.id}`) ? translateVectorStroke(s, dx, dy) : s,
      ),
    })),
  }
}

export function removeStrokesFromDoc(
  doc: VectorBoardDocument,
  selections: DocStrokeSelection[],
): VectorBoardDocument {
  if (selections.length === 0) return doc
  const index = buildSelectionSet(selections)
  return {
    ...doc,
    layers: doc.layers.map(L => ({
      ...L,
      strokes: L.strokes.filter(s => !index.has(`${L.id}:${s.id}`)),
    })),
  }
}

export function getStrokesForSelections(
  doc: VectorBoardDocument,
  selections: DocStrokeSelection[],
): VectorBoardStroke[] {
  if (selections.length === 0) return []
  const byLayer = new Map<string, Map<string, VectorBoardStroke>>()
  for (const L of doc.layers) {
    const m = new Map<string, VectorBoardStroke>()
    for (const s of L.strokes) m.set(s.id, s)
    byLayer.set(L.id, m)
  }
  const out: VectorBoardStroke[] = []
  const seen = new Set<string>()
  for (const L of doc.layers) {
    const m = byLayer.get(L.id)!
    for (const s of L.strokes) {
      const key = `${L.id}:${s.id}`
      if (!seen.has(key) && selections.some(sel => sel.layerId === L.id && sel.strokeId === s.id)) {
        out.push(m.get(s.id)!)
        seen.add(key)
      }
    }
  }
  return out
}

export function duplicateSelectionsInPlace(
  doc: VectorBoardDocument,
  selections: DocStrokeSelection[],
): { doc: VectorBoardDocument; newSelections: DocStrokeSelection[] } | null {
  if (selections.length === 0) return null
  const index = buildSelectionSet(selections)
  const newSelections: DocStrokeSelection[] = []
  let mutated = false
  const layers = doc.layers.map(L => {
    const out: VectorBoardStroke[] = []
    for (const s of L.strokes) {
      out.push(s)
      if (index.has(`${L.id}:${s.id}`)) {
        const clone = cloneVectorBoardStroke(s)
        out.push(clone)
        newSelections.push({ layerId: L.id, strokeId: clone.id })
        mutated = true
      }
    }
    return mutated ? { ...L, strokes: out } : L
  })
  if (!mutated) return null
  return { doc: { ...doc, layers }, newSelections }
}

export function strokeIntersectsRectNorm(
  s: VectorBoardStroke,
  rect: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  const b = normBoundsForStroke(s)
  if (!b) return false
  if (b.maxX < rect.minX || b.minX > rect.maxX) return false
  if (b.maxY < rect.minY || b.minY > rect.maxY) return false
  return true
}

export function findStrokesIntersectingRect(
  doc: VectorBoardDocument,
  rect: { minX: number; minY: number; maxX: number; maxY: number },
): DocStrokeSelection[] {
  const out: DocStrokeSelection[] = []
  for (const L of doc.layers) {
    if (!L.visible) continue
    for (const s of L.strokes) {
      if (!strokeIsRenderable(s)) continue
      if (strokeIntersectsRectNorm(s, rect)) {
        out.push({ layerId: L.id, strokeId: s.id })
      }
    }
  }
  return out
}

export function applyScaleStrokesInDoc(
  doc: VectorBoardDocument,
  selections: DocStrokeSelection[],
  ax: number,
  ay: number,
  sx: number,
  sy: number,
): VectorBoardDocument {
  if (selections.length === 0) return doc
  const index = buildSelectionSet(selections)
  return {
    ...doc,
    layers: doc.layers.map(L => ({
      ...L,
      strokes: L.strokes.map(s =>
        index.has(`${L.id}:${s.id}`) ? scaleVectorStroke(s, ax, ay, sx, sy) : s,
      ),
    })),
  }
}

export function normBoundsForSelections(
  doc: VectorBoardDocument,
  selections: DocStrokeSelection[],
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (selections.length === 0) return null
  const index = buildSelectionSet(selections)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const L of doc.layers) {
    if (!L.visible) continue
    for (const s of L.strokes) {
      if (!index.has(`${L.id}:${s.id}`)) continue
      const b = normBoundsForStroke(s)
      if (!b) continue
      if (b.minX < minX) minX = b.minX
      if (b.minY < minY) minY = b.minY
      if (b.maxX > maxX) maxX = b.maxX
      if (b.maxY > maxY) maxY = b.maxY
    }
  }
  if (!Number.isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

type ZOrderOp = 'front' | 'back' | 'forward' | 'backward'

function reorderStrokesInLayer(
  strokes: VectorBoardStroke[],
  selectedIds: Set<string>,
  op: ZOrderOp,
): VectorBoardStroke[] {
  if (strokes.length === 0) return strokes
  const selectedInOrder = strokes.filter(s => selectedIds.has(s.id))
  if (selectedInOrder.length === 0) return strokes
  if (op === 'front') {
    const rest = strokes.filter(s => !selectedIds.has(s.id))
    return [...rest, ...selectedInOrder]
  }
  if (op === 'back') {
    const rest = strokes.filter(s => !selectedIds.has(s.id))
    return [...selectedInOrder, ...rest]
  }
  const out = strokes.slice()
  if (op === 'forward') {
    for (let i = out.length - 2; i >= 0; i--) {
      const s = out[i]!
      if (!selectedIds.has(s.id)) continue
      const next = out[i + 1]!
      if (selectedIds.has(next.id)) continue
      out[i] = next
      out[i + 1] = s
    }
  } else {
    for (let i = 1; i < out.length; i++) {
      const s = out[i]!
      if (!selectedIds.has(s.id)) continue
      const prev = out[i - 1]!
      if (selectedIds.has(prev.id)) continue
      out[i] = prev
      out[i - 1] = s
    }
  }
  return out
}

export function applyZOrderInDoc(
  doc: VectorBoardDocument,
  selections: DocStrokeSelection[],
  op: ZOrderOp,
): VectorBoardDocument {
  if (selections.length === 0) return doc
  const byLayer = new Map<string, Set<string>>()
  for (const sel of selections) {
    const existing = byLayer.get(sel.layerId) ?? new Set<string>()
    existing.add(sel.strokeId)
    byLayer.set(sel.layerId, existing)
  }
  return {
    ...doc,
    layers: doc.layers.map(L => {
      const ids = byLayer.get(L.id)
      if (!ids) return L
      return { ...L, strokes: reorderStrokesInLayer(L.strokes, ids, op) }
    }),
  }
}

export function updateStrokeInDocFull(
  doc: VectorBoardDocument,
  layerId: string,
  strokeId: string,
  patch: Partial<VectorBoardStroke>,
): VectorBoardDocument {
  return {
    ...doc,
    layers: doc.layers.map(L =>
      L.id !== layerId
        ? L
        : {
            ...L,
            strokes: L.strokes.map(s => (s.id !== strokeId ? s : { ...s, ...patch })),
          },
    ),
  }
}

export function cloneVectorBoardStroke(stroke: VectorBoardStroke): VectorBoardStroke {
  return {
    ...stroke,
    id: crypto.randomUUID(),
    points: stroke.points.map(p => [p[0], p[1]] as [number, number]),
    penAnchors: stroke.penAnchors?.map(a => ({ ...a })),
  }
}

export function removeStrokeFromDoc(
  doc: VectorBoardDocument,
  layerId: string,
  strokeId: string,
): VectorBoardDocument {
  return {
    ...doc,
    layers: doc.layers.map(L =>
      L.id !== layerId ? L : { ...L, strokes: L.strokes.filter(s => s.id !== strokeId) },
    ),
  }
}

export function insertStrokeCloneAfterInDoc(
  doc: VectorBoardDocument,
  layerId: string,
  strokeId: string,
): { doc: VectorBoardDocument; newStrokeId: string } | null {
  const L = doc.layers.find(l => l.id === layerId)
  if (!L) return null
  const i = L.strokes.findIndex(s => s.id === strokeId)
  if (i < 0) return null
  const clone = cloneVectorBoardStroke(L.strokes[i]!)
  const nextStrokes = [...L.strokes.slice(0, i + 1), clone, ...L.strokes.slice(i + 1)]
  return {
    doc: {
      ...doc,
      layers: doc.layers.map(l => (l.id === layerId ? { ...l, strokes: nextStrokes } : l)),
    },
    newStrokeId: clone.id,
  }
}

export function appendClonedStrokesToActiveLayer(
  doc: VectorBoardDocument,
  strokes: VectorBoardStroke[],
  dx: number,
  dy: number,
): { doc: VectorBoardDocument; newStrokeIds: string[] } | null {
  const active = getActiveLayer(doc)
  if (!active?.visible) return null
  const newStrokeIds: string[] = []
  const newStrokes = strokes.map(s => {
    const c = cloneVectorBoardStroke(s)
    newStrokeIds.push(c.id)
    return translateVectorStroke(c, dx, dy)
  })
  return {
    doc: {
      ...doc,
      layers: doc.layers.map(L =>
        L.id !== active.id ? L : { ...L, strokes: [...L.strokes, ...newStrokes] },
      ),
    },
    newStrokeIds,
  }
}

export function parseVectorStrokeClipboardText(text: string): VectorBoardStroke[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>
  if (o.avnacVectorStrokeClip !== true || o.v !== 1 || !Array.isArray(o.strokes)) return null
  const out: VectorBoardStroke[] = []
  for (const row of o.strokes) {
    if (!row || typeof row !== 'object') continue
    const s = strokeFromUnknown(row as Record<string, unknown>)
    if (s) out.push(s)
  }
  return out.length > 0 ? out : null
}

export function updateVectorStrokeInDoc(
  doc: VectorBoardDocument,
  layerId: string,
  strokeId: string,
  patch: Partial<Pick<VectorBoardStroke, 'stroke' | 'fill' | 'strokeWidthN'>>,
): VectorBoardDocument {
  return {
    ...doc,
    layers: doc.layers.map(L =>
      L.id !== layerId
        ? L
        : {
            ...L,
            strokes: L.strokes.map(s => (s.id !== strokeId ? s : { ...s, ...patch })),
          },
    ),
  }
}

export function normBoundsForStroke(
  s: VectorBoardStroke,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const pts = strokeToWorldPoints(s)
  if (pts.length === 0) return null
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p[0])
    maxX = Math.max(maxX, p[0])
    minY = Math.min(minY, p[1])
    maxY = Math.max(maxY, p[1])
  }
  if (!Number.isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

function distToSegment(px: number, py: number, a: [number, number], b: [number, number]): number {
  const [ax, ay] = a
  const [bx, by] = b
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  if (ab2 < 1e-18) return Math.hypot(px - ax, py - ay)
  let t = (apx * abx + apy * aby) / ab2
  t = Math.max(0, Math.min(1, t))
  const qx = ax + t * abx
  const qy = ay + t * aby
  return Math.hypot(px - qx, py - qy)
}

function pointInPolygon(nx: number, ny: number, pts: [number, number][]): boolean {
  if (pts.length < 3) return false
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i]![0]
    const yi = pts[i]![1]
    const xj = pts[j]![0]
    const yj = pts[j]![1]
    const denom = yj - yi
    if (Math.abs(denom) < 1e-18) continue
    const intersect = yi > ny !== yj > ny && nx < ((xj - xi) * (ny - yi)) / denom + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Point inside rect / ellipse / closed polygon (normalized space). */
function pointInClosedStroke(s: VectorBoardStroke, nx: number, ny: number): boolean {
  if (s.kind === 'pen' && s.penClosed === true) {
    if (s.penAnchors && s.penAnchors.length >= 2) {
      const pts = samplePenAnchorsToPolyline(s.penAnchors, 48, true)
      if (pts.length >= 3) return pointInPolygon(nx, ny, pts)
    }
    if (s.points.length >= 3) {
      return pointInPolygon(nx, ny, s.points)
    }
    return false
  }
  if (s.points.length < 2) return false
  if (s.kind === 'rect') {
    const [ax, ay] = s.points[0]!
    const [bx, by] = s.points[1]!
    const minX = Math.min(ax, bx)
    const maxX = Math.max(ax, bx)
    const minY = Math.min(ay, by)
    const maxY = Math.max(ay, by)
    return nx >= minX && nx <= maxX && ny >= minY && ny <= maxY
  }
  if (s.kind === 'ellipse') {
    const [ax, ay] = s.points[0]!
    const [bx, by] = s.points[1]!
    const minX = Math.min(ax, bx)
    const maxX = Math.max(ax, bx)
    const minY = Math.min(ay, by)
    const maxY = Math.max(ay, by)
    const rx = (maxX - minX) / 2
    const ry = (maxY - minY) / 2
    if (rx < 1e-9 || ry < 1e-9) return false
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const dx = (nx - cx) / rx
    const dy = (ny - cy) / ry
    return dx * dx + dy * dy <= 1 + 1e-9
  }
  if (s.kind === 'polygon' && s.points.length >= 3) {
    return pointInPolygon(nx, ny, s.points)
  }
  return false
}

function strokeHitAtNorm(nx: number, ny: number, s: VectorBoardStroke, threshold: number): boolean {
  const edge = distanceToStroke(nx, ny, s)
  const halfW = s.strokeWidthN * 0.5
  if (edge <= threshold + halfW) return true
  return pointInClosedStroke(s, nx, ny)
}

/**
 * Sets fill on the topmost rect / ellipse / polygon under (nx, ny).
 * Returns null if nothing was hit.
 */
export function fillTopClosedShapeAt(
  doc: VectorBoardDocument,
  nx: number,
  ny: number,
  fill: string,
): VectorBoardDocument | null {
  const nextFill = fill && fill !== 'transparent' ? fill : ''
  const layersRev = [...doc.layers].reverse()
  for (const layer of layersRev) {
    if (!layer.visible) continue
    const strokesRev = [...layer.strokes].reverse()
    for (const s of strokesRev) {
      if (s.kind !== 'rect' && s.kind !== 'ellipse' && s.kind !== 'polygon') continue
      if (!pointInClosedStroke(s, nx, ny)) continue
      return {
        ...doc,
        layers: doc.layers.map(L =>
          L.id !== layer.id
            ? L
            : {
                ...L,
                strokes: L.strokes.map(x => (x.id !== s.id ? x : { ...x, fill: nextFill })),
              },
        ),
      }
    }
  }
  return null
}

function strokeToWorldPoints(s: VectorBoardStroke): [number, number][] {
  if (s.kind === 'rect' || s.kind === 'ellipse') {
    if (s.points.length < 2) return []
    const [ax, ay] = s.points[0]!
    const [bx, by] = s.points[1]!
    const minX = Math.min(ax, bx)
    const maxX = Math.max(ax, bx)
    const minY = Math.min(ay, by)
    const maxY = Math.max(ay, by)
    if (s.kind === 'rect') {
      return [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
      ]
    }
    const segs = 48
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const rx = (maxX - minX) / 2
    const ry = (maxY - minY) / 2
    const out: [number, number][] = []
    for (let i = 0; i <= segs; i++) {
      const t = (i / segs) * Math.PI * 2
      out.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)])
    }
    return out
  }
  if (s.kind === 'arrow' && s.points.length >= 2) {
    return [s.points[0]!, s.points[1]!]
  }
  if (s.kind === 'pen' && s.penAnchors && s.penAnchors.length >= 2) {
    return samplePenAnchorsToPolyline(s.penAnchors, 24, s.penClosed === true)
  }
  return s.points
}
