import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
} from 'react'
import { cx } from './utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'magic'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const buttonBase =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border font-medium no-underline outline-none transition-[background-color,border-color,color,box-shadow,opacity,transform] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'border-neutral-900 bg-neutral-950 text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-neutral-800',
  secondary:
    'border-black/[0.1] bg-white/88 text-neutral-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-black/[0.16] hover:bg-white',
  ghost:
    'border-transparent bg-transparent text-neutral-700 hover:bg-black/[0.055] hover:text-neutral-950',
  subtle:
    'border-black/[0.06] bg-black/[0.035] text-neutral-800 hover:border-black/[0.1] hover:bg-black/[0.06]',
  danger: 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100',
  magic:
    'border-[#8B3DFF]/20 bg-[linear-gradient(135deg,rgba(139,61,255,0.1),rgba(255,184,142,0.16))] text-[#5d2fc2] hover:border-[#8B3DFF]/32 hover:bg-[linear-gradient(135deg,rgba(139,61,255,0.14),rgba(255,184,142,0.22))]',
}

const buttonSizes: Record<ButtonSize, string> = {
  xs: 'h-8 rounded-lg px-2.5 text-[12px]',
  sm: 'h-9 rounded-lg px-3 text-[13px]',
  md: 'h-10 rounded-xl px-4 text-sm',
  lg: 'h-12 rounded-xl px-5 text-base',
}

export function buttonClassName({
  className,
  fullWidth,
  size = 'md',
  variant = 'secondary',
}: {
  className?: string
  fullWidth?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
} = {}) {
  return cx(
    buttonBase,
    buttonVariants[variant],
    buttonSizes[size],
    fullWidth && 'w-full',
    className,
  )
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  iconBefore?: ReactNode
  iconAfter?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    children,
    variant = 'secondary',
    size = 'md',
    fullWidth,
    iconBefore,
    iconAfter,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ className, fullWidth, size, variant })}
      {...props}
    >
      {iconBefore}
      {children}
      {iconAfter}
    </button>
  )
})

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  iconBefore?: ReactNode
  iconAfter?: ReactNode
}

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  {
    className,
    children,
    variant = 'secondary',
    size = 'md',
    fullWidth,
    iconBefore,
    iconAfter,
    ...props
  },
  ref,
) {
  return (
    <a ref={ref} className={buttonClassName({ className, fullWidth, size, variant })} {...props}>
      {iconBefore}
      {children}
      {iconAfter}
    </a>
  )
})

type IconButtonVariant = 'chrome' | 'ghost' | 'subtle' | 'primary' | 'danger' | 'magic'
type IconButtonSize = 'sm' | 'md' | 'lg'

const iconButtonVariants: Record<IconButtonVariant, string> = {
  chrome:
    'border-transparent bg-transparent text-neutral-600 hover:bg-black/[0.06] hover:text-neutral-950',
  ghost:
    'border-transparent bg-transparent text-neutral-600 hover:bg-black/[0.055] hover:text-neutral-950',
  subtle:
    'border-black/[0.06] bg-black/[0.035] text-neutral-700 hover:border-black/[0.1] hover:bg-black/[0.06]',
  primary: 'border-neutral-900 bg-neutral-950 text-white hover:bg-neutral-800',
  danger: 'border-transparent bg-transparent text-red-600 hover:bg-red-50',
  magic:
    'border-[#8B3DFF]/18 bg-[#8B3DFF]/8 text-[#6838ce] hover:border-[#8B3DFF]/28 hover:bg-[#8B3DFF]/12',
}

const iconButtonSizes: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-10 w-10 rounded-xl',
}

export function iconButtonClassName({
  active,
  className,
  size = 'sm',
  variant = 'chrome',
}: {
  active?: boolean
  className?: string
  size?: IconButtonSize
  variant?: IconButtonVariant
} = {}) {
  return cx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center border outline-none transition-[background-color,border-color,color,box-shadow,opacity] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-45',
    iconButtonVariants[variant],
    iconButtonSizes[size],
    active && 'border-black/[0.08] bg-black/[0.08] text-neutral-950',
    className,
  )
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconSvgElement
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  active?: boolean
  strokeWidth?: number
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    className,
    icon,
    label,
    variant = 'chrome',
    size = 'sm',
    active,
    strokeWidth = 1.75,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={iconButtonClassName({ active, className, size, variant })}
      {...props}
    >
      <HugeiconsIcon icon={icon} size={size === 'lg' ? 20 : 18} strokeWidth={strokeWidth} />
    </button>
  )
})
