import { HugeiconsIcon } from "@hugeicons/react";
import { Home05Icon } from "@hugeicons/core-free-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import EditorExportMenu from "../components/editor-export-menu";
import DocumentMigrationDialog from "../components/document-migration-dialog";
import SceneEditor, {
  type SceneEditorHandle,
} from "../components/scene-editor";
import { useEditorUnsupportedOnThisDevice } from "../hooks/use-editor-device-support";
import {
  idbGetEditorRecord,
  idbMigrateLegacyDocument,
  idbSetDocumentName,
} from "../lib/avnac-editor-idb";

type CreateSearch = {
  id?: string;
  w?: number;
  h?: number;
};

function parseSearchDimension(v: unknown): number | undefined {
  const n =
    typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN;
  if (!Number.isFinite(n)) return undefined;
  return Math.min(16000, Math.max(100, Math.round(n)));
}

export const Route = createFileRoute("/create")({
  validateSearch: (raw: Record<string, unknown>): CreateSearch => {
    const id = raw.id;
    return {
      id: typeof id === "string" && id.length > 0 ? id : undefined,
      w: parseSearchDimension(raw.w),
      h: parseSearchDimension(raw.h),
    };
  },
  component: CreatePage,
});

function CreatePage() {
  const editorRef = useRef<SceneEditorHandle>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("Untitled");
  const [documentStorageKind, setDocumentStorageKind] = useState<
    "loading" | "current" | "legacy"
  >("loading");
  const [migrationBusy, setMigrationBusy] = useState(false);
  const search = Route.useSearch();
  const id = search.id;
  const initialW = search.w;
  const initialH = search.h;
  const navigate = Route.useNavigate();
  const posthog = usePostHog();
  const editorUnsupported = useEditorUnsupportedOnThisDevice();

  useLayoutEffect(() => {
    if (editorUnsupported) return;
    if (id) return;
    void navigate({
      to: "/create",
      search: {
        id: crypto.randomUUID(),
        w: initialW,
        h: initialH,
      },
      replace: true,
    });
  }, [editorUnsupported, id, initialW, initialH, navigate]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setDocumentStorageKind("loading");
    void idbGetEditorRecord(id).then((row) => {
      if (cancelled) return;
      setDocumentTitle(row?.name?.trim() || "Untitled");
      setDocumentStorageKind(row?.storageKind === "legacy" ? "legacy" : "current");
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const commitDocumentTitle = () => {
    const t = documentTitle.trim() || "Untitled";
    setDocumentTitle(t);
    if (id) {
      void idbSetDocumentName(id, t);
      posthog.capture("document_renamed", { file_id: id, new_name: t });
    }
  };

  const legacyBlocked = documentStorageKind === "legacy";
  const loadingDocument = documentStorageKind === "loading";

  useEffect(() => {
    if (!legacyBlocked || !id) return;
    posthog.capture("legacy_conversion_prompt_opened", {
      surface: "create_page",
      trigger_source: "direct_open",
      file_count: 1,
      file_ids: [id],
      open_after_conversion: false,
    });
  }, [id, legacyBlocked, posthog]);

  if (editorUnsupported) {
    return (
      <main className="hero-page relative flex min-h-[100dvh] flex-col overflow-hidden px-5 py-12 sm:px-8 sm:py-16">
        <div className="hero-bg-orb hero-bg-orb-a" aria-hidden="true" />
        <div className="hero-bg-orb hero-bg-orb-b" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />

        <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-1 items-center justify-center">
          <div className="w-full rounded-[2rem] border border-[var(--line)] bg-white/82 p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-md sm:p-10">
            <div className="landing-kicker mb-3">Desktop Only</div>
            <h1 className="display-title text-[clamp(2rem,8vw,3rem)] font-medium leading-[1.04] tracking-[-0.03em] text-[var(--text)]">
              The editor is not available on mobile.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
              Open Avnac on a desktop or laptop to create and edit files. You can
              still return to your files from here.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/files"
                className="inline-flex min-h-12 items-center justify-center rounded-full border-0 bg-[var(--text)] px-8 py-3 text-base font-medium text-white no-underline hover:bg-[#262626]"
              >
                Go to files
              </Link>
              <Link
                to="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/[0.14] bg-white/70 px-8 py-3 text-base font-medium text-[var(--text)] no-underline hover:border-black/[0.22] hover:bg-white"
              >
                Back home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!id) {
    return null;
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-[var(--surface-subtle)]">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 sm:px-5 sm:py-3.5">
        <Link
          to="/files"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] no-underline transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)]"
          aria-label="All files"
          title="All files"
        >
          <HugeiconsIcon
            icon={Home05Icon}
            size={18}
            strokeWidth={1.65}
            className="shrink-0"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <label htmlFor="avnac-doc-title" className="sr-only">
            Document name
          </label>
          <input
            id="avnac-doc-title"
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            onBlur={commitDocumentTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="m-0 w-full min-w-0 truncate border-0 bg-transparent text-sm font-medium leading-snug text-[var(--text)] outline-none focus:ring-0"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <EditorExportMenu
            disabled={!editorReady}
            onExport={(opts) => editorRef.current?.exportImage(opts)}
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4">
        {loadingDocument || legacyBlocked ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-[2rem] border border-[var(--line)] bg-white/60 backdrop-blur-md">
            <p className="text-sm font-medium text-[var(--text-muted)]">
              {legacyBlocked ? "Legacy file detected" : "Loading file…"}
            </p>
          </div>
        ) : (
          <SceneEditor
            ref={editorRef}
            persistId={id}
            persistDisplayName={documentTitle}
            onReadyChange={setEditorReady}
            initialArtboardWidth={initialW}
            initialArtboardHeight={initialH}
          />
        )}
      </div>
      <DocumentMigrationDialog
        open={legacyBlocked}
        title="Convert this file first"
        message={`"${documentTitle}" was made in an older version of Avnac. Convert it to the new editor before you keep editing.`}
        confirmLabel="Convert file"
        cancelLabel="Back to files"
        busy={migrationBusy}
        onClose={() => {
          if (migrationBusy) return;
          posthog.capture("legacy_conversion_cancelled", {
            surface: "create_page",
            trigger_source: "direct_open",
            file_count: 1,
            file_ids: [id],
            open_after_conversion: false,
          });
          void navigate({ to: "/files" });
        }}
        onConfirm={() => {
          if (migrationBusy) return;
          posthog.capture("legacy_conversion_started", {
            surface: "create_page",
            trigger_source: "direct_open",
            file_count: 1,
            file_ids: [id],
            open_after_conversion: false,
          });
          setMigrationBusy(true);
          void (async () => {
            try {
              await idbMigrateLegacyDocument(id);
              posthog.capture("legacy_conversion_completed", {
                surface: "create_page",
                trigger_source: "direct_open",
                file_count: 1,
                file_ids: [id],
                open_after_conversion: false,
                opened_file_id: id,
              });
              setDocumentStorageKind("current");
            } catch (err) {
              posthog.capture("legacy_conversion_failed", {
                surface: "create_page",
                trigger_source: "direct_open",
                file_count: 1,
                file_ids: [id],
                open_after_conversion: false,
              });
              posthog.captureException(err);
              console.error("[avnac] legacy migration failed", err);
            } finally {
              setMigrationBusy(false);
            }
          })();
        }}
      />
    </div>
  );
}
