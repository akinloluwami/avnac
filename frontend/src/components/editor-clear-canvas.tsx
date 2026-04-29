import { RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

// similar class as the adjacent export button next to it 
const triggerClass = [
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-black/[0.08] px-4 text-sm font-medium sm:h-10 sm:px-5",
  "bg-gradient-to-br from-[#fafaf9] via-[#f2f0f3] to-[#ebe7f3]",
  "text-[var(--text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
  "outline-none transition-[background,box-shadow,filter] duration-200",
  "hover:from-[#f5f4f2] hover:via-[#eceaf1] hover:to-[#e5e0f2] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");

type Props = {
  onClearCanvas?: () => void;
};

export default function EditorClearCanvas({ onClearCanvas }: Props) {
    return (
        <button
            type="button"
            className={triggerClass}
            title="Clear canvas"
            onClick={onClearCanvas}
        >
            <HugeiconsIcon
                icon={RefreshIcon}
                size={18}
                strokeWidth={1.75}
                className="shrink-0 text-neutral-800"
            />
            <span className="text-[var(--text)]">Clear Canvas</span>
        </button>
    )
}