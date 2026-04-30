import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, FileExportIcon } from "@hugeicons/core-free-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { useViewportAwarePopoverPlacement } from "../hooks/use-viewport-aware-popover";
import EditorRangeSlider from "./editor-range-slider";
import { floatingToolbarPopoverMenuClass } from "./floating-toolbar-shell";

export type PngExportCrop = "none" | "selection" | "content";

export type ExportImageFormat = "png" | "jpg" | "webp" | "pdf";

export type ExportImageOptions = {
  format: ExportImageFormat;
  multiplier: number;
  transparent: boolean;
  flattenPdf?: boolean;
  crop?: PngExportCrop;
};

const DEFAULT_EXPORT: ExportImageOptions = {
  format: "png",
  multiplier: 1,
  transparent: false,
};

const PANEL_ESTIMATE_H = 360;

const exportTriggerClass = [
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-black/[0.08] px-4 text-sm font-medium sm:h-10 sm:px-5",
  "bg-gradient-to-br from-[#fafaf9] via-[#f2f0f3] to-[#ebe7f3]",
  "text-[var(--text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
  "outline-none transition-[background,box-shadow,filter] duration-200",
  "hover:from-[#f5f4f2] hover:via-[#eceaf1] hover:to-[#e5e0f2] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
  "focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]",
  "disabled:pointer-events-none disabled:opacity-40",
].join(" ");

const formatMeta: Record<ExportImageFormat, { label: string; note: string }> = {
  png: {
    label: "PNG",
    note: "Sharp graphics with optional transparency",
  },
  jpg: {
    label: "JPG",
    note: "Smaller files for photos and quick sharing",
  },
  webp: {
    label: "WebP",
    note: "Modern compression with transparency support",
  },
  pdf: {
    label: "PDF",
    note: "One document with every page included",
  },
};

type Props = {
  disabled?: boolean;
  onExport: (opts: ExportImageOptions) => void;
};

export default function EditorExportMenu({ disabled, onExport }: Props) {
  const [open, setOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [opts, setOpts] = useState<ExportImageOptions>(DEFAULT_EXPORT);
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
      setFormatOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) setFormatOpen(false);
  }, [open]);

  useEffect(() => {
    if (!formatOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setFormatOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [formatOpen]);

  const mult = Math.max(1, Math.min(3, Math.round(opts.multiplier)));
  const exportMult = opts.format === "pdf" ? 1 : mult;
  const transparentAllowed = opts.format !== "jpg" && opts.format !== "pdf";
  const chooseFormat = (format: ExportImageFormat) => {
    setOpts((p) => ({
      ...p,
      format,
      transparent: format === "jpg" || format === "pdf" ? false : p.transparent,
    }));
    setFormatOpen(false);
  };

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
          data-avnac-chrome
          className={[
            "absolute left-1/2 z-[100] min-w-[23rem]",
            openUpward ? "bottom-full mb-2" : "top-full mt-2",
            floatingToolbarPopoverMenuClass,
          ].join(" ")}
          style={{
            transform: `translateX(calc(-50% + ${shiftX}px))`,
          }}
          role="dialog"
          aria-label="Export"
        >
          <div className="border-b border-black/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,242,247,0.96))] px-4 py-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Download
            </div>
            <div className="mt-1 text-[15px] font-semibold text-neutral-900">
              Export your design
            </div>
          </div>

          <div className="space-y-3.5 p-3.5">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Format
              </div>
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={formatOpen}
                  className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-black/[0.08] bg-black/[0.02] px-3 text-left outline-none transition-[border-color,background-color,box-shadow] hover:bg-black/[0.035] focus-visible:border-neutral-900/20 focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(0,0,0,0.04)]"
                  onClick={() => setFormatOpen((value) => !value)}
                >
                  <span className="text-[13px] font-semibold text-neutral-900">
                    {formatMeta[opts.format].label}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    size={18}
                    strokeWidth={1.75}
                    className={[
                      "shrink-0 text-neutral-500 transition-transform duration-150",
                      formatOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>
                {formatOpen ? (
                  <div
                    role="listbox"
                    aria-label="Export format"
                    className="absolute inset-x-0 top-full z-[120] mt-1.5 overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.16)]"
                  >
                    {(["png", "jpg", "webp", "pdf"] as const).map((format) => {
                      const active = opts.format === format;
                      return (
                        <button
                          key={format}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={[
                            "mb-1.5 block w-full rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow]",
                            active
                              ? "border-neutral-900/12 bg-black/[0.035] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                              : "border-transparent bg-transparent hover:border-black/[0.06] hover:bg-black/[0.025]",
                          ].join(" ")}
                          onClick={() => chooseFormat(format)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-neutral-900">
                              {formatMeta[format].label}
                            </span>
                            {active ? (
                              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-[11.5px] leading-relaxed text-neutral-500">
                            {formatMeta[format].note}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <div className="mt-2 text-[11.5px] leading-relaxed text-neutral-500">
                {formatMeta[opts.format].note}
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-white p-3">
              {opts.format !== "pdf" ? (
                <>
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                      Scale
                    </span>
                    <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] font-medium tabular-nums text-neutral-700">
                      {mult}x
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
                    aria-label="Image export scale"
                    aria-valuemin={1}
                    aria-valuemax={3}
                    aria-valuenow={mult}
                    trackClassName={transparentAllowed ? "w-full" : "w-full"}
                  />
                </>
              ) : null}
              {transparentAllowed ? (
                <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px] text-neutral-800">
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
              ) : null}
              {opts.format === "pdf" ? (
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] text-neutral-800">
                  <input
                    type="checkbox"
                    checked={!!opts.flattenPdf}
                    onChange={(e) =>
                      setOpts((p) => ({ ...p, flattenPdf: e.target.checked }))
                    }
                    className="mt-0.5 size-4 shrink-0 rounded border border-black/20"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span>
                    <span className="block font-medium">Flatten PDF</span>
                    <span className="block text-[11.5px] leading-relaxed text-neutral-500">
                      Export each page as one image.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-black/[0.02] px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-neutral-700">
                  {formatMeta[opts.format].label}
                  {opts.format !== "pdf" ? ` • ${mult}x` : ""}
                  {transparentAllowed && opts.transparent
                    ? " • Transparent"
                    : ""}
                  {opts.format === "pdf" && opts.flattenPdf
                    ? " • Flattened"
                    : ""}
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-neutral-800"
                onClick={() => {
                  const finalOpts = {
                    ...opts,
                    multiplier: exportMult,
                    transparent: transparentAllowed ? opts.transparent : false,
                  };
                  posthog.capture("image_exported", {
                    format: finalOpts.format,
                    scale: finalOpts.multiplier,
                    transparent: finalOpts.transparent,
                    flattenPdf: finalOpts.flattenPdf,
                  });
                  onExport(finalOpts);
                  setOpen(false);
                }}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
