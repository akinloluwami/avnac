import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cx } from './utils'

const fieldControlBase =
  'w-full border border-black/[0.08] bg-white px-3 text-sm text-neutral-900 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-neutral-400 focus:border-neutral-900/20 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-neutral-400'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cx('grid gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-[12px] font-semibold text-neutral-700">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="m-0 text-[12px] leading-5 text-red-600">{error}</p>
      ) : hint ? (
        <p className="m-0 text-[12px] leading-5 text-neutral-500">{hint}</p>
      ) : null}
    </div>
  )
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return (
      <input ref={ref} className={cx(fieldControlBase, 'h-10 rounded-xl', className)} {...props} />
    )
  },
)

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cx(fieldControlBase, 'min-h-24 resize-none rounded-xl py-2.5', className)}
      {...props}
    />
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cx(fieldControlBase, 'h-10 rounded-xl pr-8', className)}
        {...props}
      >
        {children}
      </select>
    )
  },
)

export function CheckboxOption({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  description?: string
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 transition-colors hover:bg-black/[0.025]',
        props.disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-black/20"
        style={{ accentColor: 'var(--accent)' }}
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-neutral-900">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[12px] leading-5 text-neutral-500">{description}</span>
        ) : null}
      </span>
    </label>
  )
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  className,
  disabled,
}: {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  description?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cx(
        'flex w-full items-center justify-between gap-4 rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-left outline-none transition-[background-color,border-color,box-shadow] hover:bg-black/[0.025] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <span className="min-w-0">
        {label ? <span className="block text-sm font-medium text-neutral-900">{label}</span> : null}
        {description ? (
          <span className="mt-0.5 block text-[12px] leading-5 text-neutral-500">{description}</span>
        ) : null}
      </span>
      <span
        className={cx(
          'relative h-6 w-10 shrink-0 rounded-full transition-colors',
          checked ? 'bg-neutral-950' : 'bg-neutral-200',
        )}
      >
        <span
          className={cx(
            'absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[1.25rem]' : 'translate-x-1',
          )}
        />
      </span>
    </button>
  )
}

export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  className,
}: {
  label?: string
  value: number
  onChange?: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  className?: string
}) {
  return (
    <div className={cx('grid gap-2', className)}>
      {label ? (
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="font-semibold text-neutral-700">{label}</span>
          <span className="tabular-nums text-neutral-500">
            {value}
            {unit}
          </span>
        </div>
      ) : null}
      <div className="relative flex h-8 items-center">
        <div className="pointer-events-none absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-neutral-300" />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={event => onChange?.(Number(event.target.value))}
          className="relative z-10 h-8 w-full cursor-pointer appearance-none rounded-full bg-transparent accent-[var(--accent)]"
        />
      </div>
    </div>
  )
}

type SwatchSize = 'sm' | 'md' | 'lg'

const swatchSizes: Record<SwatchSize, string> = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10',
}

export function ColorSwatch({
  color,
  label,
  selected,
  size = 'md',
  className,
  ...props
}: ComponentPropsWithoutRef<'button'> & {
  color: string
  label: string
  selected?: boolean
  size?: SwatchSize
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-black/[0.1] bg-white p-1 outline-none transition-[box-shadow,transform] hover:scale-105 focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45',
        selected && 'shadow-[0_0_0_2px_var(--accent)]',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cx('block rounded-full border border-black/[0.08]', swatchSizes[size])}
        style={{ background: color }}
      />
    </button>
  )
}
