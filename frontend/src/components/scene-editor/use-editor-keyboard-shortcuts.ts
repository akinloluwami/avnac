import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { cloneAvnacDocument, type AvnacDocument } from "../../lib/avnac-scene";
import type { LayerReorderKind } from "../../scene-engine/primitives";

type AsyncCommand = () => void | Promise<void>;

const SELECTION_NUDGE_STEP_PX = 12;
const SELECTION_NUDGE_LARGE_STEP_PX = 24;

type UseEditorKeyboardShortcutsArgs = {
  applyingHistoryRef: MutableRefObject<boolean>;
  commitTextDraft: () => void;
  copyElementToClipboard: AsyncCommand;
  deleteSelection: () => void;
  duplicateElement: AsyncCommand;
  groupSelection: () => void;
  historyIndexRef: MutableRefObject<number>;
  historyRef: MutableRefObject<AvnacDocument[]>;
  nudgeSelection: (dx: number, dy: number) => void;
  onZoomFitRequest: () => void;
  pasteFromClipboard: AsyncCommand;
  reorderSelectionLayers: (kind: LayerReorderKind) => void;
  setDoc: Dispatch<SetStateAction<AvnacDocument>>;
  setShortcutsOpen: (open: boolean) => void;
  ungroupSelection: () => void;
};

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
  pasteFromClipboard,
  reorderSelectionLayers,
  setDoc,
  setShortcutsOpen,
  ungroupSelection,
}: UseEditorKeyboardShortcutsArgs) {
  useEffect(() => {
    const restoreHistorySnapshot = (nextIndex: number) => {
      const snap = historyRef.current[nextIndex];
      if (!snap) return;
      applyingHistoryRef.current = true;
      historyIndexRef.current = nextIndex;
      setDoc(cloneAvnacDocument(snap));
      window.setTimeout(() => {
        applyingHistoryRef.current = false;
      }, 0);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editingTextInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (e.key === "?" && !editingTextInput) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (editingTextInput) {
        if (e.key === "Escape") {
          e.preventDefault();
          commitTextDraft();
        }
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        const nextIndex = e.shiftKey
          ? Math.min(historyRef.current.length - 1, historyIndexRef.current + 1)
          : Math.max(0, historyIndexRef.current - 1);
        restoreHistorySnapshot(nextIndex);
        return;
      }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        void duplicateElement();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        void copyElementToClipboard();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        void pasteFromClipboard();
        return;
      }
      if (mod && e.code === "BracketRight") {
        e.preventDefault();
        reorderSelectionLayers(e.shiftKey ? "front" : "forward");
        return;
      }
      if (mod && e.code === "BracketLeft") {
        e.preventDefault();
        reorderSelectionLayers(e.shiftKey ? "back" : "backward");
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelection();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeSelection(
          e.shiftKey
            ? -SELECTION_NUDGE_LARGE_STEP_PX
            : -SELECTION_NUDGE_STEP_PX,
          0,
        );
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeSelection(
          e.shiftKey ? SELECTION_NUDGE_LARGE_STEP_PX : SELECTION_NUDGE_STEP_PX,
          0,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeSelection(
          0,
          e.shiftKey
            ? -SELECTION_NUDGE_LARGE_STEP_PX
            : -SELECTION_NUDGE_STEP_PX,
        );
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeSelection(
          0,
          e.shiftKey ? SELECTION_NUDGE_LARGE_STEP_PX : SELECTION_NUDGE_STEP_PX,
        );
        return;
      }
      if (mod && e.key === "1") {
        e.preventDefault();
        onZoomFitRequest();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    pasteFromClipboard,
    reorderSelectionLayers,
    setDoc,
    setShortcutsOpen,
    ungroupSelection,
  ]);
}
