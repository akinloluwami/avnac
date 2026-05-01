export type ShadowUi = {
  blur: number
  offsetX: number
  offsetY: number
  colorHex: string
  opacityPct: number
}

export const DEFAULT_SHADOW_UI: ShadowUi = {
  blur: 14,
  offsetX: 6,
  offsetY: 6,
  colorHex: '#000000',
  opacityPct: 35,
}

function clampChannel(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return { r: 0, g: 0, b: 0 }
  const n = Number.parseInt(m[1], 16)
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  }
}

export function shadowColorString(ui: ShadowUi): string {
  const { r, g, b } = hexToRgb(ui.colorHex)
  const a = Math.max(0, Math.min(100, Math.round(ui.opacityPct))) / 100
  return `rgba(${r},${g},${b},${a})`
}

export function parseShadowColor(color: string): { hex: string; opacityPct: number } {
  const t = color.trim()
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(
    t,
  )
  if (rgba) {
    const r = clampChannel(Number(rgba[1]))
    const g = clampChannel(Number(rgba[2]))
    const b = clampChannel(Number(rgba[3]))
    const a = rgba[4] !== undefined ? Math.max(0, Math.min(1, Number(rgba[4]))) : 1
    return {
      hex: `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`,
      opacityPct: Math.round(a * 100),
    }
  }
  if (/^#[0-9a-f]{6}$/i.test(t)) {
    return { hex: t.startsWith('#') ? t : `#${t}`, opacityPct: 100 }
  }
  return { hex: '#000000', opacityPct: 100 }
}

export function averageShadowUi(rows: ShadowUi[]): ShadowUi {
  if (rows.length === 0) return { ...DEFAULT_SHADOW_UI }
  const blur = Math.round(rows.reduce((sum, row) => sum + row.blur, 0) / rows.length)
  const offsetX = Math.round(rows.reduce((sum, row) => sum + row.offsetX, 0) / rows.length)
  const offsetY = Math.round(rows.reduce((sum, row) => sum + row.offsetY, 0) / rows.length)
  const opacityPct = Math.round(rows.reduce((sum, row) => sum + row.opacityPct, 0) / rows.length)
  const baseColor = rows[0]?.colorHex ?? '#000000'
  const colorHex = rows.every(row => row.colorHex === baseColor) ? baseColor : '#000000'
  return { blur, offsetX, offsetY, colorHex, opacityPct }
}
