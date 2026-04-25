import { HugeiconsIcon } from '@hugeicons/react'
import {
  AiMagicIcon,
  Album02Icon,
  CloudUploadIcon,
  DashboardCircleIcon,
  Layers02Icon,
  PenTool01Icon,
} from '@hugeicons/core-free-icons'

export type EditorSidebarPanelId =
  | 'layers'
  | 'uploads'
  | 'images'
  | 'vector-board'
  | 'apps'
  | 'ai'

type Item = {
  id: EditorSidebarPanelId
  label: string
  icon: typeof Layers02Icon
  fancy?: boolean
}

const ITEMS: Item[] = [
  { id: 'layers', label: 'Layers', icon: Layers02Icon },
  { id: 'uploads', label: 'Uploads', icon: CloudUploadIcon },
  { id: 'images', label: 'Images', icon: Album02Icon },
  { id: 'vector-board', label: 'Vectors', icon: PenTool01Icon },
  { id: 'apps', label: 'Apps', icon: DashboardCircleIcon },
  { id: 'ai', label: 'Magic', icon: AiMagicIcon, fancy: true },
]

type Props = {
  activePanel: EditorSidebarPanelId | null
  onSelectPanel: (id: EditorSidebarPanelId) => void
  disabled?: boolean
}

export default function EditorFloatingSidebar({
  activePanel,
  onSelectPanel,
  disabled,
}: Props) {
  return (
    <nav
      data-avnac-chrome
      aria-label="Editor tools"
      className={[
        'pointer-events-auto fixed left-3 top-[calc(0.75rem+2.5rem+0.75rem+1px+0.75rem)] z-[45] flex flex-col gap-0.5 rounded-3xl border border-[var(--line)] bg-[var(--surface-panel)] p-1.5 backdrop-blur-md sm:top-[calc(0.875rem+2.5rem+0.875rem+1px+0.75rem)]',
        disabled ? 'pointer-events-none opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {ITEMS.map((item) => {
        const active = activePanel === item.id
        if (item.fancy) {
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              title={item.label}
              onClick={() => onSelectPanel(item.id)}
              className={[
                'avnac-ai-tile flex w-[4.25rem] flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-[11px] font-medium transition-[background,box-shadow]',
                disabled ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              <HugeiconsIcon
                icon={item.icon}
                size={22}
                strokeWidth={1.75}
                className="avnac-ai-accent shrink-0"
              />
              <span className="avnac-ai-accent max-w-full truncate font-semibold">
                {item.label}
              </span>
            </button>
          )
        }
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={item.label}
            onClick={() => onSelectPanel(item.id)}
            className={[
              'flex w-[4.25rem] flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-[11px] font-medium transition-colors',
              active
                ? 'bg-[var(--surface-overlay-strong)] text-[var(--text)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]',
              disabled ? 'cursor-not-allowed' : '',
            ].join(' ')}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={22}
              strokeWidth={1.65}
              className="shrink-0 text-[var(--text-muted)]"
            />
            <span className="max-w-full truncate">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
