import { AiMagicIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import NewCanvasDialog from "../components/new-canvas-dialog";
import { idbListDocuments } from "../lib/avnac-editor-idb";

export const Route = createFileRoute("/")({ component: Landing });

type Sticker = {
  id: string;
  src: string;
  label: string;
  rotation: number;
  size: string;
  desktop: {
    x: number;
    y: number;
  };
  mobile: {
    x: number;
    y: number;
  };
};

const initialStickers: Sticker[] = [
  {
    id: "sunflower",
    src: "/stickers/sunflower-badge.webp",
    label: "Sunflower sticker",
    rotation: 6,
    size: "clamp(5.6rem, 10.8vw, 8.8rem)",
    desktop: { x: 74, y: 12 },
    mobile: { x: 37, y: 15 },
  },
  {
    id: "star",
    src: "/stickers/shooting-star-badge.webp",
    label: "Shooting star sticker",
    rotation: -7,
    size: "clamp(4.4rem, 8.8vw, 7.4rem)",
    desktop: { x: 9, y: 12 },
    mobile: { x: 7, y: 16 },
  },
  {
    id: "pineapple",
    src: "/stickers/pineapple.webp",
    label: "Pineapple sticker",
    rotation: 7,
    size: "clamp(5.4rem, 11.2vw, 9.1rem)",
    desktop: { x: 77, y: 70 },
    mobile: { x: 68, y: 74 },
  },
  {
    id: "donut",
    src: "/stickers/donut.webp",
    label: "Donut sticker",
    rotation: -8,
    size: "clamp(4.9rem, 9.6vw, 8rem)",
    desktop: { x: 16, y: 73 },
    mobile: { x: 8, y: 76 },
  },
  {
    id: "lollipop",
    src: "/stickers/lollipop.webp",
    label: "Lollipop sticker",
    rotation: 12,
    size: "clamp(4.1rem, 8vw, 6.5rem)",
    desktop: { x: 80, y: 45 },
    mobile: { x: 72, y: 15 },
  },
  {
    id: "leaf",
    src: "/stickers/leaf.webp",
    label: "Leaf sticker",
    rotation: -11,
    size: "clamp(4rem, 7.8vw, 6.2rem)",
    desktop: { x: 11, y: 47 },
    mobile: { x: 40, y: 77 },
  },
];

const capabilityCards = [
  {
    eyebrow: "Start fast",
    title: "Open a canvas and begin immediately.",
    body:
      "Avnac opens straight into the work. Presets and custom sizes make it easy to set up posters, graphics, and layout studies.",
  },
  {
    eyebrow: "Compose visually",
    title: "Work with the pieces you actually use.",
    body:
      "Text, shapes, images, vector boards, and layer controls are already part of the editor.",
  },
  {
    eyebrow: "Keep going",
    title: "Stay in the browser and export when ready.",
    body:
      "Files autosave in this browser, reopen from the files view, and export to PNG with scale and transparency options.",
  },
] as const;

const workflowSteps = [
  {
    step: "01",
    title: "Create the canvas",
    body:
      "Pick a preset or set your own dimensions.",
  },
  {
    step: "02",
    title: "Build with the editor tools",
    body:
      "Add text, shapes, images, QR codes, and vector boards, then organize with layers and styling controls.",
  },
  {
    step: "03",
    title: "Keep working and export",
    body:
      "Your work autosaves in this browser, and you can export a PNG when it is ready to leave the canvas.",
  },
] as const;

const aiHighlights = [
  {
    eyebrow: "Prompt-based",
    title: "Describe a layout or a single edit.",
    body:
      "Magic can respond to full design prompts or smaller changes inside the current composition.",
  },
  {
    eyebrow: "Canvas-aware",
    title: "It can read the artboard before acting.",
    body:
      "The AI tools can inspect canvas size, background, and existing objects before making changes.",
  },
  {
    eyebrow: "Image-aware",
    title: "It can place images from prompts too.",
    body:
      "Magic can search Unsplash, choose a match, and place imagery directly on the artboard.",
  },
] as const;

type DragState = {
  mode: "drag" | "rotate";
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLeft: number;
  startTop: number;
  startRotation: number;
  centerX: number;
  centerY: number;
  startPointerAngle: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function useCompactHeroStickerLayout() {
  const [compact, setCompact] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 640px)").matches
      : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return compact;
}

function Landing() {
  const navigate = Route.useNavigate();
  const [newCanvasOpen, setNewCanvasOpen] = useState(false);
  const [savedFileCount, setSavedFileCount] = useState<number | null>(null);
  const [stickers, setStickers] = useState(initialStickers);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const posthog = usePostHog();
  const stickerLayerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const compactHeroStickerLayout = useCompactHeroStickerLayout();

  useEffect(() => {
    let cancelled = false;
    void idbListDocuments()
      .then((docs) => {
        if (!cancelled) setSavedFileCount(docs.length);
      })
      .catch(() => {
        if (!cancelled) setSavedFileCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStickerPosition = useCallback((
    stickerId: string,
    clientX: number,
    clientY: number,
  ) => {
    const layer = stickerLayerRef.current;
    const dragState = dragStateRef.current;
    if (!layer || !dragState || dragState.id !== stickerId) {
      return;
    }

    if (dragState.mode === "rotate") {
      const pointerAngle = Math.atan2(
        clientY - dragState.centerY,
        clientX - dragState.centerX,
      );
      const rotation =
        dragState.startRotation +
        radiansToDegrees(pointerAngle - dragState.startPointerAngle);

      setStickers((current) =>
        current.map((sticker) =>
          sticker.id === stickerId ? { ...sticker, rotation } : sticker,
        ),
      );
      return;
    }

    const layerRect = layer.getBoundingClientRect();
    const positionKey = compactHeroStickerLayout ? "mobile" : "desktop";
    const nextLeft = clamp(
      dragState.startLeft + (clientX - dragState.startClientX),
      0,
      Math.max(layerRect.width - dragState.width, 0),
    );
    const nextTop = clamp(
      dragState.startTop + (clientY - dragState.startClientY),
      0,
      Math.max(layerRect.height - dragState.height, 0),
    );

    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === stickerId
          ? {
              ...sticker,
              [positionKey]: {
                x: (nextLeft / Math.max(layerRect.width, 1)) * 100,
                y: (nextTop / Math.max(layerRect.height, 1)) * 100,
              },
            }
          : sticker,
      ),
    );
  }, [compactHeroStickerLayout]);

  const endDrag = (pointerId: number, target: EventTarget | null) => {
    if (dragStateRef.current?.pointerId !== pointerId) {
      return;
    }

    if (target instanceof HTMLElement && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }

    dragStateRef.current = null;
    setActiveStickerId(null);
  };

  const openEditor = useCallback(() => {
    void (async () => {
      try {
        const docs = await idbListDocuments();
        setSavedFileCount(docs.length);
        const destination = docs.length > 0 ? "/files" : "/create";
        posthog.capture("editor_opened", {
          source: "landing_hero",
          destination,
          existing_file_count: docs.length,
        });
        if (docs.length > 0) {
          await navigate({ to: "/files" });
          return;
        }
      } catch (err) {
        posthog.captureException(err);
      }
      setNewCanvasOpen(true);
    })();
  }, [navigate, posthog]);

  const hasSavedFiles = (savedFileCount ?? 0) > 0;
  const primaryCtaLabel = hasSavedFiles ? "Open files" : "Open editor";
  const heroBody = hasSavedFiles
    ? "You already have saved work in this browser. Open your files and keep editing."
    : "Avnac is an open canvas for layouts, posters, and graphics.";
  const ctaKicker = hasSavedFiles ? "Back to work" : "Ready to make something";
  const ctaTitle = hasSavedFiles
    ? "Open your files and keep going."
    : "Open a canvas and make something.";

  return (
    <main className="landing-page">
      <section className="hero-page relative flex min-h-[100dvh] flex-col justify-center overflow-hidden px-5 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
        <div className="hero-bg-orb hero-bg-orb-a" aria-hidden="true" />
        <div className="hero-bg-orb hero-bg-orb-b" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div ref={stickerLayerRef} className="hero-sticker-layer" aria-hidden="true">
          {stickers.map((sticker) => (
            (() => {
              const pos = compactHeroStickerLayout
                ? sticker.mobile
                : sticker.desktop;

              return (
                <div
                  key={sticker.id}
                  className={`hero-sticker-frame ${activeStickerId === sticker.id ? "is-active" : ""}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: sticker.size,
                    transform: `rotate(${sticker.rotation}deg)`,
                    zIndex: activeStickerId === sticker.id ? 3 : 1,
                  }}
                  onPointerDown={(e) => {
                    const layer = stickerLayerRef.current;
                    if (!layer) {
                      return;
                    }

                    const layerRect = layer.getBoundingClientRect();
                    const stickerLeft =
                      (pos.x / 100) * Math.max(layerRect.width, 1);
                    const stickerTop =
                      (pos.y / 100) * Math.max(layerRect.height, 1);

                    dragStateRef.current = {
                      mode: "drag",
                      id: sticker.id,
                      pointerId: e.pointerId,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startLeft: stickerLeft,
                      startTop: stickerTop,
                      startRotation: sticker.rotation,
                      centerX:
                        e.currentTarget.getBoundingClientRect().left +
                        e.currentTarget.offsetWidth / 2,
                      centerY:
                        e.currentTarget.getBoundingClientRect().top +
                        e.currentTarget.offsetHeight / 2,
                      startPointerAngle: 0,
                      width: e.currentTarget.offsetWidth,
                      height: e.currentTarget.offsetHeight,
                    };
                    setActiveStickerId(sticker.id);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    updateStickerPosition(sticker.id, e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    endDrag(e.pointerId, e.target);
                  }}
                  onPointerCancel={(e) => {
                    endDrag(e.pointerId, e.target);
                  }}
                >
                  <span className="hero-sticker-selection" />
                  <span className="hero-sticker-handle hero-sticker-handle-nw" />
                  <span
                    className="hero-sticker-rotation-arm"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const frame = e.currentTarget.parentElement;
                      if (!frame) {
                        return;
                      }

                      const frameRect = frame.getBoundingClientRect();
                      const centerX = frameRect.left + frameRect.width / 2;
                      const centerY = frameRect.top + frameRect.height / 2;

                      dragStateRef.current = {
                        mode: "rotate",
                        id: sticker.id,
                        pointerId: e.pointerId,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        startLeft: 0,
                        startTop: 0,
                        startRotation: sticker.rotation,
                        centerX,
                        centerY,
                        startPointerAngle: Math.atan2(
                          e.clientY - centerY,
                          e.clientX - centerX,
                        ),
                        width: frameRect.width,
                        height: frameRect.height,
                      };
                      setActiveStickerId(sticker.id);
                      frame.setPointerCapture(e.pointerId);
                    }}
                  >
                    <span className="hero-sticker-rotation-handle" />
                  </span>
                  <span className="hero-sticker-handle hero-sticker-handle-ne" />
                  <span className="hero-sticker-handle hero-sticker-handle-e" />
                  <span className="hero-sticker-handle hero-sticker-handle-se" />
                  <span className="hero-sticker-handle hero-sticker-handle-s" />
                  <span className="hero-sticker-handle hero-sticker-handle-sw" />
                  <span className="hero-sticker-handle hero-sticker-handle-w" />
                  <img
                    src={sticker.src}
                    alt={sticker.label}
                    className="hero-sticker-image"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </div>
              );
            })()
          ))}
        </div>
        <div className="relative z-[1] mx-auto w-full max-w-3xl">
          <div className="rise-in text-left">
            <h1 className="display-title hero-headline mb-8 font-medium text-balance text-[var(--text)] sm:mb-10 lg:mb-12">
              Design in the browser,
              <br />
              openly.
            </h1>
            <p className="mb-10 max-w-xl text-lg leading-[1.6] text-[var(--text-muted)] sm:mb-12 sm:text-xl sm:leading-[1.55] lg:text-[1.375rem] lg:leading-[1.5]">
              {heroBody}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="bg-black text-white inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-0 px-10 py-3.5 text-base font-medium sm:min-h-14 sm:px-12 sm:py-4 sm:text-[1.0625rem]"
                onClick={openEditor}
              >
                {primaryCtaLabel}
              </button>
              <Link
                to="/studio"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/14 bg-white/85 px-8 py-3.5 text-base font-medium text-(--text) no-underline backdrop-blur-sm hover:border-black/22 hover:bg-white sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]"
              >
                Avnac Studio
              </Link>
              <a
                href="https://github.com/akinloluwami/avnac"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/[0.14] bg-white/70 px-8 py-3.5 text-base font-medium text-[var(--text)] no-underline backdrop-blur-sm hover:border-black/[0.22] hover:bg-white sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-tight">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div className="landing-kicker">Inside the editor</div>
            <h2 className="display-title landing-section-title">
              For posters, layouts, and graphics.
            </h2>
            <p className="landing-section-copy">
              A lightweight canvas for composing visual work in the browser.
            </p>
          </div>

          <div className="landing-feature-grid">
            <article className="landing-feature-spotlight">
              <div className="landing-feature-window">
                <div className="landing-feature-toolbar">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="landing-feature-canvas">
                  <div className="landing-feature-card landing-feature-card-a">
                    <span className="landing-feature-chip">Canvas</span>
                    <strong>Preset or custom artboards</strong>
                    <p>Start from common sizes or enter exact dimensions.</p>
                  </div>
                  <div className="landing-feature-card landing-feature-card-b">
                    <span className="landing-feature-chip">Assets</span>
                    <strong>Your own assets or photos from Unsplash</strong>
                    <p>Bring imagery onto the artboard without leaving the editor.</p>
                  </div>
                  <div className="landing-feature-card landing-feature-card-c">
                    <span className="landing-feature-chip">Controls</span>
                    <strong>Layers, blur, crop, vector boards</strong>
                    <p>Use the browser editor to refine and organize elements.</p>
                  </div>
                </div>
              </div>
            </article>

            <div className="landing-feature-list">
              {capabilityCards.map((feature) => (
                <article key={feature.title} className="landing-copy-card">
                  <div className="landing-kicker">{feature.eyebrow}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-process-shell">
            <div className="landing-process-header">
              <div>
                <div className="landing-kicker landing-kicker-inverse">
                  Workflow
                </div>
                <h2 className="display-title landing-process-title">
                  From blank canvas to finished graphic.
                </h2>
              </div>
              <p>
                The flow is simple: create a file, build the composition, keep
                iterating in the browser, and export when it is ready.
              </p>
            </div>

            <div className="landing-process-grid">
              {workflowSteps.map((step) => (
                <article key={step.step} className="landing-process-card">
                  <span>{step.step}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-ai-shell">
            <div className="landing-ai-header">
              <div className="landing-kicker landing-ai-kicker">
                <HugeiconsIcon
                  icon={AiMagicIcon}
                  size={14}
                  strokeWidth={1.9}
                  className="landing-ai-kicker-icon"
                />
                <span>AI</span>
              </div>
              <h2 className="display-title landing-section-title">
                Magic can turn prompts into edits on the canvas.
              </h2>
              <p className="landing-section-copy">
                The editor includes a Magic panel for prompt-based changes. It
                can work from broad layout instructions or smaller refinement
                requests inside the current design.
              </p>
            </div>

            <div className="landing-ai-grid">
              <article className="landing-ai-hero-card">
                <div className="landing-ai-hero-label">Magic beta</div>
                <p>
                  Ask for a poster, a headline treatment, a new element, or a
                  change to what is already on the board.
                </p>
                <div className="landing-ai-prompt-list">
                  <span>“Design a bold typographic poster for a jazz night.”</span>
                  <span>“Find an Unsplash image and place it behind the title.”</span>
                  <span>“Tighten the layout and make the headline larger.”</span>
                </div>
              </article>

              <div className="landing-ai-card-list">
                {aiHighlights.map((item) => (
                  <article key={item.title} className="landing-ai-card">
                    <div className="landing-kicker">{item.eyebrow}</div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-last">
        <div className="landing-container">
          <div className="landing-cta-band landing-cta-band-only">
            <div>
              <div className="landing-kicker">{ctaKicker}</div>
              <h2 className="display-title landing-cta-title">
                {ctaTitle}
              </h2>
            </div>
            <div className="landing-cta-actions">
              <button
                type="button"
                className="bg-black text-white min-h-12 cursor-pointer items-center justify-center rounded-full border-0 px-10 py-3.5 text-base font-medium sm:min-h-14 sm:px-12 sm:py-4 sm:text-[1.0625rem]"
                onClick={openEditor}
              >
                {primaryCtaLabel}
              </button>
              <a
                href="https://github.com/akinloluwami/avnac"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/[0.14] bg-white/85 px-8 py-3.5 text-base font-medium text-[var(--text)] no-underline hover:border-black/[0.22] hover:bg-white sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]"
              >
                View source
              </a>
            </div>
          </div>
        </div>
      </section>

      <NewCanvasDialog
        open={newCanvasOpen}
        onClose={() => setNewCanvasOpen(false)}
      />
    </main>
  );
}
