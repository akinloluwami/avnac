import { Cancel01Icon, CloudUploadIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRef } from 'react'
import {
  editorSidebarPanelLeftClass,
  editorSidebarPanelTopClass,
} from '../lib/editor-sidebar-panel-layout'
import type { SceneSvg } from '../lib/avnac-scene'
import { useEditorStore } from './scene-editor/editor-store'

type Props = {
  open: boolean
  onClose: () => void
}

// SVGs are rendered exclusively via <img> with a data URL, which sandboxes scripts
// and event handlers at the browser level. This sanitizer is defense-in-depth only —
// it removes common XSS vectors so that stored markup stays clean if the rendering
// approach ever changes.
function sanitizeSvgMarkup(markup: string): string {
  return markup
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-removed=')
    .replace(/javascript:/gi, '')
    .replace(/(<use\b[^>]*\s(?:href|xlink:href)\s*=\s*["'])(https?:\/\/[^"']*)(["'])/gi, '$1#$3')
}

// Returns null if the markup is not valid SVG.
function parseSvgNaturalSize(markup: string): { width: number; height: number } | null {
  const parser = new DOMParser()
  const doc = parser.parseFromString(markup, 'image/svg+xml')
  if (doc.querySelector('parsererror')) return null

  const root = doc.documentElement
  if (root.tagName.toLowerCase() !== 'svg') return null
  const wAttr = root.getAttribute('width')
  const hAttr = root.getAttribute('height')
  const viewBox = root.getAttribute('viewBox')

  const numW = wAttr ? parseFloat(wAttr) : Number.NaN
  const numH = hAttr ? parseFloat(hAttr) : Number.NaN
  if (Number.isFinite(numW) && numW > 0 && Number.isFinite(numH) && numH > 0) {
    return { width: numW, height: numH }
  }

  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/)
    const vbW = parseFloat(parts[2] ?? '')
    const vbH = parseFloat(parts[3] ?? '')
    if (Number.isFinite(vbW) && vbW > 0 && Number.isFinite(vbH) && vbH > 0) {
      return { width: vbW, height: vbH }
    }
  }

  return { width: 300, height: 300 }
}

export default function EditorUploadsPanel({ open, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setDoc = useEditorStore(s => s.setDoc)
  const doc = useEditorStore(s => s.doc)
  const setSelectedIds = useEditorStore(s => s.setSelectedIds)

  if (!open) return null

  const artboardW = doc.artboard.width
  const artboardH = doc.artboard.height

  const handleSvgFiles = async (files: FileList | null) => {
    if (!files) return
    const insertedIds: string[] = []

    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') continue

      let rawMarkup: string
      try {
        rawMarkup = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(reader.error)
          reader.readAsText(file)
        })
      } catch {
        continue
      }

      const markup = sanitizeSvgMarkup(rawMarkup)
      const size = parseSvgNaturalSize(markup)
      if (!size) continue

      const { width: naturalWidth, height: naturalHeight } = size
      const maxEdge = 800
      const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight))
      const displayWidth = Math.max(1, Math.round(naturalWidth * scale))
      const displayHeight = Math.max(1, Math.round(naturalHeight * scale))

      const obj: SceneSvg = {
        id: crypto.randomUUID(),
        type: 'svg',
        x: Math.round(artboardW / 2 - displayWidth / 2),
        y: Math.round(artboardH / 2 - displayHeight / 2),
        width: displayWidth,
        height: displayHeight,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        blurPct: 0,
        shadow: null,
        markup,
        naturalWidth,
        naturalHeight,
      }

      insertedIds.push(obj.id)
      setDoc(prev => ({ ...prev, objects: [...prev.objects, obj] }))
    }

    if (insertedIds.length > 0) {
      setSelectedIds(insertedIds)
    }
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
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          multiple
          onChange={e => {
            void handleSvgFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-black/[0.12] px-4 py-6 text-center text-sm text-neutral-500 hover:border-black/[0.2] hover:bg-black/[0.02]"
          onClick={() => fileInputRef.current?.click()}
        >
          <HugeiconsIcon icon={CloudUploadIcon} size={28} strokeWidth={1.5} />
          <span>Upload SVG file</span>
          <span className="text-xs text-neutral-400">Click to browse</span>
        </button>
      </div>
    </div>
  )
}
