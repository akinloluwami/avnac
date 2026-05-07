import {
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
} from 'react'

import { type AvnacDocument, cloneAvnacDocument } from '../../lib/avnac-scene'
import type { LayerReorderKind } from '../../scene-engine/primitives'

type AsyncCommand = () => void | Promise<void>

type UseEditorKeyboardShortcutsArgs = {
  applyingHistoryRef: MutableRefObject<boolean>
  commitTextDraft: () => void
  copyElementToClipboard: AsyncCommand
  deleteSelection: () => void
  duplicateElement: AsyncCommand
  groupSelection: () => void
  historyIndexRef: MutableRefObject<number>
  historyRef: MutableRefObject<AvnacDocument[]>
  nudgeSelection: (dx: number, dy: number) => void
  onZoomFitRequest: () => void
  onZoomInRequest: () => void
  onZoomOutRequest: () => void
  pasteFromClipboard: AsyncCommand
  reorderSelectionLayers: (kind: LayerReorderKind) => void
  setDoc: Dispatch<SetStateAction<AvnacDocument>>
  setShortcutsOpen: (open: boolean) => void
  shortcutScopeRef: RefObject<HTMLElement | null>
  ungroupSelection: () => void
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]',
    ),
  )
}

function isDocumentShortcutTarget(target: EventTarget | null): boolean {
  return target === document || target === document.body || target === document.documentElement
}

function targetIsInScope(target: EventTarget | null, scope: HTMLElement | null): boolean {
  return !!scope && target instanceof Node && scope.contains(target)
}

function hasNativeTextSelection(): boolean {
  const selection = window.getSelection()
  return !!selection && !selection.isCollapsed && selection.toString().length > 0
}

export function useEditorKeyboardShortcuts({
  applyingHistoryRef,
  commitTextDraft,
  copyElementToClipboard,
  deleteSelection,
  duplicateElement,
  groupSelection,
  historyIndexRef,
  historyRef,
  nudgeSelection,
  onZoomFitRequest,
  onZoomInRequest,
  onZoomOutRequest,
  pasteFromClipboard,
  reorderSelectionLayers,
  setDoc,
  setShortcutsOpen,
  shortcutScopeRef,
  ungroupSelection,
}: UseEditorKeyboardShortcutsArgs) {
  const shortcutScopeActiveRef = useRef(false)

  useEffect(() => {
    const syncShortcutScope = (event: Event) => {
      shortcutScopeActiveRef.current = targetIsInScope(event.target, shortcutScopeRef.current)
    }

    window.addEventListener('pointerdown', syncShortcutScope, true)
    window.addEventListener('focusin', syncShortcutScope, true)
    return () => {
      window.removeEventListener('pointerdown', syncShortcutScope, true)
      window.removeEventListener('focusin', syncShortcutScope, true)
    }
  }, [shortcutScopeRef])

  useEffect(() => {
    const restoreHistorySnapshot = (nextIndex: number) => {
      const snap = historyRef.current[nextIndex]
      if (!snap) return
      applyingHistoryRef.current = true
      historyIndexRef.current = nextIndex
      setDoc(cloneAvnacDocument(snap))
      window.setTimeout(() => {
        applyingHistoryRef.current = false
      }, 0)
    }

    const onKey = (e: KeyboardEvent) => {
      const target = e.target
      const targetInScope = targetIsInScope(target, shortcutScopeRef.current)
      const targetUsesActiveScope =
        isDocumentShortcutTarget(target) && shortcutScopeActiveRef.current
      const useEditorShortcuts = targetInScope || targetUsesActiveScope
      const editingTextInput = isEditableShortcutTarget(target)
      if (e.key === '?' && !editingTextInput && useEditorShortcuts) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }
      if (editingTextInput) {
        if (useEditorShortcuts && e.key === 'Escape') {
          e.preventDefault()
          commitTextDraft()
        }
        return
      }
      if (!useEditorShortcuts) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        const nextIndex = e.shiftKey
          ? Math.min(historyRef.current.length - 1, historyIndexRef.current + 1)
          : Math.max(0, historyIndexRef.current - 1)
        restoreHistorySnapshot(nextIndex)
        return
      }
      if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        if (e.shiftKey) ungroupSelection()
        else groupSelection()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        void duplicateElement()
        return
      }
      if (mod && e.key.toLowerCase() === 'c') {
        if (hasNativeTextSelection()) return
        e.preventDefault()
        void copyElementToClipboard()
        return
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        void pasteFromClipboard()
        return
      }
      if (
        mod &&
        (e.key === '+' ||
          (e.key === '=' && e.shiftKey) ||
          e.code === 'Equal' ||
          e.code === 'NumpadAdd')
      ) {
        e.preventDefault()
        onZoomInRequest()
        return
      }
      if (mod && (e.key === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract')) {
        e.preventDefault()
        onZoomOutRequest()
        return
      }
      if (mod && e.code === 'BracketRight') {
        e.preventDefault()
        reorderSelectionLayers(e.shiftKey ? 'front' : 'forward')
        return
      }
      if (mod && e.code === 'BracketLeft') {
        e.preventDefault()
        reorderSelectionLayers(e.shiftKey ? 'back' : 'backward')
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelection()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        nudgeSelection(e.shiftKey ? -10 : -1, 0)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        nudgeSelection(e.shiftKey ? 10 : 1, 0)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        nudgeSelection(0, e.shiftKey ? -10 : -1)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        nudgeSelection(0, e.shiftKey ? 10 : 1)
        return
      }
      if (mod && e.key === '1') {
        e.preventDefault()
        onZoomFitRequest()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [
    applyingHistoryRef,
    commitTextDraft,
    copyElementToClipboard,
    deleteSelection,
    duplicateElement,
    groupSelection,
    historyIndexRef,
    historyRef,
    nudgeSelection,
    onZoomFitRequest,
    onZoomInRequest,
    onZoomOutRequest,
    pasteFromClipboard,
    reorderSelectionLayers,
    setDoc,
    setShortcutsOpen,
    shortcutScopeRef,
    ungroupSelection,
  ])
}
