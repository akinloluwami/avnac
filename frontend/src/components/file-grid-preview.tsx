import { useEffect, useState } from 'react'
import {
  avnacDocumentPreviewCacheKey,
  renderAvnacDocumentPreviewDataUrl,
} from '../lib/avnac-document-preview'
import { idbGetDocument } from '../lib/avnac-editor-idb'

type FileGridPreviewProps = {
  persistId: string
  updatedAt: number
  className?: string
}

export default function FileGridPreview({
  persistId,
  updatedAt,
  className = '',
}: FileGridPreviewProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    setFailed(false)

    void (async () => {
      const doc = await idbGetDocument(persistId)
      if (cancelled) return
      if (!doc) {
        setFailed(true)
        return
      }
      const cacheKey = avnacDocumentPreviewCacheKey(persistId, updatedAt)
      const url = await renderAvnacDocumentPreviewDataUrl(doc, persistId, {
        maxCssPx: 520,
        cacheKey,
      })
      if (cancelled) return
      if (url) setSrc(url)
      else setFailed(true)
    })()

    return () => {
      cancelled = true
    }
  }, [persistId, updatedAt])

  if (src) {
    return <img src={src} alt="" className={['h-full w-full object-cover', className].join(' ')} />
  }

  return (
    <div
      className={[
        'flex h-full w-full items-center justify-center bg-black/[0.04]',
        failed ? '' : 'animate-pulse',
        className,
      ].join(' ')}
      aria-hidden
    />
  )
}
