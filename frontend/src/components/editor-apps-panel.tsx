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
import type { AiDesignController } from '../lib/avnac-ai-controller'

type Props = {
  open: boolean
  onClose: () => void
  controller: AiDesignController
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

export default function EditorAppsPanel({ open, onClose, controller }: Props) {
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
        'theme-sidebar-panel pointer-events-auto fixed z-40 flex w-[min(100vw-1.5rem,340px)] max-h-[min(92dvh,720px)] flex-col overflow-hidden rounded-3xl border backdrop-blur-md',
        editorSidebarPanelLeftClass,
        editorSidebarPanelTopClass,
      ].join(' ')}
      role="dialog"
      aria-label="Apps"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {screen !== 'menu' ? (
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--hover)]"
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
          <span className="truncate text-sm font-semibold text-[var(--text)]">
            {screen === 'menu' ? 'Apps' : 'QR code'}
          </span>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--hover)]"
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
            className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-overlay)] px-3 py-3 text-left transition-colors hover:bg-[var(--surface-soft)]"
          >
            <HugeiconsIcon
              icon={QrCodeIcon}
              size={22}
              strokeWidth={1.75}
              className="shrink-0 text-[var(--text-muted)]"
            />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[var(--text)]">
                QR code
              </div>
              <div className="text-[11.5px] text-[var(--text-muted)]">
                Encode a URL and place it on the artboard.
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <label className="block text-[11px] font-medium text-[var(--text-muted)]">
            URL
            <input
              type="url"
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              className="theme-input mt-1 h-10 w-full rounded-xl border px-2.5 text-[13px] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/45"
              placeholder="https://example.com"
              autoComplete="url"
              inputMode="url"
            />
          </label>

          <details className="group rounded-xl border border-[var(--line)] bg-[var(--surface-overlay)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-[13px] font-semibold text-[var(--text)]">
                Customize
              </span>
              <span
                className="flex size-7 shrink-0 items-center justify-center text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180"
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
            <div className="border-t border-[var(--line)] px-3 pb-3 pt-1">
              <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
                <span className="text-[13px] text-[var(--text)]">Background color</span>
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
                    className="pointer-events-none block size-9 rounded-full border border-[var(--border-strong)] bg-[var(--surface-overlay-strong)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
                    style={{ backgroundColor: qrColors.light }}
                  />
                </span>
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
                <span className="text-[13px] text-[var(--text)]">Foreground color</span>
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
                    className="pointer-events-none block size-9 rounded-full border border-[var(--border-strong)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
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
            <div className="flex justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-overlay)] p-3">
              <img
                src={qrPreview}
                alt="QR code preview"
                width={200}
                height={200}
                className="size-[200px] max-w-full bg-[var(--surface-overlay-strong)]"
              />
            </div>
          ) : (
            <p className="text-center text-[12px] text-[var(--text-muted)]">
              Enter a URL to see a live preview.
            </p>
          )}

          <div className="mt-auto border-t border-[var(--line)] pt-2">
            <button
              type="button"
              disabled={adding || !qrUrl.trim() || !qrPreview}
              onClick={() => void addQrToCanvas()}
              className="theme-primary-button w-full rounded-xl px-3 py-2.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add to canvas'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
