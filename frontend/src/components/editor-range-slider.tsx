export const editorRangeInputClassName = [
  'relative z-10 h-8 w-full cursor-pointer appearance-none bg-transparent',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/45 focus-visible:ring-offset-1',
  'rounded-full disabled:cursor-not-allowed disabled:opacity-40',
  '[&::-webkit-slider-runnable-track]:h-0 [&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-webkit-slider-thumb]:-mt-2.5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0',
  '[&::-webkit-slider-thumb]:bg-white',
  '[&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(59,130,246,0.14),0_1px_4px_rgba(0,0,0,0.12)]',
  '[&::-moz-range-track]:h-0 [&::-moz-range-track]:bg-transparent',
  '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0',
  '[&::-moz-range-thumb]:bg-white',
  '[&::-moz-range-thumb]:shadow-[0_2px_8px_rgba(59,130,246,0.14),0_1px_4px_rgba(0,0,0,0.12)]',
].join(' ')

type EditorRangeSliderProps = {
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  id?: string
  'aria-label'?: string
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  'aria-valuenow'?: number
  /** Tailwind classes for the track wrapper (height is fixed h-8 to match thumb). */
  trackClassName?: string
}

export default function EditorRangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  disabled,
  id,
  'aria-label': ariaLabel,
  'aria-valuemin': ariaValuemin,
  'aria-valuemax': ariaValuemax,
  'aria-valuenow': ariaValuenow,
  trackClassName = 'w-full min-w-[6rem]',
}: EditorRangeSliderProps) {
  return (
    <div
      className={['relative flex h-8 shrink-0 items-center', trackClassName]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="pointer-events-none absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-neutral-300/90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-2 top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-500"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-2 top-1/2 size-[5px] translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-500"
        aria-hidden
      />
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-valuemin={ariaValuemin}
        aria-valuemax={ariaValuemax}
        aria-valuenow={ariaValuenow}
        onChange={e => onChange(Number(e.target.value))}
        className={editorRangeInputClassName}
      />
    </div>
  )
}
