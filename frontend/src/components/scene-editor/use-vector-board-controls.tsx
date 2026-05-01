import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import type { AvnacDocument, SceneObject } from '../../lib/avnac-scene'
import {
  emptyVectorBoardDocument,
  type VectorBoardDocument,
  vectorDocHasRenderableStrokes,
} from '../../lib/avnac-vector-board-document'
import {
  type AvnacVectorBoardMeta,
  loadVectorBoardDocs,
  loadVectorBoards,
  mergeVectorBoardDocsForMeta,
  saveVectorBoardDocs,
  saveVectorBoards,
} from '../../lib/avnac-vector-boards-storage'

type UseVectorBoardControlsArgs = {
  addObjects: (objectsToAdd: SceneObject[]) => void
  artboardH: number
  artboardW: number
  persistId?: string
  ready: boolean
  setDoc: Dispatch<SetStateAction<AvnacDocument>>
}

export type VectorBoardControls = {
  boardDocs: Record<string, VectorBoardDocument>
  boards: AvnacVectorBoardMeta[]
  closeVectorWorkspace: () => void
  createVectorBoard: () => void
  deleteVectorBoard: (id: string) => void
  onVectorBoardDocumentChange: (boardId: string, next: VectorBoardDocument) => void
  openVectorBoardWorkspace: (id: string) => void
  placeActiveVectorBoardAtArtboardCenter: () => void
  placeVectorBoard: (boardId: string, x?: number, y?: number) => void
  vectorWorkspaceId: string | null
  vectorWorkspaceName: string
}

const VectorBoardControlsContext = createContext<VectorBoardControls | null>(null)

export function VectorBoardControlsProvider({
  children,
  value,
}: {
  children: ReactNode
  value: VectorBoardControls
}) {
  return (
    <VectorBoardControlsContext.Provider value={value}>
      {children}
    </VectorBoardControlsContext.Provider>
  )
}

export function useVectorBoardControlsContext() {
  const value = useContext(VectorBoardControlsContext)
  if (!value) {
    throw new Error('useVectorBoardControlsContext must be used within VectorBoardControlsProvider')
  }
  return value
}

export function useVectorBoardControls({
  addObjects,
  artboardH,
  artboardW,
  persistId,
  ready,
  setDoc,
}: UseVectorBoardControlsArgs): VectorBoardControls {
  const [boards, setBoards] = useState<AvnacVectorBoardMeta[]>([])
  const [boardDocs, setBoardDocs] = useState<Record<string, VectorBoardDocument>>({})
  const [vectorWorkspaceId, setVectorWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    const nextBoards = persistId ? loadVectorBoards(persistId) : []
    const docs = persistId ? loadVectorBoardDocs(persistId) : {}
    setBoards(nextBoards)
    setBoardDocs(persistId ? mergeVectorBoardDocsForMeta(nextBoards, docs) : docs)
    setVectorWorkspaceId(null)
  }, [persistId])

  useEffect(() => {
    if (!persistId || !ready) return
    saveVectorBoards(persistId, boards)
  }, [boards, persistId, ready])

  useEffect(() => {
    if (!persistId || !ready) return
    saveVectorBoardDocs(persistId, boardDocs)
  }, [boardDocs, persistId, ready])

  const createVectorBoard = useCallback(() => {
    const id = crypto.randomUUID()
    const board: AvnacVectorBoardMeta = {
      id,
      name: `Vector ${boards.length + 1}`,
      createdAt: Date.now(),
    }
    setBoards(prev => [...prev, board])
    setBoardDocs(prev => ({
      ...prev,
      [id]: emptyVectorBoardDocument(),
    }))
    setVectorWorkspaceId(id)
  }, [boards.length])

  const deleteVectorBoard = useCallback(
    (id: string) => {
      setBoards(prev => prev.filter(board => board.id !== id))
      setBoardDocs(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setDoc(prev => ({
        ...prev,
        objects: prev.objects.filter(obj => !(obj.type === 'vector-board' && obj.boardId === id)),
      }))
      if (vectorWorkspaceId === id) setVectorWorkspaceId(null)
    },
    [setDoc, vectorWorkspaceId],
  )

  const openVectorBoardWorkspace = useCallback((id: string) => {
    setVectorWorkspaceId(id)
  }, [])

  const closeVectorWorkspace = useCallback(() => {
    setVectorWorkspaceId(null)
  }, [])

  const onVectorBoardDocumentChange = useCallback((boardId: string, next: VectorBoardDocument) => {
    setBoardDocs(prev => ({ ...prev, [boardId]: next }))
  }, [])

  const placeVectorBoard = useCallback(
    (boardId: string, x?: number, y?: number) => {
      const docForBoard = boardDocs[boardId]
      if (!docForBoard || !vectorDocHasRenderableStrokes(docForBoard)) return
      const width = 280
      const height = 280
      addObjects([
        {
          id: crypto.randomUUID(),
          type: 'vector-board',
          x: x ?? artboardW / 2 - width / 2,
          y: y ?? artboardH / 2 - height / 2,
          width,
          height,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          blurPct: 0,
          shadow: null,
          boardId,
        },
      ])
    },
    [addObjects, artboardH, artboardW, boardDocs],
  )

  const placeActiveVectorBoardAtArtboardCenter = useCallback(() => {
    if (!vectorWorkspaceId) return
    placeVectorBoard(vectorWorkspaceId)
  }, [placeVectorBoard, vectorWorkspaceId])

  const vectorWorkspaceName = useMemo(
    () => boards.find(board => board.id === vectorWorkspaceId)?.name ?? 'Vector board',
    [boards, vectorWorkspaceId],
  )

  return {
    boardDocs,
    boards,
    closeVectorWorkspace,
    createVectorBoard,
    deleteVectorBoard,
    onVectorBoardDocumentChange,
    openVectorBoardWorkspace,
    placeActiveVectorBoardAtArtboardCenter,
    placeVectorBoard,
    vectorWorkspaceId,
    vectorWorkspaceName,
  }
}
