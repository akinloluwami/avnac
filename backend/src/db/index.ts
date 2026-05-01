import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../config/env'
import { schema } from './schema'

export const sql = postgres(env.DATABASE_URL, {
  max: 10,
  prepare: false,
})

export const db = drizzle(sql, { schema })
