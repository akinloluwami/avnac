import { type BgValue, bgValueToCss } from '../components/background-popover'
import type { AvnacDocument, SceneArrow, SceneLine, SceneObject, SceneText } from './avnac-document'
import { iconSvgToDataUrl } from './avnac-icon'
import { getExportSafeImageUrl } from './avnac-image-proxy'
import { shadowColorString } from './avnac-shadow'
import {
  flattenVisibleStrokes,
  type VectorBoardDocument,
  type VectorBoardStroke,
} from './avnac-vector-board-document'
import { samplePenAnchorsToPolyline } from './avnac-vector-pen-bezier'
import { loadGoogleFontFamily } from './load-google-font'

const imageElementCache = new Map<string, Promise<HTMLImageElement>>()
let measureCanvas: HTMLCanvasElement | null = null
let textStrokeCanvas: HTMLCanvasElement | null = null

export function sceneTextLineHeight(obj: SceneText): number {
  const raw = obj.lineHeight
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 1.22
  return Math.max(0.6, Math.min(4, raw))
}

export function sceneTextLetterSpacing(obj: SceneText): number {
  const raw = obj.letterSpacing
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  return raw
}

export function measureSceneTextWidth(
  obj: SceneText,
  line: string,
  ctx?: CanvasRenderingContext2D | null,
): number {
  const measure = ctx ?? getMeasureContext()
  if (!measure) return Math.max(0, Array.from(line).length * (obj.fontSize * 0.6))
  setTextFont(measure, obj)
  return measureSceneTextLineWidth(measure, obj, line)
}

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!measureCanvas) measureCanvas = document.createElement('canvas')
  return measureCanvas.getContext('2d')
}

function makeLinearGradient(
  ctx: CanvasRenderingContext2D,
  stops: { color: string; offset: number }[],
  angleDeg: number,
  width: number,
  height: number,
): CanvasGradient {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const cx = width / 2
  const cy = height / 2
  const tx = dx !== 0 ? width / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY
  const ty = dy !== 0 ? height / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY
  const halfLen = Math.min(tx, ty)
  const gradient = ctx.createLinearGradient(
    cx - dx * halfLen,
    cy - dy * halfLen,
    cx + dx * halfLen,
    cy + dy * halfLen,
  )
  for (const stop of stops) {
    gradient.addColorStop(stop.offset, stop.color)
  }
  return gradient
}

export function bgValueToCanvasPaint(
  ctx: CanvasRenderingContext2D,
  value: BgValue,
  width: number,
  height: number,
): string | CanvasGradient {
  if (value.type === 'solid') return value.color
  return makeLinearGradient(ctx, value.stops, value.angle, width, height)
}

export function bgValueToSceneCss(value: BgValue): string {
  return bgValueToCss(value)
}

export function blurPxFromPct(blurPct: number): number {
  return Math.max(0, Math.min(28, (Math.max(0, Math.min(100, blurPct)) / 100) * 28))
}

export function containSquareInRect(width: number, height: number) {
  const size = Math.max(0, Math.min(width, height))
  return {
    x: (width - size) / 2,
    y: (height - size) / 2,
    width: size,
    height: size,
  }
}

export async function loadSceneImageElement(rawUrl: string): Promise<HTMLImageElement> {
  const safeUrl = getExportSafeImageUrl(rawUrl)
  const key = safeUrl || rawUrl
  const hit = imageElementCache.get(key)
  if (hit) return hit
  const task = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    if (!safeUrl.startsWith('data:') && !safeUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load image: ${rawUrl}`))
    img.src = safeUrl
  })
  imageElementCache.set(key, task)
  try {
    return await task
  } catch (error) {
    imageElementCache.delete(key)
    throw error
  }
}

function applyShadow(ctx: CanvasRenderingContext2D, obj: SceneObject) {
  if (!obj.shadow) {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    return
  }
  ctx.shadowColor = shadowColorString(obj.shadow)
  ctx.shadowBlur = obj.shadow.blur
  ctx.shadowOffsetX = obj.shadow.offsetX
  ctx.shadowOffsetY = obj.shadow.offsetY
}

function applyDash(ctx: CanvasRenderingContext2D, obj: SceneLine | SceneArrow) {
  if (obj.lineStyle === 'dashed') {
    ctx.setLineDash([obj.strokeWidth * 3, obj.strokeWidth * 2])
    return
  }
  if (obj.lineStyle === 'dotted') {
    ctx.setLineDash([obj.strokeWidth * 0.5, obj.strokeWidth * 1.8])
    return
  }
  ctx.setLineDash([])
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2))
  ctx.beginPath()
  if ('roundRect' in ctx) {
    ctx.roundRect(x, y, width, height, r)
    return
  }
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function fillAndStrokeShape(
  ctx: CanvasRenderingContext2D,
  obj: Extract<SceneObject, { fill: BgValue; stroke: BgValue; strokeWidth: number }>,
) {
  ctx.fillStyle = bgValueToCanvasPaint(ctx, obj.fill, obj.width, obj.height)
  ctx.fill()
  if (obj.strokeWidth > 0) {
    ctx.strokeStyle = bgValueToCanvasPaint(ctx, obj.stroke, obj.width, obj.height)
    ctx.lineWidth = obj.strokeWidth
    ctx.stroke()
  }
}

function polygonPoints(sides: number, width: number, height: number): [number, number][] {
  const pts: [number, number][] = []
  const count = Math.max(3, sides)
  const rx = width / 2
  const ry = height / 2
  for (let i = 0; i < count; i += 1) {
    const a = -Math.PI / 2 + (i / count) * Math.PI * 2
    pts.push([rx + Math.cos(a) * rx, ry + Math.sin(a) * ry])
  }
  return pts
}

function starPoints(points: number, width: number, height: number): [number, number][] {
  const out: [number, number][] = []
  const count = Math.max(4, points)
  const rx = width / 2
  const ry = height / 2
  const inner = 0.45
  for (let i = 0; i < count * 2; i += 1) {
    const a = -Math.PI / 2 + (i / (count * 2)) * Math.PI * 2
    const r = i % 2 === 0 ? 1 : inner
    out.push([rx + Math.cos(a) * rx * r, ry + Math.sin(a) * ry * r])
  }
  return out
}

function drawPointPath(ctx: CanvasRenderingContext2D, pts: [number, number][], close = true) {
  if (pts.length === 0) return
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i += 1) {
    ctx.lineTo(pts[i][0], pts[i][1])
  }
  if (close) ctx.closePath()
}

function setTextFont(ctx: CanvasRenderingContext2D, obj: SceneText) {
  const weight = typeof obj.fontWeight === 'number' ? obj.fontWeight : obj.fontWeight
  ctx.font = `${obj.fontStyle} ${weight} ${obj.fontSize}px "${obj.fontFamily}", sans-serif`
}

function measureSceneTextLineWidth(
  ctx: CanvasRenderingContext2D,
  obj: SceneText,
  line: string,
): number {
  if (!line) return 0
  const letterSpacing = sceneTextLetterSpacing(obj)
  if (letterSpacing === 0) return ctx.measureText(line).width
  const chars = Array.from(line)
  const width =
    chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) +
    Math.max(0, chars.length - 1) * letterSpacing
  return Math.max(0, width)
}

function drawSceneTextLine(
  ctx: CanvasRenderingContext2D,
  obj: SceneText,
  line: string,
  x: number,
  y: number,
  mode: 'fill' | 'stroke',
) {
  const letterSpacing = sceneTextLetterSpacing(obj)
  if (letterSpacing === 0 || line.length <= 1) {
    if (mode === 'stroke') ctx.strokeText(line, x, y)
    else ctx.fillText(line, x, y)
    return
  }
  const chars = Array.from(line)
  let cursor = x
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i] ?? ''
    if (mode === 'stroke') ctx.strokeText(char, cursor, y)
    else ctx.fillText(char, cursor, y)
    cursor += ctx.measureText(char).width
    if (i < chars.length - 1) cursor += letterSpacing
  }
}

function drawSceneTextLayout(
  ctx: CanvasRenderingContext2D,
  obj: SceneText,
  text: ReturnType<typeof layoutSceneText>,
  baselineOffset: number,
  mode: 'fill' | 'stroke',
) {
  const textAlign = obj.textAlign === 'justify' ? 'left' : obj.textAlign
  const anchorX = textAlign === 'center' ? obj.width / 2 : textAlign === 'right' ? obj.width : 0
  for (let i = 0; i < text.lines.length; i += 1) {
    const line = text.lines[i] ?? ''
    const y = i * text.lineHeight
    const baselineY = y + baselineOffset
    const width = measureSceneTextLineWidth(ctx, obj, line)
    const startX =
      textAlign === 'center' ? anchorX - width / 2 : textAlign === 'right' ? anchorX - width : 0
    drawSceneTextLine(ctx, obj, line, startX, baselineY, mode)
  }
}

function splitSceneTextTokenToFit(
  ctx: CanvasRenderingContext2D,
  obj: SceneText,
  token: string,
  maxWidth: number,
): string[] {
  if (!token) return ['']
  const chars = Array.from(token)
  const parts: string[] = []
  let current = ''
  for (const char of chars) {
    const next = current + char
    if (measureSceneTextLineWidth(ctx, obj, next) <= maxWidth || !current) {
      current = next
      continue
    }
    parts.push(current)
    current = char
  }
  if (current) parts.push(current)
  return parts
}

function cssLineBoxBaselineOffset(
  ctx: CanvasRenderingContext2D,
  obj: SceneText,
  lineHeight: number,
): number {
  const metrics = ctx.measureText('Mg') as TextMetrics & {
    fontBoundingBoxAscent?: number
    fontBoundingBoxDescent?: number
  }
  const ascent =
    typeof metrics.fontBoundingBoxAscent === 'number' &&
    Number.isFinite(metrics.fontBoundingBoxAscent)
      ? metrics.fontBoundingBoxAscent
      : metrics.actualBoundingBoxAscent || obj.fontSize * 0.8
  const descent =
    typeof metrics.fontBoundingBoxDescent === 'number' &&
    Number.isFinite(metrics.fontBoundingBoxDescent)
      ? metrics.fontBoundingBoxDescent
      : metrics.actualBoundingBoxDescent || obj.fontSize * 0.2
  const fontBox = Math.max(1, ascent + descent)
  return (lineHeight - fontBox) / 2 + ascent
}

export function sceneTextBaselineOffset(
  obj: SceneText,
  ctx?: CanvasRenderingContext2D | null,
): number {
  const measure = ctx ?? getMeasureContext()
  if (!measure) return obj.fontSize * 0.8
  setTextFont(measure, obj)
  return cssLineBoxBaselineOffset(measure, obj, obj.fontSize * sceneTextLineHeight(obj))
}

export function layoutSceneText(
  obj: SceneText,
  ctx?: CanvasRenderingContext2D | null,
): {
  lines: string[]
  lineHeight: number
  height: number
} {
  const measure = ctx ?? getMeasureContext()
  const lineHeight = obj.fontSize * sceneTextLineHeight(obj)
  if (!measure) {
    const roughLines = obj.text.split(/\r?\n/)
    return {
      lines: roughLines,
      lineHeight,
      height: roughLines.length * lineHeight,
    }
  }
  setTextFont(measure, obj)
  const maxWidth = Math.max(8, obj.width)
  const paragraphs = obj.text.split(/\r?\n/)
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }
    const words = paragraph.split(/(\s+)/).filter(Boolean)
    let current = ''
    for (const word of words) {
      const next = current ? `${current}${word}` : word
      if (measureSceneTextLineWidth(measure, obj, next) <= maxWidth) {
        current = next
        continue
      }
      if (!current) {
        const split = splitSceneTextTokenToFit(measure, obj, word.trimStart(), maxWidth)
        current = split.pop() ?? ''
        lines.push(...split)
        continue
      }
      lines.push(current.trimEnd())
      const remainder = word.trimStart()
      if (!remainder) {
        current = ''
        continue
      }
      if (measureSceneTextLineWidth(measure, obj, remainder) <= maxWidth) {
        current = remainder
        continue
      }
      const split = splitSceneTextTokenToFit(measure, obj, remainder, maxWidth)
      current = split.pop() ?? ''
      lines.push(...split)
    }
    lines.push(current.trimEnd())
  }
  return {
    lines,
    lineHeight,
    height: Math.max(lineHeight, lines.length * lineHeight),
  }
}

export async function preloadFontsForDocument(doc: AvnacDocument): Promise<void> {
  const fonts = new Set<string>()
  const visit = (obj: SceneObject) => {
    if (obj.type === 'text') fonts.add(obj.fontFamily)
    if (obj.type === 'group') {
      for (const child of obj.children) visit(child)
    }
  }
  for (const obj of doc.objects) visit(obj)
  await Promise.all([...fonts].map(font => loadGoogleFontFamily(font)))
}

function drawTextObject(ctx: CanvasRenderingContext2D, obj: SceneText) {
  const text = layoutSceneText(obj, ctx)
  setTextFont(ctx, obj)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const fillPaint = bgValueToCanvasPaint(ctx, obj.fill, obj.width, obj.height)
  const textAlign = obj.textAlign === 'justify' ? 'left' : obj.textAlign
  const anchorX = textAlign === 'center' ? obj.width / 2 : textAlign === 'right' ? obj.width : 0
  const baselineOffset = cssLineBoxBaselineOffset(ctx, obj, text.lineHeight)
  if (obj.strokeWidth > 0) {
    drawTextOutsideStroke(ctx, obj, text, baselineOffset)
  }
  for (let i = 0; i < text.lines.length; i += 1) {
    const line = text.lines[i] ?? ''
    const y = i * text.lineHeight
    const baselineY = y + baselineOffset
    const width = measureSceneTextLineWidth(ctx, obj, line)
    const startX =
      textAlign === 'center' ? anchorX - width / 2 : textAlign === 'right' ? anchorX - width : 0
    ctx.fillStyle = fillPaint
    drawSceneTextLine(ctx, obj, line, startX, baselineY, 'fill')
    if (obj.underline && line.length > 0) {
      const underlineY = baselineY + obj.fontSize * 0.12
      ctx.beginPath()
      ctx.moveTo(startX, underlineY)
      ctx.lineTo(startX + width, underlineY)
      ctx.lineWidth = Math.max(1, obj.fontSize * 0.06)
      ctx.strokeStyle = fillPaint
      ctx.stroke()
    }
  }
}

function drawTextOutsideStroke(
  ctx: CanvasRenderingContext2D,
  obj: SceneText,
  text: ReturnType<typeof layoutSceneText>,
  baselineOffset: number,
) {
  if (typeof document === 'undefined') {
    ctx.strokeStyle = bgValueToCanvasPaint(ctx, obj.stroke, obj.width, obj.height)
    ctx.lineWidth = obj.strokeWidth
    drawSceneTextLayout(ctx, obj, text, baselineOffset, 'stroke')
    return
  }
  if (!textStrokeCanvas) textStrokeCanvas = document.createElement('canvas')
  const pad = Math.ceil(Math.max(2, obj.strokeWidth * 2))
  const matrix = ctx.getTransform()
  const dpr = Math.max(1, Math.hypot(matrix.a, matrix.b) || 1)
  const width = Math.max(1, Math.ceil((obj.width + pad * 2) * dpr))
  const height = Math.max(1, Math.ceil((Math.max(obj.height, text.height) + pad * 2) * dpr))
  textStrokeCanvas.width = width
  textStrokeCanvas.height = height
  const strokeCtx = textStrokeCanvas.getContext('2d')
  if (!strokeCtx) return
  strokeCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  strokeCtx.clearRect(0, 0, width / dpr, height / dpr)
  strokeCtx.translate(pad, pad)
  setTextFont(strokeCtx, obj)
  strokeCtx.textBaseline = 'alphabetic'
  strokeCtx.textAlign = 'left'
  strokeCtx.lineJoin = 'round'
  strokeCtx.lineCap = 'round'
  strokeCtx.miterLimit = 2
  strokeCtx.strokeStyle = bgValueToCanvasPaint(strokeCtx, obj.stroke, obj.width, obj.height)
  strokeCtx.lineWidth = obj.strokeWidth * 2
  drawSceneTextLayout(strokeCtx, obj, text, baselineOffset, 'stroke')
  strokeCtx.globalCompositeOperation = 'destination-out'
  strokeCtx.fillStyle = '#000000'
  drawSceneTextLayout(strokeCtx, obj, text, baselineOffset, 'fill')
  strokeCtx.globalCompositeOperation = 'source-over'
  ctx.drawImage(textStrokeCanvas, -pad, -pad, width / dpr, height / dpr)
}

function drawArrowPath(ctx: CanvasRenderingContext2D, obj: SceneArrow) {
  const pad = obj.strokeWidth / 2
  const tailX = pad
  const tipX = Math.max(pad + 1, obj.width - obj.strokeWidth * 1.8)
  const y = obj.height / 2
  ctx.beginPath()
  if (obj.pathType === 'curved') {
    const cx = tailX + (tipX - tailX) * obj.curveT
    const cy = y - obj.curveBulge
    ctx.moveTo(tailX, y)
    ctx.quadraticCurveTo(cx, cy, tipX, y)
  } else {
    ctx.moveTo(tailX, y)
    ctx.lineTo(tipX, y)
  }
}

function drawArrowHead(ctx: CanvasRenderingContext2D, obj: SceneArrow) {
  const headLen = Math.max(obj.strokeWidth * 2, obj.strokeWidth * 4 * obj.headSize)
  const tipX = obj.width - obj.strokeWidth * 0.5
  const y = obj.height / 2
  const spread = Math.max(obj.strokeWidth * 1.6, obj.strokeWidth * 3.2 * obj.headSize)
  ctx.beginPath()
  ctx.moveTo(tipX, y)
  ctx.lineTo(tipX - headLen, y - spread / 2)
  ctx.lineTo(tipX - headLen * 0.82, y)
  ctx.lineTo(tipX - headLen, y + spread / 2)
  ctx.closePath()
  ctx.fill()
}

function drawVectorStroke(
  ctx: CanvasRenderingContext2D,
  stroke: VectorBoardStroke,
  width: number,
  height: number,
) {
  const lineWidth = Math.max(0.5, stroke.strokeWidthN * Math.min(width, height))
  ctx.strokeStyle = stroke.stroke || '#1a1a1a'
  ctx.fillStyle = stroke.fill || 'transparent'
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const points =
    stroke.kind === 'pen' && stroke.penAnchors && stroke.penAnchors.length >= 2
      ? samplePenAnchorsToPolyline(stroke.penAnchors, 18, stroke.penClosed === true)
      : stroke.points
  if (points.length < 2) return
  const px = points.map(([x, y]) => [x * width, y * height] as const)
  if (stroke.kind === 'rect') {
    const [a, b] = [px[0], px[px.length - 1]]
    const minX = Math.min(a[0], b[0])
    const minY = Math.min(a[1], b[1])
    const w = Math.abs(b[0] - a[0])
    const h = Math.abs(b[1] - a[1])
    ctx.beginPath()
    ctx.rect(minX, minY, w, h)
    if (stroke.fill && stroke.fill !== 'transparent') ctx.fill()
    ctx.stroke()
    return
  }
  if (stroke.kind === 'ellipse') {
    const [a, b] = [px[0], px[px.length - 1]]
    const cx = (a[0] + b[0]) / 2
    const cy = (a[1] + b[1]) / 2
    const rx = Math.abs(b[0] - a[0]) / 2
    const ry = Math.abs(b[1] - a[1]) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    if (stroke.fill && stroke.fill !== 'transparent') ctx.fill()
    ctx.stroke()
    return
  }
  if (stroke.kind === 'polygon') {
    drawPointPath(ctx, px as [number, number][])
    if (stroke.fill && stroke.fill !== 'transparent') ctx.fill()
    ctx.stroke()
    return
  }
  if (stroke.kind === 'arrow') {
    const [a, b] = [px[0], px[px.length - 1]]
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const angle = Math.atan2(dy, dx)
    const head = Math.max(lineWidth * 3.2, 12)
    const spread = Math.max(lineWidth * 2.2, 8)
    ctx.beginPath()
    ctx.moveTo(b[0], b[1])
    ctx.lineTo(
      b[0] - head * Math.cos(angle) + spread * Math.sin(angle) * 0.5,
      b[1] - head * Math.sin(angle) - spread * Math.cos(angle) * 0.5,
    )
    ctx.lineTo(
      b[0] - head * Math.cos(angle) - spread * Math.sin(angle) * 0.5,
      b[1] - head * Math.sin(angle) + spread * Math.cos(angle) * 0.5,
    )
    ctx.closePath()
    ctx.fillStyle = stroke.stroke || '#1a1a1a'
    ctx.fill()
    return
  }
  ctx.beginPath()
  ctx.moveTo(px[0][0], px[0][1])
  for (let i = 1; i < px.length; i += 1) {
    ctx.lineTo(px[i][0], px[i][1])
  }
  if (stroke.kind === 'pen' && stroke.penClosed) ctx.closePath()
  if (stroke.fill && stroke.fill !== 'transparent' && stroke.kind === 'pen') ctx.fill()
  ctx.stroke()
}

export function renderVectorBoardDocumentToCanvas(
  ctx: CanvasRenderingContext2D,
  doc: VectorBoardDocument,
  width: number,
  height: number,
  opts?: { fillBackground?: boolean },
) {
  if (opts?.fillBackground !== false) {
    ctx.fillStyle = '#f8f8f7'
    ctx.fillRect(0, 0, width, height)
  }
  const strokes = flattenVisibleStrokes(doc)
  for (const stroke of strokes) {
    drawVectorStroke(ctx, stroke, width, height)
  }
}

async function drawSceneObject(
  ctx: CanvasRenderingContext2D,
  obj: SceneObject,
  vectorBoardDocs: Record<string, VectorBoardDocument>,
): Promise<void> {
  if (!obj.visible) return
  ctx.save()
  ctx.globalAlpha *= obj.opacity
  applyShadow(ctx, obj)
  const blur = blurPxFromPct(obj.blurPct)
  ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none'
  ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2)
  ctx.rotate((obj.rotation * Math.PI) / 180)
  ctx.translate(-obj.width / 2, -obj.height / 2)

  switch (obj.type) {
    case 'rect':
      drawRoundedRectPath(ctx, 0, 0, obj.width, obj.height, obj.cornerRadius)
      fillAndStrokeShape(ctx, obj)
      break
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse(obj.width / 2, obj.height / 2, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2)
      fillAndStrokeShape(ctx, obj)
      break
    case 'polygon':
      drawPointPath(ctx, polygonPoints(obj.sides, obj.width, obj.height))
      fillAndStrokeShape(ctx, obj)
      break
    case 'star':
      drawPointPath(ctx, starPoints(obj.points, obj.width, obj.height))
      fillAndStrokeShape(ctx, obj)
      break
    case 'line':
      ctx.strokeStyle = bgValueToCanvasPaint(ctx, obj.stroke, obj.width, obj.height)
      ctx.lineWidth = obj.strokeWidth
      ctx.lineCap = obj.roundedEnds ? 'round' : 'butt'
      applyDash(ctx, obj)
      ctx.beginPath()
      ctx.moveTo(obj.strokeWidth / 2, obj.height / 2)
      ctx.lineTo(obj.width - obj.strokeWidth / 2, obj.height / 2)
      ctx.stroke()
      ctx.setLineDash([])
      break
    case 'arrow':
      ctx.strokeStyle = bgValueToCanvasPaint(ctx, obj.stroke, obj.width, obj.height)
      ctx.fillStyle = bgValueToCanvasPaint(ctx, obj.stroke, obj.width, obj.height)
      ctx.lineWidth = obj.strokeWidth
      ctx.lineCap = obj.roundedEnds ? 'round' : 'butt'
      ctx.lineJoin = 'round'
      applyDash(ctx, obj)
      drawArrowPath(ctx, obj)
      ctx.stroke()
      ctx.setLineDash([])
      drawArrowHead(ctx, obj)
      break
    case 'text':
      drawTextObject(ctx, obj)
      break
    case 'image': {
      const img = await loadSceneImageElement(obj.src)
      const cropRotation = obj.crop.rotation || 0
      ctx.save()
      drawRoundedRectPath(ctx, 0, 0, obj.width, obj.height, obj.cornerRadius)
      ctx.clip()
      if (Math.abs(cropRotation) < 0.001) {
        ctx.drawImage(
          img,
          obj.crop.x,
          obj.crop.y,
          obj.crop.width,
          obj.crop.height,
          0,
          0,
          obj.width,
          obj.height,
        )
      } else {
        const scaleX = obj.width / Math.max(1, obj.crop.width)
        const scaleY = obj.height / Math.max(1, obj.crop.height)
        const cropCenterX = obj.crop.x + obj.crop.width / 2
        const cropCenterY = obj.crop.y + obj.crop.height / 2
        ctx.translate(obj.width / 2, obj.height / 2)
        ctx.scale(scaleX, scaleY)
        ctx.rotate((cropRotation * Math.PI) / 180)
        ctx.drawImage(img, -cropCenterX, -cropCenterY)
      }
      ctx.restore()
      break
    }
    case 'icon': {
      const img = await loadSceneImageElement(
        iconSvgToDataUrl(obj.svg, {
          fill: obj.fill,
          strokeWidth: obj.strokeWidth,
        }),
      )
      const iconBox = containSquareInRect(obj.width, obj.height)
      ctx.drawImage(img, iconBox.x, iconBox.y, iconBox.width, iconBox.height)
      break
    }
    case 'vector-board': {
      const doc = vectorBoardDocs[obj.boardId]
      if (doc) {
        renderVectorBoardDocumentToCanvas(ctx, doc, obj.width, obj.height, {
          fillBackground: false,
        })
      }
      break
    }
    case 'group':
      for (const child of obj.children) {
        await drawSceneObject(ctx, child, vectorBoardDocs)
      }
      break
  }

  ctx.restore()
}

export async function renderAvnacDocumentToCanvas(
  ctx: CanvasRenderingContext2D,
  doc: AvnacDocument,
  vectorBoardDocs: Record<string, VectorBoardDocument>,
  opts?: { transparent?: boolean },
): Promise<void> {
  const { width, height } = doc.artboard
  ctx.clearRect(0, 0, width, height)
  if (!opts?.transparent) {
    ctx.fillStyle = bgValueToCanvasPaint(ctx, doc.bg, width, height)
    ctx.fillRect(0, 0, width, height)
  }
  await preloadFontsForDocument(doc)
  for (const obj of doc.objects) {
    await drawSceneObject(ctx, obj, vectorBoardDocs)
  }
}

export async function renderAvnacDocumentToDataUrl(
  doc: AvnacDocument,
  vectorBoardDocs: Record<string, VectorBoardDocument>,
  opts?: {
    format?: 'png' | 'jpg' | 'webp'
    multiplier?: number
    transparent?: boolean
  },
): Promise<string> {
  const multiplier = Math.max(1, Math.round(opts?.multiplier ?? 1))
  const format = opts?.format ?? 'png'
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(doc.artboard.width * multiplier))
  canvas.height = Math.max(1, Math.round(doc.artboard.height * multiplier))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create export canvas.')
  ctx.setTransform(multiplier, 0, 0, multiplier, 0, 0)
  await renderAvnacDocumentToCanvas(ctx, doc, vectorBoardDocs, {
    transparent: opts?.transparent,
  })
  const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
  return canvas.toDataURL(mimeType)
}
