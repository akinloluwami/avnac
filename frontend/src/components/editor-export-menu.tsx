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

export type ExportSvgOptions = {
  transparent: boolean;
};

export type ExportFormat = "png" | "svg";

const DEFAULT_PNG: ExportPngOptions = {
  multiplier: 1,
  transparent: false,
};

const DEFAULT_SVG: ExportSvgOptions = {
  transparent: false,
};

const PANEL_ESTIMATE_H = 260;

const exportTriggerClass = [
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-black/[0.08] px-4 text-sm font-medium sm:h-10 sm:px-5",
  "bg-gradient-to-br from-[#fafaf9] via-[#f2f0f3] to-[#ebe7f3]",
  "text-[var(--text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
  "outline-none transition-[background,box-shadow,filter] duration-200",
  "hover:from-[#f5f4f2] hover:via-[#eceaf1] hover:to-[#e5e0f2] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");

const formatTabClass = (active: boolean) =>
  [
    "flex-1 rounded-md py-1.5 text-[12px] font-medium transition-colors",
    active
      ? "bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
      : "text-neutral-600 hover:text-neutral-900",
  ].join(" ");

type Props = {
  disabled?: boolean;
  onExport: (opts: ExportPngOptions) => void;
  onExportSvg?: (opts: ExportSvgOptions) => void;
};

export default function EditorExportMenu({
  disabled,
  onExport,
  onExportSvg,
}: Props) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [pngOpts, setPngOpts] = useState<ExportPngOptions>(DEFAULT_PNG);
  const [svgOpts, setSvgOpts] = useState<ExportSvgOptions>(DEFAULT_SVG);
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

  const mult = Math.max(1, Math.min(3, Math.round(pngOpts.multiplier)));

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
          className="shrink-0 text-neutral-800"
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
          <div
            className="mb-3 flex gap-1 rounded-lg bg-black/[0.04] p-1"
            role="tablist"
            aria-label="Export format"
          >
            <button
              type="button"
              role="tab"
              aria-selected={format === "png"}
              className={formatTabClass(format === "png")}
              onClick={() => setFormat("png")}
            >
              PNG
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={format === "svg"}
              className={formatTabClass(format === "svg")}
              onClick={() => setFormat("svg")}
            >
              SVG
            </button>
          </div>

          {format === "png" ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-neutral-800">
                  Export scale
                </span>
                <span className="text-[13px] tabular-nums text-neutral-600">
                  {mult}×
                </span>
              </div>
              <EditorRangeSlider
                min={1}
                max={3}
                step={1}
                value={mult}
                onChange={(n) =>
                  setPngOpts((p) => ({ ...p, multiplier: Math.round(n) }))
                }
                aria-label="PNG export scale"
                aria-valuemin={1}
                aria-valuemax={3}
                aria-valuenow={mult}
                trackClassName="mb-4 w-full"
              />
              <label className="mb-4 flex cursor-pointer items-center gap-2.5 text-[13px] text-neutral-800">
                <input
                  type="checkbox"
                  checked={pngOpts.transparent}
                  onChange={(e) =>
                    setPngOpts((p) => ({ ...p, transparent: e.target.checked }))
                  }
                  className="size-4 shrink-0 rounded border border-black/20"
                  style={{ accentColor: "var(--accent)" }}
                />
                Transparent background
              </label>
              <button
                type="button"
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800"
                onClick={() => {
                  const finalOpts = { ...pngOpts, multiplier: mult };
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
            </>
          ) : (
            <>
              <p className="mb-3 text-[12px] leading-snug text-neutral-600">
                Vector export. Scales infinitely without quality loss.
              </p>
              <label className="mb-4 flex cursor-pointer items-center gap-2.5 text-[13px] text-neutral-800">
                <input
                  type="checkbox"
                  checked={svgOpts.transparent}
                  onChange={(e) =>
                    setSvgOpts((p) => ({ ...p, transparent: e.target.checked }))
                  }
                  className="size-4 shrink-0 rounded border border-black/20"
                  style={{ accentColor: "var(--accent)" }}
                />
                Transparent background
              </label>
              <button
                type="button"
                disabled={!onExportSvg}
                className="w-full rounded-lg bg-neutral-900 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
                onClick={() => {
                  if (!onExportSvg) return;
                  posthog.capture("svg_exported", {
                    transparent: svgOpts.transparent,
                  });
                  onExportSvg(svgOpts);
                  setOpen(false);
                }}
              >
                Download SVG
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
