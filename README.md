# Avnac

Avnac is a browser-first design editor for posters, layouts, social graphics, and other canvas-based compositions.


## Current Product State

Avnac today is strongest around:

- Fast browser-local editing
- A custom scene editor with direct manipulation controls
- Files saved in IndexedDB with a dedicated `/files` view
- JSON import/export
- Legacy file migration into the current editor format
- Image export as `PNG`, `JPG`, and `WebP`
- Prompt-driven editing through the Magic panel

Things that are true right now:

- The main editing experience lives in the frontend
- The app is desktop-first; mobile editing is intentionally blocked
- File persistence is primarily browser-local today
- The backend exists, but it is optional for many day-to-day editor tasks

## Editor Capabilities

The current editor supports:

- Custom-size or preset canvases
- Text, rectangles, ellipses, polygons, stars, lines, arrows, images, and vector boards
- Selection, multi-select, marquee select, group/ungroup, reorder, and alignment
- Resize, rotate, crop, corner radius, blur, opacity, shadows, and background editing
- Snapping and transform overlays
- Nested vector-board drawing areas
- QR code generation
- JSON file import from the files page
- Legacy-file conversion prompts before opening older documents

## Architecture Overview

### Frontend

The frontend is a React + Vite + TypeScript application with TanStack Router and Tailwind CSS.

Key architectural points:

- The editor no longer depends on an external canvas editing runtime for scene manipulation
- Scene data is modeled in `frontend/src/lib/avnac-scene.ts`
- Rendering/export logic lives in `frontend/src/lib/avnac-scene-render.ts`
- Low-level geometry, snapping, object transforms, file placement, and related logic live under `frontend/src/scene-engine/primitives`
- The scene editor UI has been split into smaller modules under `frontend/src/components/scene-editor`
- Shared editor state now uses a small Zustand-backed store in `frontend/src/components/scene-editor/editor-store.tsx`

Important frontend routes:

- `/` landing page
- `/files` local files manager
- `/create` editor

### Backend

The backend is an Elysia + TypeScript service. It is not required for all local editing workflows, but it is useful for:

- media proxying for export-safe remote images
- Unsplash search/download flows
- document and auth-related server routes that exist in the repo

Current backend route areas:

- `backend/src/routes/media.ts`
- `backend/src/routes/unsplash.ts`
- `backend/src/routes/documents.ts`

## Repository Layout

```text
frontend/
  src/
    routes/                   App routes like landing, files, and editor
    components/scene-editor/  Main editor UI modules, panels, overlays, hooks, store
    scene-engine/primitives/  Geometry, transforms, snapping, object/file helpers
    lib/                      Scene model, render/export, storage, previews, utilities
    __tests__/                Frontend unit/regression tests

backend/
  src/
    routes/                   Media, Unsplash, and document endpoints
    plugins/                  Backend plugins such as auth wiring
    db/                       Database setup and schema
```

## Persistence and File Handling

Avnac is currently local-first.

- Documents autosave in the browser
- The files page reads from IndexedDB
- The editor opens documents by id via `/create?id=...`
- JSON import/export is supported from the files workflow
- Older saved files are detected and can be migrated from the UI before editing

Legacy migration behavior currently includes:

- a migrate-all prompt on the files page when old files are present
- a conversion modal when a user clicks an old file
- a blocking conversion overlay if a user opens or refreshes an old editor URL directly

## Analytics

Frontend analytics use PostHog.

- Root provider setup lives in `frontend/src/routes/__root.tsx`
- The tracked event catalog is documented in `frontend/.posthog-events.json`

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3300`.

Optional Hugeicons Pro setup:

- The frontend works without a Hugeicons Pro license. By default, contributors will install only the free icon packages and the app will fall back to free sidebar icons.
- If you have a Hugeicons Pro license, set `HUGEICONS_NPM_TOKEN` before running `npm install` in `frontend/`. The optional package will install and Vite will automatically switch the sidebar to the pro icon set.
- Do not expose this token with a `VITE_` prefix. It is only needed at install/build time.
- In production or CI, builds can still succeed without the token. They will simply use the free fallback icons instead of the pro ones.

Example local setup for licensed installs:

```bash
cd frontend
export HUGEICONS_NPM_TOKEN=your_token_here
npm install
```

Useful frontend scripts:

```bash
cd frontend
npm run dev
npm run build
npm run preview
npm test
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Runs on `http://localhost:3001`.

Useful backend scripts:

```bash
cd backend
npm run dev
npm run check
```

## Backend Notes

The backend matters most when you are working on remote media, Unsplash flows, or server-backed document/auth behavior.

In local development, the frontend can still be the primary focus if you are working on:

- scene editing
- selection and transform behavior
- local files
- legacy migration UX
- export behavior

## Testing

Frontend regression tests live in `frontend/src/__tests__`.

Right now they cover core areas such as:

- scene parsing and migration detection
- snapping behavior
- image/object resize behavior
- vector-board render behavior
- file placement helpers

## Practical Notes

- If you change media proxy behavior, restart the backend before testing export flows that depend on remote images
- If you are debugging editor behavior, the frontend is the main source of truth
- If you are debugging old-file compatibility, start with `frontend/src/lib/avnac-scene.ts` and the files/create routes
