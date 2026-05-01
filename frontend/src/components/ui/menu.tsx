import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
} from 'react'
import { cx } from './utils'

export const MenuList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  function MenuList({ className, ...props }, ref) {
    return <div ref={ref} className={cx('grid gap-1 p-1.5', className)} {...props} />
  },
)

export type MenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: IconSvgElement
  label: ReactNode
  description?: ReactNode
  shortcut?: ReactNode
  active?: boolean
  danger?: boolean
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  { className, icon, label, description, shortcut, active, danger, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-[background-color,color,box-shadow] hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 disabled:cursor-not-allowed disabled:opacity-45',
        active && 'bg-black/[0.055]',
        danger ? 'text-red-600 hover:bg-red-50' : 'text-neutral-800',
        className,
      )}
      {...props}
    >
      {icon ? (
        <HugeiconsIcon
          icon={icon}
          size={18}
          strokeWidth={1.75}
          className={cx('shrink-0', danger ? 'text-red-500' : 'text-neutral-500')}
        />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block truncate text-[12px] leading-5 text-neutral-500">
            {description}
          </span>
        ) : null}
      </span>
      {shortcut ? (
        <span className="shrink-0 rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[11px] font-medium text-neutral-500">
          {shortcut}
        </span>
      ) : null}
    </button>
  )
})
