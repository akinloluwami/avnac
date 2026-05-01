import { randomUUID } from 'node:crypto'
import { Elysia, t } from 'elysia'

import { env } from '../config/env'
import { HttpError } from '../lib/http'

const PAYSTACK_API_BASE = 'https://api.paystack.co'
const recurringPlanCache = new Map<string, Promise<string>>()
const sponsorIntervals = ['weekly', 'monthly', 'quarterly', 'annually'] as const

type SponsorMode = 'one-time' | 'recurring'
type SponsorInterval = (typeof sponsorIntervals)[number]

type SponsorMetadata = {
  kind: 'avnac-sponsor'
  tipMode: SponsorMode
  interval: SponsorInterval | null
  amountMajor: number
  currency: string
}

type PaystackEnvelope<T> = {
  status?: boolean
  message?: string
  data?: T
}

type PaystackInitializeData = {
  authorization_url?: string | null
  reference?: string | null
}

type PaystackPlanData = {
  plan_code?: string | null
}

type PaystackVerifyData = {
  status?: string | null
  reference?: string | null
  amount?: number | null
  currency?: string | null
  paid_at?: string | null
  gateway_response?: string | null
  metadata?: unknown
  plan?: unknown
  customer?: {
    email?: string | null
  } | null
}

function paystackSecretKey(): string {
  const key = env.PAYSTACK_SECRET_KEY
  if (!key) {
    throw new HttpError(503, 'Paystack checkout is not configured.')
  }
  return key
}

async function paystackRequest<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${PAYSTACK_API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${paystackSecretKey()}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    })
  } catch {
    throw new HttpError(502, 'Could not reach Paystack.')
  }

  let payload: PaystackEnvelope<T> | null = null
  try {
    payload = (await response.json()) as PaystackEnvelope<T>
  } catch {
    payload = null
  }

  if (!response.ok || !payload?.status || payload.data == null) {
    const reason = payload?.message?.trim()
    if (response.status === 401 || response.status === 403) {
      throw new HttpError(
        502,
        'Paystack rejected the server credentials. Check PAYSTACK_SECRET_KEY.',
      )
    }
    throw new HttpError(
      502,
      reason ? `Paystack request failed: ${reason}` : 'Paystack request failed.',
    )
  }

  return payload.data
}

function toMinorUnits(amountMajor: number): number {
  return Math.round(amountMajor * 100)
}

function fromMinorUnits(amountMinor: number): number {
  return Math.round(amountMinor) / 100
}

function createSponsorReference(mode: SponsorMode): string {
  return `avnac-${mode}-${Date.now()}-${randomUUID().slice(0, 8)}`
}

function parseCallbackUrl(value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new HttpError(400, 'Invalid return URL.')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpError(400, 'Invalid return URL.')
  }

  return parsed.toString()
}

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function asSponsorInterval(value: unknown): SponsorInterval | null {
  if (typeof value !== 'string') {
    return null
  }
  return sponsorIntervals.find(interval => interval === value) ?? null
}

function planCacheKey(input: {
  amountMinor: number
  currency: string
  interval: SponsorInterval
}): string {
  return `${input.currency}:${input.interval}:${input.amountMinor}`
}

async function createRecurringPlan(input: {
  amountMinor: number
  amountMajor: number
  currency: string
  interval: SponsorInterval
}): Promise<string> {
  const plan = await paystackRequest<PaystackPlanData>('/plan', {
    method: 'POST',
    body: JSON.stringify({
      name: `Avnac Sponsor ${toTitleCase(input.interval)} ${input.currency} ${input.amountMajor}`,
      interval: input.interval,
      amount: input.amountMinor,
      currency: input.currency,
      description: `Recurring ${input.interval} tip for Avnac`,
    }),
  })

  const planCode = plan.plan_code?.trim()
  if (!planCode) {
    throw new HttpError(502, 'Paystack did not return a plan code.')
  }

  return planCode
}

async function getRecurringPlanCode(input: {
  amountMinor: number
  amountMajor: number
  currency: string
  interval: SponsorInterval
}): Promise<string> {
  const key = planCacheKey(input)
  const existing = recurringPlanCache.get(key)
  if (existing) {
    return existing
  }

  const pending = createRecurringPlan(input).catch(error => {
    recurringPlanCache.delete(key)
    throw error
  })

  recurringPlanCache.set(key, pending)
  return pending
}

function parseSponsorMetadata(value: unknown): SponsorMetadata | null {
  let parsed = value
  if (typeof value === 'string' && value.trim()) {
    try {
      parsed = JSON.parse(value) as unknown
    } catch {
      return null
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const record = parsed as Record<string, unknown>
  if (record.kind !== 'avnac-sponsor') {
    return null
  }

  const tipMode = record.tipMode === 'recurring' ? 'recurring' : 'one-time'
  const interval = asSponsorInterval(record.interval)
  const amountMajor = typeof record.amountMajor === 'number' ? record.amountMajor : 0
  const currency =
    typeof record.currency === 'string' && record.currency.trim()
      ? record.currency
      : env.PAYSTACK_CURRENCY

  return {
    kind: 'avnac-sponsor',
    tipMode,
    interval,
    amountMajor,
    currency,
  }
}

function resolveModeFromPlan(plan: unknown): SponsorMode {
  if (plan == null) {
    return 'one-time'
  }
  if (typeof plan === 'string' && plan.trim()) {
    return 'recurring'
  }
  if (typeof plan === 'object') {
    return Object.keys(plan as Record<string, unknown>).length > 0 ? 'recurring' : 'one-time'
  }
  return 'one-time'
}

export const sponsorRoutes = new Elysia({ prefix: '/sponsor' })
  .get('/config', () => ({
    data: {
      enabled: Boolean(env.PAYSTACK_SECRET_KEY),
      currency: env.PAYSTACK_CURRENCY,
      recurringIntervals: sponsorIntervals,
    },
  }))
  .post(
    '/checkout',
    async ({ body }) => {
      const email = body.email.trim().toLowerCase()
      const amountMajor = Math.round(body.amount)
      const callbackUrl = parseCallbackUrl(body.returnUrl)
      const currency = env.PAYSTACK_CURRENCY
      const amountMinor = toMinorUnits(amountMajor)
      const recurringInterval = asSponsorInterval(body.interval)

      if (body.mode === 'recurring' && !recurringInterval) {
        throw new HttpError(400, 'Recurring tips require a billing interval.')
      }

      const metadata: SponsorMetadata = {
        kind: 'avnac-sponsor',
        tipMode: body.mode,
        interval: body.mode === 'recurring' ? recurringInterval : null,
        amountMajor,
        currency,
      }

      const payload: Record<string, unknown> = {
        email,
        amount: String(amountMinor),
        currency,
        reference: createSponsorReference(body.mode),
        callback_url: callbackUrl,
        metadata: JSON.stringify(metadata),
      }

      if (body.mode === 'recurring') {
        const planCode = await getRecurringPlanCode({
          amountMinor,
          amountMajor,
          currency,
          interval: recurringInterval!,
        })
        payload.plan = planCode
      }

      const initialized = await paystackRequest<PaystackInitializeData>('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const checkoutUrl = initialized.authorization_url?.trim()
      const reference = initialized.reference?.trim()
      if (!checkoutUrl || !reference) {
        throw new HttpError(502, 'Paystack did not return a checkout URL for this tip.')
      }

      return {
        data: {
          checkoutUrl,
          reference,
        },
      }
    },
    {
      body: t.Object({
        mode: t.Union([t.Literal('one-time'), t.Literal('recurring')]),
        email: t.String({ format: 'email' }),
        amount: t.Integer({ minimum: 100 }),
        interval: t.Optional(
          t.Union(
            sponsorIntervals.map(interval => t.Literal(interval)) as unknown as [
              ReturnType<typeof t.Literal>,
              ...ReturnType<typeof t.Literal>[],
            ],
          ),
        ),
        returnUrl: t.String({ minLength: 1 }),
      }),
    },
  )
  .get(
    '/verify/:reference',
    async ({ params }) => {
      const paystackData = await paystackRequest<PaystackVerifyData>(
        `/transaction/verify/${encodeURIComponent(params.reference)}`,
        { method: 'GET' },
      )
      const metadata = parseSponsorMetadata(paystackData.metadata)
      const recurringMode = metadata?.tipMode ?? resolveModeFromPlan(paystackData.plan)

      return {
        data: {
          reference: paystackData.reference?.trim() || params.reference,
          status: paystackData.status?.trim() || 'unknown',
          amount:
            typeof paystackData.amount === 'number'
              ? fromMinorUnits(paystackData.amount)
              : (metadata?.amountMajor ?? 0),
          currency: paystackData.currency?.trim() || metadata?.currency || env.PAYSTACK_CURRENCY,
          paidAt: paystackData.paid_at ?? null,
          gatewayResponse: paystackData.gateway_response ?? null,
          email: paystackData.customer?.email ?? null,
          mode: recurringMode,
          interval: metadata?.interval ?? null,
        },
      }
    },
    {
      params: t.Object({
        reference: t.String({ minLength: 1 }),
      }),
    },
  )
