import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, CloudUploadIcon } from '@hugeicons/core-free-icons'
import { useRef, useState, type DragEvent } from 'react'
import {
  editorSidebarPanelLeftClass,
  editorSidebarPanelTopClass,
} from '../lib/editor-sidebar-panel-layout'

type Props = {
  open: boolean
  onClose: () => void
  addImages: (files: FileList | readonly File[]) => void
}

function isHeic(f: File): boolean {
  const t = f.type.toLowerCase()
  if (t === 'image/heic' || t === 'image/heif') return true
  const n = f.name.toLowerCase()
  return n.endsWith('.heic') || n.endsWith('.heif')
}

export default function EditorUploadsPanel({ open, onClose, addImages }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const all = Array.from(files)
    const heicCount = all.filter(isHeic).length
    const images = all.filter(
      (f) => !isHeic(f) && f.type.startsWith('image/'),
    )
    if (heicCount > 0) {
      setError("HEIC isn't supported")
    } else {
      setError(null)
    }
    if (images.length === 0) return
    addImages(images)
    onClose()
  }

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const onDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!dragOver) setDragOver(true)
  }

  const onDragLeave = (e: DragEvent<HTMLButtonElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setDragOver(false)
  }

  return (
    <div
      data-avnac-chrome
      className={[
        'pointer-events-auto fixed z-40 flex w-[min(100vw-1.5rem,280px)] flex-col overflow-hidden rounded-3xl border border-black/[0.08] bg-white/95 backdrop-blur-md',
        editorSidebarPanelLeftClass,
        editorSidebarPanelTopClass,
      ].join(' ')}
      role="dialog"
      aria-label="Uploads"
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2">
        <span className="text-sm font-semibold text-neutral-800">Uploads</span>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-black/[0.06]"
          onClick={onClose}
          aria-label="Close uploads"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.75} />
        </button>
      </div>
      <div className="p-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={onDragOver}
          onDragLeave={onDragLeave}
          className={[
            'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragOver
              ? 'border-[var(--accent)] bg-[var(--accent)]/10'
              : 'border-black/[0.12] bg-[var(--surface-subtle)] hover:border-black/[0.24] hover:bg-black/[0.03]',
          ].join(' ')}
        >
          <HugeiconsIcon
            icon={CloudUploadIcon}
            size={28}
            strokeWidth={1.5}
            className="text-neutral-500"
          />
          <span className="text-[13px] font-medium text-neutral-800">
            Drop images here or click to browse
          </span>
          <span className="text-[11px] text-neutral-500">
            PNG, JPG, GIF, WebP, SVG
          </span>
        </button>
        {error ? (
          <p className="mt-2 text-center text-[12px] text-red-600">{error}</p>
        ) : null}
      </div>
    </div>
  )
}
