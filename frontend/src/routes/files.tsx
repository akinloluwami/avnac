import {
  ArrowDown01Icon,
  CloudUploadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import DeleteConfirmDialog from "../components/delete-confirm-dialog";
import DocumentMigrationDialog from "../components/document-migration-dialog";
import FileGridCard from "../components/file-grid-card";
import FilesMultiselectBar from "../components/files-multiselect-bar";
import NewCanvasDialog from "../components/new-canvas-dialog";
import { avnacDocumentPreviewEvictPersistId } from "../lib/avnac-document-preview";
import {
  idbDeleteDocument,
  idbListDocuments,
  idbMigrateLegacyDocument,
  idbPutDocument,
  type AvnacEditorIdbListItem,
} from "../lib/avnac-editor-idb";
import { parseAvnacDocument } from "../lib/avnac-document";
import { downloadAvnacJsonForId } from "../lib/avnac-files-export";

export const Route = createFileRoute("/files")({
  component: FilesPage,
});

function formatUpdatedAt(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

function nameFromImportFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return base || "Imported file";
}

function FilesPage() {
  const [items, setItems] = useState<AvnacEditorIdbListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [newCanvasOpen, setNewCanvasOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    ids: string[];
    title: string;
    message: string;
  } | null>(null);
  const [migrationDialog, setMigrationDialog] = useState<{
    ids: string[];
    title: string;
    message: string;
    confirmLabel: string;
    triggerSource: "thumbnail" | "title" | "menu" | "banner";
    openFileId?: string;
  } | null>(null);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const posthog = usePostHog();
  const navigate = Route.useNavigate();

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const refreshList = useCallback(() => {
    void idbListDocuments()
      .then((list) => {
        setItems(list);
        setLoadError(null);
      })
      .catch(() => {
        setLoadError("Could not load files.");
        setItems([]);
      });
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!items) return;
    if (items.length === 0) {
      setSelectedIds((prev) => (prev.length ? [] : prev));
      return;
    }
    const valid = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [items]);

  useEffect(() => {
    if (!actionsOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = actionsRef.current;
      if (el && !el.contains(e.target as Node)) setActionsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActionsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [actionsOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (deleteDialog) {
        e.preventDefault();
        setDeleteDialog(null);
        return;
      }
      if (selectedIds.length > 0) clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteDialog, selectedIds.length, clearSelection]);

  const bulkDownload = useCallback(() => {
    const ids = [...selectedIds];
    posthog.capture("files_bulk_downloaded", { file_count: ids.length });
    void (async () => {
      try {
        for (const id of ids) {
          await downloadAvnacJsonForId(id);
          await new Promise((r) => setTimeout(r, 140));
        }
      } catch (err) {
        posthog.captureException(err);
        console.error("[avnac] bulk download failed", err);
      }
    })();
  }, [selectedIds, posthog]);

  const bulkTrash = useCallback(() => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const n = ids.length;
    setDeleteDialog({
      ids,
      title: n === 1 ? "Remove this file?" : "Remove these files?",
      message:
        n === 1
          ? "This will permanently remove the file from this browser. This cannot be undone."
          : `This will permanently remove ${n} files from this browser. This cannot be undone.`,
    });
  }, [selectedIds]);

  const confirmDelete = useCallback(() => {
    if (!deleteDialog) return;
    const ids = [...deleteDialog.ids];
    setDeleteDialog(null);
    posthog.capture("file_deleted", { file_count: ids.length, file_ids: ids });
    void (async () => {
      try {
        for (const id of ids) {
          await idbDeleteDocument(id);
          avnacDocumentPreviewEvictPersistId(id);
        }
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        refreshList();
      } catch (err) {
        posthog.captureException(err);
        console.error("[avnac] delete failed", err);
      }
    })();
  }, [deleteDialog, refreshList, posthog]);

  const requestDeleteFile = useCallback((id: string) => {
    setDeleteDialog({
      ids: [id],
      title: "Remove this file?",
      message:
        "This will permanently remove the file from this browser. This cannot be undone.",
    });
  }, []);

  const importFromJsonFile = useCallback(
    async (file: File) => {
      setImportError(null);
      setActionsOpen(false);
      try {
        let raw: unknown;
        try {
          raw = JSON.parse(await file.text()) as unknown;
        } catch (err) {
          posthog.captureException(err);
          setImportError(
            "That file is not valid JSON. Choose an exported Avnac JSON document and try again.",
          );
          return;
        }
        const document = parseAvnacDocument(raw);
        if (!document) {
          setImportError(
            "This JSON file could not be imported. Try an Avnac export or a legacy Fabric-based Avnac file.",
          );
          return;
        }
        const id = crypto.randomUUID();
        const name = nameFromImportFilename(file.name);
        await idbPutDocument(id, document, { name });
        posthog.capture("file_imported", {
          file_id: id,
          file_name: name,
          source_name: file.name,
          source_type: "json",
          imported_version: document.v,
        });
        refreshList();
        void navigate({ to: "/create", search: { id } });
      } catch (err) {
        posthog.captureException(err);
        setImportError(
          "The file could not be imported into this browser right now. Try again in a moment.",
        );
      }
    },
    [navigate, posthog, refreshList],
  );

  const onImportInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      void importFromJsonFile(file);
    },
    [importFromJsonFile],
  );

  const selectionCount = selectedIds.length;
  const legacyItems = items?.filter((row) => row.isLegacy) ?? [];
  const legacyCount = legacyItems.length;
  const actionButtonClass =
    "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center border-0 bg-[var(--text)] text-[15px] font-medium text-white transition hover:bg-[#262626] sm:min-h-12 sm:text-[1.0625rem]";
  const menuItemClass =
    "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[14px] font-medium text-[var(--text)] transition-colors hover:bg-black/[0.04]";

  const requestOpenFile = useCallback(
    (
      row: AvnacEditorIdbListItem,
      source: "thumbnail" | "title" | "menu",
    ) => {
      if (row.isLegacy) {
        setMigrationDialog({
          ids: [row.id],
          title: "Convert this file first",
          message: `"${row.name}" was made in an older version of Avnac. Convert it to the new editor before opening it.`,
          confirmLabel: "Convert and open",
          triggerSource: source,
          openFileId: row.id,
        });
        posthog.capture("legacy_conversion_prompt_opened", {
          surface: "files_page",
          trigger_source: source,
          file_count: 1,
          file_ids: [row.id],
          open_after_conversion: true,
        });
        return;
      }
      posthog.capture("file_opened", {
        file_id: row.id,
        method: source,
      });
      void navigate({ to: "/create", search: { id: row.id } });
    },
    [navigate, posthog],
  );

  const requestMigrateAll = useCallback(() => {
    if (legacyItems.length === 0) return;
    setMigrationDialog({
      ids: legacyItems.map((row) => row.id),
      title:
        legacyItems.length === 1
          ? "Migrate 1 old file?"
          : `Migrate ${legacyItems.length} old files?`,
      message:
        legacyItems.length === 1
          ? "This file was saved in an older version of Avnac. Convert it now so it opens normally in the new editor."
          : "These files were saved in an older version of Avnac. Convert them now so they open normally in the new editor.",
      confirmLabel:
        legacyItems.length === 1 ? "Convert file" : "Migrate all files",
      triggerSource: "banner",
    });
    posthog.capture("legacy_conversion_prompt_opened", {
      surface: "files_page",
      trigger_source: "banner",
      file_count: legacyItems.length,
      file_ids: legacyItems.map((row) => row.id),
      open_after_conversion: false,
    });
  }, [legacyItems]);

  const confirmMigration = useCallback(() => {
    if (!migrationDialog || migrationBusy) return;
    const { ids, openFileId, triggerSource } = migrationDialog;
    posthog.capture("legacy_conversion_started", {
      surface: "files_page",
      trigger_source: triggerSource,
      file_count: ids.length,
      file_ids: ids,
      open_after_conversion: openFileId != null,
    });
    setMigrationBusy(true);
    void (async () => {
      try {
        for (const id of ids) {
          await idbMigrateLegacyDocument(id);
        }
        posthog.capture("legacy_conversion_completed", {
          surface: "files_page",
          trigger_source: triggerSource,
          file_count: ids.length,
          file_ids: ids,
          open_after_conversion: openFileId != null,
          opened_file_id: openFileId ?? null,
        });
        setMigrationDialog(null);
        refreshList();
        if (openFileId) {
          void navigate({ to: "/create", search: { id: openFileId } });
        }
      } catch (err) {
        posthog.capture("legacy_conversion_failed", {
          surface: "files_page",
          trigger_source: triggerSource,
          file_count: ids.length,
          file_ids: ids,
          open_after_conversion: openFileId != null,
        });
        posthog.captureException(err);
        setImportError(
          "Those files could not be converted right now. Try again in a moment.",
        );
      } finally {
        setMigrationBusy(false);
      }
    })();
  }, [migrationBusy, migrationDialog, navigate, posthog, refreshList]);

  return (
    <main className="hero-page relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div className="hero-bg-orb hero-bg-orb-a" aria-hidden="true" />
      <div className="hero-bg-orb hero-bg-orb-b" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />

      <div className="relative z-[1] flex flex-1 flex-col">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] pt-4 sm:pt-5">
          <div className="mx-auto flex w-full max-w-6xl justify-end px-5 sm:px-8 pointer-events-auto">
            <div ref={actionsRef} className="relative flex shrink-0">
              <button
                type="button"
                className={`${actionButtonClass} rounded-l-full px-6 py-2.5 sm:px-8 sm:py-3`}
                onClick={() => setNewCanvasOpen(true)}
              >
                New file
              </button>
              <button
                type="button"
                aria-label="More file actions"
                aria-expanded={actionsOpen}
                aria-haspopup="menu"
                className={`${actionButtonClass} rounded-r-full border-l border-white/18 px-4 py-2.5 sm:px-5 sm:py-3`}
                onClick={() => setActionsOpen((open) => !open)}
              >
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={18}
                  strokeWidth={1.85}
                  className="shrink-0"
                />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={onImportInputChange}
              />
              {actionsOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 min-w-[14rem] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.12)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className={menuItemClass}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <HugeiconsIcon
                      icon={CloudUploadIcon}
                      size={18}
                      strokeWidth={1.7}
                      className="shrink-0 text-[var(--text-muted)]"
                    />
                    Import JSON
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 pt-4 sm:pt-5" aria-hidden>
          <div className="mx-auto flex h-11 w-full max-w-6xl justify-end px-5 sm:h-12 sm:px-8" />
        </div>

        <div
          className={`mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:py-20 ${selectionCount > 0 ? "pb-28 sm:pb-32" : ""}`}
        >
          <div className="rise-in">
            <h1 className="display-title mb-4 text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.06] tracking-[-0.03em] text-[var(--text)]">
              Files
            </h1>
            <p className="mb-12 max-w-xl text-lg leading-[1.6] text-[var(--text-muted)] sm:text-xl sm:leading-[1.55]">
              Designs saved in this browser. Open one to keep editing.
            </p>

            {loadError ? (
              <p className="text-base leading-relaxed text-red-600">
                {loadError}
              </p>
            ) : null}

            {importError ? (
              <p className="mt-4 text-base leading-relaxed text-red-600">
                {importError}
              </p>
            ) : null}

            {legacyCount > 0 ? (
              <div className="mb-8 flex flex-col gap-4 rounded-[1.75rem] border border-amber-300/60 bg-[linear-gradient(135deg,rgba(255,247,214,0.9),rgba(255,236,179,0.7))] p-5 shadow-[0_18px_44px_rgba(190,130,24,0.12)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900/70">
                    Old Files Found
                  </div>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-amber-950/80 sm:text-base">
                    {legacyCount === 1
                      ? "There is 1 file from the older editor in this browser. Convert it once and it will open normally in the new canvas."
                      : `There are ${legacyCount} files from the older editor in this browser. Convert them once and they will open normally in the new canvas.`}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border-0 bg-[var(--text)] px-6 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#262626] sm:min-h-12"
                  onClick={requestMigrateAll}
                >
                  {legacyCount === 1 ? "Migrate old file" : "Migrate all old files"}
                </button>
              </div>
            ) : null}

            {items === null ? (
              <p className="text-lg text-[var(--text-muted)]">Loading…</p>
            ) : items.length === 0 ? (
              <div className="max-w-xl">
                <p className="m-0 text-lg leading-[1.6] text-[var(--text-muted)]">
                  Nothing here yet. Start a canvas — it autosaves as you work.
                </p>
                <button
                  type="button"
                  className="mt-8 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--text)] px-10 py-3.5 text-base font-medium text-white hover:bg-[#262626] sm:min-h-14 sm:px-12 sm:py-4 sm:text-[1.0625rem]"
                  onClick={() => setNewCanvasOpen(true)}
                >
                  Open editor
                </button>
              </div>
            ) : (
              <ul className="m-0 grid list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-7">
                {items.map((row) => (
                  <FileGridCard
                    key={row.id}
                    row={row}
                    formatUpdatedAt={formatUpdatedAt}
                    onListChange={refreshList}
                    selected={selectedIds.includes(row.id)}
                    onToggleSelect={toggleSelect}
                    onRequestDelete={requestDeleteFile}
                    onRequestOpen={requestOpenFile}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <NewCanvasDialog
        open={newCanvasOpen}
        onClose={() => setNewCanvasOpen(false)}
      />
      <FilesMultiselectBar
        count={selectionCount}
        onClear={clearSelection}
        onDownload={bulkDownload}
        onTrash={bulkTrash}
      />
      <DeleteConfirmDialog
        open={deleteDialog !== null}
        title={deleteDialog?.title ?? ""}
        message={deleteDialog?.message ?? ""}
        onClose={() => setDeleteDialog(null)}
        onConfirm={confirmDelete}
      />
      <DocumentMigrationDialog
        open={migrationDialog !== null}
        title={migrationDialog?.title ?? ""}
        message={migrationDialog?.message ?? ""}
        confirmLabel={migrationDialog?.confirmLabel ?? "Convert file"}
        busy={migrationBusy}
        onClose={() => {
          if (migrationBusy) return;
          if (migrationDialog) {
            posthog.capture("legacy_conversion_cancelled", {
              surface: "files_page",
              trigger_source: migrationDialog.triggerSource,
              file_count: migrationDialog.ids.length,
              file_ids: migrationDialog.ids,
              open_after_conversion: migrationDialog.openFileId != null,
            });
          }
          setMigrationDialog(null);
        }}
        onConfirm={confirmMigration}
      />
    </main>
  );
}
