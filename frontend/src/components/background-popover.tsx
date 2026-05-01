import { type CSSProperties, useEffect, useRef, useState } from 'react'
import EditorRangeSlider from './editor-range-slider'
import { floatingToolbarPopoverClass } from './floating-toolbar-shell'

export type BgValue =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; css: string; stops: GradientStop[]; angle: number }

export type GradientStop = { color: string; offset: number }

/** True for CSS colors that are fully invisible (stroke/fill “none”). */
export function isTransparentCssColor(value: string): boolean {
  const s = value.trim().toLowerCase()
  if (s === 'transparent' || s === 'none') return true
  const m = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)$/.exec(
    s,
  )
  if (m && m[4] !== undefined) {
    const a = parseFloat(m[4])
    return Number.isFinite(a) && a === 0
  }
  if (/^#[0-9a-f]{8}$/i.test(s)) return s.slice(7, 9).toLowerCase() === '00'
  return false
}

export function solidPaintColorsEquivalent(a: string, b: string): boolean {
  if (a === b) return true
  return isTransparentCssColor(a) && isTransparentCssColor(b)
}

const TRANSPARENT_SWATCH_STYLE: CSSProperties = {
  background: 'repeating-conic-gradient(#e2e2e2 0% 25%, #fafafa 0% 50%)',
  backgroundSize: '8px 8px',
}

const PRESET_SOLIDS = [
  'transparent',
  '#ffffff',
  '#f8f9fa',
  '#f1f3f5',
  '#e9ecef',
  '#dee2e6',
  '#212529',
  '#0c8ce9',
  '#339af0',
  '#51cf66',
  '#fcc419',
  '#ff922b',
  '#ff6b6b',
  '#cc5de8',
  '#845ef7',
  '#5c7cfa',
  '#22b8cf',
  '#20c997',
  '#94d82d',
]

const PRESET_GRADIENTS: { stops: GradientStop[]; angle: number }[] = [
  {
    stops: [
      { color: '#667eea', offset: 0 },
      { color: '#764ba2', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#f093fb', offset: 0 },
      { color: '#f5576c', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#4facfe', offset: 0 },
      { color: '#00f2fe', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#43e97b', offset: 0 },
      { color: '#38f9d7', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#fa709a', offset: 0 },
      { color: '#fee140', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#a18cd1', offset: 0 },
      { color: '#fbc2eb', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#fccb90', offset: 0 },
      { color: '#d57eeb', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#e0c3fc', offset: 0 },
      { color: '#8ec5fc', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#f5f7fa', offset: 0 },
      { color: '#c3cfe2', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#0c0c0c', offset: 0 },
      { color: '#3a3a3a', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#ff9a9e', offset: 0 },
      { color: '#fecfef', offset: 1 },
    ],
    angle: 135,
  },
  {
    stops: [
      { color: '#96fbc4', offset: 0 },
      { color: '#f9f586', offset: 1 },
    ],
    angle: 90,
  },
]

function gradientCss(stops: GradientStop[], angle: number): string {
  const s = stops.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')
  return `linear-gradient(${angle}deg, ${s})`
}

const HEX6 = /^#[0-9A-Fa-f]{6}$/

function parseHexInput(raw: string): string | null {
  const t = raw.trim()
  if (HEX6.test(t)) return t
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t}`
  return null
}

function clampAngle(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(360, Math.max(0, Math.round(n)))
}

export function bgValueToCss(v: BgValue): string {
  return v.type === 'solid' ? v.color : v.css
}

export function bgValueToSwatch(v: BgValue): CSSProperties {
  if (v.type === 'solid' && isTransparentCssColor(v.color)) {
    return TRANSPARENT_SWATCH_STYLE
  }
  return v.type === 'solid' ? { backgroundColor: v.color } : { backgroundImage: v.css }
}

type Tab = 'solid' | 'gradient'

type Props = {
  value: BgValue
  onChange: (v: BgValue) => void
}

export default function BackgroundPopover({ value, onChange }: Props) {
  const [tab, setTab] = useState<Tab>(value.type === 'gradient' ? 'gradient' : 'solid')
  const customColorRef = useRef<HTMLInputElement>(null)
  const gradColor1Ref = useRef<HTMLInputElement>(null)
  const gradColor2Ref = useRef<HTMLInputElement>(null)

  const [customColor, setCustomColor] = useState(value.type === 'solid' ? value.color : '#ffffff')
  const [gradAngle, setGradAngle] = useState(value.type === 'gradient' ? value.angle : 135)
  const [gradStop1, setGradStop1] = useState(
    value.type === 'gradient' ? (value.stops[0]?.color ?? '#667eea') : '#667eea',
  )
  const [gradStop2, setGradStop2] = useState(
    value.type === 'gradient' ? (value.stops[1]?.color ?? '#764ba2') : '#764ba2',
  )
  const [angleDraft, setAngleDraft] = useState(
    String(value.type === 'gradient' ? value.angle : 135),
  )

  useEffect(() => {
    if (value.type === 'solid') setCustomColor(value.color)
    if (value.type === 'gradient') {
      setGradAngle(value.angle)
      setAngleDraft(String(value.angle))
      setGradStop1(value.stops[0]?.color ?? '#667eea')
      setGradStop2(value.stops[1]?.color ?? '#764ba2')
    }
  }, [value])

  function applySolid(hex: string) {
    setCustomColor(hex)
    onChange({ type: 'solid', color: hex })
  }

  function applyGradient(stops: GradientStop[], angle: number) {
    const a = clampAngle(angle)
    setGradAngle(a)
    setAngleDraft(String(a))
    if (stops.length >= 1) setGradStop1(stops[0].color)
    if (stops.length >= 2) setGradStop2(stops[1].color)
    const css = gradientCss(stops, a)
    onChange({ type: 'gradient', css, stops, angle: a })
  }

  function applyCustomGradient(s1: string, s2: string, a: number) {
    const stops: GradientStop[] = [
      { color: s1, offset: 0 },
      { color: s2, offset: 1 },
    ]
    applyGradient(stops, a)
  }

  const tabBtnCls = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
      active ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
    }`

  return (
    <div
      className={[
        'w-[min(380px,calc(100vw-2rem))] p-3.5',
        floatingToolbarPopoverClass,
        '!overflow-visible',
      ].join(' ')}
    >
      <div className="mb-3 flex gap-1 rounded-lg bg-neutral-100 p-0.5">
        <button
          type="button"
          className={tabBtnCls(tab === 'solid')}
          onClick={() => setTab('solid')}
        >
          Solid
        </button>
        <button
          type="button"
          className={tabBtnCls(tab === 'gradient')}
          onClick={() => setTab('gradient')}
        >
          Gradient
        </button>
      </div>

      {tab === 'solid' ? (
        <div>
          <div className="mb-2.5 grid grid-cols-6 gap-2 justify-items-center">
            {PRESET_SOLIDS.map(hex => (
              <button
                key={hex}
                type="button"
                className={`h-12 w-12 shrink-0 rounded-full border transition-shadow ${
                  value.type === 'solid' && solidPaintColorsEquivalent(value.color, hex)
                    ? 'border-neutral-900 ring-2 ring-neutral-900/20'
                    : 'border-black/10 hover:border-black/25'
                }`}
                style={
                  hex === 'transparent' || isTransparentCssColor(hex)
                    ? TRANSPARENT_SWATCH_STYLE
                    : { backgroundColor: hex }
                }
                onClick={() => applySolid(hex)}
                aria-label={hex === 'transparent' ? 'Transparent' : hex}
                title={hex === 'transparent' ? 'Transparent' : hex}
              />
            ))}
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-black/10 px-2.5 py-2">
            <button
              type="button"
              className="h-8 w-8 shrink-0 rounded-full border border-black/15 shadow-inner outline-none ring-offset-2 transition hover:ring-2 hover:ring-neutral-900/10 focus-visible:ring-2 focus-visible:ring-neutral-900/20"
              style={
                isTransparentCssColor(customColor)
                  ? TRANSPARENT_SWATCH_STYLE
                  : {
                      backgroundColor: HEX6.test(customColor) ? customColor : '#ffffff',
                    }
              }
              onClick={() => customColorRef.current?.click()}
              aria-label="Pick custom color"
            />
            <input
              ref={customColorRef}
              type="color"
              value={HEX6.test(customColor) ? customColor : '#ffffff'}
              onChange={e => applySolid(e.target.value)}
              className="sr-only"
              tabIndex={-1}
            />
            <input
              type="text"
              value={customColor}
              onChange={e => {
                const v = e.target.value
                setCustomColor(v)
                if (HEX6.test(v)) applySolid(v)
              }}
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 font-mono text-[13px] font-medium text-neutral-800 outline-none transition focus:border-black/10"
              spellCheck={false}
              aria-label="Hex color"
            />
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2.5 grid grid-cols-4 gap-2 justify-items-center">
            {PRESET_GRADIENTS.map((g, i) => {
              const css = gradientCss(g.stops, g.angle)
              const isActive =
                value.type === 'gradient' &&
                value.stops.length === g.stops.length &&
                value.stops.every(
                  (s, j) => s.color === g.stops[j].color && s.offset === g.stops[j].offset,
                ) &&
                value.angle === g.angle
              return (
                <button
                  key={i}
                  type="button"
                  className={`h-12 w-12 shrink-0 rounded-full border transition-shadow ${
                    isActive
                      ? 'border-neutral-900 ring-2 ring-neutral-900/20'
                      : 'border-black/10 hover:border-black/25'
                  }`}
                  style={{ backgroundImage: css }}
                  onClick={() => applyGradient(g.stops, g.angle)}
                  aria-label={`Gradient ${i + 1}`}
                />
              )
            })}
          </div>

          <div className="rounded-lg border border-black/10 p-3">
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Custom
            </p>
            <div className="grid gap-3">
              <div className="flex items-center gap-2.5">
                <label
                  htmlFor="bg-grad-start"
                  className="w-[3.25rem] shrink-0 text-[12px] font-medium text-neutral-600"
                >
                  Start
                </label>
                <button
                  type="button"
                  className="h-8 w-8 shrink-0 rounded-full border border-black/12 shadow-inner outline-none ring-offset-2 transition hover:ring-2 hover:ring-neutral-900/15 focus-visible:ring-2 focus-visible:ring-neutral-900/25"
                  style={{ backgroundColor: HEX6.test(gradStop1) ? gradStop1 : '#667eea' }}
                  onClick={() => gradColor1Ref.current?.click()}
                  aria-label="Pick start color"
                />
                <input
                  ref={gradColor1Ref}
                  type="color"
                  value={HEX6.test(gradStop1) ? gradStop1 : '#667eea'}
                  onChange={e => {
                    setGradStop1(e.target.value)
                    applyCustomGradient(e.target.value, gradStop2, gradAngle)
                  }}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                />
                <input
                  id="bg-grad-start"
                  type="text"
                  value={gradStop1}
                  onChange={e => {
                    const v = e.target.value
                    setGradStop1(v)
                    const hex = parseHexInput(v)
                    if (hex) applyCustomGradient(hex, gradStop2, gradAngle)
                  }}
                  onBlur={() => {
                    const hex = parseHexInput(gradStop1)
                    if (hex) {
                      setGradStop1(hex)
                      applyCustomGradient(hex, gradStop2, gradAngle)
                    } else {
                      const fallback =
                        value.type === 'gradient' ? (value.stops[0]?.color ?? '#667eea') : '#667eea'
                      setGradStop1(fallback)
                      applyCustomGradient(fallback, gradStop2, gradAngle)
                    }
                  }}
                  className="min-w-0 flex-1 rounded-md border border-black/10 bg-neutral-50/80 px-2 py-1.5 font-mono text-[12px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-black/20"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="#000000"
                />
              </div>
              <div className="flex items-center gap-2.5">
                <label
                  htmlFor="bg-grad-end"
                  className="w-[3.25rem] shrink-0 text-[12px] font-medium text-neutral-600"
                >
                  End
                </label>
                <button
                  type="button"
                  className="h-8 w-8 shrink-0 rounded-full border border-black/12 shadow-inner outline-none ring-offset-2 transition hover:ring-2 hover:ring-neutral-900/15 focus-visible:ring-2 focus-visible:ring-neutral-900/25"
                  style={{ backgroundColor: HEX6.test(gradStop2) ? gradStop2 : '#764ba2' }}
                  onClick={() => gradColor2Ref.current?.click()}
                  aria-label="Pick end color"
                />
                <input
                  ref={gradColor2Ref}
                  type="color"
                  value={HEX6.test(gradStop2) ? gradStop2 : '#764ba2'}
                  onChange={e => {
                    setGradStop2(e.target.value)
                    applyCustomGradient(gradStop1, e.target.value, gradAngle)
                  }}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                />
                <input
                  id="bg-grad-end"
                  type="text"
                  value={gradStop2}
                  onChange={e => {
                    const v = e.target.value
                    setGradStop2(v)
                    const hex = parseHexInput(v)
                    if (hex) applyCustomGradient(gradStop1, hex, gradAngle)
                  }}
                  onBlur={() => {
                    const hex = parseHexInput(gradStop2)
                    if (hex) {
                      setGradStop2(hex)
                      applyCustomGradient(gradStop1, hex, gradAngle)
                    } else {
                      const fallback =
                        value.type === 'gradient' ? (value.stops[1]?.color ?? '#764ba2') : '#764ba2'
                      setGradStop2(fallback)
                      applyCustomGradient(gradStop1, fallback, gradAngle)
                    }
                  }}
                  className="min-w-0 flex-1 rounded-md border border-black/10 bg-neutral-50/80 px-2 py-1.5 font-mono text-[12px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-black/20"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="#000000"
                />
              </div>
              <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_4.5rem] items-center gap-2">
                <label htmlFor="bg-grad-angle" className="text-[12px] font-medium text-neutral-600">
                  Angle
                </label>
                <EditorRangeSlider
                  min={0}
                  max={360}
                  value={gradAngle}
                  onChange={n => {
                    const a = clampAngle(n)
                    setGradAngle(a)
                    setAngleDraft(String(a))
                    applyCustomGradient(gradStop1, gradStop2, a)
                  }}
                  aria-label="Gradient angle"
                  trackClassName="min-w-0 w-full"
                />
                <div className="relative w-full min-w-[4.5rem] shrink-0">
                  <input
                    id="bg-grad-angle"
                    type="text"
                    inputMode="numeric"
                    value={angleDraft}
                    onChange={e => {
                      const t = e.target.value
                      setAngleDraft(t)
                      if (t === '' || t === '-') return
                      const n = Number(t)
                      if (Number.isFinite(n)) {
                        const a = clampAngle(n)
                        setGradAngle(a)
                        applyCustomGradient(gradStop1, gradStop2, a)
                      }
                    }}
                    onBlur={() => {
                      const n = Number(angleDraft)
                      const a = Number.isFinite(n) ? clampAngle(n) : gradAngle
                      setGradAngle(a)
                      setAngleDraft(String(a))
                      applyCustomGradient(gradStop1, gradStop2, a)
                    }}
                    className="box-border w-full min-w-0 rounded-md border border-black/10 bg-neutral-50/80 py-1.5 pl-2 pr-6 text-right font-mono text-[12px] tabular-nums text-neutral-900 outline-none focus:border-black/20"
                    aria-label="Angle in degrees"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-neutral-400">
                    °
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
