import { Add01Icon, Cancel01Icon, Delete02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AVNAC_VECTOR_BOARD_DRAG_MIME,
  emptyVectorBoardDocument,
  type VectorBoardDocument,
  vectorDocHasRenderableStrokes,
} from '../lib/avnac-vector-board-document'
import type { AvnacVectorBoardMeta } from '../lib/avnac-vector-boards-storage'
import {
  editorSidebarPanelLeftClass,
  editorSidebarPanelTopClass,
} from '../lib/editor-sidebar-panel-layout'
import VectorBoardListPreview from './vector-board-list-preview'

type Props = {
  open: boolean
  onClose: () => void
  boards: AvnacVectorBoardMeta[]
  boardDocs: Record<string, VectorBoardDocument>
  onCreateNew: () => void
  onOpenBoard: (id: string) => void
  onDeleteBoard: (id: string) => void
}

export default function EditorVectorBoardPanel({
  open,
  onClose,
  boards,
  boardDocs,
  onCreateNew,
  onOpenBoard,
  onDeleteBoard,
}: Props) {
  if (!open) return null

  return (
    <div
      data-avnac-chrome
      className={[
        'pointer-events-auto fixed z-40 flex w-[min(100vw-1.5rem,300px)] flex-col overflow-hidden rounded-3xl border border-black/[0.08] bg-white/95 backdrop-blur-md',
        editorSidebarPanelLeftClass,
        editorSidebarPanelTopClass,
      ].join(' ')}
      role="dialog"
      aria-label="Vector boards"
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2">
        <span className="text-sm font-semibold text-neutral-800">Vector boards</span>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-black/[0.06]"
          onClick={onClose}
          aria-label="Close vector boards"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex max-h-[min(50vh,360px)] flex-col gap-2 overflow-auto p-2">
        {boards.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-neutral-500">No vector boards yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {boards.map(b => {
              const doc = boardDocs[b.id] ?? emptyVectorBoardDocument()
              const hasContent = vectorDocHasRenderableStrokes(doc)
              return (
                <li key={b.id}>
                  <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-neutral-50/80 p-2">
                    <div
                      draggable={hasContent}
                      onDragStart={e => {
                        if (!hasContent) {
                          e.preventDefault()
                          return
                        }
                        e.dataTransfer.setData(AVNAC_VECTOR_BOARD_DRAG_MIME, b.id)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      className={[
                        'shrink-0 overflow-hidden rounded-lg border border-black/10 bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]',
                        hasContent
                          ? 'cursor-grab active:cursor-grabbing'
                          : 'cursor-not-allowed opacity-50',
                      ].join(' ')}
                      title={
                        hasContent
                          ? 'Drag onto the canvas to place'
                          : 'Draw something to drag to the canvas'
                      }
                    >
                      <VectorBoardListPreview doc={doc} size={56} />
                    </div>
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-800 transition-colors hover:bg-white/80"
                      onClick={() => onOpenBoard(b.id)}
                    >
                      <span className="block truncate font-medium">{b.name}</span>
                      <span className="mt-0.5 block text-[11px] text-neutral-500">
                        {hasContent ? 'Click to edit · drag preview to place' : 'Click to edit'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Delete vector board"
                      aria-label={`Delete ${b.name}`}
                      onClick={e => {
                        e.stopPropagation()
                        onDeleteBoard(b.id)
                      }}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.75} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="border-t border-black/[0.06] p-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          onClick={onCreateNew}
        >
          <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.75} />
          New vector board
        </button>
      </div>
    </div>
  )
}
