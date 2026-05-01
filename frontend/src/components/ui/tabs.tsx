import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { cx } from './utils'

export type ChoiceItem = {
  id: string
  label: string
  icon?: IconSvgElement
  disabled?: boolean
}

export function SegmentedControl({
  items,
  value,
  onValueChange,
  className,
}: {
  items: ChoiceItem[]
  value: string
  onValueChange?: (value: string) => void
  className?: string
}) {
  return (
    <div
      className={cx(
        'inline-flex rounded-xl border border-black/[0.08] bg-black/[0.035] p-0.5',
        className,
      )}
    >
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          disabled={item.disabled}
          aria-pressed={value === item.id}
          onClick={() => onValueChange?.(item.id)}
          className={cx(
            'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-neutral-600 outline-none transition-[background-color,color,box-shadow] hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 disabled:cursor-not-allowed disabled:opacity-45',
            value === item.id && 'bg-white text-neutral-950 shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
          )}
        >
          {item.icon ? <HugeiconsIcon icon={item.icon} size={15} strokeWidth={1.8} /> : null}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Tabs({
  items,
  value,
  onValueChange,
  className,
}: {
  items: ChoiceItem[]
  value: string
  onValueChange?: (value: string) => void
  className?: string
}) {
  return (
    <div className={cx('flex border-b border-black/[0.08]', className)} role="tablist">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          role="tab"
          disabled={item.disabled}
          aria-selected={value === item.id}
          onClick={() => onValueChange?.(item.id)}
          className={cx(
            'relative flex h-10 min-w-0 items-center gap-2 px-3 text-[13px] font-medium text-neutral-500 outline-none transition-colors hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/45 disabled:cursor-not-allowed disabled:opacity-45',
            value === item.id && 'text-neutral-950',
          )}
        >
          {item.icon ? <HugeiconsIcon icon={item.icon} size={16} strokeWidth={1.75} /> : null}
          <span className="truncate">{item.label}</span>
          {value === item.id ? (
            <span
              aria-hidden
              className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-neutral-950"
            />
          ) : null}
        </button>
      ))}
    </div>
  )
}
