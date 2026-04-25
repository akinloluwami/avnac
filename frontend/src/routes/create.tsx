import { HugeiconsIcon } from "@hugeicons/react";
import { Home05Icon } from "@hugeicons/core-free-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import EditorExportMenu from "../components/editor-export-menu";
import FabricEditor, {
  type FabricEditorHandle,
} from "../components/fabric-editor";
import { useEditorUnsupportedOnThisDevice } from "../hooks/use-editor-device-support";
import {
  idbGetEditorRecord,
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
  const editorRef = useRef<FabricEditorHandle>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("Untitled");
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
    void idbGetEditorRecord(id).then((row) => {
      if (cancelled) return;
      setDocumentTitle(row?.name?.trim() || "Untitled");
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

  if (editorUnsupported) {
    return (
      <main className="hero-page relative flex min-h-[100dvh] flex-col overflow-hidden px-5 py-12 sm:px-8 sm:py-16">
        <div className="hero-bg-orb hero-bg-orb-a" aria-hidden="true" />
        <div className="hero-bg-orb hero-bg-orb-b" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />

        <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-1 items-center justify-center">
          <div className="theme-glass-card w-full rounded-[2rem] border p-7 text-center backdrop-blur-md sm:p-10">
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
                className="theme-primary-button inline-flex min-h-12 items-center justify-center rounded-full border-0 px-8 py-3 text-base font-medium no-underline"
              >
                Go to files
              </Link>
              <Link
                to="/"
                className="theme-secondary-button inline-flex min-h-12 items-center justify-center rounded-full border px-8 py-3 text-base font-medium text-[var(--text)] no-underline"
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
            onExport={(opts) => editorRef.current?.exportPng(opts)}
          />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4">
        <FabricEditor
          ref={editorRef}
          persistId={id}
          persistDisplayName={documentTitle}
          onReadyChange={setEditorReady}
          initialArtboardWidth={initialW}
          initialArtboardHeight={initialH}
        />
      </div>
    </div>
  );
}
