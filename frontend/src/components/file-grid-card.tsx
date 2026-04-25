import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  Delete02Icon,
  Download01Icon,
  LinkSquare02Icon,
  MoreVerticalSquare01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import {
  idbDuplicateDocument,
  type AvnacEditorIdbListItem,
} from "../lib/avnac-editor-idb";
import { downloadAvnacJsonForId } from "../lib/avnac-files-export";
import FileGridPreview from "./file-grid-preview";

type FileGridCardProps = {
  row: AvnacEditorIdbListItem;
  formatUpdatedAt: (ts: number) => string;
  onListChange: () => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRequestDelete: (id: string) => void;
};

export default function FileGridCard({
  row,
  formatUpdatedAt,
  onListChange,
  selected,
  onToggleSelect,
  onRequestDelete,
}: FileGridCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const posthog = usePostHog();

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const openInNewTab = () => {
    setMenuOpen(false);
    posthog.capture("file_opened", { file_id: row.id, method: "new_tab" });
    const u = new URL("/create", window.location.origin);
    u.searchParams.set("id", row.id);
    window.open(u.toString(), "_blank", "noopener,noreferrer");
  };

  const makeCopy = () => {
    setMenuOpen(false);
    void (async () => {
      try {
        const newId = await idbDuplicateDocument(row.id);
        if (newId) {
          posthog.capture("file_duplicated", {
            file_id: row.id,
            new_file_id: newId,
          });
          onListChange();
        }
      } catch (err) {
        posthog.captureException(err);
        console.error("[avnac] duplicate failed", err);
      }
    })();
  };

  const downloadJson = () => {
    setMenuOpen(false);
    void (async () => {
      try {
        await downloadAvnacJsonForId(row.id);
        posthog.capture("file_downloaded", { file_id: row.id, format: "json" });
      } catch (err) {
        posthog.captureException(err);
        console.error("[avnac] download failed", err);
      }
    })();
  };

  const moveToTrash = () => {
    setMenuOpen(false);
    onRequestDelete(row.id);
  };

  const menuBtnClass =
    "flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--button-secondary-border)] bg-[var(--surface-raised)] text-[var(--text-muted)] opacity-0 pointer-events-none transition-[opacity,colors,border-color] duration-150 group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:border-[var(--button-secondary-border-hover)] hover:bg-[var(--surface-overlay-strong)] hover:text-[var(--text)]";

  const menuBtnVisible =
    menuOpen || selected
      ? `${menuBtnClass} opacity-100 pointer-events-auto`
      : menuBtnClass;

  const checkboxWrapClass =
    "inline-flex cursor-pointer opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto";

  const checkboxWrapVisible =
    menuOpen || selected
      ? `${checkboxWrapClass} opacity-100 pointer-events-auto`
      : checkboxWrapClass;

  const menuItemClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--hover)]";

  const openEditorClass =
    "block no-underline text-inherit transition-colors hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]";

  return (
    <li className="min-w-0">
      <div
        ref={wrapRef}
        className="group flex h-full flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] backdrop-blur-md transition-[border-color,background-color] duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft-hover)]"
      >
        <div className="relative p-2.5 sm:p-3">
          <div className="absolute left-3 top-3 z-20">
            <label className={checkboxWrapVisible}>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={selected}
                onChange={() => onToggleSelect(row.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <span
                className={[
                  "flex size-[22px] items-center justify-center rounded-md border-2 bg-[var(--surface-overlay-strong)] transition-colors",
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent)]"
                    : "border-[var(--border-strong)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--text)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--focus-ring-offset)]",
                ].join(" ")}
                aria-hidden
              >
                {selected ? (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    size={14}
                    strokeWidth={2.25}
                    className="shrink-0 text-[#181412]"
                  />
                ) : null}
              </span>
            </label>
          </div>
          <Link
            to="/create"
            search={{ id: row.id }}
            className={openEditorClass}
            onClick={() =>
              posthog.capture("file_opened", {
                file_id: row.id,
                method: "thumbnail",
              })
            }
          >
            <div
              className={[
                "relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[var(--surface-subtle)] transition-shadow duration-150",
                selected
                  ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--focus-ring-offset)]"
                  : "ring-1 ring-inset ring-[var(--line)]",
              ].join(" ")}
            >
              <FileGridPreview
                persistId={row.id}
                updatedAt={row.updatedAt}
                className="absolute inset-0"
              />
            </div>
          </Link>
          <div className="absolute right-4 top-4 z-10">
            <button
              type="button"
              className={menuBtnVisible}
              aria-label="File options"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <HugeiconsIcon
                icon={MoreVerticalSquare01Icon}
                size={18}
                strokeWidth={1.75}
                className="shrink-0"
              />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-1.5 min-w-[13.5rem] rounded-xl border border-[var(--line)] bg-[var(--surface)] py-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => openInNewTab()}
                >
                  <HugeiconsIcon
                    icon={LinkSquare02Icon}
                    size={18}
                    strokeWidth={1.65}
                    className="shrink-0 text-[var(--text-muted)]"
                  />
                  Open in new tab
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => makeCopy()}
                >
                  <HugeiconsIcon
                    icon={Copy01Icon}
                    size={18}
                    strokeWidth={1.65}
                    className="shrink-0 text-[var(--text-muted)]"
                  />
                  Make a copy
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => downloadJson()}
                >
                  <HugeiconsIcon
                    icon={Download01Icon}
                    size={18}
                    strokeWidth={1.65}
                    className="shrink-0 text-[var(--text-muted)]"
                  />
                  Download
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${menuItemClass} text-red-600 hover:bg-red-50`}
                  onClick={() => moveToTrash()}
                >
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    size={18}
                    strokeWidth={1.65}
                    className="shrink-0 text-red-600"
                  />
                  Move to trash
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <Link
          to="/create"
          search={{ id: row.id }}
          className={`${openEditorClass} flex min-h-0 flex-1 flex-col gap-2 border-t border-[var(--line)] px-4 pb-4 pt-3`}
          onClick={() =>
            posthog.capture("file_opened", { file_id: row.id, method: "title" })
          }
        >
          <div className="truncate text-[15px] font-medium leading-snug tracking-[-0.01em] text-[var(--text)]">
            {row.name}
          </div>
          <div className="text-[13px] leading-normal tabular-nums text-[var(--text-muted)]">
            {row.artboardWidth} × {row.artboardHeight}px
          </div>
          <time
            dateTime={new Date(row.updatedAt).toISOString()}
            className="mt-auto text-[12px] tabular-nums text-[var(--text-subtle)]"
          >
            {formatUpdatedAt(row.updatedAt)}
          </time>
        </Link>
      </div>
    </li>
  );
}
