import type { BgValue } from '../components/background-popover'
import { parseShadowColor, type ShadowUi } from './avnac-shadow'
import type { ArrowLineStyle, ArrowPathType, AvnacShapeMeta } from './avnac-shape-meta'

export const AVNAC_DOC_VERSION = 2 as const
export const AVNAC_STORAGE_KEY = 'avnac-editor-document'

export type SceneObjectType =
  | 'rect'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'line'
  | 'arrow'
  | 'text'
  | 'image'
  | 'vector-board'
  | 'group'

export type SceneShadow = ShadowUi

export type SceneObjectBase = {
  id: string
  type: SceneObjectType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  name?: string
  blurPct: number
  shadow: SceneShadow | null
}

type ShapePaint = {
  fill: BgValue
  stroke: BgValue
  strokeWidth: number
}

export type SceneRect = SceneObjectBase &
  ShapePaint & {
    type: 'rect'
    cornerRadius: number
  }

export type SceneEllipse = SceneObjectBase &
  ShapePaint & {
    type: 'ellipse'
  }

export type ScenePolygon = SceneObjectBase &
  ShapePaint & {
    type: 'polygon'
    sides: number
  }

export type SceneStar = SceneObjectBase &
  ShapePaint & {
    type: 'star'
    points: number
  }

export type SceneLine = SceneObjectBase & {
  type: 'line'
  stroke: BgValue
  strokeWidth: number
  lineStyle: ArrowLineStyle
  roundedEnds: boolean
}

export type SceneArrow = SceneObjectBase & {
  type: 'arrow'
  stroke: BgValue
  strokeWidth: number
  lineStyle: ArrowLineStyle
  roundedEnds: boolean
  pathType: ArrowPathType
  headSize: number
  curveBulge: number
  curveT: number
}

export type SceneText = SceneObjectBase & {
  type: 'text'
  text: string
  fill: BgValue
  stroke: BgValue
  strokeWidth: number
  fontFamily: string
  fontSize: number
  lineHeight?: number
  fontWeight: number | 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  underline: boolean
  textAlign: 'left' | 'center' | 'right' | 'justify'
}

export type SceneImage = SceneObjectBase & {
  type: 'image'
  src: string
  naturalWidth: number
  naturalHeight: number
  crop: {
    x: number
    y: number
    width: number
    height: number
  }
  cornerRadius: number
}

export type SceneVectorBoard = SceneObjectBase & {
  type: 'vector-board'
  boardId: string
}

export type SceneGroup = SceneObjectBase & {
  type: 'group'
  children: SceneObject[]
}

export type SceneObject =
  | SceneRect
  | SceneEllipse
  | ScenePolygon
  | SceneStar
  | SceneLine
  | SceneArrow
  | SceneText
  | SceneImage
  | SceneVectorBoard
  | SceneGroup

export type AvnacDocument = {
  v: typeof AVNAC_DOC_VERSION
  artboard: { width: number; height: number }
  bg: BgValue
  objects: SceneObject[]
  activePageId: string
  pages: AvnacPage[]
}

export type AvnacPage = {
  id: string
  name: string
  artboard: { width: number; height: number }
  bg: BgValue
  objects: SceneObject[]
}

export type AvnacDocumentStorageKind = 'current' | 'legacy' | 'invalid'

const DEFAULT_SHAPE_FILL: BgValue = { type: 'solid', color: '#262626' }
const DEFAULT_SHAPE_STROKE: BgValue = { type: 'solid', color: 'transparent' }
const DEFAULT_TEXT_FILL: BgValue = { type: 'solid', color: '#171717' }
const DEFAULT_LINE_STROKE: BgValue = { type: 'solid', color: '#262626' }
const DEFAULT_BG: BgValue = { type: 'solid', color: '#ffffff' }

function clampSize(n: number, min = 1, max = 16000): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, Math.round(n)))
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}`
}

function clampOpacity(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(0, Math.min(1, n))
}

function clampBlurPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function clampLineHeight(n: number, fallback = 1.22): number {
  if (!Number.isFinite(n)) return fallback
  return Math.max(0.6, Math.min(4, n))
}

function parseFontWeight(value: unknown): SceneText['fontWeight'] {
  if (value === 'bold' || value === 'normal') return value
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(100, Math.min(900, Math.round(value)))
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(100, Math.min(900, Math.round(parsed)))
    }
  }
  return 'normal'
}

function legacyScale(raw: Record<string, unknown>, axis: 'x' | 'y'): number {
  const key = axis === 'x' ? 'scaleX' : 'scaleY'
  const value = Number(raw[key])
  if (!Number.isFinite(value) || value === 0) return 1
  return Math.abs(value)
}

function legacyStrokeScale(raw: Record<string, unknown>): number {
  if (raw.strokeUniform === true) return 1
  const scaleX = legacyScale(raw, 'x')
  const scaleY = legacyScale(raw, 'y')
  return Math.sqrt(scaleX * scaleY)
}

function legacyStrokeWidth(raw: Record<string, unknown>, fallback: number, min = 0): number {
  const base =
    typeof raw.strokeWidth === 'number' && Number.isFinite(raw.strokeWidth)
      ? raw.strokeWidth
      : fallback
  return Math.max(min, base * legacyStrokeScale(raw))
}

function cloneBgValue(value: BgValue): BgValue {
  return value.type === 'solid'
    ? { ...value }
    : {
        type: 'gradient',
        css: value.css,
        angle: value.angle,
        stops: value.stops.map(stop => ({ ...stop })),
      }
}

export function cloneShadow(shadow: SceneShadow | null | undefined): SceneShadow | null {
  if (!shadow) return null
  return { ...shadow }
}

function isGradientStopArray(raw: unknown): raw is BgValue['stops'] {
  return (
    Array.isArray(raw) &&
    raw.every(
      item =>
        item &&
        typeof item === 'object' &&
        typeof (item as { color?: unknown }).color === 'string' &&
        typeof (item as { offset?: unknown }).offset === 'number',
    )
  )
}

function parseBgValue(raw: unknown, fallback: BgValue): BgValue {
  if (!raw || typeof raw !== 'object') return cloneBgValue(fallback)
  const obj = raw as Partial<BgValue>
  if (obj.type === 'solid' && typeof obj.color === 'string') {
    return { type: 'solid', color: obj.color }
  }
  if (
    obj.type === 'gradient' &&
    typeof obj.css === 'string' &&
    typeof obj.angle === 'number' &&
    isGradientStopArray(obj.stops)
  ) {
    return {
      type: 'gradient',
      css: obj.css,
      angle: obj.angle,
      stops: obj.stops.map(stop => ({ ...stop })),
    }
  }
  return cloneBgValue(fallback)
}

function legacySolidPaint(value: unknown, fallback: BgValue): BgValue {
  if (typeof value === 'string' && value.trim()) {
    return { type: 'solid', color: value }
  }
  return cloneBgValue(fallback)
}

function parseShadow(raw: unknown): SceneShadow | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (
    typeof obj.blur === 'number' ||
    typeof obj.offsetX === 'number' ||
    typeof obj.offsetY === 'number' ||
    typeof obj.color === 'string'
  ) {
    const color = typeof obj.color === 'string' ? obj.color : 'rgba(0,0,0,0.35)'
    const parsed = parseShadowColor(color)
    return {
      blur: Math.max(0, Math.min(80, Math.round(Number(obj.blur) || 0))),
      offsetX: Math.max(-80, Math.min(80, Math.round(Number(obj.offsetX) || 0))),
      offsetY: Math.max(-80, Math.min(80, Math.round(Number(obj.offsetY) || 0))),
      colorHex: parsed.hex,
      opacityPct: parsed.opacityPct,
    }
  }
  if (
    typeof obj.blur === 'number' &&
    typeof obj.offsetX === 'number' &&
    typeof obj.offsetY === 'number' &&
    typeof obj.colorHex === 'string' &&
    typeof obj.opacityPct === 'number'
  ) {
    return {
      blur: Math.round(obj.blur),
      offsetX: Math.round(obj.offsetX),
      offsetY: Math.round(obj.offsetY),
      colorHex: obj.colorHex,
      opacityPct: Math.round(obj.opacityPct),
    }
  }
  return null
}

function baseObjectFromUnknown(
  raw: Record<string, unknown>,
  type: SceneObjectType,
): SceneObjectBase {
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : crypto.randomUUID(),
    type,
    x: typeof raw.x === 'number' ? raw.x : 0,
    y: typeof raw.y === 'number' ? raw.y : 0,
    width: clampSize(typeof raw.width === 'number' ? raw.width : 1),
    height: clampSize(typeof raw.height === 'number' ? raw.height : 1),
    rotation: typeof raw.rotation === 'number' ? raw.rotation : 0,
    opacity: clampOpacity(
      typeof raw.opacity === 'number'
        ? raw.opacity
        : typeof raw.opacityPct === 'number'
          ? raw.opacityPct / 100
          : 1,
    ),
    visible: raw.visible !== false,
    locked: raw.locked === true,
    name: typeof raw.name === 'string' ? raw.name : undefined,
    blurPct: clampBlurPct(typeof raw.blurPct === 'number' ? raw.blurPct : 0),
    shadow: parseShadow(raw.shadow),
  }
}

function parseSceneObject(raw: unknown): SceneObject | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const type = typeof obj.type === 'string' ? obj.type.trim().toLowerCase() : ''
  if (type === 'rect') {
    return {
      ...baseObjectFromUnknown(obj, 'rect'),
      fill: parseBgValue(obj.fill, DEFAULT_SHAPE_FILL),
      stroke: parseBgValue(obj.stroke, DEFAULT_SHAPE_STROKE),
      strokeWidth: typeof obj.strokeWidth === 'number' ? Math.max(0, obj.strokeWidth) : 0,
      cornerRadius: typeof obj.cornerRadius === 'number' ? Math.max(0, obj.cornerRadius) : 0,
    }
  }
  if (type === 'ellipse') {
    return {
      ...baseObjectFromUnknown(obj, 'ellipse'),
      fill: parseBgValue(obj.fill, DEFAULT_SHAPE_FILL),
      stroke: parseBgValue(obj.stroke, DEFAULT_SHAPE_STROKE),
      strokeWidth: typeof obj.strokeWidth === 'number' ? Math.max(0, obj.strokeWidth) : 0,
    }
  }
  if (type === 'polygon') {
    return {
      ...baseObjectFromUnknown(obj, 'polygon'),
      fill: parseBgValue(obj.fill, DEFAULT_SHAPE_FILL),
      stroke: parseBgValue(obj.stroke, DEFAULT_SHAPE_STROKE),
      strokeWidth: typeof obj.strokeWidth === 'number' ? Math.max(0, obj.strokeWidth) : 0,
      sides: typeof obj.sides === 'number' ? Math.max(3, Math.min(32, Math.round(obj.sides))) : 6,
    }
  }
  if (type === 'star') {
    return {
      ...baseObjectFromUnknown(obj, 'star'),
      fill: parseBgValue(obj.fill, DEFAULT_SHAPE_FILL),
      stroke: parseBgValue(obj.stroke, DEFAULT_SHAPE_STROKE),
      strokeWidth: typeof obj.strokeWidth === 'number' ? Math.max(0, obj.strokeWidth) : 0,
      points:
        typeof obj.points === 'number' ? Math.max(4, Math.min(32, Math.round(obj.points))) : 5,
    }
  }
  if (type === 'line') {
    return {
      ...baseObjectFromUnknown(obj, 'line'),
      stroke: parseBgValue(obj.stroke, DEFAULT_LINE_STROKE),
      strokeWidth: typeof obj.strokeWidth === 'number' ? Math.max(1, obj.strokeWidth) : 4,
      lineStyle: obj.lineStyle === 'dashed' || obj.lineStyle === 'dotted' ? obj.lineStyle : 'solid',
      roundedEnds: obj.roundedEnds !== false,
    }
  }
  if (type === 'arrow') {
    return {
      ...baseObjectFromUnknown(obj, 'arrow'),
      stroke: parseBgValue(obj.stroke, DEFAULT_LINE_STROKE),
      strokeWidth: typeof obj.strokeWidth === 'number' ? Math.max(1, obj.strokeWidth) : 4,
      lineStyle: obj.lineStyle === 'dashed' || obj.lineStyle === 'dotted' ? obj.lineStyle : 'solid',
      roundedEnds: obj.roundedEnds !== false,
      pathType: obj.pathType === 'curved' ? 'curved' : 'straight',
      headSize: typeof obj.headSize === 'number' ? Math.max(0.2, obj.headSize) : 1,
      curveBulge: typeof obj.curveBulge === 'number' ? obj.curveBulge : 0,
      curveT: typeof obj.curveT === 'number' ? Math.max(0.1, Math.min(0.9, obj.curveT)) : 0.5,
    }
  }
  if (type === 'text') {
    return {
      ...baseObjectFromUnknown(obj, 'text'),
      text: typeof obj.text === 'string' ? obj.text : '',
      fill: parseBgValue(obj.fill, DEFAULT_TEXT_FILL),
      stroke: parseBgValue(obj.stroke, DEFAULT_SHAPE_STROKE),
      strokeWidth: typeof obj.strokeWidth === 'number' ? Math.max(0, obj.strokeWidth) : 0,
      fontFamily:
        typeof obj.fontFamily === 'string' && obj.fontFamily.trim() ? obj.fontFamily : 'Inter',
      fontSize: typeof obj.fontSize === 'number' ? Math.max(8, obj.fontSize) : 64,
      lineHeight: clampLineHeight(typeof obj.lineHeight === 'number' ? obj.lineHeight : 1.22),
      fontWeight: parseFontWeight(obj.fontWeight),
      fontStyle: obj.fontStyle === 'italic' ? 'italic' : 'normal',
      underline: obj.underline === true,
      textAlign:
        obj.textAlign === 'center' || obj.textAlign === 'right' || obj.textAlign === 'justify'
          ? obj.textAlign
          : 'left',
    }
  }
  if (type === 'image') {
    const naturalWidth = typeof obj.naturalWidth === 'number' ? clampSize(obj.naturalWidth) : 1
    const naturalHeight = typeof obj.naturalHeight === 'number' ? clampSize(obj.naturalHeight) : 1
    const cropRaw = obj.crop as Record<string, unknown> | undefined
    return {
      ...baseObjectFromUnknown(obj, 'image'),
      src: typeof obj.src === 'string' ? obj.src : '',
      naturalWidth,
      naturalHeight,
      crop: {
        x: typeof cropRaw?.x === 'number' ? Math.max(0, cropRaw.x) : 0,
        y: typeof cropRaw?.y === 'number' ? Math.max(0, cropRaw.y) : 0,
        width: typeof cropRaw?.width === 'number' ? Math.max(1, cropRaw.width) : naturalWidth,
        height: typeof cropRaw?.height === 'number' ? Math.max(1, cropRaw.height) : naturalHeight,
      },
      cornerRadius: typeof obj.cornerRadius === 'number' ? Math.max(0, obj.cornerRadius) : 0,
    }
  }
  if (type === 'vector-board') {
    return {
      ...baseObjectFromUnknown(obj, 'vector-board'),
      boardId: typeof obj.boardId === 'string' && obj.boardId.trim() ? obj.boardId : '',
    }
  }
  if (type === 'group') {
    const childrenRaw = Array.isArray(obj.children) ? obj.children : []
    return {
      ...baseObjectFromUnknown(obj, 'group'),
      children: childrenRaw
        .map(child => parseSceneObject(child))
        .filter((child): child is SceneObject => child != null),
    }
  }
  return null
}

function legacyBox(raw: Record<string, unknown>) {
  const width = Math.max(1, Math.abs(Number(raw.width) || 0) * Math.abs(Number(raw.scaleX) || 1))
  const height = Math.max(1, Math.abs(Number(raw.height) || 0) * Math.abs(Number(raw.scaleY) || 1))
  const left = typeof raw.left === 'number' ? raw.left : 0
  const top = typeof raw.top === 'number' ? raw.top : 0
  const originX = raw.originX === 'center' || raw.originX === 'right' ? raw.originX : 'left'
  const originY = raw.originY === 'center' || raw.originY === 'bottom' ? raw.originY : 'top'
  const x = originX === 'center' ? left - width / 2 : originX === 'right' ? left - width : left
  const y = originY === 'center' ? top - height / 2 : originY === 'bottom' ? top - height : top
  return {
    x,
    y,
    width,
    height,
    rotation: typeof raw.angle === 'number' ? raw.angle : 0,
    opacity: typeof raw.opacity === 'number' ? clampOpacity(raw.opacity) : 1,
    visible: raw.visible !== false,
  }
}

function bgFromLegacyPaint(raw: Record<string, unknown>, key: 'fill' | 'stroke') {
  const customKey = key === 'fill' ? 'avnacFill' : 'avnacStroke'
  return parseBgValue(
    raw[customKey],
    legacySolidPaint(raw[key], key === 'fill' ? DEFAULT_SHAPE_FILL : DEFAULT_SHAPE_STROKE),
  )
}

function createLegacyBase(raw: Record<string, unknown>, type: SceneObjectType): SceneObjectBase {
  const box = legacyBox(raw)
  return {
    id:
      typeof raw.avnacLayerId === 'string' && raw.avnacLayerId.trim()
        ? raw.avnacLayerId
        : typeof raw.id === 'string' && raw.id.trim()
          ? raw.id
          : crypto.randomUUID(),
    type,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    rotation: box.rotation,
    opacity: box.opacity,
    visible: box.visible,
    locked: raw.avnacLocked === true,
    name: typeof raw.avnacLayerName === 'string' ? raw.avnacLayerName : undefined,
    blurPct: typeof raw.avnacBlur === 'number' ? clampBlurPct(raw.avnacBlur) : 0,
    shadow: parseShadow(raw.shadow),
  }
}

function pointDistance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1)
}

function migrateLegacyObject(raw: unknown): SceneObject | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const meta = (obj.avnacShape as AvnacShapeMeta | undefined) ?? null
  const type = typeof obj.type === 'string' ? obj.type.trim().toLowerCase() : ''
  if (typeof obj.avnacVectorBoardId === 'string' && obj.avnacVectorBoardId) {
    return {
      ...createLegacyBase(obj, 'vector-board'),
      type: 'vector-board',
      boardId: obj.avnacVectorBoardId,
    }
  }
  if (meta?.kind === 'arrow' || meta?.kind === 'line') {
    const ep = meta.arrowEndpoints
    if (ep) {
      const length = Math.max(1, pointDistance(ep.x1, ep.y1, ep.x2, ep.y2))
      const strokeWidth = Math.max(
        1,
        typeof meta.arrowStrokeWidth === 'number'
          ? meta.arrowStrokeWidth
          : Number(obj.strokeWidth) || 4,
      )
      const curveBulge = typeof meta.arrowCurveBulge === 'number' ? meta.arrowCurveBulge : 0
      const height = Math.max(strokeWidth * 4, Math.abs(curveBulge) * 2 + strokeWidth * 3, 24)
      const cx = (ep.x1 + ep.x2) / 2
      const cy = (ep.y1 + ep.y2) / 2
      const rotation = (Math.atan2(ep.y2 - ep.y1, ep.x2 - ep.x1) * 180) / Math.PI
      const base = createLegacyBase(obj, meta.kind)
      if (meta.kind === 'line') {
        return {
          ...base,
          type: 'line',
          x: cx - length / 2,
          y: cy - height / 2,
          width: length,
          height,
          rotation,
          stroke: bgFromLegacyPaint(obj, 'stroke'),
          strokeWidth,
          lineStyle:
            meta.arrowLineStyle === 'dashed' || meta.arrowLineStyle === 'dotted'
              ? meta.arrowLineStyle
              : 'solid',
          roundedEnds: meta.arrowRoundedEnds !== false,
        }
      }
      return {
        ...base,
        type: 'arrow',
        x: cx - length / 2,
        y: cy - height / 2,
        width: length,
        height,
        rotation,
        stroke: bgFromLegacyPaint(obj, 'stroke'),
        strokeWidth,
        lineStyle:
          meta.arrowLineStyle === 'dashed' || meta.arrowLineStyle === 'dotted'
            ? meta.arrowLineStyle
            : 'solid',
        roundedEnds: meta.arrowRoundedEnds !== false,
        pathType: meta.arrowPathType === 'curved' ? 'curved' : 'straight',
        headSize: typeof meta.arrowHead === 'number' ? meta.arrowHead : 1,
        curveBulge,
        curveT:
          typeof meta.arrowCurveT === 'number'
            ? Math.max(0.1, Math.min(0.9, meta.arrowCurveT))
            : 0.5,
      }
    }
  }
  if (type === 'textbox' || type === 'i-text' || type === 'itext' || type === 'text') {
    const base = createLegacyBase(obj, 'text')
    const scaleY = legacyScale(obj, 'y')
    return {
      ...base,
      type: 'text',
      text: typeof obj.text === 'string' ? obj.text : '',
      fill: bgFromLegacyPaint(obj, 'fill'),
      stroke: bgFromLegacyPaint(obj, 'stroke'),
      strokeWidth: legacyStrokeWidth(obj, 0),
      fontFamily:
        typeof obj.fontFamily === 'string' && obj.fontFamily.trim() ? obj.fontFamily : 'Inter',
      fontSize: typeof obj.fontSize === 'number' ? Math.max(8, obj.fontSize * scaleY) : 64,
      lineHeight: clampLineHeight(typeof obj.lineHeight === 'number' ? obj.lineHeight : 1.22),
      fontWeight: parseFontWeight(obj.fontWeight),
      fontStyle: obj.fontStyle === 'italic' ? 'italic' : 'normal',
      underline: obj.underline === true,
      textAlign:
        obj.textAlign === 'center' || obj.textAlign === 'right' || obj.textAlign === 'justify'
          ? obj.textAlign
          : 'left',
    }
  }
  if (type === 'image') {
    const naturalWidth = typeof obj.width === 'number' ? Math.max(1, Math.round(obj.width)) : 1
    const naturalHeight = typeof obj.height === 'number' ? Math.max(1, Math.round(obj.height)) : 1
    const base = createLegacyBase(obj, 'image')
    return {
      ...base,
      type: 'image',
      src: typeof obj.src === 'string' ? obj.src : '',
      naturalWidth,
      naturalHeight,
      crop: {
        x: typeof obj.cropX === 'number' ? Math.max(0, obj.cropX) : 0,
        y: typeof obj.cropY === 'number' ? Math.max(0, obj.cropY) : 0,
        width: naturalWidth,
        height: naturalHeight,
      },
      cornerRadius: typeof obj.rx === 'number' ? Math.max(0, obj.rx) : 0,
    }
  }
  if (meta?.kind === 'rect' || type === 'rect') {
    const base = createLegacyBase(obj, 'rect')
    return {
      ...base,
      type: 'rect',
      fill: bgFromLegacyPaint(obj, 'fill'),
      stroke: bgFromLegacyPaint(obj, 'stroke'),
      strokeWidth: legacyStrokeWidth(obj, 0),
      cornerRadius: typeof obj.rx === 'number' ? Math.max(0, obj.rx) : 0,
    }
  }
  if (meta?.kind === 'ellipse' || type === 'ellipse' || type === 'circle') {
    const base = createLegacyBase(obj, 'ellipse')
    return {
      ...base,
      type: 'ellipse',
      fill: bgFromLegacyPaint(obj, 'fill'),
      stroke: bgFromLegacyPaint(obj, 'stroke'),
      strokeWidth: legacyStrokeWidth(obj, 0),
    }
  }
  if (meta?.kind === 'polygon') {
    const base = createLegacyBase(obj, 'polygon')
    return {
      ...base,
      type: 'polygon',
      fill: bgFromLegacyPaint(obj, 'fill'),
      stroke: bgFromLegacyPaint(obj, 'stroke'),
      strokeWidth: legacyStrokeWidth(obj, 0),
      sides: typeof meta.polygonSides === 'number' ? Math.max(3, Math.round(meta.polygonSides)) : 6,
    }
  }
  if (meta?.kind === 'star') {
    const base = createLegacyBase(obj, 'star')
    return {
      ...base,
      type: 'star',
      fill: bgFromLegacyPaint(obj, 'fill'),
      stroke: bgFromLegacyPaint(obj, 'stroke'),
      strokeWidth: legacyStrokeWidth(obj, 0),
      points: typeof meta.starPoints === 'number' ? Math.max(4, Math.round(meta.starPoints)) : 5,
    }
  }
  if (type === 'group' && Array.isArray(obj.objects)) {
    const children = obj.objects
      .map(child => migrateLegacyObject(child))
      .filter((child): child is SceneObject => child != null)
    const base = createLegacyBase(obj, 'group')
    if (children.length === 0) return null
    return normalizeGroup({
      ...base,
      type: 'group',
      children,
    })
  }
  return null
}

export function createEmptyAvnacDocument(width: number, height: number): AvnacDocument {
  const page = createEmptyAvnacPage(width, height, 'Page 1')
  return {
    v: AVNAC_DOC_VERSION,
    artboard: { ...page.artboard },
    bg: cloneBgValue(page.bg),
    objects: [],
    activePageId: page.id,
    pages: [page],
  }
}

export function createEmptyAvnacPage(width: number, height: number, name = 'Page'): AvnacPage {
  return createAvnacPage({
    name,
    artboard: {
      width: clampSize(width, 100),
      height: clampSize(height, 100),
    },
    bg: DEFAULT_BG,
    objects: [],
  })
}

export function createAvnacPage({
  id,
  name = 'Page',
  artboard,
  bg,
  objects,
}: {
  id?: string
  name?: string
  artboard: { width: number; height: number }
  bg: BgValue
  objects: SceneObject[]
}): AvnacPage {
  return {
    id: id?.trim() || makeId('page'),
    name: name.trim() || 'Page',
    artboard: {
      width: clampSize(artboard.width, 100),
      height: clampSize(artboard.height, 100),
    },
    bg: cloneBgValue(bg),
    objects: objects.map(obj => cloneSceneObject(obj)),
  }
}

function currentFieldsToPage(doc: AvnacDocument, id: string, fallbackName = 'Page 1'): AvnacPage {
  return createAvnacPage({
    id,
    name: doc.pages.find(page => page.id === id)?.name || doc.pages[0]?.name || fallbackName,
    artboard: doc.artboard,
    bg: doc.bg,
    objects: doc.objects,
  })
}

export function cloneAvnacPage(page: AvnacPage): AvnacPage {
  return createAvnacPage(page)
}

export function syncActivePage(doc: AvnacDocument): AvnacDocument {
  const existingPages = doc.pages.length > 0 ? doc.pages : []
  const activePageId =
    doc.activePageId && existingPages.some(page => page.id === doc.activePageId)
      ? doc.activePageId
      : existingPages[0]?.id || makeId('page')
  const currentPage = currentFieldsToPage(doc, activePageId)
  const pages = existingPages.map(page =>
    page.id === activePageId ? currentPage : cloneAvnacPage(page),
  )
  if (pages.length === 0) {
    pages.push(currentPage)
  } else if (!pages.some(page => page.id === activePageId)) {
    pages.unshift(currentPage)
  }
  const activePage = pages.find(page => page.id === activePageId) ?? pages[0]
  return {
    v: AVNAC_DOC_VERSION,
    artboard: { ...activePage.artboard },
    bg: cloneBgValue(activePage.bg),
    objects: activePage.objects.map(obj => cloneSceneObject(obj)),
    activePageId: activePage.id,
    pages,
  }
}

export function activateAvnacPage(doc: AvnacDocument, pageId: string): AvnacDocument {
  const synced = syncActivePage(doc)
  const activePage = synced.pages.find(page => page.id === pageId) ?? synced.pages[0]
  return {
    ...synced,
    artboard: { ...activePage.artboard },
    bg: cloneBgValue(activePage.bg),
    objects: activePage.objects.map(obj => cloneSceneObject(obj)),
    activePageId: activePage.id,
  }
}

function parseAvnacPage(raw: unknown, fallbackIndex: number): AvnacPage | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const artboard = obj.artboard as Record<string, unknown> | undefined
  if (!artboard || typeof artboard.width !== 'number' || typeof artboard.height !== 'number') {
    return null
  }
  const objectsRaw = Array.isArray(obj.objects) ? obj.objects : []
  return createAvnacPage({
    id: typeof obj.id === 'string' ? obj.id : undefined,
    name: typeof obj.name === 'string' ? obj.name : `Page ${fallbackIndex + 1}`,
    artboard: {
      width: artboard.width,
      height: artboard.height,
    },
    bg: parseBgValue(obj.bg, DEFAULT_BG),
    objects: objectsRaw
      .map(row => parseSceneObject(row))
      .filter((row): row is SceneObject => row != null),
  })
}

function migrateLegacyDocument(raw: Record<string, unknown>): AvnacDocument | null {
  const artboardRaw = raw.artboard as Record<string, unknown> | undefined
  const width = typeof artboardRaw?.width === 'number' ? artboardRaw.width : Number.NaN
  const height = typeof artboardRaw?.height === 'number' ? artboardRaw.height : Number.NaN
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  const legacySceneState = raw.fabric as Record<string, unknown> | undefined
  const objectsRaw = Array.isArray(legacySceneState?.objects) ? legacySceneState.objects : []
  const doc = {
    v: AVNAC_DOC_VERSION,
    artboard: { width: clampSize(width, 100), height: clampSize(height, 100) },
    bg: parseBgValue(raw.bg, DEFAULT_BG),
    objects: objectsRaw
      .map(obj => migrateLegacyObject(obj))
      .filter((obj): obj is SceneObject => obj != null),
    activePageId: '',
    pages: [],
  }
  return syncActivePage(doc)
}

export function getAvnacDocumentStorageKind(raw: unknown): AvnacDocumentStorageKind {
  if (!raw || typeof raw !== 'object') return 'invalid'
  const obj = raw as Record<string, unknown>
  if (obj.v === AVNAC_DOC_VERSION && Array.isArray(obj.objects)) {
    return 'current'
  }
  const legacySceneState = obj.fabric
  if (obj.v === 1 && legacySceneState && typeof legacySceneState === 'object') {
    return 'legacy'
  }
  return 'invalid'
}

export function parseAvnacDocument(raw: unknown): AvnacDocument | null {
  const kind = getAvnacDocumentStorageKind(raw)
  if (kind === 'invalid' || !raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (kind === 'current') {
    const artboard = obj.artboard as Record<string, unknown> | undefined
    if (!artboard || typeof artboard.width !== 'number' || typeof artboard.height !== 'number') {
      return null
    }
    const objectsRaw = Array.isArray(obj.objects) ? obj.objects : []
    const objects = objectsRaw
      .map(row => parseSceneObject(row))
      .filter((row): row is SceneObject => row != null)
    const pages = Array.isArray(obj.pages)
      ? obj.pages
          .map((row, index) => parseAvnacPage(row, index))
          .filter((row): row is AvnacPage => row != null)
      : []
    return syncActivePage({
      v: AVNAC_DOC_VERSION,
      artboard: {
        width: clampSize(artboard.width, 100),
        height: clampSize(artboard.height, 100),
      },
      bg: parseBgValue(obj.bg, DEFAULT_BG),
      objects,
      activePageId: typeof obj.activePageId === 'string' ? obj.activePageId : '',
      pages,
    })
  }
  if (kind === 'legacy') {
    return migrateLegacyDocument(obj)
  }
  return null
}

export function cloneSceneObject<T extends SceneObject>(obj: T): T {
  const base = {
    ...obj,
    shadow: cloneShadow(obj.shadow),
  } as SceneObject
  switch (obj.type) {
    case 'rect':
    case 'ellipse':
    case 'polygon':
    case 'star':
      return {
        ...base,
        fill: cloneBgValue(obj.fill),
        stroke: cloneBgValue(obj.stroke),
      } as T
    case 'line':
      return { ...base, stroke: cloneBgValue(obj.stroke) } as T
    case 'arrow':
      return { ...base, stroke: cloneBgValue(obj.stroke) } as T
    case 'text':
      return {
        ...base,
        fill: cloneBgValue(obj.fill),
        stroke: cloneBgValue(obj.stroke),
      } as T
    case 'image':
      return {
        ...base,
        crop: { ...obj.crop },
      } as T
    case 'vector-board':
      return { ...base } as T
    case 'group':
      return {
        ...base,
        children: obj.children.map(child => cloneSceneObject(child)),
      } as T
  }
}

export function cloneAvnacDocument(doc: AvnacDocument): AvnacDocument {
  const synced = syncActivePage(doc)
  return {
    v: AVNAC_DOC_VERSION,
    artboard: { ...synced.artboard },
    bg: cloneBgValue(synced.bg),
    objects: synced.objects.map(obj => cloneSceneObject(obj)),
    activePageId: synced.activePageId,
    pages: synced.pages.map(page => cloneAvnacPage(page)),
  }
}

export function objectDisplayName(obj: SceneObject): string {
  if (obj.name?.trim()) return obj.name.trim()
  switch (obj.type) {
    case 'rect':
      return 'Square'
    case 'ellipse':
      return 'Ellipse'
    case 'polygon':
      return 'Polygon'
    case 'star':
      return 'Star'
    case 'line':
      return 'Line'
    case 'arrow':
      return 'Arrow'
    case 'text':
      return obj.text.trim() || 'Text'
    case 'image':
      return 'Image'
    case 'vector-board':
      return 'Vector board'
    case 'group':
      return 'Group'
  }
}

export function sceneObjectToShapeMeta(obj: SceneObject): AvnacShapeMeta | null {
  switch (obj.type) {
    case 'rect':
      return { kind: 'rect' }
    case 'ellipse':
      return { kind: 'ellipse' }
    case 'polygon':
      return { kind: 'polygon', polygonSides: obj.sides }
    case 'star':
      return { kind: 'star', starPoints: obj.points }
    case 'line':
      return {
        kind: 'line',
        arrowEndpoints: {
          x1: obj.x,
          y1: obj.y + obj.height / 2,
          x2: obj.x + obj.width,
          y2: obj.y + obj.height / 2,
        },
        arrowStrokeWidth: obj.strokeWidth,
        arrowLineStyle: obj.lineStyle,
        arrowRoundedEnds: obj.roundedEnds,
      }
    case 'arrow':
      return {
        kind: 'arrow',
        arrowEndpoints: {
          x1: obj.x,
          y1: obj.y + obj.height / 2,
          x2: obj.x + obj.width,
          y2: obj.y + obj.height / 2,
        },
        arrowStrokeWidth: obj.strokeWidth,
        arrowLineStyle: obj.lineStyle,
        arrowRoundedEnds: obj.roundedEnds,
        arrowPathType: obj.pathType,
        arrowHead: obj.headSize,
        arrowCurveBulge: obj.curveBulge,
        arrowCurveT: obj.curveT,
      }
    default:
      return null
  }
}

export function objectSupportsOutlineStroke(obj: SceneObject): boolean {
  return (
    obj.type === 'rect' ||
    obj.type === 'ellipse' ||
    obj.type === 'polygon' ||
    obj.type === 'star' ||
    obj.type === 'line' ||
    obj.type === 'arrow' ||
    obj.type === 'text'
  )
}

export function objectSupportsFill(obj: SceneObject): boolean {
  return (
    obj.type === 'rect' ||
    obj.type === 'ellipse' ||
    obj.type === 'polygon' ||
    obj.type === 'star' ||
    obj.type === 'text'
  )
}

export function objectSupportsCornerRadius(obj: SceneObject): boolean {
  return obj.type === 'rect' || obj.type === 'image'
}

export function getObjectCornerRadius(obj: SceneObject): number {
  if (obj.type === 'rect' || obj.type === 'image') return obj.cornerRadius
  return 0
}

export function setObjectCornerRadius(obj: SceneObject, radius: number): SceneObject {
  if (obj.type !== 'rect' && obj.type !== 'image') return obj
  return {
    ...obj,
    cornerRadius: Math.max(0, Math.round(radius)),
  }
}

export function maxCornerRadiusForObject(obj: SceneObject): number {
  return Math.min(obj.width, obj.height) / 2
}

export function getObjectFill(obj: SceneObject): BgValue | null {
  if (!objectSupportsFill(obj)) return null
  return cloneBgValue(obj.fill)
}

export function getObjectStroke(obj: SceneObject): BgValue | null {
  if (!objectSupportsOutlineStroke(obj)) return null
  return cloneBgValue(obj.stroke)
}

export function setObjectFill(obj: SceneObject, fill: BgValue): SceneObject {
  if (!objectSupportsFill(obj)) return obj
  return { ...obj, fill: cloneBgValue(fill) } as SceneObject
}

export function setObjectStroke(obj: SceneObject, stroke: BgValue): SceneObject {
  if (!objectSupportsOutlineStroke(obj)) return obj
  return { ...obj, stroke: cloneBgValue(stroke) } as SceneObject
}

export function getObjectStrokeWidth(obj: SceneObject): number {
  if (!objectSupportsOutlineStroke(obj)) return 0
  return obj.strokeWidth
}

export function setObjectStrokeWidth(obj: SceneObject, strokeWidth: number): SceneObject {
  if (!objectSupportsOutlineStroke(obj)) return obj
  return { ...obj, strokeWidth: Math.max(0, strokeWidth) } as SceneObject
}

export function normalizeGroup(group: SceneGroup): SceneGroup {
  if (group.children.length === 0) return group
  const boxes = group.children.map(child => ({
    x: child.x,
    y: child.y,
    maxX: child.x + child.width,
    maxY: child.y + child.height,
  }))
  const minX = Math.min(...boxes.map(box => box.x))
  const minY = Math.min(...boxes.map(box => box.y))
  const maxX = Math.max(...boxes.map(box => box.maxX))
  const maxY = Math.max(...boxes.map(box => box.maxY))
  const children = group.children.map(child => ({
    ...cloneSceneObject(child),
    x: child.x - minX,
    y: child.y - minY,
  })) as SceneObject[]
  return {
    ...group,
    x: group.x + minX,
    y: group.y + minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    children,
  }
}

export function rotatePoint(
  x: number,
  y: number,
  angleDeg: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

export function getObjectCenter(obj: SceneObject): { x: number; y: number } {
  return {
    x: obj.x + obj.width / 2,
    y: obj.y + obj.height / 2,
  }
}

export function getObjectRotatedBounds(obj: SceneObject): {
  left: number
  top: number
  width: number
  height: number
} {
  const center = getObjectCenter(obj)
  const corners = [
    rotatePoint(obj.x, obj.y, obj.rotation, center.x, center.y),
    rotatePoint(obj.x + obj.width, obj.y, obj.rotation, center.x, center.y),
    rotatePoint(obj.x + obj.width, obj.y + obj.height, obj.rotation, center.x, center.y),
    rotatePoint(obj.x, obj.y + obj.height, obj.rotation, center.x, center.y),
  ]
  const left = Math.min(...corners.map(corner => corner.x))
  const top = Math.min(...corners.map(corner => corner.y))
  const right = Math.max(...corners.map(corner => corner.x))
  const bottom = Math.max(...corners.map(corner => corner.y))
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

export function getSelectionBounds(objects: SceneObject[]): {
  left: number
  top: number
  width: number
  height: number
} | null {
  if (objects.length === 0) return null
  const bounds = objects.map(obj => getObjectRotatedBounds(obj))
  const left = Math.min(...bounds.map(bound => bound.left))
  const top = Math.min(...bounds.map(bound => bound.top))
  const right = Math.max(...bounds.map(bound => bound.left + bound.width))
  const bottom = Math.max(...bounds.map(bound => bound.top + bound.height))
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

export function updateSceneObject(
  objects: SceneObject[],
  id: string,
  updater: (obj: SceneObject) => SceneObject,
): SceneObject[] {
  return objects.map(obj => {
    if (obj.id === id) return updater(obj)
    if (obj.type !== 'group') return obj
    return {
      ...obj,
      children: updateSceneObject(obj.children, id, updater),
    }
  })
}

export function findSceneObject(objects: SceneObject[], id: string): SceneObject | null {
  for (const obj of objects) {
    if (obj.id === id) return obj
    if (obj.type === 'group') {
      const nested = findSceneObject(obj.children, id)
      if (nested) return nested
    }
  }
  return null
}

export function replaceTopLevelObject(
  objects: SceneObject[],
  id: string,
  next: SceneObject,
): SceneObject[] {
  return objects.map(obj => (obj.id === id ? next : obj))
}

export function removeTopLevelObjects(objects: SceneObject[], ids: string[]): SceneObject[] {
  const set = new Set(ids)
  return objects.filter(obj => !set.has(obj.id))
}

export function createGroupFromSelection(objects: SceneObject[]): SceneGroup | null {
  if (objects.length < 2) return null
  const clones = objects.map(obj => cloneSceneObject(obj))
  return normalizeGroup({
    id: crypto.randomUUID(),
    type: 'group',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: objects.every(obj => obj.locked),
    name: 'Group',
    blurPct: 0,
    shadow: null,
    children: clones,
  })
}

export function ungroupSceneObject(group: SceneGroup): SceneObject[] {
  const center = getObjectCenter(group)
  return group.children.map(child => {
    const localCenter = {
      x: group.x + child.x + child.width / 2,
      y: group.y + child.y + child.height / 2,
    }
    const rotated = rotatePoint(localCenter.x, localCenter.y, group.rotation, center.x, center.y)
    const next = cloneSceneObject(child)
    next.x = rotated.x - next.width / 2
    next.y = rotated.y - next.height / 2
    next.rotation += group.rotation
    return next
  })
}
