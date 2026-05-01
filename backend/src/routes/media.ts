import { isIP } from 'node:net'
import { Elysia, t } from 'elysia'
import { env } from '../config/env'
import { HttpError } from '../lib/http'
import { isSupportedRembgModel, type RembgModel } from '../lib/rembg'

const IMAGE_ACCEPT_HEADER = 'image/*,*/*;q=0.8'
const DEFAULT_IMAGE_FILENAME = 'image.png'
const REMBG_RETRY_ATTEMPTS = 2
const REMBG_READY_CHECK_INTERVAL_MS = 500
const REMBG_READY_TIMEOUT_MS = 20_000
const REMBG_HEALTH_TIMEOUT_MS = 2_000

type RemoveBackgroundOptions = {
  a?: boolean
  ab?: number
  ae?: number
  af?: number
  bgc?: string
  extras?: string
  model?: RembgModel
  om?: boolean
  ppm?: boolean
}

type RemoveBackgroundInput = {
  body: ArrayBuffer
  contentType: string
  filename: string
  options: RemoveBackgroundOptions
}

let rembgRequestQueue: Promise<void> = Promise.resolve()

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase()
  if (!host) return true
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true
  }

  const ipVersion = isIP(host)
  if (ipVersion === 4) {
    const parts = host.split('.').map(part => Number(part))
    const [a = 0, b = 0] = parts
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    )
  }

  if (ipVersion === 6) {
    return (
      host === '::' ||
      host === '::1' ||
      host.startsWith('fe80:') ||
      host.startsWith('fc') ||
      host.startsWith('fd')
    )
  }

  return false
}

function assertAllowedImageUrl(target: URL): void {
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new HttpError(400, 'Invalid image URL.')
  }
  if (isBlockedHostname(target.hostname)) {
    throw new HttpError(400, 'This image host is not allowed.')
  }
}

async function fetchImageUpstream(target: URL): Promise<Response> {
  let current = target
  for (let hop = 0; hop < 5; hop += 1) {
    assertAllowedImageUrl(current)
    let upstream: Response
    try {
      upstream = await fetch(current, {
        redirect: 'manual',
        headers: {
          Accept: IMAGE_ACCEPT_HEADER,
        },
      })
    } catch {
      throw new HttpError(502, 'Could not fetch image.')
    }

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location')
      if (!location) {
        throw new HttpError(502, 'Image redirect was missing a location.')
      }
      try {
        current = new URL(location, current)
      } catch {
        throw new HttpError(502, 'Image redirect was invalid.')
      }
      continue
    }

    return upstream
  }

  throw new HttpError(502, 'Too many image redirects.')
}

function assertImageResponseContentType(contentType: string): void {
  if (contentType && !contentType.toLowerCase().startsWith('image/')) {
    throw new HttpError(415, 'The requested URL did not return an image.')
  }
}

function assertWithinUploadLimit(sizeInBytes: number): void {
  if (sizeInBytes > env.REMBG_MAX_UPLOAD_BYTES) {
    throw new HttpError(413, `Image exceeds the ${env.REMBG_MAX_UPLOAD_BYTES} byte upload limit.`)
  }
}

function trimContentType(contentType: string | null): string {
  return contentType?.split(';')[0]?.trim() ?? ''
}

function rembgRemoveUrl(): URL {
  const baseUrl = env.REMBG_URL
  if (!baseUrl) {
    throw new HttpError(503, 'Background removal is not configured (set REMBG_URL on the server).')
  }

  return new URL('/api/remove', baseUrl)
}

function rembgHealthUrl(): URL {
  const baseUrl = env.REMBG_URL
  if (!baseUrl) {
    throw new HttpError(503, 'Background removal is not configured (set REMBG_URL on the server).')
  }

  return new URL('/api', baseUrl)
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

async function waitForRembgReady(maxWaitMs: number): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs
  const url = rembgHealthUrl()

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REMBG_HEALTH_TIMEOUT_MS),
      })
      if (response.ok) {
        return true
      }
    } catch {
      // Ignore transient startup errors while the service is restarting.
    }

    await delay(REMBG_READY_CHECK_INTERVAL_MS)
  }

  return false
}

async function withRembgRequestSlot<T>(task: () => Promise<T>): Promise<T> {
  const previous = rembgRequestQueue
  let release!: () => void
  rembgRequestQueue = new Promise(resolve => {
    release = resolve
  })

  await previous.catch(() => {})

  try {
    return await task()
  } finally {
    release()
  }
}

function buildRembgFormData(input: RemoveBackgroundInput): FormData {
  const form = new FormData()
  form.set(
    'file',
    new File([input.body], input.filename, {
      type: input.contentType,
    }),
  )
  form.set('model', input.options.model ?? env.REMBG_DEFAULT_MODEL)
  if (input.options.a !== undefined) {
    form.set('a', String(input.options.a))
  }
  if (input.options.ab !== undefined) {
    form.set('ab', String(input.options.ab))
  }
  if (input.options.ae !== undefined) {
    form.set('ae', String(input.options.ae))
  }
  if (input.options.af !== undefined) {
    form.set('af', String(input.options.af))
  }
  if (input.options.om !== undefined) {
    form.set('om', String(input.options.om))
  }
  if (input.options.ppm !== undefined) {
    form.set('ppm', String(input.options.ppm))
  }

  return form
}

function basenameFromPathname(pathname: string): string {
  const parts = pathname
    .split('/')
    .map(part => part.trim())
    .filter(Boolean)
  const lastPart = parts.at(-1)
  return lastPart || DEFAULT_IMAGE_FILENAME
}

function filenameFromUrl(target: URL): string {
  const candidate = basenameFromPathname(target.pathname)
  try {
    return decodeURIComponent(candidate)
  } catch {
    return candidate
  }
}

function outputFilename(filename: string): string {
  const trimmed = filename.trim()
  if (!trimmed) return 'image-no-bg.png'
  const normalized = trimmed.replace(/\.[^.]+$/, '').replace(/["\\/\r\n]+/g, '-')
  return `${normalized || 'image'}-no-bg.png`
}

function readTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

function parseBooleanOption(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) {
      return undefined
    }
    if (normalized === 'true' || normalized === '1') {
      return true
    }
    if (normalized === 'false' || normalized === '0') {
      return false
    }
  }

  throw new HttpError(400, `Invalid ${fieldName}.`)
}

function parseIntegerOption(
  value: unknown,
  fieldName: string,
  { max, min = 0 }: { max?: number; min?: number } = {},
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value.trim(), 10)
        : Number.NaN

  if (!Number.isInteger(parsed) || parsed < min || (max !== undefined && parsed > max)) {
    throw new HttpError(400, `Invalid ${fieldName}.`)
  }

  return parsed
}

function parseModelOption(value: unknown): RembgModel | undefined {
  const model = readTrimmedString(value)
  if (!model) {
    return undefined
  }

  if (!isSupportedRembgModel(model)) {
    throw new HttpError(400, 'Invalid model.')
  }

  return model
}

function parseRemoveBackgroundOptionsFromRecord(
  readValue: (key: keyof RemoveBackgroundOptions) => unknown,
): RemoveBackgroundOptions {
  return {
    a: parseBooleanOption(readValue('a'), 'a'),
    ab: parseIntegerOption(readValue('ab'), 'ab', { max: 255 }),
    ae: parseIntegerOption(readValue('ae'), 'ae'),
    af: parseIntegerOption(readValue('af'), 'af', { max: 255 }),
    bgc: readTrimmedString(readValue('bgc')),
    extras: readTrimmedString(readValue('extras')),
    model: parseModelOption(readValue('model')),
    om: parseBooleanOption(readValue('om'), 'om'),
    ppm: parseBooleanOption(readValue('ppm'), 'ppm'),
  }
}

function parseRemoveBackgroundOptionsFromJson(
  body: Record<string, unknown>,
): RemoveBackgroundOptions {
  return parseRemoveBackgroundOptionsFromRecord(key => body[key])
}

function parseRemoveBackgroundOptionsFromFormData(form: FormData): RemoveBackgroundOptions {
  return parseRemoveBackgroundOptionsFromRecord(key => {
    const value = form.get(key)
    return typeof value === 'string' ? value : undefined
  })
}

async function loadRemoteImage(url: string): Promise<RemoveBackgroundInput> {
  let target: URL
  try {
    target = new URL(url)
  } catch {
    throw new HttpError(400, 'Invalid image URL.')
  }

  const upstream = await fetchImageUpstream(target)
  if (!upstream.ok) {
    throw new HttpError(502, `Image fetch failed (${upstream.status}).`)
  }

  const contentLength = Number(upstream.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > 0) {
    assertWithinUploadLimit(contentLength)
  }

  const contentType = trimContentType(upstream.headers.get('content-type'))
  assertImageResponseContentType(contentType)

  const body = await upstream.arrayBuffer()
  assertWithinUploadLimit(body.byteLength)

  return {
    body,
    contentType: contentType || 'application/octet-stream',
    filename: filenameFromUrl(target),
    options: {},
  }
}

async function loadUploadedImage(file: File): Promise<RemoveBackgroundInput> {
  if (!file.size) {
    throw new HttpError(400, 'Uploaded image was empty.')
  }

  assertWithinUploadLimit(file.size)

  const contentType = trimContentType(file.type)
  if (contentType && !contentType.toLowerCase().startsWith('image/')) {
    throw new HttpError(415, 'Uploaded file must be an image.')
  }

  return {
    body: await file.arrayBuffer(),
    contentType: contentType || 'application/octet-stream',
    filename: file.name?.trim() || DEFAULT_IMAGE_FILENAME,
    options: {},
  }
}

async function loadRemoveBackgroundInput(request: Request): Promise<RemoveBackgroundInput> {
  const contentType = trimContentType(request.headers.get('content-type'))

  if (contentType === 'application/json') {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new HttpError(400, 'Invalid JSON body.')
    }

    if (typeof body !== 'object' || body === null) {
      throw new HttpError(400, 'Invalid JSON body.')
    }

    const imageUrl =
      'imageUrl' in body && typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''

    if (!imageUrl) {
      throw new HttpError(400, 'imageUrl is required.')
    }

    const input = await loadRemoteImage(imageUrl)
    return {
      ...input,
      options: parseRemoveBackgroundOptionsFromJson(body as Record<string, unknown>),
    }
  }

  if (contentType === 'multipart/form-data') {
    const form = await request.formData()
    const uploaded = form.get('file')

    if (!(uploaded instanceof File)) {
      throw new HttpError(400, 'Multipart uploads must include a file field.')
    }

    const input = await loadUploadedImage(uploaded)
    return {
      ...input,
      options: parseRemoveBackgroundOptionsFromFormData(form),
    }
  }

  throw new HttpError(415, 'Unsupported content type. Use application/json or multipart/form-data.')
}

async function removeBackground(input: RemoveBackgroundInput): Promise<Response> {
  const url = rembgRemoveUrl()
  if (input.options.bgc) {
    url.searchParams.set('bgc', input.options.bgc)
  }
  if (input.options.extras) {
    url.searchParams.set('extras', input.options.extras)
  }

  return withRembgRequestSlot(async () => {
    let upstream: Response | null = null

    for (let attempt = 0; attempt < REMBG_RETRY_ATTEMPTS; attempt += 1) {
      try {
        upstream = await fetch(url, {
          method: 'POST',
          body: buildRembgFormData(input),
          signal: AbortSignal.timeout(env.REMBG_TIMEOUT_MS),
        })
      } catch (error) {
        if (error instanceof HttpError) {
          throw error
        }
        if (isTimeoutError(error)) {
          throw new HttpError(504, 'Background removal timed out.')
        }
        if (attempt + 1 >= REMBG_RETRY_ATTEMPTS) {
          throw new HttpError(502, 'Could not reach the background removal service.')
        }
        const ready = await waitForRembgReady(REMBG_READY_TIMEOUT_MS)
        if (!ready) {
          throw new HttpError(502, 'Could not reach the background removal service.')
        }
        continue
      }

      if (upstream.ok) {
        break
      }

      if (upstream.status >= 500 && attempt + 1 < REMBG_RETRY_ATTEMPTS) {
        const ready = await waitForRembgReady(REMBG_READY_TIMEOUT_MS)
        if (ready) {
          upstream = null
          continue
        }
      }

      throw new HttpError(502, `Background removal failed (${upstream.status}).`)
    }

    if (!upstream || !upstream.ok) {
      throw new HttpError(502, 'Could not reach the background removal service.')
    }

    const body = await upstream.arrayBuffer()
    const contentType = trimContentType(upstream.headers.get('content-type'))

    return new Response(body, {
      headers: {
        'cache-control': 'no-store',
        'content-disposition': `inline; filename="${outputFilename(input.filename)}"`,
        'content-length': String(body.byteLength),
        'content-type': contentType || 'image/png',
        'x-content-type-options': 'nosniff',
      },
    })
  })
}

export const mediaRoutes = new Elysia({ prefix: '/media' })
  .get(
    '/proxy',
    async ({ query }) => {
      let target: URL
      try {
        target = new URL(query.url)
      } catch {
        throw new HttpError(400, 'Invalid image URL.')
      }
      const upstream = await fetchImageUpstream(target)

      if (!upstream.ok) {
        throw new HttpError(502, `Image fetch failed (${upstream.status}).`)
      }

      const contentType = trimContentType(upstream.headers.get('content-type'))
      assertImageResponseContentType(contentType)

      const body = await upstream.arrayBuffer()
      return new Response(body, {
        headers: {
          'cache-control': 'public, max-age=3600',
          'content-type': contentType || 'application/octet-stream',
          'x-content-type-options': 'nosniff',
        },
      })
    },
    {
      query: t.Object({
        url: t.String({ minLength: 1 }),
      }),
    },
  )
  .post('/remove-background', async ({ request }) => {
    const input = await loadRemoveBackgroundInput(request)
    return removeBackground(input)
  })
