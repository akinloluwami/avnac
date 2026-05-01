import { getPublicApiBase } from './public-api-base'

export type SponsorMode = 'one-time' | 'recurring'
export type SponsorInterval = 'weekly' | 'monthly' | 'quarterly' | 'annually'

export type SponsorConfig = {
  enabled: boolean
  currency: string
  recurringIntervals: SponsorInterval[]
}

export type SponsorCheckoutPayload = {
  mode: SponsorMode
  email: string
  amount: number
  interval?: SponsorInterval
  returnUrl: string
}

export type SponsorVerification = {
  reference: string
  status: string
  amount: number
  currency: string
  paidAt: string | null
  gatewayResponse: string | null
  email: string | null
  mode: SponsorMode
  interval: SponsorInterval | null
}

async function readData<T>(response: Response): Promise<T> {
  let payload: { data?: T; error?: string; message?: string } | null = null
  try {
    payload = (await response.json()) as { data?: T; error?: string; message?: string }
  } catch {
    payload = null
  }

  if (!response.ok || payload?.data == null) {
    throw new Error(
      payload?.error?.trim() || payload?.message?.trim() || 'Request failed. Please try again.',
    )
  }

  return payload.data
}

export async function fetchSponsorConfig(): Promise<SponsorConfig> {
  const response = await fetch(`${getPublicApiBase()}/sponsor/config`, {
    credentials: 'include',
  })
  return readData<SponsorConfig>(response)
}

export async function createSponsorCheckout(
  payload: SponsorCheckoutPayload,
): Promise<{ checkoutUrl: string; reference: string }> {
  const response = await fetch(`${getPublicApiBase()}/sponsor/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  return readData<{ checkoutUrl: string; reference: string }>(response)
}

export async function verifySponsorPayment(reference: string): Promise<SponsorVerification> {
  const response = await fetch(
    `${getPublicApiBase()}/sponsor/verify/${encodeURIComponent(reference)}`,
    {
      credentials: 'include',
    },
  )
  return readData<SponsorVerification>(response)
}
