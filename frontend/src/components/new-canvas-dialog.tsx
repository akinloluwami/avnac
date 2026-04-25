import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";
import { useEditorUnsupportedOnThisDevice } from "../hooks/use-editor-device-support";
import { ARTBOARD_PRESETS } from "../data/artboard-presets";

const CANVAS_MIN = 100;
const CANVAS_MAX = 16000;

type NewCanvasDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function NewCanvasDialog({
  open,
  onClose,
}: NewCanvasDialogProps) {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const editorUnsupported = useEditorUnsupportedOnThisDevice();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"presets" | "custom">("presets");
  const [customW, setCustomW] = useState("1920");
  const [customH, setCustomH] = useState("1080");
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("presets");
    setCustomError(null);
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const goCreate = (w: number, h: number, presetLabel?: string) => {
    const W = Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.round(w)));
    const H = Math.min(CANVAS_MAX, Math.max(CANVAS_MIN, Math.round(h)));
    posthog.capture("canvas_created", {
      width: W,
      height: H,
      creation_mode: presetLabel ? "preset" : "custom",
      preset_label: presetLabel ?? null,
    });
    void navigate({ to: "/create", search: { w: W, h: H } });
    onClose();
  };

  const submitCustom = () => {
    const w = Number.parseInt(customW.replace(/\s/g, ""), 10);
    const h = Number.parseInt(customH.replace(/\s/g, ""), 10);
    if (!Number.isFinite(w) || !Number.isFinite(h)) {
      setCustomError("Enter width and height as numbers.");
      return;
    }
    if (w < CANVAS_MIN || h < CANVAS_MIN) {
      setCustomError(`Minimum size is ${CANVAS_MIN}×${CANVAS_MIN}px.`);
      return;
    }
    if (w > CANVAS_MAX || h > CANVAS_MAX) {
      setCustomError(`Maximum size is ${CANVAS_MAX}×${CANVAS_MAX}px.`);
      return;
    }
    setCustomError(null);
    goCreate(w, h);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-[var(--overlay-backdrop)] backdrop-blur-[2px]"
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] w-full max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-6 backdrop-blur-md sm:p-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2
          id={titleId}
          className="display-title m-0 text-2xl font-medium tracking-[-0.02em] text-[var(--text)] sm:text-[1.75rem]"
        >
          {editorUnsupported ? "Desktop only" : "New canvas"}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-muted)]">
          {editorUnsupported
            ? "Avnac's editor is not available on mobile devices yet. Open this app on a desktop or laptop to create a new canvas."
            : "Pick a preset or set a custom artboard size."}
        </p>

        {editorUnsupported ? (
          <div className="mt-6">
            <a
              href="https://github.com/akinloluwami/avnac"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[#f6c56a]/60 bg-[linear-gradient(135deg,#fff7d6_0%,#ffe8a3_48%,#ffd36f_100%)] px-6 py-3 text-[15px] font-semibold text-[#3f2a00] no-underline shadow-[0_12px_30px_rgba(245,179,54,0.22),inset_0_1px_0_rgba(255,255,255,0.72)] transition-transform duration-200 hover:-translate-y-0.5 hover:text-[#2f1f00]"
            >
              <HugeiconsIcon
                icon={StarIcon}
                size={18}
                strokeWidth={1.9}
                className="shrink-0"
              />
              <span>Star us on GitHub</span>
            </a>
          </div>
        ) : (
          <>
            <div className="theme-segmented mt-6 flex gap-2 rounded-full border p-1">
              <button
                type="button"
                className={[
                  "min-h-10 flex-1 rounded-full text-sm font-medium transition-colors",
                  mode === "presets"
                    ? "bg-[var(--surface)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                ].join(" ")}
                onClick={() => setMode("presets")}
              >
                Presets
              </button>
              <button
                type="button"
                className={[
                  "min-h-10 flex-1 rounded-full text-sm font-medium transition-colors",
                  mode === "custom"
                    ? "bg-[var(--surface)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                ].join(" ")}
                onClick={() => setMode("custom")}
              >
                Customize
              </button>
            </div>

            {mode === "presets" ? (
              <ul className="mt-5 max-h-[min(52vh,22rem)] list-none space-y-2 overflow-y-auto overscroll-contain p-0 sm:max-h-[min(48vh,24rem)]">
                {ARTBOARD_PRESETS.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-[var(--hover)] px-4 py-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--hover-strong)]"
                      onClick={() => goCreate(p.width, p.height, p.label)}
                    >
                      <span className="min-w-0 text-[15px] font-medium text-[var(--text)]">
                        {p.label}
                      </span>
                      <span className="shrink-0 tabular-nums text-[13px] text-[var(--text-muted)]">
                        {p.width} × {p.height}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="avnac-new-canvas-w"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-subtle)]"
                    >
                      Width
                    </label>
                    <input
                      id="avnac-new-canvas-w"
                      type="text"
                      inputMode="numeric"
                      value={customW}
                      onChange={(e) => setCustomW(e.target.value)}
                      className="theme-input w-full rounded-xl border px-3 py-2.5 text-[15px] outline-none focus:border-[var(--button-secondary-border-hover)]"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="avnac-new-canvas-h"
                      className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-subtle)]"
                    >
                      Height
                    </label>
                    <input
                      id="avnac-new-canvas-h"
                      type="text"
                      inputMode="numeric"
                      value={customH}
                      onChange={(e) => setCustomH(e.target.value)}
                      className="theme-input w-full rounded-xl border px-3 py-2.5 text-[15px] outline-none focus:border-[var(--button-secondary-border-hover)]"
                      autoComplete="off"
                    />
                  </div>
                </div>
                {customError ? (
                  <p className="m-0 text-sm text-red-600">{customError}</p>
                ) : null}
                <button
                  type="button"
                  className="theme-primary-button inline-flex min-h-11 w-full items-center justify-center rounded-full px-6 py-2.5 text-[15px] font-medium"
                  onClick={() => submitCustom()}
                >
                  Create canvas
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex justify-end border-t border-[var(--line)] pt-5">
          <button
            type="button"
            className="theme-secondary-button min-h-10 rounded-full border px-5 text-[15px] font-medium transition-colors"
            onClick={onClose}
          >
            {editorUnsupported ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
