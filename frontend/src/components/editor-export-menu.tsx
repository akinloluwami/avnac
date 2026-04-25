import { HugeiconsIcon } from "@hugeicons/react";
import { FileExportIcon } from "@hugeicons/core-free-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { useViewportAwarePopoverPlacement } from "../hooks/use-viewport-aware-popover";
import EditorRangeSlider from "./editor-range-slider";
import { floatingToolbarPopoverClass } from "./floating-toolbar-shell";

export type PngExportCrop = "none" | "selection" | "content";

export type ExportPngOptions = {
  multiplier: number;
  transparent: boolean;
  crop?: PngExportCrop;
};

const DEFAULT_EXPORT: ExportPngOptions = {
  multiplier: 1,
  transparent: false,
};

const PANEL_ESTIMATE_H = 220;

const exportTriggerClass = [
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[var(--line)] px-4 text-sm font-medium sm:h-10 sm:px-5",
  "bg-[linear-gradient(135deg,var(--surface-overlay-strong)_0%,var(--surface-soft)_55%,var(--surface-subtle)_100%)]",
  "text-[var(--text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
  "outline-none transition-[background,box-shadow,filter] duration-200",
  "hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
  "focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");

type Props = {
  disabled?: boolean;
  onExport: (opts: ExportPngOptions) => void;
};

export default function EditorExportMenu({ disabled, onExport }: Props) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ExportPngOptions>(DEFAULT_EXPORT);
  const posthog = usePostHog();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pickPanel = useCallback(() => panelRef.current, []);

  const { openUpward, shiftX } = useViewportAwarePopoverPlacement(
    open,
    rootRef,
    PANEL_ESTIMATE_H,
    pickPanel,
    "center",
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const mult = Math.max(1, Math.min(3, Math.round(opts.multiplier)));

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        className={exportTriggerClass}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Export"
        onClick={() => setOpen((o) => !o)}
      >
        <HugeiconsIcon
          icon={FileExportIcon}
          size={18}
          strokeWidth={1.75}
          className="shrink-0 text-[var(--text)]"
        />
        <span className="text-[var(--text)]">Export</span>
      </button>
      {open ? (
        <div
          ref={panelRef}
          className={[
            "absolute left-1/2 z-[100] min-w-[16rem] p-3",
            openUpward ? "bottom-full mb-2" : "top-full mt-2",
            floatingToolbarPopoverClass,
          ].join(" ")}
          style={{
            transform: `translateX(calc(-50% + ${shiftX}px))`,
          }}
          role="dialog"
          aria-label="Export"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-[var(--text)]">
              Export scale
            </span>
            <span className="text-[13px] tabular-nums text-[var(--text-muted)]">
              {mult}×
            </span>
          </div>
          <EditorRangeSlider
            min={1}
            max={3}
            step={1}
            value={mult}
            onChange={(n) =>
              setOpts((p) => ({ ...p, multiplier: Math.round(n) }))
            }
            aria-label="PNG export scale"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={mult}
            trackClassName="mb-4 w-full"
          />
          <label className="mb-4 flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--text)]">
            <input
              type="checkbox"
              checked={opts.transparent}
              onChange={(e) =>
                setOpts((p) => ({ ...p, transparent: e.target.checked }))
              }
              className="size-4 shrink-0 rounded border border-black/20"
              style={{ accentColor: "var(--accent)" }}
            />
            Transparent background
          </label>
          <button
            type="button"
            className="theme-primary-button w-full rounded-lg py-2.5 text-[13px] font-medium transition-colors"
            onClick={() => {
              const finalOpts = { ...opts, multiplier: mult };
              posthog.capture("png_exported", {
                scale: finalOpts.multiplier,
                transparent: finalOpts.transparent,
              });
              onExport(finalOpts);
              setOpen(false);
            }}
          >
            Download PNG
          </button>
        </div>
      ) : null}
    </div>
  );
}
