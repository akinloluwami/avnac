import { useEffect, useId, useRef } from 'react'

type DeleteConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export default function DeleteConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Move to trash',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: DeleteConfirmDialogProps) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => confirmRef.current?.focus(), 0)
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

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" aria-hidden />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-[1] w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-6 backdrop-blur-md sm:p-8"
        onMouseDown={e => e.stopPropagation()}
      >
        <h2
          id={titleId}
          className="display-title m-0 text-xl font-medium tracking-[-0.02em] text-[var(--text)] sm:text-2xl"
        >
          {title}
        </h2>
        <p id={descId} className="mt-3 text-[15px] leading-relaxed text-[var(--text-muted)]">
          {message}
        </p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-black/[0.14] bg-white px-6 py-2.5 text-[15px] font-medium text-[var(--text)] transition-colors hover:bg-black/[0.04] sm:w-auto"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border-0 bg-red-600 px-6 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-red-700 sm:w-auto"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
