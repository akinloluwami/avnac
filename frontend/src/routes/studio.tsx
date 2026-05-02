import {
  AppleIcon,
  CommandLineIcon,
  GithubIcon,
  WindowsNewIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/studio')({
  component: StudioPage,
})

type Sticker = {
  id: string
  src: string
  label: string
  rotation: number
  size: string
  desktop: { x: number; y: number }
  mobile: { x: number; y: number }
}

const initialStickers: Sticker[] = [
  {
    id: 'sunflower',
    src: '/stickers/sunflower-badge.webp',
    label: 'Sunflower sticker',
    rotation: 6,
    size: 'clamp(5.6rem, 10.8vw, 8.8rem)',
    desktop: { x: 74, y: 12 },
    mobile: { x: 37, y: 15 },
  },
  {
    id: 'star',
    src: '/stickers/shooting-star-badge.webp',
    label: 'Shooting star sticker',
    rotation: -7,
    size: 'clamp(4.4rem, 8.8vw, 7.4rem)',
    desktop: { x: 9, y: 12 },
    mobile: { x: 7, y: 16 },
  },
  {
    id: 'pineapple',
    src: '/stickers/pineapple.webp',
    label: 'Pineapple sticker',
    rotation: 7,
    size: 'clamp(5.4rem, 11.2vw, 9.1rem)',
    desktop: { x: 77, y: 70 },
    mobile: { x: 68, y: 74 },
  },
  {
    id: 'donut',
    src: '/stickers/donut.webp',
    label: 'Donut sticker',
    rotation: -8,
    size: 'clamp(4.9rem, 9.6vw, 8rem)',
    desktop: { x: 16, y: 73 },
    mobile: { x: 8, y: 76 },
  },
  {
    id: 'lollipop',
    src: '/stickers/lollipop.webp',
    label: 'Lollipop sticker',
    rotation: 12,
    size: 'clamp(4.1rem, 8vw, 6.5rem)',
    desktop: { x: 80, y: 45 },
    mobile: { x: 72, y: 15 },
  },
  {
    id: 'leaf',
    src: '/stickers/leaf.webp',
    label: 'Leaf sticker',
    rotation: -11,
    size: 'clamp(4rem, 7.8vw, 6.2rem)',
    desktop: { x: 11, y: 47 },
    mobile: { x: 40, y: 77 },
  },
]

type DragState = {
  mode: 'drag' | 'rotate'
  id: string
  pointerId: number
  startClientX: number
  startClientY: number
  startLeft: number
  startTop: number
  startRotation: number
  centerX: number
  centerY: number
  startPointerAngle: number
  width: number
  height: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI
}

function useCompactLayout() {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false,
  )
  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])
  return compact
}

const primaryButtonClass =
  'landing-primary-button inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-medium no-underline sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]'

const secondaryButtonClass =
  'inline-flex min-h-12 items-center justify-center rounded-full border border-black/14 bg-white/78 px-8 py-3.5 text-base font-medium text-(--text) no-underline backdrop-blur-sm hover:border-black/22 hover:bg-white sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]'

const textLinkClass =
  'font-medium text-(--text) underline decoration-black/15 underline-offset-4 transition-colors hover:text-black'

const sectionLabelClass = 'text-xs font-bold uppercase tracking-[0.12em] text-(--text-subtle)'

const sectionLabelInverseClass = 'text-xs font-bold uppercase tracking-[0.12em] text-dark/80'

const releasePageHref = 'https://github.com/striker561/Avnac-Studio/releases/latest'

const studioRepoHref = 'https://github.com/striker561/Avnac-Studio'

const studioBranchHref = 'https://github.com/striker561/Avnac-Studio/tree/studio'

const striker561TwitterHref = 'https://twitter.com/insigdev'
const d3uceyTwitterHref = 'https://twitter.com/d3uc3y'

const downloadLinks = [
  {
    label: 'Windows',
    title: 'Windows installer',
    body: 'One-click installer for the latest desktop release.',
    href: 'https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-windows-amd64-installer.exe',
    icon: WindowsNewIcon,
    badge: 'Latest',
  },
  {
    label: 'macOS',
    title: 'Arm64 DMG',
    body: 'Apple Silicon Macs.',
    href: 'https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-macos-arm64.dmg',
    icon: AppleIcon,
    badge: 'Recommended',
  },
  {
    label: 'macOS Intel',
    title: 'Intel DMG',
    body: 'Separate build for x86_64 Macs.',
    href: 'https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-macos-amd64.dmg',
    icon: AppleIcon,
    badge: 'Intel only',
  },
  {
    label: 'Linux',
    title: 'amd64 binary',
    body: 'Portable Linux binary from the latest release.',
    href: 'https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-linux-amd64',
    icon: CommandLineIcon,
    badge: 'Portable',
  },
] as const


const comparisonRows = [
  {
    label: 'Where it runs',
    studio: 'Installed desktop app',
    web: 'Browser tab',
  },
  {
    label: 'Where files live',
    studio: 'A local app folder on your computer',
    web: 'Browser storage',
  },
  {
    label: 'Offline use',
    studio: 'Ready after install',
    web: 'Needs the browser',
  },
  {
    label: 'Saving and export',
    studio: 'Native file dialogs',
    web: 'Browser downloads',
  },
  {
    label: 'Best fit',
    studio: 'People who want a local desktop workflow',
    web: 'People who want instant browser access',
  },
] as const

const capabilityCards = [
  {
    eyebrow: 'Projects',
    title: 'Keep your files on your computer.',
    body: 'Studio stores work in a local app folder, so your projects are not tied to browser storage alone.',
  },
  {
    eyebrow: 'Workflow',
    title: 'Use the familiar canvas in a desktop app.',
    body: 'You still get the Avnac editing flow, but with native open, save, and export behavior around it.',
  },
  {
    eyebrow: 'Releases',
    title: 'Follow one fork for builds and desktop work.',
    body: 'The Studio fork publishes releases, tracks branch changes, and keeps desktop-specific work in one place.',
  },
] as const

const commandCards = [
  {
    eyebrow: 'Install Go first',
    body: 'Wails depends on Go, so install and verify Go before anything else.',
    command:
      'macOS:   brew install go\nWindows: winget install -e --id GoLang.Go\nLinux:   sudo apt update && sudo apt install golang-go\ngo version',
  },
  {
    eyebrow: 'Install Wails',
    body: 'After Go is ready, install the Wails CLI once.',
    command: 'go install github.com/wailsapp/wails/v2/cmd/wails@latest\nwails doctor',
  },
  {
    eyebrow: 'Run the desktop app',
    body: 'Start the full desktop build with native bindings.',
    command: 'cd frontend\nnpm install\ncd ..\nwails dev',
  },
  {
    eyebrow: 'Frontend only',
    body: 'Use this when you are only changing the UI.',
    command: 'cd frontend\nnpm install\nnpm run dev',
  },
] as const

function StudioPage() {
  const [stickers, setStickers] = useState(initialStickers)
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null)
  const stickerLayerRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const compact = useCompactLayout()

  const updateStickerPosition = useCallback(
    (stickerId: string, clientX: number, clientY: number) => {
      const layer = stickerLayerRef.current
      const dragState = dragStateRef.current
      if (!layer || !dragState || dragState.id !== stickerId) return

      if (dragState.mode === 'rotate') {
        const pointerAngle = Math.atan2(clientY - dragState.centerY, clientX - dragState.centerX)
        const rotation =
          dragState.startRotation + radiansToDegrees(pointerAngle - dragState.startPointerAngle)
        setStickers(current =>
          current.map(s => (s.id === stickerId ? { ...s, rotation } : s)),
        )
        return
      }

      const layerRect = layer.getBoundingClientRect()
      const positionKey = compact ? 'mobile' : 'desktop'
      const nextLeft = clamp(
        dragState.startLeft + (clientX - dragState.startClientX),
        0,
        Math.max(layerRect.width - dragState.width, 0),
      )
      const nextTop = clamp(
        dragState.startTop + (clientY - dragState.startClientY),
        0,
        Math.max(layerRect.height - dragState.height, 0),
      )
      setStickers(current =>
        current.map(s =>
          s.id === stickerId
            ? {
              ...s,
              [positionKey]: {
                x: (nextLeft / Math.max(layerRect.width, 1)) * 100,
                y: (nextTop / Math.max(layerRect.height, 1)) * 100,
              },
            }
            : s,
        ),
      )
    },
    [compact],
  )

  const endDrag = (pointerId: number, target: EventTarget | null) => {
    if (dragStateRef.current?.pointerId !== pointerId) return
    if (target instanceof HTMLElement && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
    dragStateRef.current = null
    setActiveStickerId(null)
  }

  return (
    <main className="landing-page">
      <section className="hero-page relative flex min-h-dvh flex-col justify-center overflow-hidden px-5 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
        <div className="hero-bg-orb hero-bg-orb-a" aria-hidden="true" />
        <div className="hero-bg-orb hero-bg-orb-b" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div ref={stickerLayerRef} className="hero-sticker-layer" aria-hidden="true">
          {stickers.map(sticker =>
            (() => {
              const pos = compact ? sticker.mobile : sticker.desktop
              return (
                <div
                  key={sticker.id}
                  className={`hero-sticker-frame ${activeStickerId === sticker.id ? 'is-active' : ''}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: sticker.size,
                    transform: `rotate(${sticker.rotation}deg)`,
                    zIndex: activeStickerId === sticker.id ? 3 : 1,
                  }}
                  onPointerDown={e => {
                    const layer = stickerLayerRef.current
                    if (!layer) return
                    const layerRect = layer.getBoundingClientRect()
                    const stickerLeft = (pos.x / 100) * Math.max(layerRect.width, 1)
                    const stickerTop = (pos.y / 100) * Math.max(layerRect.height, 1)
                    dragStateRef.current = {
                      mode: 'drag',
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
                    }
                    setActiveStickerId(sticker.id)
                    e.currentTarget.setPointerCapture(e.pointerId)
                  }}
                  onPointerMove={e => updateStickerPosition(sticker.id, e.clientX, e.clientY)}
                  onPointerUp={e => endDrag(e.pointerId, e.target)}
                  onPointerCancel={e => endDrag(e.pointerId, e.target)}
                >
                  <span className="hero-sticker-selection" />
                  <span className="hero-sticker-handle hero-sticker-handle-nw" />
                  <span
                    className="hero-sticker-rotation-arm"
                    onPointerDown={e => {
                      e.stopPropagation()
                      const frame = e.currentTarget.parentElement
                      if (!frame) return
                      const frameRect = frame.getBoundingClientRect()
                      const centerX = frameRect.left + frameRect.width / 2
                      const centerY = frameRect.top + frameRect.height / 2
                      dragStateRef.current = {
                        mode: 'rotate',
                        id: sticker.id,
                        pointerId: e.pointerId,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        startLeft: 0,
                        startTop: 0,
                        startRotation: sticker.rotation,
                        centerX,
                        centerY,
                        startPointerAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
                        width: frameRect.width,
                        height: frameRect.height,
                      }
                      setActiveStickerId(sticker.id)
                      frame.setPointerCapture(e.pointerId)
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
              )
            })(),
          )}
        </div>

        <div className="relative z-1 mx-auto w-full max-w-3xl">
          <div className="rise-in text-left">
            <div className={sectionLabelClass}>Desktop release</div>
            <h1 className="display-title hero-headline mb-8 font-medium text-balance text-(--text) sm:mb-10 lg:mb-12">
              Download Avnac Studio.
            </h1>
            <p className="mb-10 max-w-xl text-lg leading-[1.6] text-(--text-muted) sm:mb-12 sm:text-xl sm:leading-[1.55] lg:text-[1.375rem] lg:leading-normal">
              Avnac Studio is the desktop fork of Avnac. It packages the editor as a native app for
              Windows, macOS, and Linux, with local files and native save dialogs.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a href="#platform-downloads" className={primaryButtonClass}>
                Pick your platform
              </a>
            </div>

            <div className="mt-10 rounded-[1.6rem] border border-black/8 bg-white/72 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-black/5 text-(--text)">
                  <HugeiconsIcon icon={GithubIcon} size={18} strokeWidth={1.75} />
                </span>
                <div className={sectionLabelClass}>Independent fork</div>
              </div>
              <p className="mt-3 text-[15px] leading-7 text-(--text-muted)">
                Avnac Studio is independently maintained by{' '}
                <a
                  href="https://github.com/striker561"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={textLinkClass}
                >
                  striker561
                </a>{' '}
                and{' '}
                <a
                  href="https://github.com/d3uceY"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={textLinkClass}
                >
                  d3uceY
                </a>
                . It lives in the{' '}
                <a
                  href={studioRepoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={textLinkClass}
                >
                  Avnac Studio fork
                </a>{' '}
                and is not maintained by{' '}
                <a
                  href="https://github.com/akinloluwami"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={textLinkClass}
                >
                  akinloluwami
                </a>{' '}
                or the upstream Avnac project.
              </p>
              <div className="mt-5 flex flex-wrap gap-5">
                <a
                  href={striker561TwitterHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow striker561 on Twitter"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text) transition-opacity hover:opacity-70"
                >
                  <span className="text-base">𝕏</span>
                  @insigdev
                </a>
                <a
                  href={d3uceyTwitterHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow d3uceY on Twitter"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text) transition-opacity hover:opacity-70"
                >
                  <span className="text-base">𝕏</span>
                  @d3uc3y
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform-downloads" className="landing-section landing-section-tight">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div className={sectionLabelClass}>Download</div>
            <h2 className="display-title landing-section-title">Pick your platform.</h2>
            <p className="landing-section-copy">
              Every button below follows the newest GitHub release, so this page does not need
              version-by-version link updates.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {downloadLinks.map(item => (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-copy-card flex h-full flex-col no-underline transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-black/5 text-(--text)">
                    <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.75} />
                  </span>
                  <span className="rounded-full border border-black/8 bg-black/3 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--text-subtle)">
                    {item.badge}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-semibold text-(--text)">{item.label}</div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
                <div className="mt-auto pt-5 text-sm font-medium text-(--text)">
                  Download latest
                </div>
              </a>
            ))}
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-black/10 bg-white/70 px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-md">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div>
                  <div className={sectionLabelClass}>Windows note</div>
                  <h3 className="mt-2 text-base font-semibold text-(--text)">
                    Windows SmartScreen Warning
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-muted)">
                    Windows may block the installer with a SmartScreen prompt. 
                  </p>
                </div>
                <span className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-(--text-subtle) transition-opacity group-open:opacity-0">
                  Expand
                </span>
              </summary>

              <div className="mt-5 space-y-5 border-t border-black/8 pt-5">
                <div>
                  <h4 className="text-sm font-semibold text-(--text)">Get past SmartScreen in two clicks</h4>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-(--text-muted)">
                    <li>When the SmartScreen dialog appears, click <strong>More info</strong></li>
                    <li>Click <strong>Run anyway</strong></li>
                  </ol>
                  <p className="mt-3 text-sm leading-6 text-(--text-muted)">
                    Full walkthrough with screenshots:{' '}
                    <a
                      href="https://www.screensaversplanet.com/help/guides/windows/how-to-bypass-windows-smartscreen-49"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={textLinkClass}
                    >
                      How to bypass Windows SmartScreen
                    </a>
                    .
                  </p>
                </div>

                <p className="text-sm leading-6 text-(--text-muted)">
                  It&apos;s safe — just unsigned. The full source is{' '}
                  <a href={studioRepoHref} target="_blank" rel="noopener noreferrer" className={textLinkClass}>
                    open on GitHub
                  </a>
                  . Prefer to compile it yourself?{' '}
                  <a href="#developer-setup" className={textLinkClass}>
                    Build steps are below.
                  </a>
                </p>
              </div>
            </details>
          </div>


          <div className="mt-6 rounded-[1.4rem] border border-black/10 bg-white/70 px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-md">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div>
                  <div className={sectionLabelClass}>macOS note</div>
                  <h3 className="mt-2 text-base font-semibold text-(--text)">
                    macOS Security Notice (First Launch)
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-muted)">
                    If macOS blocks Avnac Studio from opening, the app is not yet signed with Apple.
                    This is expected for early releases.
                  </p>
                </div>
                <span className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-(--text-subtle) transition-opacity group-open:opacity-0">
                  Expand
                </span>
              </summary>

              <div className="mt-5 space-y-5 border-t border-black/8 pt-5">
                <div>
                  <h4 className="text-sm font-semibold text-(--text)">
                    Try this first (recommended)
                  </h4>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-(--text-muted)">
                    <li>Locate Avnac.app in Finder</li>
                    <li>Right-click the app</li>
                    <li>Click Open</li>
                    <li>Confirm by clicking Open again</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-(--text)">Alternative method</h4>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-(--text-muted)">
                    <li>Open System Settings</li>
                    <li>Go to Privacy &amp; Security</li>
                    <li>Scroll down to Security</li>
                    <li>Click Allow Anyway next to Avnac Studio</li>
                    <li>Try opening the app again</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-(--text)">
                    Advanced (only if it still doesn&apos;t open)
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                    Open Terminal and run:
                  </p>
                  <pre className="mt-2 overflow-x-auto rounded-xl border border-black/8 bg-[#111111] px-4 py-3 text-sm text-white">
                    <code>xattr -rd com.apple.quarantine /Applications/Avnac.app</code>
                  </pre>
                  <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                    Then try opening the app again.
                  </p>
                </div>

                <p className="text-sm leading-6 text-(--text-muted)">
                  This is a temporary limitation of the current release due to macOS security
                  requirements. We&apos;re working toward removing this in a future update.
                </p>
              </div>
            </details>
          </div>

          <div className="mt-8 rounded-[1.8rem] border border-black/8 bg-white/78 px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-md">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className={sectionLabelClass}>Repository</div>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-(--text-muted)">
                  Releases are published from{' '}
                  <a
                    href={studioRepoHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={textLinkClass}
                  >
                    striker561/Avnac-Studio
                  </a>
                  , and active desktop development lives on the{' '}
                  <a
                    href={studioBranchHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={textLinkClass}
                  >
                    studio branch
                  </a>
                  .
                </p>
              </div>
              <a
                href={studioBranchHref}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryButtonClass}
              >
                View studio branch
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-process-shell">
            <div className="landing-process-header">
              <div>
                <div className={sectionLabelInverseClass}>Desktop or web</div>
                <h2 className="display-title landing-process-title">
                  Choose the version that fits your workflow.
                </h2>
              </div>
              <p>
                Both versions follow the same editor direction. The main difference is whether you
                want a local desktop install or a browser-based workflow.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.6rem] border border-black/8 bg-white/78 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-2xl border-collapse text-left">
                  <thead className="bg-black/3 text-sm text-(--text-subtle)">
                    <tr>
                      <th className="px-5 py-4 font-medium">Area</th>
                      <th className="px-5 py-4 font-medium">Avnac Studio</th>
                      <th className="px-5 py-4 font-medium">Avnac web</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map(row => (
                      <tr key={row.label} className="border-t border-black/6 align-top">
                        <th className="px-5 py-4 text-sm font-semibold text-(--text)">
                          {row.label}
                        </th>
                        <td className="px-5 py-4 text-sm leading-6 text-(--text-muted)">
                          {row.studio}
                        </td>
                        <td className="px-5 py-4 text-sm leading-6 text-(--text-muted)">
                          {row.web}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div className={sectionLabelClass}>Why Studio</div>
            <h2 className="display-title landing-section-title">What you get on desktop.</h2>
            <p className="landing-section-copy">
              Studio keeps the Avnac editor familiar while making the surrounding workflow feel like
              a proper desktop app.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {capabilityCards.map(card => (
              <article key={card.title} className="landing-copy-card flex h-full flex-col">
                <div className={sectionLabelClass}>{card.eyebrow}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="developer-setup" className="landing-section">
        <div className="landing-container">
          <div className="landing-ai-shell">
            <div className="landing-ai-header">
              <div className={sectionLabelClass}>For developers</div>
              <h2 className="display-title landing-section-title">Working on the desktop fork?</h2>
              <p className="landing-section-copy">
                These commands are based on the Studio setup flow, with Go first and Wails second.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {commandCards.map(card => (
                <article key={card.eyebrow} className="landing-ai-card min-w-0! flex h-full flex-col">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-black/5 text-(--text)">
                      <HugeiconsIcon icon={CommandLineIcon} size={18} strokeWidth={1.75} />
                    </span>
                    <div className="landing-kicker">{card.eyebrow}</div>
                  </div>
                  <p className="mt-4">{card.body}</p>
                  <pre className="mt-6 h-43 min-w-0! overflow-x-auto rounded-[1.2rem] bg-[#111111] px-4 py-4 text-sm leading-7 text-white">
                    <code className="block whitespace-pre-wrap">{card.command}</code>
                  </pre>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-last">
        <div className="landing-container">
          <div className="landing-cta-band landing-cta-band-only">
            <div>
              <div className={sectionLabelClass}>Maintained independently</div>
              <h2 className="display-title landing-cta-title">
                Follow the Studio fork for desktop builds and updates.
              </h2>
            </div>
            <div className="landing-cta-actions">
              <a
                href={releasePageHref}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryButtonClass}
              >
                Open releases
              </a>
              <a
                href={studioBranchHref}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryButtonClass}
              >
                View studio branch
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
