import { StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useNavigate } from '@tanstack/react-router'
import { usePostHog } from 'posthog-js/react'
import { useEffect, useId, useRef, useState } from 'react'
import { ARTBOARD_PRESETS, type ArtboardPresetCategory } from '../data/artboard-presets'
import { useEditorUnsupportedOnThisDevice } from '../hooks/use-editor-device-support'

const CANVAS_MIN = 100
const CANVAS_MAX = 16000
const PRESET_CATEGORY_ORDER: ArtboardPresetCategory[] = [
  'general',
  'social-media',
  'presentation',
  'print',
]
const PRESET_CATEGORY_LABELS: Record<ArtboardPresetCategory, string> = {
  general: 'General',
  'social-media': 'Social media',
  presentation: 'Presentation',
  print: 'Print',
}
const PRESET_CATEGORY_ACCENTS: Record<
  ArtboardPresetCategory,
  {
    dot: string
    previewShell: string
    previewFrame: string
  }
> = {
  general: {
    dot: 'bg-[#8d99ae]',
    previewShell:
      'border-[#cfd6df] bg-[linear-gradient(135deg,rgba(241,244,247,0.95),rgba(228,233,239,0.85))]',
    previewFrame:
      'border-[#aeb8c5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,244,248,0.98))]',
  },
  'social-media': {
    dot: 'bg-[#df8b57]',
    previewShell:
      'border-[#efc9ae] bg-[linear-gradient(135deg,rgba(255,244,235,0.98),rgba(255,231,214,0.9))]',
    previewFrame:
      'border-[#d8a886] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,244,237,0.98))]',
  },
  presentation: {
    dot: 'bg-[#5f8fd6]',
    previewShell:
      'border-[#c4d7f5] bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(224,236,255,0.92))]',
    previewFrame:
      'border-[#9ebce8] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.98))]',
  },
  print: {
    dot: 'bg-[#6a9b72]',
    previewShell:
      'border-[#c9dccd] bg-[linear-gradient(135deg,rgba(241,249,242,0.98),rgba(228,241,231,0.92))]',
    previewFrame:
      'border-[#a6c3ac] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,249,242,0.98))]',
  },
}
const GROUPED_ARTBOARD_PRESETS = PRESET_CATEGORY_ORDER.map(category => ({
  category,
  label: PRESET_CATEGORY_LABELS[category],
  presets: ARTBOARD_PRESETS.filter(preset => preset.category === category),
})).filter(group => group.presets.length > 0)
const GROUPED_ARTBOARD_PRESET_COLUMNS = (() => {
  const columns: {
    groups: typeof GROUPED_ARTBOARD_PRESETS
    weight: number
  }[] = [
    { groups: [], weight: 0 },
    { groups: [], weight: 0 },
  ]

  for (const group of GROUPED_ARTBOARD_PRESETS) {
    const target = columns[0].weight <= columns[1].weight ? columns[0] : columns[1]
    target.groups.push(group)
    target.weight += Math.max(1, group.presets.length)
  }

  return columns.map(column => column.groups)
})()

function getPresetPreviewStyle(width: number, height: number) {
  const maxPreviewSide = 34
  const scale = Math.min(maxPreviewSide / width, maxPreviewSide / height)
  return {
    width: `${Math.max(16, Math.round(width * scale))}px`,
    height: `${Math.max(16, Math.round(height * scale))}px`,
  }
}

type NewCanvasDialogProps = {
  open: boolean
  onClose: () => void
}

export default function NewCanvasDialog({ open, onClose }: NewCanvasDialogProps) {
  const navigate = useNavigate()
  const posthog = usePostHog()
  const editorUnsupported = useEditorUnsupportedOnThisDevice()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'presets' | 'custom'>('presets')
  const [customW, setCustomW] = useState('1920')
  const [customH, setCustomH] = useState('1080')
  const [customError, setCustomError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMode('presets')
    setCustomError(null)
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button')?.focus()
    }, 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const goCreate = (w: number, h: number, presetLabel?: string) => {
    const W = Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.round(w)))
    const H = Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.round(h)))
    posthog.capture('canvas_created', {
      width: W,
      height: H,
      creation_mode: presetLabel ? 'preset' : 'custom',
      preset_label: presetLabel ?? null,
    })
    void navigate({ to: '/create', search: { w: W, h: H } })
    onClose()
  }

  const submitCustom = () => {
    const w = Number.parseInt(customW.replace(/\s/g, ''), 10)
    const h = Number.parseInt(customH.replace(/\s/g, ''), 10)
    if (!Number.isFinite(w) || !Number.isFinite(h)) {
      setCustomError('Enter width and height as numbers.')
      return
    }
    if (w < CANVAS_MIN || h < CANVAS_MIN) {
      setCustomError(`Minimum size is ${CANVAS_MIN}×${CANVAS_MIN}px.`)
      return
    }
    if (w > CANVAS_MAX || h > CANVAS_MAX) {
      setCustomError(`Maximum size is ${CANVAS_MAX}×${CANVAS_MAX}px.`)
      return
    }
    setCustomError(null)
    goCreate(w, h)
  }

  const renderPresetGroup = (group: (typeof GROUPED_ARTBOARD_PRESETS)[number]) => (
    <section
      key={group.category}
      aria-label={group.label}
      className="rounded-[1.4rem] border border-black/[0.08] bg-black/[0.02] p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={[
              'h-2.5 w-2.5 shrink-0 rounded-full',
              PRESET_CATEGORY_ACCENTS[group.category].dot,
            ].join(' ')}
            aria-hidden
          />
          <h3 className="m-0 text-sm font-semibold text-[var(--text)]">{group.label}</h3>
        </div>
        <div className="shrink-0 text-[12px] font-medium text-[var(--text-muted)]">
          {group.presets.length} {group.presets.length === 1 ? 'size' : 'sizes'}
        </div>
      </div>
      <ul className="m-0 list-none space-y-2 p-0">
        {group.presets.map(preset => (
          <li key={preset.id}>
            <button
              type="button"
              className="group flex w-full items-center gap-3 rounded-[1rem] border border-transparent bg-[var(--surface)] px-3 py-3 text-left transition-colors hover:border-black/[0.08] hover:bg-black/[0.03]"
              onClick={() => goCreate(preset.width, preset.height, preset.label)}
            >
              <div
                className={[
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-md border',
                  PRESET_CATEGORY_ACCENTS[group.category].previewShell,
                ].join(' ')}
              >
                <div
                  className={[
                    'rounded-[0.2rem] border transition-transform duration-200 group-hover:scale-[1.03]',
                    PRESET_CATEGORY_ACCENTS[group.category].previewFrame,
                  ].join(' ')}
                  style={getPresetPreviewStyle(preset.width, preset.height)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium leading-snug text-[var(--text)]">
                  {preset.label}
                </span>
                <span className="mt-0.5 block tabular-nums text-[12px] text-[var(--text-muted)]">
                  {preset.width} × {preset.height}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'relative z-[1] w-full overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--surface)]/95 p-6 backdrop-blur-md sm:p-8',
          editorUnsupported ? 'max-w-lg' : mode === 'presets' ? 'max-w-4xl' : 'max-w-xl',
        ].join(' ')}
        onMouseDown={e => e.stopPropagation()}
      >
        <h2
          id={titleId}
          className="display-title m-0 text-2xl font-medium tracking-[-0.02em] text-[var(--text)] sm:text-[1.8rem]"
        >
          {editorUnsupported ? 'Desktop only' : 'New canvas'}
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--text-muted)]">
          {editorUnsupported
            ? "Avnac's editor is not available on mobile devices yet. Open this app on a desktop or laptop to create a new canvas."
            : 'Pick a preset or set a custom artboard size.'}
        </p>

        {editorUnsupported ? (
          <div className="mt-6">
            <a
              href="https://github.com/akinloluwami/avnac"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[#f6c56a]/60 bg-[linear-gradient(135deg,#fff7d6_0%,#ffe8a3_48%,#ffd36f_100%)] px-6 py-3 text-[15px] font-semibold text-[#3f2a00] no-underline shadow-[0_12px_30px_rgba(245,179,54,0.22),inset_0_1px_0_rgba(255,255,255,0.72)] transition-transform duration-200 hover:-translate-y-0.5 hover:text-[#2f1f00]"
            >
              <HugeiconsIcon icon={StarIcon} size={18} strokeWidth={1.9} className="shrink-0" />
              <span>Star us on GitHub</span>
            </a>
          </div>
        ) : (
          <>
            <div className="mt-6 flex gap-2 rounded-full border border-black/[0.08] bg-black/[0.03] p-1">
              <button
                type="button"
                className={[
                  'min-h-11 flex-1 rounded-full px-4 text-sm font-medium transition-colors',
                  mode === 'presets'
                    ? 'bg-[var(--surface)] text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                ].join(' ')}
                onClick={() => setMode('presets')}
              >
                Presets
              </button>
              <button
                type="button"
                className={[
                  'min-h-11 flex-1 rounded-full px-4 text-sm font-medium transition-colors',
                  mode === 'custom'
                    ? 'bg-[var(--surface)] text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]',
                ].join(' ')}
                onClick={() => setMode('custom')}
              >
                Customize
              </button>
            </div>

            {mode === 'presets' ? (
              <div className="mt-6 max-h-[min(56vh,31rem)] overflow-y-auto overscroll-contain pr-1">
                <div className="mb-4 flex items-center justify-between gap-3 px-1">
                  <p className="m-0 text-sm text-[var(--text-muted)]">
                    Pick a format to start with.
                  </p>
                  <div className="inline-flex rounded-full border border-black/[0.08] bg-black/[0.03] px-3 py-1 text-[12px] font-medium text-[var(--text-muted)]">
                    {ARTBOARD_PRESETS.length} curated presets
                  </div>
                </div>
                <div className="space-y-4 lg:hidden">
                  {GROUPED_ARTBOARD_PRESETS.map(renderPresetGroup)}
                </div>
                <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
                  {GROUPED_ARTBOARD_PRESET_COLUMNS.map((column, index) => (
                    <div key={index} className="space-y-4">
                      {column.map(renderPresetGroup)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-[1.4rem] border border-black/[0.08] bg-black/[0.02] p-4">
                  <p className="m-0 text-sm font-medium text-[var(--text)]">Set exact dimensions</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                    Use a custom artboard when you already know the width and height you need.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-[1.4rem] border border-black/[0.08] bg-black/[0.02] p-4">
                  <div>
                    <label
                      htmlFor="avnac-new-canvas-w"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-subtle)]"
                    >
                      Width
                    </label>
                    <input
                      id="avnac-new-canvas-w"
                      type="text"
                      inputMode="numeric"
                      value={customW}
                      onChange={e => setCustomW(e.target.value)}
                      className="w-full rounded-xl border border-black/[0.12] bg-[var(--surface)] px-3 py-2.5 text-[15px] text-[var(--text)] outline-none transition-colors focus:border-black/[0.22]"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="avnac-new-canvas-h"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-subtle)]"
                    >
                      Height
                    </label>
                    <input
                      id="avnac-new-canvas-h"
                      type="text"
                      inputMode="numeric"
                      value={customH}
                      onChange={e => setCustomH(e.target.value)}
                      className="w-full rounded-xl border border-black/[0.12] bg-[var(--surface)] px-3 py-2.5 text-[15px] text-[var(--text)] outline-none transition-colors focus:border-black/[0.22]"
                      autoComplete="off"
                    />
                  </div>
                </div>
                {customError ? <p className="m-0 text-sm text-red-600">{customError}</p> : null}
                <button
                  type="button"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--text)] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#262626]"
                  onClick={() => submitCustom()}
                >
                  Create canvas
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex justify-end border-t border-black/[0.06] pt-5">
          <button
            type="button"
            className="min-h-10 rounded-full bg-black/[0.05] px-5 text-[15px] font-medium text-[var(--text)] transition-colors hover:bg-black/[0.08]"
            onClick={onClose}
          >
            {editorUnsupported ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
