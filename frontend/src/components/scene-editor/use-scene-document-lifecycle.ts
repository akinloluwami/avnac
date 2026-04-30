import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'

import {
  AVNAC_STORAGE_KEY,
  cloneAvnacDocument,
  createEmptyAvnacDocument,
  parseAvnacDocument,
  type AvnacDocument,
} from '../../lib/avnac-scene'
import { idbGetDocument, idbPutDocument } from '../../lib/avnac-editor-idb'
import { clampDimension } from '../../scene-engine/primitives'

type UseSceneDocumentLifecycleArgs = {
  applyingHistoryRef: MutableRefObject<boolean>
  autosaveTimerRef: MutableRefObject<number | null>
  defaultArtboardH: number
  defaultArtboardW: number
  doc: AvnacDocument
  historyIndexRef: MutableRefObject<number>
  historyRef: MutableRefObject<AvnacDocument[]>
  historyTimerRef: MutableRefObject<number | null>
  initialArtboardHeight?: number
  initialArtboardWidth?: number
  onReadyChange?: (ready: boolean) => void
  persistDisplayNameRef: MutableRefObject<string>
  persistId?: string
  persistIdRef: MutableRefObject<string | undefined>
  ready: boolean
  setDoc: Dispatch<SetStateAction<AvnacDocument>>
  setReady: Dispatch<SetStateAction<boolean>>
  setSelectedIds: Dispatch<SetStateAction<string[]>>
  setTextEditingId: Dispatch<SetStateAction<string | null>>
  setZoomPercent: Dispatch<SetStateAction<number | null>>
  zoomUserAdjustedRef: MutableRefObject<boolean>
}

export function useSceneDocumentLifecycle({
  applyingHistoryRef,
  autosaveTimerRef,
  defaultArtboardH,
  defaultArtboardW,
  doc,
  historyIndexRef,
  historyRef,
  historyTimerRef,
  initialArtboardHeight,
  initialArtboardWidth,
  onReadyChange,
  persistDisplayNameRef,
  persistId,
  persistIdRef,
  ready,
  setDoc,
  setReady,
  setSelectedIds,
  setTextEditingId,
  setZoomPercent,
  zoomUserAdjustedRef,
}: UseSceneDocumentLifecycleArgs) {
  useEffect(() => {
    let cancelled = false
    setReady(false)
    ;(async () => {
      let nextDoc: AvnacDocument | null = null
      if (persistId) {
        const raw = await idbGetDocument(persistId)
        nextDoc = raw ? parseAvnacDocument(raw) : null
      } else {
        try {
          const raw = localStorage.getItem(AVNAC_STORAGE_KEY)
          nextDoc = raw ? parseAvnacDocument(JSON.parse(raw)) : null
        } catch {
          nextDoc = null
        }
      }
      const base =
        nextDoc ??
        createEmptyAvnacDocument(
          clampDimension(initialArtboardWidth, defaultArtboardW),
          clampDimension(initialArtboardHeight, defaultArtboardH),
        )
      if (cancelled) return
      setDoc(base)
      setSelectedIds([])
      setTextEditingId(null)
      historyRef.current = [cloneAvnacDocument(base)]
      historyIndexRef.current = 0
      zoomUserAdjustedRef.current = false
      setZoomPercent(100)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [
    defaultArtboardH,
    defaultArtboardW,
    historyIndexRef,
    historyRef,
    initialArtboardHeight,
    initialArtboardWidth,
    persistId,
    setDoc,
    setReady,
    setSelectedIds,
    setTextEditingId,
    setZoomPercent,
    zoomUserAdjustedRef,
  ])

  useEffect(() => {
    onReadyChange?.(ready)
  }, [onReadyChange, ready])

  useEffect(() => {
    if (!ready) return
    if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current)
    historyTimerRef.current = window.setTimeout(() => {
      if (applyingHistoryRef.current) return
      const snap = cloneAvnacDocument(doc)
      const serialized = JSON.stringify(snap)
      const current = historyRef.current[historyIndexRef.current]
      if (current && JSON.stringify(current) === serialized) return
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
      historyRef.current.push(snap)
      historyIndexRef.current = historyRef.current.length - 1
    }, 140)
    return () => {
      if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current)
    }
  }, [
    applyingHistoryRef,
    doc,
    historyIndexRef,
    historyRef,
    historyTimerRef,
    ready,
  ])

  useEffect(() => {
    if (!ready) return
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      const snapshot = cloneAvnacDocument(doc)
      if (!persistIdRef.current) {
        localStorage.setItem(AVNAC_STORAGE_KEY, JSON.stringify(snapshot))
        return
      }
      void idbPutDocument(persistIdRef.current, snapshot, {
        name: persistDisplayNameRef.current,
      }).catch((error) => {
        console.error('[avnac] autosave failed', error)
      })
    }, 240)
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [autosaveTimerRef, doc, persistDisplayNameRef, persistIdRef, ready])
}
