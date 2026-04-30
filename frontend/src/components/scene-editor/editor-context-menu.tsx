import { HugeiconsIcon } from '@hugeicons/react'
import {
  Copy01Icon,
  Delete02Icon,
  FilePasteIcon,
  LayerAddIcon,
  Layers02Icon,
  SquareLock01Icon,
  SquareUnlock01Icon,
} from '@hugeicons/core-free-icons'

export type EditorContextMenuState = {
  x: number
  y: number
  sceneX: number
  sceneY: number
  hasSelection: boolean
  pageId: string | null
  showPageActions: boolean
  locked: boolean
}

const contextMenuButtonClass =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-neutral-800 outline-none hover:bg-black/[0.05] focus:bg-black/[0.05]'

export function EditorContextMenu({
  onAddPage,
  canDeletePage,
  contextMenu,
  onClose,
  onCopy,
  onDelete,
  onDeletePage,
  onDuplicate,
  onDuplicatePage,
  onPaste,
  onToggleLock,
}: {
  onAddPage: (afterPageId?: string) => void
  canDeletePage: boolean
  contextMenu: EditorContextMenuState | null
  onClose: () => void
  onCopy: () => void
  onDelete: () => void
  onDeletePage: (pageId?: string) => void
  onDuplicate: () => void
  onDuplicatePage: (sourcePageId?: string) => void
  onPaste: (point: { x: number; y: number }) => void
  onToggleLock: () => void
}) {
  if (!contextMenu) return null
  return (
    <div
      role="menu"
      className="fixed z-[90] min-w-48 overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_18px_48px_rgba(0,0,0,0.16)] backdrop-blur"
      style={{
        left: `min(${contextMenu.x}px, calc(100vw - 12.5rem))`,
        top: `min(${contextMenu.y}px, calc(100vh - 18rem))`,
      }}
      data-avnac-chrome
    >
      {contextMenu.hasSelection ? (
        <>
          <button
            type="button"
            role="menuitem"
            className={contextMenuButtonClass}
            onClick={() => {
              onCopy()
              onClose()
            }}
          >
            <HugeiconsIcon icon={Copy01Icon} size={18} strokeWidth={1.75} />
            Copy
          </button>
          <button
            type="button"
            role="menuitem"
            className={contextMenuButtonClass}
            onClick={() => {
              onDuplicate()
              onClose()
            }}
          >
            <HugeiconsIcon icon={Layers02Icon} size={18} strokeWidth={1.75} />
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            className={contextMenuButtonClass}
            onClick={() => {
              onToggleLock()
              onClose()
            }}
          >
            <HugeiconsIcon
              icon={contextMenu.locked ? SquareUnlock01Icon : SquareLock01Icon}
              size={18}
              strokeWidth={1.75}
            />
            {contextMenu.locked ? 'Unlock' : 'Lock'}
          </button>
          <div className="my-1 h-px bg-black/[0.06]" aria-hidden />
        </>
      ) : null}
      <button
        type="button"
        role="menuitem"
        className={contextMenuButtonClass}
        onClick={() => {
          onPaste({ x: contextMenu.sceneX, y: contextMenu.sceneY })
          onClose()
        }}
      >
        <HugeiconsIcon icon={FilePasteIcon} size={18} strokeWidth={1.75} />
        Paste
      </button>
      {contextMenu.showPageActions ? (
        <>
          <button
            type="button"
            role="menuitem"
            className={contextMenuButtonClass}
            onClick={() => {
              onDuplicatePage(contextMenu.pageId ?? undefined)
              onClose()
            }}
          >
            <HugeiconsIcon icon={Copy01Icon} size={18} strokeWidth={1.75} />
            Duplicate page
          </button>
          <button
            type="button"
            role="menuitem"
            className={contextMenuButtonClass}
            onClick={() => {
              onAddPage(contextMenu.pageId ?? undefined)
              onClose()
            }}
          >
            <HugeiconsIcon icon={LayerAddIcon} size={18} strokeWidth={1.75} />
            Add new page
          </button>
          {canDeletePage ? (
            <button
              type="button"
              role="menuitem"
              className={contextMenuButtonClass}
              onClick={() => {
                onDeletePage(contextMenu.pageId ?? undefined)
                onClose()
              }}
            >
              <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.75} />
              Delete page
            </button>
          ) : null}
        </>
      ) : null}
      {contextMenu.hasSelection ? (
        <>
          <div className="my-1 h-px bg-black/[0.06]" aria-hidden />
          <button
            type="button"
            role="menuitem"
            className={contextMenuButtonClass}
            onClick={() => {
              onDelete()
              onClose()
            }}
          >
            <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.75} />
            Delete
          </button>
        </>
      ) : null}
    </div>
  )
}
