import { z } from 'zod'

import { DEFAULT_REMBG_MODEL, REMBG_MODELS } from '../lib/rembg'
import { getRuntimeEnv } from './runtime-env'

const optionalNonEmptyString = z.preprocess(
  value => (typeof value === 'string' && !value.trim() ? undefined : value),
  z.string().min(1).optional(),
)

const optionalUrl = z.preprocess(
  value => (typeof value === 'string' && !value.trim() ? undefined : value),
  z.string().url().optional(),
)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3001'),
  CORS_ORIGIN: z.string().default('http://localhost:3300'),
  UNSPLASH_ACCESS_KEY: optionalNonEmptyString,
  PAYSTACK_SECRET_KEY: optionalNonEmptyString,
  PAYSTACK_CURRENCY: z
    .string()
    .trim()
    .length(3, 'PAYSTACK_CURRENCY must be a 3-letter code')
    .transform(value => value.toUpperCase())
    .default('NGN'),
  REMBG_URL: optionalUrl,
  REMBG_DEFAULT_MODEL: z.enum(REMBG_MODELS).default(DEFAULT_REMBG_MODEL),
  REMBG_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  REMBG_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(20_000_000),
})

export const env = envSchema.parse(getRuntimeEnv())

export type Env = typeof env
