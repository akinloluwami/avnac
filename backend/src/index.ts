import './load-env'

import { cors } from '@elysiajs/cors'
import { node } from '@elysiajs/node'
import { Elysia } from 'elysia'
import { auth } from './auth'
import { env } from './config/env'
import { sql } from './db'
import { HttpError } from './lib/http'
import { authPlugin } from './plugins/auth'
import { documentsRoutes } from './routes/documents'
import { mediaRoutes } from './routes/media'
import { sponsorRoutes } from './routes/sponsor'
import { unsplashRoutes } from './routes/unsplash'

function corsOrigins(value: string): string | string[] {
  const parts = value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return parts.length <= 1 ? (parts[0] ?? value) : parts
}

const app = new Elysia({ adapter: node() })
  .use(
    cors({
      origin: corsOrigins(env.CORS_ORIGIN),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  .use(authPlugin)
  .onError(({ code, error, set }) => {
    if (error instanceof HttpError) {
      set.status = error.status
      return {
        error: error.message,
        details: error.details ?? null,
      }
    }

    if (code === 'VALIDATION') {
      set.status = 400
      return {
        error: 'Invalid request payload',
        details: error.message,
      }
    }

    console.error(error)
    set.status = 500
    return {
      error: 'Internal server error',
    }
  })
  .get('/', () => ({
    name: 'avnac-backend',
    status: 'ok',
  }))
  .get('/health', async () => {
    await sql`select 1`
    return {
      status: 'ok',
      database: 'reachable',
    }
  })
  .get('/session', async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    return {
      data: session,
    }
  })
  .use(documentsRoutes)
  .use(mediaRoutes)
  .use(sponsorRoutes)
  .use(unsplashRoutes)
  .listen(env.PORT)

console.log(`Avnac backend running at ${app.server?.hostname}:${app.server?.port}`)
