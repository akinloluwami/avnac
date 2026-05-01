import { loadImageMetadata } from './avnac-image-proxy'
import type { SceneImage } from './avnac-scene'
import { getPublicApiBase } from './public-api-base'

type RemoveBackgroundOptions = {
  a?: boolean
  ab?: number
  ae?: number
  af?: number
  bgc?: string
  extras?: string
  model?: string
  om?: boolean
  ppm?: boolean
  provider?: 'bria' | 'rembg'
}

function parseImageUrl(raw: string): URL | null {
  if (typeof window === 'undefined') return null
  try {
    return new URL(raw, window.location.href)
  } catch {
    return null
  }
}

function getRemoteImageUrl(raw: string): string | null {
  const parsed = parseImageUrl(raw)
  if (!parsed) return null
  if (parsed.pathname.endsWith('/media/proxy') && parsed.searchParams.has('url')) {
    return parsed.searchParams.get('url')
  }
  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    return parsed.toString()
  }
  return null
}

function appendOptionsToFormData(form: FormData, options: RemoveBackgroundOptions) {
  if (options.provider) form.set('provider', options.provider)
  if (options.model) form.set('model', options.model)
  if (options.a !== undefined) form.set('a', String(options.a))
  if (options.ab !== undefined) form.set('ab', String(options.ab))
  if (options.ae !== undefined) form.set('ae', String(options.ae))
  if (options.af !== undefined) form.set('af', String(options.af))
  if (options.bgc) form.set('bgc', options.bgc)
  if (options.extras) form.set('extras', options.extras)
  if (options.om !== undefined) form.set('om', String(options.om))
  if (options.ppm !== undefined) form.set('ppm', String(options.ppm))
}

function appendOptionsToJsonBody(
  body: Record<string, boolean | number | string>,
  options: RemoveBackgroundOptions,
) {
  if (options.provider) body.provider = options.provider
  if (options.model) body.model = options.model
  if (options.a !== undefined) body.a = options.a
  if (options.ab !== undefined) body.ab = options.ab
  if (options.ae !== undefined) body.ae = options.ae
  if (options.af !== undefined) body.af = options.af
  if (options.om !== undefined) body.om = options.om
  if (options.ppm !== undefined) body.ppm = options.ppm
  if (options.bgc) body.bgc = options.bgc
  if (options.extras) body.extras = options.extras
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read processed image.'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read processed image.'))
        return
      }
      resolve(reader.result)
    }
    reader.readAsDataURL(blob)
  })
}

function fileNameForImage(image: SceneImage, blob: Blob): string {
  const parsed = parseImageUrl(image.src)
  const fromPath = parsed?.pathname.split('/').filter(Boolean).at(-1)?.trim()
  if (fromPath) return fromPath
  const ext =
    blob.type === 'image/png'
      ? 'png'
      : blob.type === 'image/webp'
        ? 'webp'
        : blob.type === 'image/jpeg'
          ? 'jpg'
          : 'png'
  return `image.${ext}`
}

async function requestRemoveBackground(
  image: SceneImage,
  options: RemoveBackgroundOptions,
): Promise<Response> {
  const endpoint = `${getPublicApiBase()}/media/remove-background`
  const remoteImageUrl = getRemoteImageUrl(image.src)

  if (remoteImageUrl) {
    const body: Record<string, boolean | number | string> = {
      imageUrl: remoteImageUrl,
    }
    appendOptionsToJsonBody(body, options)
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  const sourceResponse = await fetch(image.src)
  if (!sourceResponse.ok) {
    throw new Error('Could not read the selected image.')
  }

  const sourceBlob = await sourceResponse.blob()
  const file = new File([sourceBlob], fileNameForImage(image, sourceBlob), {
    type: sourceBlob.type || 'image/png',
  })
  const form = new FormData()
  form.set('file', file)
  appendOptionsToFormData(form, options)
  return fetch(endpoint, {
    method: 'POST',
    body: form,
  })
}

export async function removeBackgroundFromSceneImage(
  image: SceneImage,
  options: RemoveBackgroundOptions = {},
): Promise<{
  naturalHeight: number
  naturalWidth: number
  src: string
}> {
  const response = await requestRemoveBackground(image, options)

  if (!response.ok) {
    let message = 'Background removal failed.'
    try {
      const body = (await response.json()) as { error?: unknown }
      if (typeof body.error === 'string' && body.error.trim()) {
        message = body.error
      }
    } catch {
      // Ignore JSON parse errors and fall back to the default message.
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const src = await blobToDataUrl(blob)
  return loadImageMetadata(src)
}
