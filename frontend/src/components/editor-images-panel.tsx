import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { useCallback, useEffect, useState } from 'react'
import {
  editorSidebarPanelLeftClass,
  editorSidebarPanelTopClass,
} from '../lib/editor-sidebar-panel-layout'
import { useAiController } from './scene-editor/ai-controller-context'
import type { UnsplashPhoto } from '../lib/unsplash-api'
import {
  fetchUnsplashPopular,
  fetchUnsplashSearch,
  scaleUnsplashToPlaceBox,
  trackUnsplashDownload,
  UNSPLASH_PLACE_MAX_EDGE_PX,
} from '../lib/unsplash-api'

type Props = {
  open: boolean
  onClose: () => void
}

const DEBOUNCE_MS = 380

function unsplashReferralLink(absoluteUrl: string): string {
  try {
    const u = new URL(absoluteUrl)
    u.searchParams.set('utm_source', 'avnac')
    u.searchParams.set('utm_medium', 'referral')
    return u.toString()
  } catch {
    return absoluteUrl
  }
}

export default function EditorImagesPanel({ open, onClose }: Props) {
  const controller = useAiController()
  const [input, setInput] = useState('')
  const [committed, setCommitted] = useState({ q: '', page: 1 })
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      const next = input.trim()
      setCommitted((c) => (c.q === next ? c : { q: next, page: 1 }))
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [open, input])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const run = async () => {
      const { q, page: pg } = committed
      if (pg === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)
      const res =
        q.length === 0
          ? await fetchUnsplashPopular(pg)
          : await fetchUnsplashSearch(q, pg)
      if (cancelled) return
      if (res.error) {
        setError(res.error)
        setLoading(false)
        setLoadingMore(false)
        return
      }
      setPhotos((prev) => (pg === 1 ? res.photos : [...prev, ...res.photos]))
      setHasMore(res.hasMore)
      setLoading(false)
      setLoadingMore(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [open, committed])

  useEffect(() => {
    if (!open) {
      setInput('')
      setCommitted({ q: '', page: 1 })
      setPhotos([])
      setHasMore(false)
      setError(null)
      setAddingId(null)
    }
  }, [open])

  const addPhoto = useCallback(
    async (photo: UnsplashPhoto) => {
      setAddingId(photo.id)
      setError(null)
      try {
        try {
          await trackUnsplashDownload(photo.links.download_location)
        } catch {
          /* placement still allowed */
        }
        const { width, height } = scaleUnsplashToPlaceBox(
          photo.width,
          photo.height,
          UNSPLASH_PLACE_MAX_EDGE_PX,
        )
        const r = await controller.addImageFromUrl({
          url: photo.urls.regular,
          origin: 'center',
          width,
          height,
        })
        if (!r) {
          setError('Could not add this image to the canvas.')
          return
        }
        onClose()
      } finally {
        setAddingId(null)
      }
    },
    [controller, onClose],
  )

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
      aria-label="Images"
    >
      <div className="flex shrink-0 items-start justify-between border-b border-black/[0.06] px-3 py-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-neutral-800">Images</div>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            <a
              href={unsplashReferralLink('https://unsplash.com/')}
              target="_blank"
              rel="noreferrer"
              className="text-neutral-600 underline-offset-2 hover:underline"
            >
              Powered by Unsplash
            </a>
          </p>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-black/[0.06]"
          onClick={onClose}
          aria-label="Close images"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-black/[0.06] p-2">
            <label className="relative block">
              <span className="sr-only">Search Unsplash</span>
              <HugeiconsIcon
                icon={Search01Icon}
                size={16}
                strokeWidth={1.75}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search Unsplash…"
                autoComplete="off"
                className="h-10 w-full rounded-xl border border-black/[0.08] bg-white pl-9 pr-3 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/45"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {error ? (
              <p className="px-1 py-2 text-[12px] text-red-600">{error}</p>
            ) : null}

            {photos.length === 0 && !loading && !error ? (
              <p className="px-1 py-6 text-center text-[12px] text-neutral-500">
                No photos found.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {photos.map((photo) => {
                  const label =
                    photo.description ??
                    photo.alt_description ??
                    'Unsplash photo'
                  const busy = addingId === photo.id
                  const profileUrl = unsplashReferralLink(photo.user.links.html)
                  return (
                    <li key={photo.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void addPhoto(photo)}
                        className="group flex w-full flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white text-left transition-colors hover:border-black/[0.12] disabled:opacity-60"
                      >
                        <span className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                          <img
                            src={photo.urls.small}
                            alt={label}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                          {busy ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[11px] font-medium text-white">
                              Adding…
                            </span>
                          ) : null}
                        </span>
                        <span className="border-t border-black/[0.06] px-1.5 py-1.5">
                          <span className="line-clamp-2 text-[10.5px] leading-snug text-neutral-600">
                            <a
                              href={profileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-neutral-800 underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {photo.user.name}
                            </a>
                            <span className="text-neutral-400"> on </span>
                            <a
                              href={unsplashReferralLink('https://unsplash.com/')}
                              target="_blank"
                              rel="noreferrer"
                              className="underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Unsplash
                            </a>
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {hasMore && photos.length > 0 ? (
              <div className="p-2 pt-1">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() =>
                    setCommitted((c) => ({ ...c, page: c.page + 1 }))
                  }
                  className="w-full rounded-xl border border-black/[0.08] bg-[var(--surface-subtle)] px-3 py-2 text-[12px] font-medium text-neutral-800 transition-colors hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            ) : null}

            {loading && photos.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-neutral-500">Loading…</p>
            ) : null}
          </div>
      </div>
    </div>
  )
}
