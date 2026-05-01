import { Elysia, t } from 'elysia'
import { env } from '../config/env'
import { HttpError } from '../lib/http'

function unsplashKey(): string {
  const k = env.UNSPLASH_ACCESS_KEY
  if (!k) {
    throw new HttpError(503, 'Unsplash is not configured (set UNSPLASH_ACCESS_KEY on the server).')
  }
  return k
}

function clientHeaders(key: string): HeadersInit {
  return {
    Accept: 'application/json',
    Authorization: `Client-ID ${key}`,
  }
}

function mapUnsplashFailure(res: Response): never {
  if (res.status === 401 || res.status === 403) {
    throw new HttpError(502, 'Unsplash rejected the server access key. Check UNSPLASH_ACCESS_KEY.')
  }
  throw new HttpError(502, `Unsplash request failed (${res.status}).`)
}

export const unsplashRoutes = new Elysia({ prefix: '/unsplash' })
  .get(
    '/photos',
    async ({ query }) => {
      const key = unsplashKey()
      const page = Math.max(1, Number(query.page) || 1)
      const perPage = Math.min(30, Math.max(1, Number(query.per_page) || 20))
      const url = `https://api.unsplash.com/photos?page=${page}&per_page=${perPage}&order_by=popular`
      const res = await fetch(url, { headers: clientHeaders(key) })
      if (!res.ok) {
        throw mapUnsplashFailure(res)
      }
      const photos = (await res.json()) as unknown[]
      return {
        data: {
          photos,
          hasMore: photos.length >= perPage,
        },
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        per_page: t.Optional(t.Numeric()),
      }),
    },
  )
  .get(
    '/search',
    async ({ query }) => {
      const key = unsplashKey()
      const q = query.q?.trim() ?? ''
      if (!q) {
        return {
          data: {
            photos: [],
            hasMore: false,
          },
        }
      }
      const page = Math.max(1, Number(query.page) || 1)
      const perPage = Math.min(30, Math.max(1, Number(query.per_page) || 20))
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&page=${page}&per_page=${perPage}`
      const res = await fetch(url, { headers: clientHeaders(key) })
      if (!res.ok) {
        throw mapUnsplashFailure(res)
      }
      const body = (await res.json()) as {
        results?: unknown[]
        total_pages?: number
      }
      const photos = body.results ?? []
      const totalPages = Math.max(1, body.total_pages ?? 1)
      return {
        data: {
          photos,
          hasMore: page < totalPages,
        },
      }
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        page: t.Optional(t.Numeric()),
        per_page: t.Optional(t.Numeric()),
      }),
    },
  )
  .post(
    '/download',
    async ({ body }) => {
      const key = unsplashKey()
      let parsed: URL
      try {
        parsed = new URL(body.downloadLocation)
      } catch {
        throw new HttpError(400, 'Invalid download URL.')
      }
      if (parsed.protocol !== 'https:' || parsed.hostname !== 'api.unsplash.com') {
        throw new HttpError(400, 'Invalid download URL.')
      }
      const res = await fetch(body.downloadLocation, {
        headers: clientHeaders(key),
      })
      if (!res.ok) {
        throw mapUnsplashFailure(res)
      }
      return { ok: true }
    },
    {
      body: t.Object({
        downloadLocation: t.String({ minLength: 1 }),
      }),
    },
  )
