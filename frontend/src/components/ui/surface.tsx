import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react'
import { cx } from './utils'

type SurfaceVariant = 'page' | 'panel' | 'raised' | 'chrome' | 'canvas' | 'subtle'
type SurfacePadding = 'none' | 'xs' | 'sm' | 'md' | 'lg'
type SurfaceRadius = 'sm' | 'md' | 'lg' | 'xl' | 'full'

const surfaceVariants: Record<SurfaceVariant, string> = {
  page: 'border-transparent bg-[var(--surface-subtle)]',
  panel:
    'border-black/[0.08] bg-white/95 shadow-[0_16px_44px_rgba(15,23,42,0.08)] backdrop-blur-md',
  raised:
    'border-black/[0.08] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08),0_1px_0_rgba(255,255,255,0.72)_inset]',
  chrome:
    'border-black/[0.08] bg-white/88 shadow-[0_8px_30px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.75)_inset] backdrop-blur-xl',
  canvas: 'border-black/[0.08] bg-[#f7f7f5] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.74)]',
  subtle: 'border-black/[0.06] bg-black/[0.025]',
}

const surfacePadding: Record<SurfacePadding, string> = {
  none: '',
  xs: 'p-2',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

const surfaceRadius: Record<SurfaceRadius, string> = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  full: 'rounded-full',
}

export type SurfaceProps = ComponentPropsWithoutRef<'div'> & {
  variant?: SurfaceVariant
  padding?: SurfacePadding
  radius?: SurfaceRadius
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { className, variant = 'panel', padding = 'md', radius = 'lg', ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        'border text-neutral-900',
        surfaceVariants[variant],
        surfacePadding[padding],
        surfaceRadius[radius],
        className,
      )}
      {...props}
    />
  )
})

export type PanelProps = SurfaceProps & {
  title?: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { title, eyebrow, description, actions, children, className, padding = 'none', ...props },
  ref,
) {
  return (
    <Surface ref={ref} padding={padding} className={cx('overflow-hidden', className)} {...props}>
      {title || eyebrow || description || actions ? (
        <div className="flex min-h-12 items-start justify-between gap-4 border-b border-black/[0.06] px-4 py-3">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                {eyebrow}
              </div>
            ) : null}
            {title ? <h2 className="m-0 text-sm font-semibold text-neutral-900">{title}</h2> : null}
            {description ? (
              <p className="m-0 mt-1 text-[12.5px] leading-5 text-neutral-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Surface>
  )
})

export type ToolbarProps = ComponentPropsWithoutRef<'div'> & {
  compact?: boolean
}

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar(
  { className, compact, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="toolbar"
      className={cx(
        'pointer-events-auto inline-flex items-center rounded-full border border-black/[0.08] bg-white/90 shadow-[0_6px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl',
        compact ? 'gap-0.5 px-1 py-1' : 'gap-1 px-1.5 py-1.5',
        className,
      )}
      {...props}
    />
  )
})

export const ToolbarGroup = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  function ToolbarGroup({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cx(
          'relative inline-flex items-center gap-0.5 rounded-full border border-black/[0.06] bg-black/[0.025] p-0.5',
          className,
        )}
        {...props}
      />
    )
  },
)

export type PopoverSurfaceProps = ComponentPropsWithoutRef<'div'> & {
  width?: string
}

export const PopoverSurface = forwardRef<HTMLDivElement, PopoverSurfaceProps>(
  function PopoverSurface({ className, width = 'w-72', style, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cx(
          'z-50 overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_18px_48px_rgba(0,0,0,0.14)]',
          width,
          className,
        )}
        style={style}
        {...props}
      />
    )
  },
)

export function Divider({
  orientation = 'horizontal',
}: {
  orientation?: 'horizontal' | 'vertical'
}) {
  if (orientation === 'vertical') {
    return <div aria-hidden className="mx-1 h-5 w-px shrink-0 bg-black/10" />
  }

  return <div aria-hidden className="h-px w-full bg-black/[0.07]" />
}
