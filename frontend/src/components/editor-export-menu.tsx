import { ArrowDown01Icon, FileExportIcon, Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { usePostHog } from 'posthog-js/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useViewportAwarePopoverPlacement } from '../hooks/use-viewport-aware-popover'
import EditorRangeSlider from './editor-range-slider'
import { floatingToolbarPopoverMenuClass } from './floating-toolbar-shell'

export type PngExportCrop = 'none' | 'selection' | 'content'

export type ExportImageFormat = 'png' | 'jpg' | 'webp' | 'pdf'

export type ExportImageOptions = {
  format: ExportImageFormat
  multiplier: number
  transparent: boolean
  flattenPdf?: boolean
  crop?: PngExportCrop
  pageIds?: string[]
}

export type ExportPageOption = {
  id: string
  name: string
  width: number
  height: number
  isCurrent?: boolean
  previewUrl?: string | null
}

const DEFAULT_EXPORT: ExportImageOptions = {
  format: 'png',
  multiplier: 1,
  transparent: false,
}

const PANEL_BASE_ESTIMATE_H = 360

const exportTriggerClass = [
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-black/[0.08] px-4 text-sm font-medium sm:h-10 sm:px-5',
  'bg-gradient-to-br from-[#fafaf9] via-[#f2f0f3] to-[#ebe7f3]',
  'text-[var(--text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
  'outline-none transition-[background,box-shadow,filter] duration-200',
  'hover:from-[#f5f4f2] hover:via-[#eceaf1] hover:to-[#e5e0f2] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
  'focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
  'disabled:pointer-events-none disabled:opacity-40',
].join(' ')

const formatMeta: Record<ExportImageFormat, { label: string; note: string }> = {
  png: {
    label: 'PNG',
    note: 'Sharp graphics with optional transparency',
  },
  jpg: {
    label: 'JPG',
    note: 'Smaller files for photos and quick sharing',
  },
  webp: {
    label: 'WebP',
    note: 'Modern compression with transparency support',
  },
  pdf: {
    label: 'PDF',
    note: 'One document with the pages you choose',
  },
}

type Props = {
  disabled?: boolean
  getPages?: () => ExportPageOption[] | Promise<ExportPageOption[]>
  onExport: (opts: ExportImageOptions) => void
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a))
  let y = Math.abs(Math.round(b))
  while (y !== 0) {
    const next = x % y
    x = y
    y = next
  }
  return Math.max(1, x)
}

function pageAspectRatioLabel(width: number, height: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  const divisor = gcd(width, height)
  const x = Math.max(1, Math.round(width / divisor))
  const y = Math.max(1, Math.round(height / divisor))
  return `${x}:${y}`
}

function pageSizeLabel(page: ExportPageOption): string {
  const ratio = pageAspectRatioLabel(page.width, page.height)
  const width = Math.round(page.width).toLocaleString('en-US')
  const height = Math.round(page.height).toLocaleString('en-US')
  return ratio ? `${ratio} • ${width} × ${height}px` : `${width} × ${height}px`
}

function formatPageRangeSummary(pages: ExportPageOption[], selectedPageIds: string[]): string {
  if (pages.length === 0) return ''
  const selected = new Set(selectedPageIds)
  const numbers = pages.flatMap((page, index) => (selected.has(page.id) ? [index + 1] : []))
  if (numbers.length === 0) return ''
  const chunks: string[] = []
  let start = numbers[0]
  let end = numbers[0]
  for (let index = 1; index < numbers.length; index += 1) {
    const current = numbers[index]
    if (current === end + 1) {
      end = current
      continue
    }
    chunks.push(start === end ? `${start}` : `${start}-${end}`)
    start = current
    end = current
  }
  chunks.push(start === end ? `${start}` : `${start}-${end}`)
  return chunks.join(', ')
}

function SelectionIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={[
        'inline-flex size-[1.125rem] shrink-0 items-center justify-center rounded-[0.35rem] border transition-colors',
        active
          ? 'border-[color:var(--accent)] bg-[color:var(--accent)] text-white shadow-[0_8px_18px_rgba(0,0,0,0.12)]'
          : 'border-black/[0.14] bg-white text-transparent',
      ].join(' ')}
      aria-hidden
    >
      {active ? <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2.5} /> : null}
    </span>
  )
}

function PagePreviewThumb({ page }: { page: ExportPageOption }) {
  if (page.previewUrl) {
    return (
      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[0.7rem] border border-black/[0.08] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
        <img
          src={page.previewUrl}
          alt=""
          className="h-full w-full object-cover"
          aria-hidden
          draggable={false}
        />
      </div>
    )
  }

  const box = 24
  const maxEdge = Math.max(page.width, page.height, 1)
  const scale = box / maxEdge
  const width = Math.max(14, Math.round(page.width * scale))
  const height = Math.max(14, Math.round(page.height * scale))

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-[0.7rem] border border-black/[0.06] bg-[linear-gradient(180deg,rgba(247,245,250,0.95),rgba(238,235,243,0.92))]">
      <div
        className="relative overflow-hidden rounded-[0.45rem] border border-black/[0.08] bg-white shadow-[0_6px_14px_rgba(0,0,0,0.1)]"
        style={{ width, height }}
        aria-hidden
      >
        <div className="absolute left-[14%] right-[14%] top-[14%] h-[14%] rounded-full bg-black/[0.08]" />
        <div className="absolute left-[12%] right-[12%] top-[36%] h-[16%] rounded-full bg-black/[0.05]" />
        <div className="absolute inset-x-[12%] bottom-[14%] top-[58%] rounded-[0.35rem] bg-[linear-gradient(180deg,rgba(217,224,235,0.95),rgba(202,211,223,0.72))]" />
      </div>
    </div>
  )
}

export default function EditorExportMenu({ disabled, getPages, onExport }: Props) {
  const [open, setOpen] = useState(false)
  const [formatOpen, setFormatOpen] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const [opts, setOpts] = useState<ExportImageOptions>(DEFAULT_EXPORT)
  const [pages, setPages] = useState<ExportPageOption[]>([])
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const posthog = usePostHog()
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pickPanel = useCallback(() => panelRef.current, [])

  const { openUpward, shiftX } = useViewportAwarePopoverPlacement(
    open,
    rootRef,
    PANEL_BASE_ESTIMATE_H,
    pickPanel,
    'center',
  )

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
      setFormatOpen(false)
      setPagesOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) return
    setFormatOpen(false)
    setPagesOpen(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPagesLoading(true)
    void Promise.resolve(getPages?.() ?? [])
      .then(nextPages => {
        if (cancelled) return
        setPages(nextPages)
        setPagesOpen(false)
        setSelectedPageIds(prev => {
          if (nextPages.length <= 1) return []
          const allowed = new Set(nextPages.map(page => page.id))
          const retained = prev.filter(id => allowed.has(id))
          return retained.length > 0 ? retained : nextPages.map(page => page.id)
        })
        setPagesLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setPages([])
        setPagesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [getPages, open])

  useEffect(() => {
    if (!formatOpen && !pagesOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (formatOpen) {
        setFormatOpen(false)
        return
      }
      setPagesOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [formatOpen, pagesOpen])

  const mult = Math.max(1, Math.min(3, Math.round(opts.multiplier)))
  const exportMult = opts.format === 'pdf' ? 1 : mult
  const transparentAllowed = opts.format !== 'jpg' && opts.format !== 'pdf'
  const hasMultiplePages = pages.length > 1
  const currentPage = pages.find(page => page.isCurrent) ?? pages[0] ?? null
  const allPageIds = pages.map(page => page.id)
  const allPagesSelected = hasMultiplePages && selectedPageIds.length === pages.length
  const onlyCurrentPageSelected =
    !!currentPage && selectedPageIds.length === 1 && selectedPageIds[0] === currentPage.id
  const selectedPageCount = hasMultiplePages ? selectedPageIds.length : 1
  const pageRangeSummary = formatPageRangeSummary(pages, selectedPageIds)
  const pageSelectionNote = allPagesSelected
    ? `All ${pages.length} pages selected`
    : onlyCurrentPageSelected && currentPage
      ? 'Current page only'
      : `${selectedPageCount} pages selected`

  const chooseFormat = (format: ExportImageFormat) => {
    setOpts(p => ({
      ...p,
      format,
      transparent: format === 'jpg' || format === 'pdf' ? false : p.transparent,
    }))
    setPagesOpen(false)
    setFormatOpen(false)
  }

  const selectAllPages = () => {
    setSelectedPageIds(allPageIds)
  }

  const selectCurrentPage = () => {
    if (!currentPage) return
    setSelectedPageIds([currentPage.id])
  }

  const togglePage = (pageId: string) => {
    setSelectedPageIds(prev => {
      if (prev.includes(pageId)) {
        if (prev.length <= 1) return prev
        return prev.filter(id => id !== pageId)
      }
      return [...prev, pageId]
    })
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        className={exportTriggerClass}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Export"
        onClick={() => setOpen(o => !o)}
      >
        <HugeiconsIcon
          icon={FileExportIcon}
          size={18}
          strokeWidth={1.75}
          className="shrink-0 text-neutral-800"
        />
        <span className="text-[var(--text)]">Export</span>
      </button>
      {open ? (
        <div
          ref={panelRef}
          data-avnac-chrome
          className={[
            'absolute left-1/2 z-[100] min-w-[23rem]',
            openUpward ? 'bottom-full mb-2' : 'top-full mt-2',
            floatingToolbarPopoverMenuClass,
          ].join(' ')}
          style={{
            transform: `translateX(calc(-50% + ${shiftX}px))`,
          }}
          role="dialog"
          aria-label="Export"
        >
          <div className="border-b border-black/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,242,247,0.96))] px-4 py-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Download
            </div>
            <div className="mt-1 text-[15px] font-semibold text-neutral-900">
              Export your design
            </div>
          </div>

          <div className="space-y-3.5 p-3.5">
            {hasMultiplePages ? (
              <div className="rounded-2xl border border-black/[0.06] bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Pages
                </div>
                <div className="relative">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={pagesOpen}
                    className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-black/[0.08] bg-black/[0.02] px-3 text-left outline-none transition-[border-color,background-color,box-shadow] hover:bg-black/[0.035] focus-visible:border-neutral-900/20 focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                    onClick={() => {
                      setFormatOpen(false)
                      setPagesOpen(value => !value)
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-neutral-900">
                        {pageRangeSummary || 'All pages'}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] leading-relaxed text-neutral-500">
                        {pageSelectionNote}
                      </span>
                    </span>
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={18}
                      strokeWidth={1.75}
                      className={[
                        'shrink-0 text-neutral-500 transition-transform duration-150',
                        pagesOpen ? 'rotate-180' : '',
                      ].join(' ')}
                    />
                  </button>

                  {pagesOpen ? (
                    <div className="absolute inset-x-0 top-full z-[120] mt-1.5 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                      <div className="space-y-1">
                        <button
                          type="button"
                          className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-black/[0.03]"
                          onClick={selectAllPages}
                        >
                          <SelectionIndicator active={allPagesSelected} />
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-semibold text-neutral-900">
                              All pages ({formatPageRangeSummary(pages, allPageIds)})
                            </span>
                            <span className="block text-[11px] leading-relaxed text-neutral-500">
                              Export the full document.
                            </span>
                          </span>
                        </button>
                        {currentPage ? (
                          <button
                            type="button"
                            className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-black/[0.03]"
                            onClick={selectCurrentPage}
                          >
                            <SelectionIndicator active={onlyCurrentPageSelected} />
                            <span className="min-w-0">
                              <span className="block text-[12.5px] font-semibold text-neutral-900">
                                Current page ({currentPage.name})
                              </span>
                              <span className="block text-[11px] leading-relaxed text-neutral-500">
                                Export only what you are editing.
                              </span>
                            </span>
                          </button>
                        ) : null}
                      </div>

                      <div className="my-1.5 border-t border-black/[0.06]" />

                      <div className="max-h-[15rem] space-y-1 overflow-y-auto px-0.5 pb-0.5">
                        {pagesLoading ? (
                          <div className="px-2.5 py-3 text-[11px] text-neutral-500">
                            Preparing page previews...
                          </div>
                        ) : (
                          pages.map((page, index) => {
                            const checked = selectedPageIds.includes(page.id)
                            return (
                              <label
                                key={page.id}
                                className={[
                                  'flex cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-[border-color,background-color,box-shadow]',
                                  checked
                                    ? 'border-black/[0.05] bg-black/[0.02]'
                                    : 'border-transparent bg-transparent hover:border-black/[0.05] hover:bg-black/[0.02]',
                                ].join(' ')}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePage(page.id)}
                                  className="sr-only"
                                />
                                <SelectionIndicator active={checked} />
                                <PagePreviewThumb page={page} />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12.5px] font-semibold text-neutral-900">
                                    {page.name}
                                  </span>
                                  <span className="mt-0.5 block truncate text-[11px] leading-relaxed text-neutral-500">
                                    {pageSizeLabel(page)}
                                  </span>
                                </span>
                                <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-neutral-600">
                                  {index + 1}
                                </span>
                              </label>
                            )
                          })
                        )}
                      </div>

                      <div className="mt-1.5 border-t border-black/[0.06] pt-1.5">
                        <button
                          type="button"
                          className="inline-flex h-9 w-full items-center justify-center rounded-xl bg-neutral-900 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-neutral-800"
                          onClick={() => setPagesOpen(false)}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 text-[11.5px] leading-relaxed text-neutral-500">
                  Pick which pages to include in this export.
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-black/[0.06] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Format
              </div>
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={formatOpen}
                  className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-black/[0.08] bg-black/[0.02] px-3 text-left outline-none transition-[border-color,background-color,box-shadow] hover:bg-black/[0.035] focus-visible:border-neutral-900/20 focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                  onClick={() => {
                    setPagesOpen(false)
                    setFormatOpen(value => !value)
                  }}
                >
                  <span className="text-[13px] font-semibold text-neutral-900">
                    {formatMeta[opts.format].label}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    size={18}
                    strokeWidth={1.75}
                    className={[
                      'shrink-0 text-neutral-500 transition-transform duration-150',
                      formatOpen ? 'rotate-180' : '',
                    ].join(' ')}
                  />
                </button>
                {formatOpen ? (
                  <div
                    role="listbox"
                    aria-label="Export format"
                    className="absolute inset-x-0 top-full z-[120] mt-1.5 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.16)]"
                  >
                    {(['png', 'jpg', 'webp', 'pdf'] as const).map(format => {
                      const active = opts.format === format
                      return (
                        <button
                          key={format}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={[
                            'mb-1.5 block w-full rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow]',
                            active
                              ? 'border-neutral-900/12 bg-black/[0.035] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                              : 'border-transparent bg-transparent hover:border-black/[0.06] hover:bg-black/[0.025]',
                          ].join(' ')}
                          onClick={() => chooseFormat(format)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-900">
                              {formatMeta[format].label}
                            </span>
                            {active ? (
                              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-[11.5px] leading-relaxed text-neutral-500">
                            {formatMeta[format].note}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
              <div className="mt-2 text-[11.5px] leading-relaxed text-neutral-500">
                {formatMeta[opts.format].note}
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-white p-3">
              {opts.format !== 'pdf' ? (
                <>
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Scale
                    </span>
                    <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] font-medium tabular-nums text-neutral-700">
                      {mult}x
                    </span>
                  </div>
                  <EditorRangeSlider
                    min={1}
                    max={3}
                    step={1}
                    value={mult}
                    onChange={n => setOpts(p => ({ ...p, multiplier: Math.round(n) }))}
                    aria-label="Image export scale"
                    aria-valuemin={1}
                    aria-valuemax={3}
                    aria-valuenow={mult}
                    trackClassName="w-full"
                  />
                </>
              ) : null}
              {transparentAllowed ? (
                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px] text-neutral-800">
                  <input
                    type="checkbox"
                    checked={opts.transparent}
                    onChange={e => setOpts(p => ({ ...p, transparent: e.target.checked }))}
                    className="size-4 shrink-0 rounded border border-black/20"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Transparent background
                </label>
              ) : null}
              {opts.format === 'pdf' ? (
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] text-neutral-800">
                  <input
                    type="checkbox"
                    checked={!!opts.flattenPdf}
                    onChange={e => setOpts(p => ({ ...p, flattenPdf: e.target.checked }))}
                    className="mt-0.5 size-4 shrink-0 rounded border border-black/20"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>
                    <span className="block font-medium">Flatten PDF</span>
                    <span className="block text-[11.5px] leading-relaxed text-neutral-500">
                      Export each page as one image.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-black/[0.02] px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-neutral-700">
                  {formatMeta[opts.format].label}
                  {hasMultiplePages && pageRangeSummary ? ` • Pages ${pageRangeSummary}` : ''}
                  {opts.format !== 'pdf' ? ` • ${mult}x` : ''}
                  {transparentAllowed && opts.transparent ? ' • Transparent' : ''}
                  {opts.format === 'pdf' && opts.flattenPdf ? ' • Flattened' : ''}
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-neutral-800"
                onClick={() => {
                  const finalOpts = {
                    ...opts,
                    multiplier: exportMult,
                    pageIds: hasMultiplePages ? selectedPageIds : undefined,
                    transparent: transparentAllowed ? opts.transparent : false,
                  }
                  posthog.capture('image_exported', {
                    format: finalOpts.format,
                    scale: finalOpts.multiplier,
                    transparent: finalOpts.transparent,
                    flattenPdf: finalOpts.flattenPdf,
                    pageCount: finalOpts.pageIds?.length ?? 1,
                  })
                  onExport(finalOpts)
                  setOpen(false)
                }}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
