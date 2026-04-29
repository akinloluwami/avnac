import {
  createContext,
  useContext,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { useStore } from 'zustand'
import {
  createStore,
  type StoreApi,
} from 'zustand/vanilla'

import type { AvnacDocument } from '../../lib/avnac-scene'

type EditorSetter<T> = SetStateAction<T>

function applySetter<T>(next: EditorSetter<T>, current: T) {
  return typeof next === 'function'
    ? (next as (value: T) => T)(current)
    : next
}

export type EditorStoreState = {
  doc: AvnacDocument
  activePageId: string
  hoveredId: string | null
  selectedIds: string[]
  setDoc: (next: EditorSetter<AvnacDocument>) => void
  setActivePageId: (id: string) => void
  setHoveredId: (next: EditorSetter<string | null>) => void
  setSelectedIds: (next: EditorSetter<string[]>) => void
}

export type EditorStoreApi = StoreApi<EditorStoreState>

export function createEditorStore(initialDoc: AvnacDocument): EditorStoreApi {
  return createStore<EditorStoreState>((set) => ({
    doc: initialDoc,
    activePageId: initialDoc.pages[0].id,
    hoveredId: null,
    selectedIds: [],
    setDoc: (next) => set((state) => ({ doc: applySetter(next, state.doc) })),
    setActivePageId: (id) => set({ activePageId: id }),
    setHoveredId: (next) =>
      set((state) => ({ hoveredId: applySetter(next, state.hoveredId) })),
    setSelectedIds: (next) =>
      set((state) => ({ selectedIds: applySetter(next, state.selectedIds) })),
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
  return (
    <EditorStoreContext.Provider value={store}>
      {children}
    </EditorStoreContext.Provider>
  )
}

export function useEditorStore<T>(
  selector: (state: EditorStoreState) => T,
): T {
  const store = useContext(EditorStoreContext)
  if (!store) {
    throw new Error('useEditorStore must be used within EditorStoreProvider')
  }
  return useStore(store, selector)
}
