import {
  type AvnacDocument,
  type AvnacDocumentStorageKind,
  cloneAvnacDocument,
  getAvnacDocumentStorageKind,
  parseAvnacDocument,
} from './avnac-document'
import type { VectorBoardDocument } from './avnac-vector-board-document'
import {
  clearAvnacVectorBoardStorage,
  loadVectorBoardDocs,
  loadVectorBoards,
  saveVectorBoardDocs,
  saveVectorBoards,
} from './avnac-vector-boards-storage'

const DB_NAME = 'avnac-editor'
const DB_VERSION = 1
const STORE = 'documents'

export type AvnacEditorIdbRecord = {
  id: string
  updatedAt: number
  document: AvnacDocument
  storageKind: Exclude<AvnacDocumentStorageKind, 'invalid'>
  /** User-visible file name (optional on legacy rows). */
  name?: string
}

type StoredAvnacEditorIdbRecord = {
  id: string
  updatedAt: number
  document: unknown
  name?: string
}

function normalizeEditorRecord(
  row: StoredAvnacEditorIdbRecord | null | undefined,
): AvnacEditorIdbRecord | null {
  if (!row || typeof row.id !== 'string') return null
  const storageKind = getAvnacDocumentStorageKind(row.document)
  if (storageKind === 'invalid') return null
  const document = parseAvnacDocument(row.document)
  if (!document) return null
  return {
    id: row.id,
    updatedAt: Number.isFinite(row.updatedAt) ? row.updatedAt : Date.now(),
    document,
    storageKind,
    name: typeof row.name === 'string' ? row.name : undefined,
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
}

export async function idbGetEditorRecord(id: string): Promise<AvnacEditorIdbRecord | null> {
  const db = await openDb()
  try {
    return await new Promise<AvnacEditorIdbRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      tx.onerror = () => reject(tx.error ?? new Error('idb read failed'))
      const r = tx.objectStore(STORE).get(id)
      r.onerror = () => reject(r.error ?? new Error('idb get failed'))
      r.onsuccess = () => {
        resolve(normalizeEditorRecord((r.result as StoredAvnacEditorIdbRecord | undefined) ?? null))
      }
    })
  } finally {
    db.close()
  }
}

export async function idbGetDocument(id: string): Promise<AvnacDocument | null> {
  const row = await idbGetEditorRecord(id)
  return row?.document ?? null
}

export type AvnacEditorIdbListItem = {
  id: string
  name: string
  updatedAt: number
  artboardWidth: number
  artboardHeight: number
  isLegacy: boolean
}

export async function idbListDocuments(): Promise<AvnacEditorIdbListItem[]> {
  const db = await openDb()
  try {
    return await new Promise<AvnacEditorIdbListItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      tx.onerror = () => reject(tx.error ?? new Error('idb list failed'))
      const r = tx.objectStore(STORE).getAll()
      r.onerror = () => reject(r.error ?? new Error('idb getAll failed'))
      r.onsuccess = () => {
        const rows = (r.result as StoredAvnacEditorIdbRecord[])
          .map(row => normalizeEditorRecord(row))
          .filter((row): row is AvnacEditorIdbRecord => row != null)
        const items: AvnacEditorIdbListItem[] = rows.map(row => ({
          id: row.id,
          name: row.name?.trim() || 'Untitled',
          updatedAt: row.updatedAt,
          artboardWidth: row.document.artboard.width,
          artboardHeight: row.document.artboard.height,
          isLegacy: row.storageKind === 'legacy',
        }))
        items.sort((a, b) => b.updatedAt - a.updatedAt)
        resolve(items)
      }
    })
  } finally {
    db.close()
  }
}

export async function idbPutDocument(
  id: string,
  document: AvnacDocument,
  opts?: { name?: string },
): Promise<void> {
  const prev = await idbGetEditorRecord(id)
  const name =
    opts && opts.name !== undefined
      ? opts.name.trim() || 'Untitled'
      : prev?.name?.trim() || 'Untitled'
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.onerror = () => reject(tx.error ?? new Error('idb write failed'))
      tx.oncomplete = () => resolve()
      tx.objectStore(STORE).put({
        id,
        updatedAt: Date.now(),
        document,
        name,
      } satisfies AvnacEditorIdbRecord)
    })
  } finally {
    db.close()
  }
}

export async function idbSetDocumentName(id: string, name: string): Promise<void> {
  const row = await idbGetEditorRecord(id)
  if (!row) return
  await idbPutDocument(id, row.document, { name })
}

export async function idbDeleteDocument(id: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.onerror = () => reject(tx.error ?? new Error('idb delete failed'))
      tx.oncomplete = () => resolve()
      tx.objectStore(STORE).delete(id)
    })
  } finally {
    db.close()
  }
  clearAvnacVectorBoardStorage(id)
}

export async function idbDuplicateDocument(sourceId: string): Promise<string | null> {
  const row = await idbGetEditorRecord(sourceId)
  if (!row) return null
  const newId = crypto.randomUUID()
  const baseName = row.name?.trim() || 'Untitled'
  const name = `${baseName} copy`
  const docClone = cloneAvnacDocument(row.document)
  await idbPutDocument(newId, docClone, { name })

  const boards = loadVectorBoards(sourceId)
  const docs = loadVectorBoardDocs(sourceId)
  if (boards.length > 0) {
    saveVectorBoards(newId, JSON.parse(JSON.stringify(boards)) as typeof boards)
  }
  if (Object.keys(docs).length > 0) {
    saveVectorBoardDocs(
      newId,
      JSON.parse(JSON.stringify(docs)) as Record<string, VectorBoardDocument>,
    )
  }
  return newId
}

export async function idbMigrateLegacyDocument(id: string): Promise<boolean> {
  const row = await idbGetEditorRecord(id)
  if (!row) return false
  if (row.storageKind !== 'legacy') return true
  await idbPutDocument(id, row.document, { name: row.name })
  return true
}
