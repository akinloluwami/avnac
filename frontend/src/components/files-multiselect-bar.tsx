import { Cancel01Icon, Delete02Icon, Download01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

type FilesMultiselectBarProps = {
  count: number
  onClear: () => void
  onDownload: () => void
  onTrash: () => void
}

export default function FilesMultiselectBar({
  count,
  onClear,
  onDownload,
  onTrash,
}: FilesMultiselectBarProps) {
  if (count < 1) return null

  const iconBtn =
    'flex size-10 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-[var(--text)] transition-colors hover:bg-black/[0.06]'

  return (
    <div
      className="pointer-events-auto fixed bottom-6 left-1/2 z-[250] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)]/95 px-2 py-2 pl-3 backdrop-blur-md sm:gap-2 sm:px-3 sm:py-2.5 sm:pl-4"
      role="toolbar"
      aria-label="Selected files actions"
    >
      <button type="button" className={iconBtn} aria-label="Clear selection" onClick={onClear}>
        <HugeiconsIcon
          icon={Cancel01Icon}
          size={20}
          strokeWidth={1.75}
          className="shrink-0 text-[var(--text-muted)]"
        />
      </button>
      <span className="min-w-0 px-1 text-[14px] font-medium tabular-nums text-[var(--text)] sm:px-2 sm:text-[15px]">
        {count} selected
      </span>
      <div className="mx-1 hidden h-6 w-px bg-black/[0.08] sm:block" aria-hidden />
      <button
        type="button"
        className={iconBtn}
        aria-label="Download selected"
        title="Download"
        onClick={onDownload}
      >
        <HugeiconsIcon
          icon={Download01Icon}
          size={20}
          strokeWidth={1.75}
          className="shrink-0 text-[var(--text-muted)]"
        />
      </button>
      <button
        type="button"
        className={`${iconBtn} text-red-600 hover:bg-red-50`}
        aria-label="Move selected to trash"
        title="Move to trash"
        onClick={onTrash}
      >
        <HugeiconsIcon icon={Delete02Icon} size={20} strokeWidth={1.75} className="shrink-0" />
      </button>
    </div>
  )
}
