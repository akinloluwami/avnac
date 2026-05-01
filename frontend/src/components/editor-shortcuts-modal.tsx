import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

type ShortcutRow = { keys: string; action: string }

const ROWS: ShortcutRow[] = [
  { keys: 'Cmd/Ctrl + Z', action: 'Undo' },
  { keys: 'Cmd/Ctrl + Shift + Z', action: 'Redo' },
  { keys: 'Cmd/Ctrl + G', action: 'Group selection' },
  { keys: 'Cmd/Ctrl + Shift + G', action: 'Ungroup' },
  { keys: 'Cmd/Ctrl + D', action: 'Duplicate selection' },
  { keys: 'Cmd/Ctrl + C / V', action: 'Copy / paste (Avnac clipboard)' },
  { keys: 'Arrow keys', action: 'Nudge selection 1px' },
  { keys: 'Shift + Arrow keys', action: 'Nudge selection 10px' },
  { keys: 'Delete / Backspace', action: 'Delete selection' },
  { keys: 'Option/Alt + drag', action: 'Duplicate while dragging (canvas)' },
  {
    keys: 'Vector board — tools',
    action: 'V = Move, P = Pen, Shift+P = Pencil, R = Rectangle, O = Ellipse',
  },
  {
    keys: 'Vector board — selection',
    action:
      'Shift+click multi-selects; drag empty area marquees; Shift+drag marquee = additive; Delete/Backspace removes; Cmd/Ctrl+C/V copies/pastes; Alt+drag duplicates; Arrow nudges 1px (Shift = 10px)',
  },
  {
    keys: 'Vector board — transform',
    action:
      'Drag selection handles to resize (Shift = proportional, Alt = from center); double-click a pen shape to edit its anchors, then Alt+click to remove an anchor, Esc to exit',
  },
  {
    keys: 'Vector board — view / z-order',
    action:
      'Space+drag or middle-click drag to pan; Cmd/Ctrl+wheel zooms; Cmd/Ctrl+0 resets, Cmd/Ctrl+1 fits, Cmd/Ctrl+=/- zooms; Cmd/Ctrl+] / [ moves selection forward/backward (add Shift for front/back)',
  },
  { keys: '?', action: 'Show shortcuts' },
]

type Props = {
  open: boolean
  onClose: () => void
}

export default function EditorShortcutsModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[20000] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        data-avnac-chrome
        className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
          <h2 className="m-0 text-base font-semibold text-neutral-900">Shortcuts</h2>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-black/[0.06]"
            onClick={onClose}
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.75} />
          </button>
        </div>
        <div className="max-h-[min(70vh,420px)] overflow-auto p-4">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {ROWS.map(row => (
                <tr key={row.action} className="border-b border-black/[0.04]">
                  <td className="py-2 pr-3 font-medium tabular-nums text-neutral-800">
                    {row.keys}
                  </td>
                  <td className="py-2 text-neutral-600">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
