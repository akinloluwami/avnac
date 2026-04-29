import { useCallback, useMemo } from 'react'

import { objectDisplayName, type SceneObject } from '../../lib/avnac-scene'
import type { EditorLayerRow } from '../editor-layers-panel'
import { useEditorStore } from './editor-store'

export function useEditorLayerControls() {
  const objects = useEditorStore((state) => {
    const page = state.doc.pages.find((p) => p.id === state.activePageId) ?? state.doc.pages[0]
    return page.objects
  })
  const activePageId = useEditorStore((state) => state.activePageId)
  const selectedIds = useEditorStore((state) => state.selectedIds)
  const setDoc = useEditorStore((state) => state.setDoc)
  const setSelectedIds = useEditorStore((state) => state.setSelectedIds)

  // Helper: update objects only on the active page
  const updatePageObjects = useCallback(
    (updater: (objects: SceneObject[]) => SceneObject[]) => {
      setDoc((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id === activePageId ? { ...p, objects: updater(p.objects) } : p,
        ),
      }))
    },
    [activePageId, setDoc],
  )

  const layerRows = useMemo<EditorLayerRow[]>(
    () =>
      [...objects]
        .map((obj, index) => ({
          id: obj.id,
          index,
          label: objectDisplayName(obj),
          visible: obj.visible,
          selected: selectedIds.includes(obj.id),
        }))
        .reverse(),
    [objects, selectedIds],
  )

  const onLayerReorder = useCallback(
    (orderedLayerIds: string[]) => {
      const byId = new Map(objects.map((obj) => [obj.id, obj]))
      const next = [...orderedLayerIds]
        .reverse()
        .map((id) => byId.get(id))
        .filter((obj): obj is SceneObject => !!obj)
      updatePageObjects(() => next)
    },
    [objects, updatePageObjects],
  )

  const onSelectLayer = useCallback(
    (stackIndex: number) => {
      const obj = objects[stackIndex]
      if (!obj) return
      setSelectedIds([obj.id])
    },
    [objects, setSelectedIds],
  )

  const onToggleLayerVisible = useCallback(
    (stackIndex: number) => {
      updatePageObjects((objs) =>
        objs.map((obj, index) =>
          index === stackIndex ? { ...obj, visible: !obj.visible } : obj,
        ),
      )
    },
    [updatePageObjects],
  )

  const onLayerBringForward = useCallback(
    (stackIndex: number) => {
      updatePageObjects((objs) => {
        if (stackIndex >= objs.length - 1) return objs
        const next = [...objs]
        const swap = next[stackIndex]
        next[stackIndex] = next[stackIndex + 1]
        next[stackIndex + 1] = swap
        return next
      })
    },
    [updatePageObjects],
  )

  const onLayerSendBackward = useCallback(
    (stackIndex: number) => {
      updatePageObjects((objs) => {
        if (stackIndex <= 0) return objs
        const next = [...objs]
        const swap = next[stackIndex]
        next[stackIndex] = next[stackIndex - 1]
        next[stackIndex - 1] = swap
        return next
      })
    },
    [updatePageObjects],
  )

  const onRenameLayer = useCallback(
    (stackIndex: number, name: string) => {
      updatePageObjects((objs) =>
        objs.map((obj, index) =>
          index === stackIndex ? { ...obj, name: name.trim() || undefined } : obj,
        ),
      )
    },
    [updatePageObjects],
  )

  return {
    layerRows,
    onLayerBringForward,
    onLayerReorder,
    onLayerSendBackward,
    onRenameLayer,
    onSelectLayer,
    onToggleLayerVisible,
  }
}
