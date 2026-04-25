import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import {
  editorSidebarPanelLeftClass,
  editorSidebarPanelTopClass,
} from '../lib/editor-sidebar-panel-layout'

type Props = {
  open: boolean
  onClose: () => void
}

export default function EditorUploadsPanel({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div
      data-avnac-chrome
      className={[
        'theme-sidebar-panel pointer-events-auto fixed z-40 flex w-[min(100vw-1.5rem,280px)] flex-col overflow-hidden rounded-3xl border backdrop-blur-md',
        editorSidebarPanelLeftClass,
        editorSidebarPanelTopClass,
      ].join(' ')}
      role="dialog"
      aria-label="Uploads"
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
        <span className="text-sm font-semibold text-[var(--text)]">Uploads</span>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--hover)]"
          onClick={onClose}
          aria-label="Close uploads"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.75} />
        </button>
      </div>
      <div className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">
        Coming soon
      </div>
    </div>
  )
}
