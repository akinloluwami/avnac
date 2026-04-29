import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowLeft01Icon,
  Copy01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
} from '@hugeicons/core-free-icons'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import {
  createEmptyAvnacPage,
  cloneAvnacPage,
  type AvnacDocument,
  type AvnacPage,
} from '../../lib/avnac-document'

type Props = {
  doc: AvnacDocument
  activePageId: string
  ready: boolean
  onSelectPage: (id: string) => void
  onSetDoc: (updater: (prev: AvnacDocument) => AvnacDocument) => void
  onClearSelection: () => void
}

type ContextMenu = { pageId: string; x: number; y: number } | null

function getDefaultSize(doc: AvnacDocument) {
  const first = doc.pages[0]
  return { width: first.artboard.width, height: first.artboard.height }
}

function PageThumb({
  page,
  index,
  isActive,
  isRenaming,
  isDragOver,
  onSelect,
  onContextMenu,
  onRenameCommit,
  onRenameStart,
  onDragHandlePointerDown,
}: {
  page: AvnacPage
  index: number
  isActive: boolean
  isRenaming: boolean
  isDragOver: boolean
  onSelect: () => void
  onContextMenu: (x: number, y: number) => void
  onRenameCommit: (name: string) => void
  onRenameStart: () => void
  onDragHandlePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(page.name)

  useEffect(() => {
    setDraft(page.name)
  }, [page.name])

  const commit = useCallback(() => {
    onRenameCommit(draft.trim() || page.name)
  }, [draft, onRenameCommit, page.name])

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commit()
      if (e.key === 'Escape') onRenameCommit(page.name)
    },
    [commit, onRenameCommit, page.name],
  )

  return (
    <div
      className={`group relative flex flex-col items-center gap-1 transition-transform ${isDragOver ? 'translate-x-1.5' : ''}`}
      data-page-id={page.id}
    >
      {/* Drag handle */}
      <div
        onPointerDown={onDragHandlePointerDown}
        className="absolute -left-1.5 top-1 hidden cursor-grab touch-none select-none group-hover:flex"
        title="Drag to reorder"
      >
        <HugeiconsIcon icon={DragDropVerticalIcon} size={12} strokeWidth={1.75} className="text-neutral-300" />
      </div>

      {/* Thumbnail */}
      <button
        type="button"
        onClick={onSelect}
        onContextMenu={(e) => {
          e.preventDefault()
          onContextMenu(e.clientX, e.clientY)
        }}
        aria-label={`Select ${page.name}`}
        aria-pressed={isActive}
        className={`relative flex h-14 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-md border-2 bg-neutral-50 transition-all ${
          isActive
            ? 'border-neutral-400 shadow-[0_0_0_3px_rgba(0,0,0,0.07)]'
            : 'border-black/[0.07] hover:border-black/20'
        }`}
      >
        <span className="select-none text-[10px] font-semibold text-neutral-300">{index + 1}</span>
      </button>

      {/* Name */}
      {isRenaming ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          className="w-[4.5rem] rounded border border-neutral-400 bg-white px-1 text-center text-[10px] text-neutral-700 outline-none ring-2 ring-neutral-200"
          maxLength={40}
        />
      ) : (
        <button
          type="button"
          onDoubleClick={onRenameStart}
          className="max-w-[4.5rem] truncate text-[10px] text-neutral-400 hover:text-neutral-600"
          title="Double-click to rename"
        >
          {page.name}
        </button>
      )}
    </div>
  )
}

export function EditorPagesPanel({
  doc,
  activePageId,
  ready,
  onSelectPage,
  onSetDoc,
  onClearSelection,
}: Props) {
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; overId: string | null } | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const hasMultiplePages = doc.pages.length > 1

  // Track scroll state to show/hide arrows and fade
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      ro.disconnect()
    }
  }, [updateScrollState, doc.pages.length])

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' })
  }, [])

  const addPage = useCallback(() => {
    const { width, height } = getDefaultSize(doc)
    const newPage = createEmptyAvnacPage(width, height, `Page ${doc.pages.length + 1}`)
    onSetDoc((prev) => ({ ...prev, pages: [...prev.pages, newPage] }))
    onSelectPage(newPage.id)
    onClearSelection()
    // Scroll to end after adding
    setTimeout(() => {
      const el = scrollRef.current
      if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
    }, 50)
  }, [doc, onClearSelection, onSelectPage, onSetDoc])

  const duplicatePage = useCallback(
    (pageId: string) => {
      const src = doc.pages.find((p) => p.id === pageId)
      if (!src) return
      const cloned: AvnacPage = { ...cloneAvnacPage(src), id: crypto.randomUUID(), name: `${src.name} copy` }
      const idx = doc.pages.findIndex((p) => p.id === pageId)
      onSetDoc((prev) => {
        const next = [...prev.pages]
        next.splice(idx + 1, 0, cloned)
        return { ...prev, pages: next }
      })
      onSelectPage(cloned.id)
      onClearSelection()
    },
    [doc.pages, onClearSelection, onSelectPage, onSetDoc],
  )

  const deletePage = useCallback(
    (pageId: string) => {
      if (doc.pages.length <= 1) return
      const idx = doc.pages.findIndex((p) => p.id === pageId)
      if (pageId === activePageId) {
        const neighbour = doc.pages[idx + 1] ?? doc.pages[idx - 1]
        if (neighbour) onSelectPage(neighbour.id)
      }
      onSetDoc((prev) => ({ ...prev, pages: prev.pages.filter((p) => p.id !== pageId) }))
      onClearSelection()
    },
    [activePageId, doc.pages, onClearSelection, onSelectPage, onSetDoc],
  )

  const renamePage = useCallback(
    (pageId: string, name: string) => {
      onSetDoc((prev) => ({
        ...prev,
        pages: prev.pages.map((p) => (p.id === pageId ? { ...p, name: name.trim() || p.name } : p)),
      }))
      setRenamingId(null)
    },
    [onSetDoc],
  )

  const onDragHandlePointerDown = useCallback(
    (pageId: string) => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging({ id: pageId, overId: null })

      const onMove = (ev: PointerEvent) => {
        const panel = panelRef.current
        if (!panel) return
        const thumbs = panel.querySelectorAll<HTMLElement>('[data-page-id]')
        let closest: string | null = null
        let minDist = Infinity
        thumbs.forEach((el) => {
          const rect = el.getBoundingClientRect()
          const cx = rect.left + rect.width / 2
          const dist = Math.abs(ev.clientX - cx)
          if (dist < minDist) { minDist = dist; closest = el.dataset.pageId ?? null }
        })
        setDragging((prev) => prev ? { ...prev, overId: closest } : null)
      }

      const onUp = () => {
        setDragging((prev) => {
          if (prev?.overId && prev.overId !== prev.id) {
            onSetDoc((d) => {
              const pages = [...d.pages]
              const from = pages.findIndex((p) => p.id === prev.id)
              const to = pages.findIndex((p) => p.id === prev.overId)
              if (from < 0 || to < 0) return d
              const [moved] = pages.splice(from, 1)
              pages.splice(to, 0, moved)
              return { ...d, pages }
            })
          }
          return null
        })
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [onSetDoc],
  )

  if (!ready) return null

  return (
    <>
      {/* Context menu backdrop */}
      {contextMenu ? (
        <div className="fixed inset-0 z-40" onPointerDown={() => setContextMenu(null)} />
      ) : null}

      {/* Context menu */}
      {contextMenu ? (
        <div
          className="fixed z-50 min-w-[148px] overflow-hidden rounded-lg border border-black/[0.08] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          style={{ left: contextMenu.x, top: contextMenu.y - 8, transform: 'translateY(-100%)' }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-black/[0.04]"
            onClick={() => { duplicatePage(contextMenu.pageId); setContextMenu(null) }}
          >
            <HugeiconsIcon icon={Copy01Icon} size={14} strokeWidth={1.75} />
            Duplicate page
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-black/[0.04]"
            onClick={() => { setRenamingId(contextMenu.pageId); setContextMenu(null) }}
          >
            <span className="w-[14px]" />
            Rename page
          </button>
          {doc.pages.length > 1 ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-black/[0.04]"
              onClick={() => { deletePage(contextMenu.pageId); setContextMenu(null) }}
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.75} />
              Delete page
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Bottom-left pages strip */}
      <div className="pointer-events-none absolute bottom-[3.5rem] left-4 z-20 flex items-end gap-1.5">

        {/* Left scroll arrow — only shows when multiple pages AND can scroll left */}
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Scroll pages left"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-black/[0.08] bg-white/90 text-neutral-400 shadow-[0_2px_8px_rgba(0,0,0,0.07)] backdrop-blur-xl transition-all hover:text-neutral-700 ${
              hasMultiplePages && canScrollLeft
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'
            }`}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* Scrollable container with fade edges */}
        <div className="pointer-events-auto relative">
          {/* Left fade */}
          <div
            className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 rounded-l-xl transition-opacity"
            style={{
              background: 'linear-gradient(to right, rgba(255,255,255,0.95), transparent)',
              opacity: canScrollLeft ? 1 : 0,
            }}
          />
          {/* Right fade */}
          <div
            className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 rounded-r-xl transition-opacity"
            style={{
              background: 'linear-gradient(to left, rgba(255,255,255,0.95), transparent)',
              opacity: canScrollRight ? 1 : 0,
            }}
          />

          {/* The actual scrollable list */}
          <div
            ref={scrollRef}
            className="flex max-w-[min(60vw,480px)] items-end gap-2 overflow-x-auto rounded-xl border border-black/[0.08] bg-white/90 px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.07)] backdrop-blur-xl"
            style={{ scrollbarWidth: 'none' }}
          >
            <div ref={panelRef} className="flex items-end gap-2">
              {doc.pages.map((page, index) => (
                <PageThumb
                  key={page.id}
                  page={page}
                  index={index}
                  isActive={page.id === activePageId}
                  isRenaming={renamingId === page.id}
                  isDragOver={dragging?.overId === page.id && dragging.id !== page.id}
                  onSelect={() => { onSelectPage(page.id); onClearSelection() }}
                  onContextMenu={(x, y) => setContextMenu({ pageId: page.id, x, y })}
                  onRenameCommit={(name) => renamePage(page.id, name)}
                  onRenameStart={() => setRenamingId(page.id)}
                  onDragHandlePointerDown={onDragHandlePointerDown(page.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Add button — always visible, outside the scroll container, perfect square */}
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={addPage}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-black/[0.08] bg-white/90 text-neutral-400 shadow-[0_2px_8px_rgba(0,0,0,0.07)] backdrop-blur-xl transition-all hover:text-neutral-700"
            aria-label="Add page"
            title="Add page"
          >
            <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={1.75} />
          </button>
        </div>

      </div>
    </>
  )
}
