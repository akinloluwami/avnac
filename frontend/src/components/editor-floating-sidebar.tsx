import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { editorSidebarIcons, type EditorSidebarIconId } from '@/lib/editor-sidebar-icons'

export type EditorSidebarPanelId = EditorSidebarIconId

type Item = {
  id: EditorSidebarPanelId
  label: string
  icon: IconSvgElement
  activeIcon: IconSvgElement
  fancy?: boolean
}

const ITEMS: Item[] = [
  {
    id: 'layers',
    label: 'Layers',
    icon: editorSidebarIcons.layers.icon,
    activeIcon: editorSidebarIcons.layers.activeIcon,
  },
  {
    id: 'uploads',
    label: 'Uploads',
    icon: editorSidebarIcons.uploads.icon,
    activeIcon: editorSidebarIcons.uploads.activeIcon,
  },
  {
    id: 'images',
    label: 'Images',
    icon: editorSidebarIcons.images.icon,
    activeIcon: editorSidebarIcons.images.activeIcon,
  },
  {
    id: 'vector-board',
    label: 'Vectors',
    icon: editorSidebarIcons['vector-board'].icon,
    activeIcon: editorSidebarIcons['vector-board'].activeIcon,
  },
  {
    id: 'apps',
    label: 'Apps',
    icon: editorSidebarIcons.apps.icon,
    activeIcon: editorSidebarIcons.apps.activeIcon,
  },
  {
    id: 'ai',
    label: 'Magic',
    icon: editorSidebarIcons.ai.icon,
    activeIcon: editorSidebarIcons.ai.activeIcon,
    fancy: true,
  },
]

type Props = {
  activePanel: EditorSidebarPanelId | null
  onSelectPanel: (id: EditorSidebarPanelId) => void
  disabled?: boolean
}

type SidebarIndicatorState = {
  left: number
  top: number
  width: number
  height: number
}

export default function EditorFloatingSidebar({
  activePanel,
  onSelectPanel,
  disabled,
}: Props) {
  const navRef = useRef<HTMLElement | null>(null)
  const buttonRefs = useRef<
    Partial<Record<EditorSidebarPanelId, HTMLButtonElement | null>>
  >({})
  const [indicator, setIndicator] = useState<SidebarIndicatorState | null>(null)
  const activeItem = activePanel
    ? ITEMS.find((item) => item.id === activePanel) ?? null
    : null

  useLayoutEffect(() => {
    if (!activeItem || activeItem.fancy) {
      setIndicator(null)
      return
    }
    const button = buttonRefs.current[activeItem.id]
    if (!button) {
      setIndicator(null)
      return
    }
    setIndicator({
      left: button.offsetLeft,
      top: button.offsetTop,
      width: button.offsetWidth,
      height: button.offsetHeight,
    })
  }, [activeItem])

  useEffect(() => {
    if (!activeItem || activeItem.fancy) return

    const updateIndicator = () => {
      const button = buttonRefs.current[activeItem.id]
      if (!button) return
      setIndicator({
        left: button.offsetLeft,
        top: button.offsetTop,
        width: button.offsetWidth,
        height: button.offsetHeight,
      })
    }

    updateIndicator()

    if (typeof ResizeObserver !== 'function') {
      window.addEventListener('resize', updateIndicator)
      return () => window.removeEventListener('resize', updateIndicator)
    }

    const observer = new ResizeObserver(updateIndicator)
    const nav = navRef.current
    if (nav) observer.observe(nav)
    Object.values(buttonRefs.current).forEach((button) => {
      if (button) observer.observe(button)
    })
    window.addEventListener('resize', updateIndicator)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeItem])

  return (
    <nav
      ref={navRef}
      data-avnac-chrome
      aria-label="Editor tools"
      className={[
        'pointer-events-auto fixed left-3 top-[calc(0.75rem+2.5rem+0.75rem+1px+0.75rem)] z-[45] flex flex-col gap-0.5 rounded-3xl border border-black/[0.08] bg-neutral-100/95 p-1.5 backdrop-blur-md sm:top-[calc(0.875rem+2.5rem+0.875rem+1px+0.75rem)]',
        disabled ? 'pointer-events-none opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {indicator ? (
        <motion.span
          aria-hidden
          initial={false}
          animate={{
            x: indicator.left,
            y: indicator.top,
            width: indicator.width,
            height: indicator.height,
            opacity: 1,
          }}
          transition={{ type: 'spring', stiffness: 560, damping: 40, mass: 0.72 }}
          className="pointer-events-none absolute left-0 top-0 z-0 rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
        />
      ) : null}
      {ITEMS.map((item) => {
        const active = activePanel === item.id
        const icon = active ? item.activeIcon : item.icon
        if (item.fancy) {
          return (
            <button
              key={item.id}
              ref={(node) => {
                buttonRefs.current[item.id] = node
              }}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onSelectPanel(item.id)}
              className={[
                'avnac-ai-tile relative z-10 flex w-[4.25rem] flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-[11px] font-medium transition-[background,box-shadow]',
                disabled ? 'cursor-not-allowed' : '',
              ].join(' ')}
            >
              <HugeiconsIcon
                icon={icon}
                size={22}
                strokeWidth={active ? undefined : 1.75}
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
            ref={(node) => {
              buttonRefs.current[item.id] = node
            }}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onSelectPanel(item.id)}
            className={[
              'relative z-10 flex w-[4.25rem] flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-[11px] font-medium transition-colors',
              active
                ? 'text-neutral-900'
                : 'text-neutral-600 hover:bg-white/70 hover:text-neutral-900',
              disabled ? 'cursor-not-allowed' : '',
            ].join(' ')}
          >
            <HugeiconsIcon
              icon={icon}
              size={22}
              strokeWidth={active ? undefined : 1.65}
              className="shrink-0 text-neutral-700"
            />
            <span className="max-w-full truncate">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
