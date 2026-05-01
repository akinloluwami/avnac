import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  DragDropVerticalIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Reorder, useDragControls } from 'motion/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  editorSidebarPanelLeftClass,
  editorSidebarPanelTopClass,
} from '../lib/editor-sidebar-panel-layout'

export type EditorLayerRow = {
  id: string
  index: number
  label: string
  visible: boolean
  selected: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  rows: EditorLayerRow[]
  onSelectLayer: (stackIndex: number) => void
  onToggleVisible: (stackIndex: number) => void
  onBringForward: (stackIndex: number) => void
  onSendBackward: (stackIndex: number) => void
  onReorder?: (orderedLayerIds: string[]) => void
  onRenameLayer?: (stackIndex: number, name: string) => void
}

function LayerRowLabelControl({
  row,
  onSelectLayer,
  onRenameLayer,
}: {
  row: EditorLayerRow
  onSelectLayer: (stackIndex: number) => void
  onRenameLayer?: (stackIndex: number, name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(row.label)

  useEffect(() => {
    if (!editing) setDraft(row.label)
  }, [row.id, row.label, editing])

  if (editing && onRenameLayer) {
    return (
      <input
        type="text"
        className="min-w-0 flex-1 rounded-md border border-black/15 bg-white px-2 py-1 text-sm text-neutral-800 outline-none focus:border-black/30"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          onRenameLayer(row.index, draft.trim())
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === 'Escape') {
            setDraft(row.label)
            setEditing(false)
          }
        }}
        autoFocus
        aria-label="Layer name"
        onPointerDown={e => e.stopPropagation()}
      />
    )
  }

  return (
    <button
      type="button"
      className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left text-sm text-neutral-800"
      onClick={() => onSelectLayer(row.index)}
      title={onRenameLayer ? 'Double-click to rename' : undefined}
    >
      <span
        className="truncate"
        onDoubleClick={e => {
          if (!onRenameLayer) return
          e.preventDefault()
          e.stopPropagation()
          setDraft(row.label)
          setEditing(true)
        }}
      >
        {row.label}
      </span>
    </button>
  )
}

function layerRowClass(selected: boolean) {
  return [
    'flex items-center gap-0.5 rounded-lg py-0.5',
    selected ? 'bg-[var(--accent)]/20' : 'hover:bg-black/[0.04]',
  ].join(' ')
}

function LayerReorderRow({
  row,
  value,
  onSelectLayer,
  onToggleVisible,
  onBringForward,
  onSendBackward,
  onRenameLayer,
}: {
  row: EditorLayerRow
  value: string
  onSelectLayer: (stackIndex: number) => void
  onToggleVisible: (stackIndex: number) => void
  onBringForward: (stackIndex: number) => void
  onSendBackward: (stackIndex: number) => void
  onRenameLayer?: (stackIndex: number, name: string) => void
}) {
  const dragControls = useDragControls()

  const onHandlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      dragControls.start(e)
    },
    [dragControls],
  )

  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={dragControls}
      className={layerRowClass(row.selected)}
      style={{ listStyle: 'none' }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Reorder ${row.label}`}
        title="Drag to reorder"
        className="flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-neutral-400 hover:bg-black/[0.06] hover:text-neutral-600 active:cursor-grabbing"
        onPointerDown={onHandlePointerDown}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault()
        }}
      >
        <HugeiconsIcon icon={DragDropVerticalIcon} size={16} strokeWidth={1.75} />
      </div>
      <LayerRowLabelControl row={row} onSelectLayer={onSelectLayer} onRenameLayer={onRenameLayer} />
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-black/[0.06]"
        title={row.visible ? 'Hide' : 'Show'}
        aria-label={row.visible ? 'Hide layer' : 'Show layer'}
        onClick={() => onToggleVisible(row.index)}
      >
        <HugeiconsIcon
          icon={row.visible ? ViewIcon : ViewOffSlashIcon}
          size={18}
          strokeWidth={1.75}
        />
      </button>
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-black/[0.06]"
        title="Forward"
        aria-label="Bring forward"
        onClick={() => onBringForward(row.index)}
      >
        <HugeiconsIcon icon={ArrowUp01Icon} size={18} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-black/[0.06]"
        title="Backward"
        aria-label="Send backward"
        onClick={() => onSendBackward(row.index)}
      >
        <HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={1.75} />
      </button>
    </Reorder.Item>
  )
}

function StaticLayerRow({
  row,
  onSelectLayer,
  onToggleVisible,
  onBringForward,
  onSendBackward,
  onRenameLayer,
}: {
  row: EditorLayerRow
  onSelectLayer: (stackIndex: number) => void
  onToggleVisible: (stackIndex: number) => void
  onBringForward: (stackIndex: number) => void
  onSendBackward: (stackIndex: number) => void
  onRenameLayer?: (stackIndex: number, name: string) => void
}) {
  return (
    <li className={layerRowClass(row.selected)}>
      <LayerRowLabelControl row={row} onSelectLayer={onSelectLayer} onRenameLayer={onRenameLayer} />
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-black/[0.06]"
        title={row.visible ? 'Hide' : 'Show'}
        aria-label={row.visible ? 'Hide layer' : 'Show layer'}
        onClick={() => onToggleVisible(row.index)}
      >
        <HugeiconsIcon
          icon={row.visible ? ViewIcon : ViewOffSlashIcon}
          size={18}
          strokeWidth={1.75}
        />
      </button>
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-black/[0.06]"
        title="Forward"
        aria-label="Bring forward"
        onClick={() => onBringForward(row.index)}
      >
        <HugeiconsIcon icon={ArrowUp01Icon} size={18} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-600 hover:bg-black/[0.06]"
        title="Backward"
        aria-label="Send backward"
        onClick={() => onSendBackward(row.index)}
      >
        <HugeiconsIcon icon={ArrowDown01Icon} size={18} strokeWidth={1.75} />
      </button>
    </li>
  )
}

export default function EditorLayersPanel({
  open,
  onClose,
  rows,
  onSelectLayer,
  onToggleVisible,
  onBringForward,
  onSendBackward,
  onReorder,
  onRenameLayer,
}: Props) {
  if (!open) return null

  const listClass = 'max-h-[min(60vh,360px)] overflow-auto p-1'

  return (
    <div
      data-avnac-chrome
      className={[
        'pointer-events-auto fixed z-40 flex w-[min(100vw-1.5rem,280px)] flex-col overflow-hidden rounded-3xl border border-black/[0.08] bg-white/95 backdrop-blur-md',
        editorSidebarPanelLeftClass,
        editorSidebarPanelTopClass,
      ].join(' ')}
      role="dialog"
      aria-label="Layers"
    >
      <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2">
        <span className="text-sm font-semibold text-neutral-800">Layers</span>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-black/[0.06]"
          onClick={onClose}
          aria-label="Close layers"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.75} />
        </button>
      </div>
      {rows.length === 0 ? (
        <ul className={listClass}>
          <li className="px-3 py-6 text-center text-sm text-neutral-500">No objects yet</li>
        </ul>
      ) : onReorder ? (
        <Reorder.Group
          as="ul"
          axis="y"
          className={listClass}
          values={rows.map(r => r.id)}
          onReorder={onReorder}
        >
          {rows.map(row => (
            <LayerReorderRow
              key={row.id}
              value={row.id}
              row={row}
              onSelectLayer={onSelectLayer}
              onToggleVisible={onToggleVisible}
              onBringForward={onBringForward}
              onSendBackward={onSendBackward}
              onRenameLayer={onRenameLayer}
            />
          ))}
        </Reorder.Group>
      ) : (
        <ul className={listClass}>
          {rows.map(row => (
            <StaticLayerRow
              key={row.id}
              row={row}
              onSelectLayer={onSelectLayer}
              onToggleVisible={onToggleVisible}
              onBringForward={onBringForward}
              onSendBackward={onSendBackward}
              onRenameLayer={onRenameLayer}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
