import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from './utils'

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'magic'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'border-black/[0.08] bg-black/[0.04] text-neutral-600',
  accent: 'border-orange-200 bg-orange-50 text-orange-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  magic: 'border-[#8B3DFF]/18 bg-[#8B3DFF]/8 text-[#6838ce]',
}

export function Badge({
  className,
  tone = 'neutral',
  children,
  ...props
}: ComponentPropsWithoutRef<'span'> & { tone?: BadgeTone }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]',
        badgeTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function Kicker({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'div'> & { children: ReactNode }) {
  return (
    <div
      className={cx(
        'text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-subtle)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function PageTitle({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'h1'> & { children: ReactNode }) {
  return (
    <h1
      className={cx(
        'display-title m-0 text-[clamp(2rem,6vw,4.25rem)] font-medium leading-[1.02] tracking-[-0.035em] text-[var(--text)]',
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export function SectionTitle({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<'h2'> & { children: ReactNode }) {
  return (
    <h2
      className={cx('m-0 text-xl font-semibold leading-tight text-neutral-950', className)}
      {...props}
    >
      {children}
    </h2>
  )
}

export function Text({
  className,
  tone = 'muted',
  children,
  ...props
}: ComponentPropsWithoutRef<'p'> & {
  tone?: 'default' | 'muted' | 'subtle'
  children: ReactNode
}) {
  return (
    <p
      className={cx(
        'm-0 leading-6',
        tone === 'default' && 'text-neutral-900',
        tone === 'muted' && 'text-neutral-600',
        tone === 'subtle' && 'text-neutral-500',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  )
}

export function StatusDot({
  tone = 'success',
  className,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'magic'
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-block size-2 rounded-full',
        tone === 'neutral' && 'bg-neutral-400',
        tone === 'success' && 'bg-emerald-500',
        tone === 'warning' && 'bg-amber-500',
        tone === 'danger' && 'bg-red-500',
        tone === 'magic' && 'bg-[#8B3DFF]',
        className,
      )}
    />
  )
}
