import { createContext, type ReactNode, type SetStateAction, useContext } from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'

import { type AvnacDocument, syncActivePage } from '../../lib/avnac-scene'

type EditorSetter<T> = SetStateAction<T>

function applySetter<T>(next: EditorSetter<T>, current: T) {
  return typeof next === 'function' ? (next as (value: T) => T)(current) : next
}

export type EditorStoreState = {
  doc: AvnacDocument
  hoveredId: string | null
  selectedIds: string[]
  setDoc: (next: EditorSetter<AvnacDocument>) => void
  setHoveredId: (next: EditorSetter<string | null>) => void
  setSelectedIds: (next: EditorSetter<string[]>) => void
}

export type EditorStoreApi = StoreApi<EditorStoreState>

export function createEditorStore(initialDoc: AvnacDocument): EditorStoreApi {
  return createStore<EditorStoreState>(set => ({
    doc: syncActivePage(initialDoc),
    hoveredId: null,
    selectedIds: [],
    setDoc: next => set(state => ({ doc: syncActivePage(applySetter(next, state.doc)) })),
    setHoveredId: next => set(state => ({ hoveredId: applySetter(next, state.hoveredId) })),
    setSelectedIds: next => set(state => ({ selectedIds: applySetter(next, state.selectedIds) })),
  }))
}

const EditorStoreContext = createContext<EditorStoreApi | null>(null)

export function EditorStoreProvider({
  children,
  store,
}: {
  children: ReactNode
  store: EditorStoreApi
}) {
  return <EditorStoreContext.Provider value={store}>{children}</EditorStoreContext.Provider>
}

export function useEditorStore<T>(selector: (state: EditorStoreState) => T): T {
  const store = useContext(EditorStoreContext)
  if (!store) {
    throw new Error('useEditorStore must be used within EditorStoreProvider')
  }
  return useStore(store, selector)
}
