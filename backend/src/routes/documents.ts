import { and, desc, eq, isNull } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { auth } from '../auth'
import { db } from '../db'
import { document } from '../db/schema'
import { documentPayloadSchema } from '../lib/editor-schema'
import { HttpError } from '../lib/http'

export const documentsRoutes = new Elysia({ prefix: '/documents' })
  .get('/', async ({ request, set }) => {
    const authSession = await auth.api.getSession({
      headers: request.headers,
    })

    if (!authSession) {
      throw new HttpError(401, 'Authentication required')
    }

    const rows = await db
      .select({
        id: document.id,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      })
      .from(document)
      .where(eq(document.ownerUserId, authSession.user.id))
      .orderBy(desc(document.updatedAt))

    set.status = 200
    return { data: rows }
  })
  .get('/:id', async ({ params, set }) => {
    const row = await db.query.document.findFirst({
      where: eq(document.id, params.id),
    })

    if (!row) {
      throw new HttpError(404, 'Document not found')
    }

    set.status = 200
    return {
      data: {
        id: row.id,
        ownerUserId: row.ownerUserId,
        document: row.document,
        vectorBoards: row.vectorBoards,
        vectorBoardDocs: row.vectorBoardDocs,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    }
  })
  .put('/:id', async ({ request, body, params, set }) => {
    const authSession = await auth.api.getSession({
      headers: request.headers,
    })

    const payload = documentPayloadSchema.parse(body)
    const existing = await db.query.document.findFirst({
      where: eq(document.id, params.id),
    })

    if (existing?.ownerUserId && existing.ownerUserId !== authSession?.user.id) {
      throw new HttpError(403, 'This document belongs to another authenticated user')
    }

    const now = new Date()
    const nextOwnerUserId = existing?.ownerUserId ?? authSession?.user.id ?? null

    if (!existing) {
      const [created] = await db
        .insert(document)
        .values({
          id: params.id,
          ownerUserId: nextOwnerUserId,
          document: payload.document,
          vectorBoards: payload.vectorBoards,
          vectorBoardDocs: payload.vectorBoardDocs,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      set.status = 201
      return { data: created }
    }

    const [updated] = await db
      .update(document)
      .set({
        ownerUserId: nextOwnerUserId,
        document: payload.document,
        vectorBoards: payload.vectorBoards,
        vectorBoardDocs: payload.vectorBoardDocs,
        updatedAt: now,
      })
      .where(eq(document.id, params.id))
      .returning()

    set.status = 200
    return { data: updated }
  })
  .post('/:id/claim', async ({ request, params, set }) => {
    const authSession = await auth.api.getSession({
      headers: request.headers,
    })

    if (!authSession) {
      throw new HttpError(401, 'Authentication required')
    }

    const row = await db.query.document.findFirst({
      where: eq(document.id, params.id),
    })

    if (!row) {
      throw new HttpError(404, 'Document not found')
    }

    if (row.ownerUserId && row.ownerUserId !== authSession.user.id) {
      throw new HttpError(403, 'Document already belongs to another user')
    }

    const [updated] = await db
      .update(document)
      .set({
        ownerUserId: authSession.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(document.id, params.id),
          row.ownerUserId
            ? eq(document.ownerUserId, row.ownerUserId)
            : isNull(document.ownerUserId),
        ),
      )
      .returning()

    set.status = 200
    return { data: updated }
  })
