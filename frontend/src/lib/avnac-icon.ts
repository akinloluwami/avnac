import type { BgValue } from '../components/background-popover'

export type SceneIconSvgElement = readonly [
  tag: string,
  attrs: { readonly [key: string]: string | number },
]

export type SceneIconSvg = readonly SceneIconSvgElement[]

const ICON_TAGS = new Set(['circle', 'ellipse', 'path', 'rect'])

const ICON_ATTRS = new Set([
  'cx',
  'cy',
  'd',
  'fill',
  'fillRule',
  'height',
  'key',
  'opacity',
  'r',
  'rx',
  'ry',
  'stroke',
  'strokeLinecap',
  'strokeLinejoin',
  'strokeWidth',
  'transform',
  'width',
  'x',
  'y',
])

function isIconAttrValue(value: unknown): value is string | number {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
}

export function normalizeIconSvg(raw: unknown): SceneIconSvg | null {
  if (!Array.isArray(raw)) return null
  const out: SceneIconSvgElement[] = []
  for (const row of raw) {
    if (!Array.isArray(row) || row.length !== 2) return null
    const [tag, attrs] = row
    if (typeof tag !== 'string' || !ICON_TAGS.has(tag)) return null
    if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return null
    const nextAttrs: Record<string, string | number> = {}
    for (const [key, value] of Object.entries(attrs)) {
      if (!ICON_ATTRS.has(key) || !isIconAttrValue(value)) continue
      nextAttrs[key] = value
    }
    out.push([tag, nextAttrs])
  }
  return out.length > 0 ? out : null
}

export function cloneIconSvg(svg: SceneIconSvg): SceneIconSvg {
  return svg.map(([tag, attrs]) => [tag, { ...attrs }] as const)
}

export function sceneIconPaintValue(fill: BgValue, gradientId: string): string {
  return fill.type === 'solid' ? fill.color : `url(#${gradientId})`
}

export function iconSvgNodeAttrs(
  attrs: SceneIconSvgElement[1],
  paint: string,
  strokeWidth: number,
): Record<string, string | number | undefined> {
  const next: Record<string, string | number | undefined> = { ...attrs }
  delete next.key
  if (next.stroke === 'currentColor') next.stroke = paint
  if (next.fill === 'currentColor') next.fill = paint
  if (next.stroke !== undefined) {
    next.strokeWidth = Math.max(0.5, Math.min(12, strokeWidth))
  }
  return next
}

function gradientEndpoints(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const tx = dx !== 0 ? 0.5 / Math.abs(dx) : Number.POSITIVE_INFINITY
  const ty = dy !== 0 ? 0.5 / Math.abs(dy) : Number.POSITIVE_INFINITY
  const halfLen = Math.min(tx, ty)
  return {
    x1: `${(0.5 - dx * halfLen) * 100}%`,
    y1: `${(0.5 - dy * halfLen) * 100}%`,
    x2: `${(0.5 + dx * halfLen) * 100}%`,
    y2: `${(0.5 + dy * halfLen) * 100}%`,
  }
}

function escapeSvgAttr(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function svgAttrName(name: string): string {
  return name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
}

function serializeAttrs(attrs: Record<string, string | number | undefined>): string {
  return Object.entries(attrs)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${svgAttrName(key)}="${escapeSvgAttr(value)}"`)
    .join(' ')
}

function svgGradientDef(id: string, value: BgValue): string {
  if (value.type !== 'gradient') return ''
  const ends = gradientEndpoints(value.angle)
  const stops = value.stops
    .map(
      stop =>
        `<stop offset="${escapeSvgAttr(stop.offset * 100)}%" stop-color="${escapeSvgAttr(stop.color)}"/>`,
    )
    .join('')
  return `<defs><linearGradient id="${escapeSvgAttr(id)}" x1="${ends.x1}" y1="${ends.y1}" x2="${ends.x2}" y2="${ends.y2}">${stops}</linearGradient></defs>`
}

export function iconSvgToMarkup(
  svg: SceneIconSvg,
  opts: {
    fill: BgValue
    strokeWidth: number
  },
): string {
  const gradientId = 'avnac-icon-fill'
  const paint = sceneIconPaintValue(opts.fill, gradientId)
  const children = svg
    .map(
      ([tag, attrs]) =>
        `<${tag} ${serializeAttrs(iconSvgNodeAttrs(attrs, paint, opts.strokeWidth))}/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none">${svgGradientDef(gradientId, opts.fill)}${children}</svg>`
}

export function iconSvgToDataUrl(
  svg: SceneIconSvg,
  opts: {
    fill: BgValue
    strokeWidth: number
  },
): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvgToMarkup(svg, opts))}`
}
