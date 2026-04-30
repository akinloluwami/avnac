import type { AvnacDocument } from './avnac-document'
import { renderAvnacDocumentToDataUrl } from './avnac-scene-render'
import { loadVectorBoardDocs } from './avnac-vector-boards-storage'

const previewCache = new Map<string, string>()
const PREVIEW_CACHE_MAX = 48

function trimPreviewCache() {
  while (previewCache.size > PREVIEW_CACHE_MAX) {
    const first = previewCache.keys().next().value as string | undefined
    if (!first) break
    previewCache.delete(first)
  }
}

export function avnacDocumentPreviewCacheKey(
  persistId: string,
  updatedAt: number,
): string {
  return `${persistId}:${updatedAt}`
}

export function avnacDocumentPreviewEvictPersistId(persistId: string) {
  for (const key of [...previewCache.keys()]) {
    if (key.startsWith(`${persistId}:`)) previewCache.delete(key)
  }
}

export async function renderAvnacDocumentPreviewDataUrl(
  doc: AvnacDocument,
  persistId: string,
  options?: { maxCssPx?: number; cacheKey?: string },
): Promise<string | null> {
  const cacheKey = options?.cacheKey
  if (cacheKey) {
    const hit = previewCache.get(cacheKey)
    if (hit) return hit
  }
  const maxCssPx = options?.maxCssPx ?? 400
  const maxEdge = Math.max(doc.artboard.width, doc.artboard.height)
  const multiplier =
    maxEdge > 0 ? Math.max(1, Math.round(Math.min(3, maxCssPx / maxEdge))) : 1

  try {
    const url = await renderAvnacDocumentToDataUrl(
      doc,
      loadVectorBoardDocs(persistId),
      { multiplier, transparent: false },
    )
    if (cacheKey) {
      previewCache.set(cacheKey, url)
      trimPreviewCache()
    }
    return url
  } catch (error) {
    console.error('[avnac] document preview failed', error)
    return null
  }
}
