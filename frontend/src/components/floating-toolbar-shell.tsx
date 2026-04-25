import { forwardRef, type ReactNode } from 'react'

const shellClass =
  'theme-toolbar-shell pointer-events-auto z-10 inline-flex max-w-[min(100vw-2rem,720px)] items-stretch overflow-visible rounded-full border backdrop-blur-md'

type ShellProps = {
  children: ReactNode
  className?: string
  role?: string
  'aria-label'?: string
}

export const FloatingToolbarShell = forwardRef<HTMLDivElement, ShellProps>(
  function FloatingToolbarShell(
    { children, className = '', role, 'aria-label': ariaLabel },
    ref,
  ) {
    return (
      <div
        ref={ref}
        role={role}
        aria-label={ariaLabel}
        className={[shellClass, className].filter(Boolean).join(' ')}
      >
        {children}
      </div>
    )
  },
)

export function FloatingToolbarDivider() {
  return (
    <div
      className="mx-0.5 w-px shrink-0 self-center bg-black/10"
      style={{ height: '1.25rem', backgroundColor: 'var(--line)' }}
      aria-hidden
    />
  )
}

export function floatingToolbarIconButton(
  active: boolean,
  opts?: { wide?: boolean },
): string {
  const base = opts?.wide
    ? 'flex h-8 min-w-[2.75rem] shrink-0 items-center justify-center gap-0.5 rounded-lg px-1.5 text-[var(--text-muted)] outline-none transition-colors hover:bg-[var(--hover)]'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition-colors hover:bg-[var(--hover)]'
  return active ? `${base} bg-[var(--hover-strong)] text-[var(--text)]` : base
}

const floatingToolbarPopoverSurface =
  'z-50 rounded-xl border border-[var(--line)] bg-[var(--surface-overlay)] shadow-[var(--shadow-floating)]'

/** Use when the panel has nested flyouts; `overflow-hidden` would clip them. */
export const floatingToolbarPopoverMenuClass = floatingToolbarPopoverSurface

export const floatingToolbarPopoverClass = `${floatingToolbarPopoverSurface} overflow-hidden`
