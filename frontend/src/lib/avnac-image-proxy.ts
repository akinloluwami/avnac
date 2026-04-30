import { getPublicApiBase } from './public-api-base'

function parseImageUrl(raw: string): URL | null {
  if (typeof window === 'undefined') return null
  try {
    return new URL(raw, window.location.href)
  } catch {
    return null
  }
}

function isProxyUrl(raw: string): boolean {
  const parsed = parseImageUrl(raw)
  if (!parsed) return false
  return parsed.pathname.endsWith('/media/proxy') && parsed.searchParams.has('url')
}

export function getExportSafeImageUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  const parsed = parseImageUrl(trimmed)
  if (!parsed) return trimmed
  if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return trimmed
  if (parsed.origin === window.location.origin || isProxyUrl(trimmed)) {
    return trimmed
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return trimmed
  return `${getPublicApiBase()}/media/proxy?url=${encodeURIComponent(parsed.toString())}`
}

export async function loadImageMetadata(
  rawUrl: string,
): Promise<{
  src: string
  naturalWidth: number
  naturalHeight: number
}> {
  const src = getExportSafeImageUrl(rawUrl)
  const img = new Image()
  if (!src.startsWith('data:') && !src.startsWith('blob:')) {
    img.crossOrigin = 'anonymous'
  }
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Could not load image: ${rawUrl}`))
    img.src = src
  })
  return {
    src,
    naturalWidth: Math.max(1, img.naturalWidth || img.width || 1),
    naturalHeight: Math.max(1, img.naturalHeight || img.height || 1),
  }
}
