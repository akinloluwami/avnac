import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  QrCodeIcon,
} from '@hugeicons/core-free-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  editorSidebarPanelLeftClass,
  editorSidebarPanelTopClass,
} from '../lib/editor-sidebar-panel-layout'
import { useAiController } from './scene-editor/ai-controller-context'

type Props = {
  open: boolean
  onClose: () => void
}

type AppScreen = 'menu' | 'qr-code'

const QR_EXPORT_PX = 512
const QR_MARGIN = 1
const QR_ERROR_LEVEL = 'M' as const
const QR_ON_CANVAS_PX = 400

type QrColors = { dark: string; light: string }

const COLOR_DEFAULTS: QrColors = {
  dark: '#0a0a0a',
  light: '#ffffff',
}

function toQrDataUrl(
  url: string,
  colors: { dark: string; light: string },
): Promise<string> {
  return QRCode.toDataURL(url.trim(), {
    width: QR_EXPORT_PX,
    margin: QR_MARGIN,
    errorCorrectionLevel: QR_ERROR_LEVEL,
    color: { dark: colors.dark, light: colors.light },
  })
}

export default function EditorAppsPanel({ open, onClose }: Props) {
  const controller = useAiController()
  const [screen, setScreen] = useState<AppScreen>('menu')
  const [qrUrl, setQrUrl] = useState('')
  const [qrPreview, setQrPreview] = useState<string | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [qrColors, setQrColors] = useState({ ...COLOR_DEFAULTS })
  const previewGenRef = useRef(0)

  const resetQrForm = useCallback(() => {
    setQrUrl('')
    setQrPreview(null)
    setQrError(null)
    setQrColors({ ...COLOR_DEFAULTS })
  }, [])

  useEffect(() => {
    if (!open) return
    setScreen('menu')
    resetQrForm()
  }, [open, resetQrForm])

  useEffect(() => {
    if (!open || screen !== 'qr-code') return
    const t = qrUrl.trim()
    if (!t) {
      setQrPreview(null)
      setQrError(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      const gen = ++previewGenRef.current
      void toQrDataUrl(t, qrColors).then(
        (dataUrl) => {
          if (cancelled || gen !== previewGenRef.current) return
          setQrPreview(dataUrl)
          setQrError(null)
        },
        () => {
          if (cancelled || gen !== previewGenRef.current) return
          setQrPreview(null)
          setQrError('Could not build a QR code for this URL.')
        },
      )
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, screen, qrUrl, qrColors])

  const addQrToCanvas = async () => {
    const t = qrUrl.trim()
    if (!t) return
    setAdding(true)
    setQrError(null)
    try {
      const dataUrl = await toQrDataUrl(t, qrColors)
      await controller.addImageFromUrl({
        url: dataUrl,
        origin: 'center',
        width: QR_ON_CANVAS_PX,
        height: QR_ON_CANVAS_PX,
      })
      onClose()
    } catch {
      setQrError('Could not add this QR code to the canvas.')
    } finally {
      setAdding(false)
    }
  }

  if (!open) return null

  return (
    <div
      data-avnac-chrome
      className={[
        'pointer-events-auto fixed z-40 flex w-[min(100vw-1.5rem,340px)] max-h-[min(92dvh,720px)] flex-col overflow-hidden rounded-3xl border border-black/[0.08] bg-white/95 backdrop-blur-md',
        editorSidebarPanelLeftClass,
        editorSidebarPanelTopClass,
      ].join(' ')}
      role="dialog"
      aria-label="Apps"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {screen !== 'menu' ? (
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-black/[0.06]"
              onClick={() => setScreen('menu')}
              aria-label="Back to apps"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={18}
                strokeWidth={1.75}
              />
            </button>
          ) : null}
          <span className="truncate text-sm font-semibold text-neutral-800">
            {screen === 'menu' ? 'Apps' : 'QR code'}
          </span>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-black/[0.06]"
          onClick={onClose}
          aria-label="Close apps"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.75} />
        </button>
      </div>

      {screen === 'menu' ? (
        <div className="flex flex-col gap-1 p-2">
          <button
            type="button"
            onClick={() => setScreen('qr-code')}
            className="flex w-full items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-3 py-3 text-left transition-colors hover:bg-[var(--surface-subtle)]"
          >
            <HugeiconsIcon
              icon={QrCodeIcon}
              size={22}
              strokeWidth={1.75}
              className="shrink-0 text-neutral-700"
            />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-neutral-900">
                QR code
              </div>
              <div className="text-[11.5px] text-neutral-500">
                Encode a URL and place it on the artboard.
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <label className="block text-[11px] font-medium text-neutral-600">
            URL
            <input
              type="url"
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-black/[0.08] bg-white px-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/45"
              placeholder="https://example.com"
              autoComplete="url"
              inputMode="url"
            />
          </label>

          <details className="group rounded-xl border border-black/[0.08] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-[13px] font-semibold text-neutral-900">
                Customize
              </span>
              <span
                className="flex size-7 shrink-0 items-center justify-center text-neutral-500 transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0"
                >
                  <path
                    d="M2.5 4.25L6 7.75L9.5 4.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </summary>
            <div className="border-t border-black/[0.06] px-3 pb-3 pt-1">
              <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
                <span className="text-[13px] text-neutral-900">Background color</span>
                <span className="relative size-9 shrink-0">
                  <input
                    type="color"
                    value={qrColors.light}
                    onChange={(e) =>
                      setQrColors((c) => ({ ...c, light: e.target.value }))
                    }
                    className="absolute inset-0 z-10 size-9 cursor-pointer opacity-0"
                    aria-label="QR background color"
                  />
                  <span
                    className="pointer-events-none block size-9 rounded-full border border-black/[0.12] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
                    style={{ backgroundColor: qrColors.light }}
                  />
                </span>
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
                <span className="text-[13px] text-neutral-900">Foreground color</span>
                <span className="relative size-9 shrink-0">
                  <input
                    type="color"
                    value={qrColors.dark}
                    onChange={(e) =>
                      setQrColors((c) => ({ ...c, dark: e.target.value }))
                    }
                    className="absolute inset-0 z-10 size-9 cursor-pointer opacity-0"
                    aria-label="QR foreground color"
                  />
                  <span
                    className="pointer-events-none block size-9 rounded-full border border-black/[0.12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                    style={{ backgroundColor: qrColors.dark }}
                  />
                </span>
              </label>
            </div>
          </details>

          {qrError ? (
            <p className="text-[12px] text-red-600">{qrError}</p>
          ) : null}

          {qrPreview ? (
            <div className="flex justify-center rounded-xl border border-black/[0.06] bg-white p-3">
              <img
                src={qrPreview}
                alt="QR code preview"
                width={200}
                height={200}
                className="size-[200px] max-w-full bg-white"
              />
            </div>
          ) : (
            <p className="text-center text-[12px] text-neutral-500">
              Enter a URL to see a live preview.
            </p>
          )}

          <div className="mt-auto border-t border-black/[0.06] pt-2">
            <button
              type="button"
              disabled={adding || !qrUrl.trim() || !qrPreview}
              onClick={() => void addQrToCanvas()}
              className="w-full rounded-xl bg-[var(--text)] px-3 py-2.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add to canvas'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
