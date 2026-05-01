import {
  TextAlignCenterIcon,
  TextAlignJustifyCenterIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { GOOGLE_FONT_FAMILIES } from '../data/google-font-families'
import { loadGoogleFontFamily } from '../lib/load-google-font'
import type { BgValue } from './background-popover'
import {
  FloatingToolbarDivider,
  FloatingToolbarShell,
  floatingToolbarIconButton,
  floatingToolbarPopoverClass,
} from './floating-toolbar-shell'
import FontSizeScrubber from './font-size-scrubber'
import PaintPopoverControl from './paint-popover-control'

export type TextFormatToolbarValues = {
  fontFamily: string
  fontSize: number
  fillStyle: BgValue
  textAlign: 'left' | 'center' | 'right' | 'justify'
  bold: boolean
  italic: boolean
  underline: boolean
}

type TextFormatToolbarProps = {
  values: TextFormatToolbarValues
  onChange: (next: Partial<TextFormatToolbarValues>) => void
  footerSlot?: ReactNode
}

const LIST_LIMIT = 80

/** Fallback when menu node is not measured yet. */
const FONT_MENU_ESTIMATE_PX = 288

export default function TextFormatToolbar({
  values,
  onChange,
  footerSlot,
}: TextFormatToolbarProps) {
  const [fontOpen, setFontOpen] = useState(false)
  const [fontQuery, setFontQuery] = useState('')
  const [fontMenuOpenUpward, setFontMenuOpenUpward] = useState(false)
  const [fontListMaxHeightPx, setFontListMaxHeightPx] = useState(224)
  const rootRef = useRef<HTMLDivElement>(null)
  const fontTriggerWrapRef = useRef<HTMLDivElement>(null)
  const fontMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fontOpen) return
    loadGoogleFontFamily(values.fontFamily)
  }, [fontOpen, values.fontFamily])

  useEffect(() => {
    if (!fontOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      setFontOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [fontOpen])

  useEffect(() => {
    if (!fontOpen) {
      setFontMenuOpenUpward(false)
      setFontListMaxHeightPx(224)
    }
  }, [fontOpen])

  const filteredFonts = useMemo(() => {
    const q = fontQuery.trim().toLowerCase()
    if (!q) return GOOGLE_FONT_FAMILIES.slice(0, LIST_LIMIT)
    const out: string[] = []
    for (const f of GOOGLE_FONT_FAMILIES) {
      if (f.toLowerCase().includes(q)) {
        out.push(f)
        if (out.length >= LIST_LIMIT) break
      }
    }
    return out
  }, [fontQuery])

  useLayoutEffect(() => {
    if (!fontOpen) return
    if (!fontTriggerWrapRef.current) return

    function syncPlacement() {
      const w = fontTriggerWrapRef.current
      const m = fontMenuRef.current
      if (!w) return
      const gap = 4
      const pad = 8
      const searchReserve = 56
      const r = w.getBoundingClientRect()
      const below = window.innerHeight - r.bottom - gap - pad
      const above = r.top - gap - pad
      const menuH = m?.getBoundingClientRect().height ?? FONT_MENU_ESTIMATE_PX
      let openUp: boolean
      if (above >= menuH) openUp = true
      else if (below >= menuH) openUp = false
      else openUp = above > below
      setFontMenuOpenUpward(openUp)
      const avail = openUp ? above : below
      const listCap = Math.max(96, avail - searchReserve - gap)
      setFontListMaxHeightPx(Math.min(224, listCap))
    }

    syncPlacement()
    window.addEventListener('resize', syncPlacement)
    window.addEventListener('scroll', syncPlacement, true)
    return () => {
      window.removeEventListener('resize', syncPlacement)
      window.removeEventListener('scroll', syncPlacement, true)
    }
  }, [fontOpen, fontQuery, filteredFonts.length])

  return (
    <FloatingToolbarShell ref={rootRef} role="toolbar" aria-label="Text formatting">
      <div ref={fontTriggerWrapRef} className="relative flex shrink-0 items-center py-1 pl-2">
        <button
          type="button"
          className="flex h-8 max-w-[9.5rem] items-center gap-1 truncate rounded-lg px-2 text-left text-xs font-medium text-neutral-800 outline-none hover:bg-black/[0.06] sm:max-w-[11rem]"
          onClick={() => setFontOpen(o => !o)}
          aria-expanded={fontOpen}
          aria-haspopup="listbox"
        >
          <span className="truncate">{values.fontFamily}</span>
        </button>
        {fontOpen ? (
          <div
            ref={fontMenuRef}
            className={[
              'absolute left-0 w-[min(calc(100vw-2rem),280px)]',
              floatingToolbarPopoverClass,
              fontMenuOpenUpward ? 'bottom-full mb-1' : 'top-full mt-1',
            ].join(' ')}
          >
            <div className="border-b border-black/[0.06] p-2">
              <input
                type="search"
                value={fontQuery}
                onChange={e => setFontQuery(e.target.value)}
                placeholder="Search fonts…"
                className="w-full rounded-lg border border-black/10 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-900 outline-none ring-0 placeholder:text-neutral-400 focus:border-black/20"
                autoFocus
              />
            </div>
            <ul
              className="overflow-y-auto py-1"
              style={{ maxHeight: fontListMaxHeightPx }}
              role="listbox"
              aria-label="Google Fonts"
            >
              {filteredFonts.map(name => (
                <li key={name} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={name === values.fontFamily}
                    className="flex w-full items-center px-3 py-1.5 text-left text-sm text-neutral-900 hover:bg-black/[0.05]"
                    style={{ fontFamily: `"${name}", sans-serif` }}
                    onMouseEnter={() => loadGoogleFontFamily(name)}
                    onClick={() => {
                      loadGoogleFontFamily(name)
                      onChange({ fontFamily: name })
                      setFontOpen(false)
                      setFontQuery('')
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
            {filteredFonts.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-neutral-500">No matches</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <FloatingToolbarDivider />

      <div className="flex min-h-8 min-w-0 flex-nowrap items-center gap-1 py-1 pr-2">
        <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1 overflow-x-auto [scrollbar-width:thin]">
          <FontSizeScrubber
            value={values.fontSize}
            min={8}
            max={800}
            onChange={fontSize => onChange({ fontSize })}
          />
        </div>

        <div className="mx-0.5 h-5 w-px shrink-0 bg-black/10" aria-hidden />

        <PaintPopoverControl
          compact
          value={values.fillStyle}
          onChange={fillStyle => onChange({ fillStyle })}
          title="Text color and gradient"
          ariaLabel="Text color and gradient"
        />

        <div className="mx-0.5 h-5 w-px shrink-0 bg-black/10" aria-hidden />

        <div className="flex min-h-8 min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto [scrollbar-width:thin]">
          <button
            type="button"
            className={floatingToolbarIconButton(values.textAlign === 'left')}
            title="Align left"
            aria-label="Align left"
            onClick={() => onChange({ textAlign: 'left' })}
          >
            <HugeiconsIcon icon={TextAlignLeftIcon} size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={floatingToolbarIconButton(values.textAlign === 'center')}
            title="Align center"
            aria-label="Align center"
            onClick={() => onChange({ textAlign: 'center' })}
          >
            <HugeiconsIcon icon={TextAlignCenterIcon} size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={floatingToolbarIconButton(values.textAlign === 'right')}
            title="Align right"
            aria-label="Align right"
            onClick={() => onChange({ textAlign: 'right' })}
          >
            <HugeiconsIcon icon={TextAlignRightIcon} size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={floatingToolbarIconButton(values.textAlign === 'justify')}
            title="Justify"
            aria-label="Justify"
            onClick={() => onChange({ textAlign: 'justify' })}
          >
            <HugeiconsIcon icon={TextAlignJustifyCenterIcon} size={18} strokeWidth={1.75} />
          </button>

          <div className="mx-0.5 h-5 w-px shrink-0 bg-black/10" aria-hidden />

          <button
            type="button"
            className={floatingToolbarIconButton(values.bold)}
            title="Bold"
            aria-label="Bold"
            onClick={() => onChange({ bold: !values.bold })}
          >
            <HugeiconsIcon icon={TextBoldIcon} size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={floatingToolbarIconButton(values.italic)}
            title="Italic"
            aria-label="Italic"
            onClick={() => onChange({ italic: !values.italic })}
          >
            <HugeiconsIcon icon={TextItalicIcon} size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={floatingToolbarIconButton(values.underline)}
            title="Underline"
            aria-label="Underline"
            onClick={() => onChange({ underline: !values.underline })}
          >
            <HugeiconsIcon icon={TextUnderlineIcon} size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      {footerSlot ? (
        <>
          <FloatingToolbarDivider />
          <div className="flex shrink-0 items-center py-1 pr-2">{footerSlot}</div>
        </>
      ) : null}
    </FloatingToolbarShell>
  )
}
