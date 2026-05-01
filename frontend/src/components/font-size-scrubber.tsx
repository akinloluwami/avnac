import ToolbarNumberScrubber from './toolbar-number-scrubber'

type FontSizeScrubberProps = {
  value: number
  min?: number
  max?: number
  onChange: (size: number) => void
}

export default function FontSizeScrubber({
  value,
  min = 8,
  max = 800,
  onChange,
}: FontSizeScrubberProps) {
  return (
    <ToolbarNumberScrubber
      value={value}
      min={min}
      max={max}
      onChange={onChange}
      ariaLabel="Font size. Drag horizontally to change, double-click to type"
      editTitle="Font size"
      title="Drag to change size · Shift for faster steps · Double-click to type"
    />
  )
}
