import { useCallback, useMemo } from 'react'

import { objectDisplayName, type SceneObject } from '../../lib/avnac-scene'
import type { EditorLayerRow } from '../editor-layers-panel'
import { useEditorStore } from './editor-store'

export function useEditorLayerControls() {
  const objects = useEditorStore(state => state.doc.objects)
  const selectedIds = useEditorStore(state => state.selectedIds)
  const setDoc = useEditorStore(state => state.setDoc)
  const setSelectedIds = useEditorStore(state => state.setSelectedIds)

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
      const byId = new Map(objects.map(obj => [obj.id, obj]))
      const next = [...orderedLayerIds]
        .reverse()
        .map(id => byId.get(id))
        .filter((obj): obj is SceneObject => !!obj)
      setDoc(prev => ({ ...prev, objects: next }))
    },
    [objects, setDoc],
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
      setDoc(prev => ({
        ...prev,
        objects: prev.objects.map((obj, index) =>
          index === stackIndex ? { ...obj, visible: !obj.visible } : obj,
        ),
      }))
    },
    [setDoc],
  )

  const onLayerBringForward = useCallback(
    (stackIndex: number) => {
      setDoc(prev => {
        if (stackIndex >= prev.objects.length - 1) return prev
        const next = [...prev.objects]
        const swap = next[stackIndex]
        next[stackIndex] = next[stackIndex + 1]
        next[stackIndex + 1] = swap
        return { ...prev, objects: next }
      })
    },
    [setDoc],
  )

  const onLayerSendBackward = useCallback(
    (stackIndex: number) => {
      setDoc(prev => {
        if (stackIndex <= 0) return prev
        const next = [...prev.objects]
        const swap = next[stackIndex]
        next[stackIndex] = next[stackIndex - 1]
        next[stackIndex - 1] = swap
        return { ...prev, objects: next }
      })
    },
    [setDoc],
  )

  const onRenameLayer = useCallback(
    (stackIndex: number, name: string) => {
      setDoc(prev => ({
        ...prev,
        objects: prev.objects.map((obj, index) =>
          index === stackIndex ? { ...obj, name: name.trim() || undefined } : obj,
        ),
      }))
    },
    [setDoc],
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
