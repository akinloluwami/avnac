# Avnac backend

Backend-only API scaffold for Avnac using Bun, Elysia, PostgreSQL, Drizzle, and Better Auth.

## What matches the frontend

The document API stores the same editor payload shape the frontend currently saves locally:

- `document`: the main `AvnacDocumentV1` blob
- `vectorBoards`: the vector board metadata list
- `vectorBoardDocs`: the per-board vector documents map

Documents are keyed by the same UUID the frontend already generates in `/create?id=...`.

## Routes

- `GET /health`
- `ALL /auth/*`
- `GET /session`
- `GET /documents/:id`
- `PUT /documents/:id`
- `POST /documents/:id/claim`
- `GET /documents` for the signed-in user's owned docs
- `POST /media/remove-background`
- `GET /sponsor/config`
- `POST /sponsor/checkout`
- `GET /sponsor/verify/:reference`

The document endpoints are intentionally backend-only for now. Nothing in the frontend is wired to them yet.

## Setup

1. Copy `.env.example` to `.env`
2. Install dependencies with `bun install`
3. Apply the starter SQL in `drizzle/0000_initial.sql` or run Drizzle migrations
4. Start the API with `bun run dev`

## Optional Paystack setup

Set `PAYSTACK_SECRET_KEY` to enable sponsor checkout links, and `PAYSTACK_CURRENCY`
if you want something other than the default `NGN`.

## Background Removal Providers

The backend can proxy background removal to either:

- the existing `rembg` service
- the separate BRIA `RMBG-2.0` service

Set `BACKGROUND_REMOVAL_PROVIDER` to `rembg` or `bria` to choose the backend default.
Set `REMBG_URL` for the local rembg service and `BRIA_RMBG_URL` for the BRIA service.
The `POST /media/remove-background` route also accepts an optional `provider` field in JSON or multipart requests if a caller needs to override the server default per request.

## Notes on Better Auth schema

This repo includes a starter Postgres/Drizzle auth schema based on Better Auth's documented Drizzle adapter setup.
If you later add Better Auth plugins or custom auth fields, regenerate the auth schema with the official CLI and sync the migration:

```bash
bunx @better-auth/cli@latest generate
bun run db:generate
```
