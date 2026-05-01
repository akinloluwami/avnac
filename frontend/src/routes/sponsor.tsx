import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import {
  createSponsorCheckout,
  fetchSponsorConfig,
  type SponsorConfig,
  type SponsorInterval,
  type SponsorMode,
  type SponsorVerification,
  verifySponsorPayment,
} from '../lib/sponsor-api'

const sponsorSearchSchema = z.object({
  reference: z.string().optional(),
  trxref: z.string().optional(),
})

export const Route = createFileRoute('/sponsor')({
  validateSearch: sponsorSearchSchema,
  component: SponsorPage,
})

const oneTimePresets = [2500, 5000, 10000, 25000] as const
const recurringPresets = [3000, 5000, 10000, 20000] as const
const fallbackIntervals: SponsorInterval[] = ['weekly', 'monthly', 'quarterly', 'annually']

type CheckoutState = {
  mode: SponsorMode | null
  error: string | null
}

type VerificationState =
  | { kind: 'idle' }
  | { kind: 'loading'; reference: string }
  | { kind: 'error'; message: string }
  | { kind: 'done'; payment: SponsorVerification }

function currencyFormatter(currency: string) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
}

function formatMoney(amount: number, currency: string): string {
  return currencyFormatter(currency).format(amount)
}

function intervalLabel(interval: SponsorInterval): string {
  switch (interval) {
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
    case 'quarterly':
      return 'Quarterly'
    case 'annually':
      return 'Yearly'
  }
}

function formatPaidAt(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function normalizeAmount(value: string): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return 0
  }
  return Math.round(numeric)
}

function cleanAmountInput(value: string): string {
  return value.replace(/[^\d]/g, '')
}

function SponsorPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const reference = search.reference ?? search.trxref ?? null

  const [config, setConfig] = useState<SponsorConfig | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [verification, setVerification] = useState<VerificationState>({
    kind: 'idle',
  })
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    mode: null,
    error: null,
  })
  const [activeModal, setActiveModal] = useState<SponsorMode | null>(null)

  const [oneTimeEmail, setOneTimeEmail] = useState('')
  const [oneTimeAmount, setOneTimeAmount] = useState('')
  const [recurringEmail, setRecurringEmail] = useState('')
  const [recurringAmount, setRecurringAmount] = useState('')
  const [recurringInterval, setRecurringInterval] = useState<SponsorInterval>('monthly')

  useEffect(() => {
    let cancelled = false

    void fetchSponsorConfig()
      .then(data => {
        if (cancelled) return
        setConfig(data)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setConfigError(error instanceof Error ? error.message : 'Could not load checkout settings.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!reference) {
      setVerification({ kind: 'idle' })
      return
    }

    let cancelled = false
    setVerification({ kind: 'loading', reference })

    void verifySponsorPayment(reference)
      .then(payment => {
        if (cancelled) return
        setVerification({ kind: 'done', payment })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setVerification({
          kind: 'error',
          message:
            error instanceof Error ? error.message : 'Could not verify the payment reference.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [reference])

  const currency = config?.currency ?? 'NGN'
  const recurringIntervals = config?.recurringIntervals ?? fallbackIntervals
  const checkoutPending = checkoutState.mode !== null
  const modalAmount = activeModal === 'recurring' ? recurringAmount : oneTimeAmount
  const statusModalOpen = verification.kind !== 'idle'

  function closeStatusModal() {
    setVerification({ kind: 'idle' })
    void navigate({ to: '/sponsor', search: {}, replace: true })
  }

  useEffect(() => {
    if (!activeModal && !statusModalOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (activeModal) {
        setActiveModal(null)
        return
      }
      if (statusModalOpen && verification.kind !== 'loading') {
        closeStatusModal()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeModal, statusModalOpen, verification.kind])

  function openCheckoutModal(mode: SponsorMode) {
    const amount = normalizeAmount(mode === 'one-time' ? oneTimeAmount : recurringAmount)

    if (amount < 100) {
      setCheckoutState({
        mode: null,
        error: 'Enter an amount of at least 100 before continuing.',
      })
      return
    }

    setCheckoutState(current => ({ ...current, error: null }))
    setActiveModal(mode)
  }

  async function beginCheckout(input: {
    mode: SponsorMode
    email: string
    amount: string
    interval?: SponsorInterval
  }) {
    if (!config?.enabled) {
      setCheckoutState({
        mode: null,
        error: 'Checkout is temporarily unavailable.',
      })
      return
    }

    const email = input.email.trim()
    const amount = normalizeAmount(input.amount)
    if (!email) {
      setCheckoutState({
        mode: null,
        error: 'Add an email address so Paystack can create the checkout.',
      })
      return
    }
    if (amount < 100) {
      setCheckoutState({
        mode: null,
        error: 'Enter an amount of at least 100.',
      })
      return
    }

    setCheckoutState({ mode: input.mode, error: null })

    try {
      const { checkoutUrl } = await createSponsorCheckout({
        mode: input.mode,
        email,
        amount,
        interval: input.interval,
        returnUrl: `${window.location.origin}/sponsor`,
      })
      window.location.assign(checkoutUrl)
      return
    } catch (error) {
      setCheckoutState({
        mode: null,
        error: error instanceof Error ? error.message : 'Could not start the Paystack checkout.',
      })
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-5 py-6 text-slate-950 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4 px-1 py-3 sm:px-2">
          <Link
            to="/"
            className="display-title text-2xl font-medium tracking-[-0.03em] text-slate-950"
          >
            Avnac
          </Link>
          <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <a
              href="https://github.com/akinloluwami/avnac"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            >
              GitHub
            </a>
          </div>
        </header>

        <section className="mx-auto mt-8 max-w-3xl text-center sm:mt-12">
          <h1 className="display-title text-5xl leading-[0.94] tracking-[-0.04em] text-balance text-slate-950 sm:text-6xl">
            Keep Avnac free and opensource
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600 sm:text-xl sm:leading-[1.6]">
            If you like Avnac, please consider sponsoring. Your support helps fund better tools,
            server cost, and steady progress.
          </p>
        </section>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {checkoutState.error ? (
            <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              {checkoutState.error}
            </div>
          ) : null}

          {configError ? (
            <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              {configError}
            </div>
          ) : null}
        </div>

        <section className="mx-auto mt-2 grid w-full max-w-4xl gap-6 lg:grid-cols-2">
          <section className="rounded-[2.25rem] border border-[#f0c9ad] bg-[#fff7f1] p-6 shadow-[0_12px_30px_rgba(15,23,42,0.07)] sm:p-7">
            <div className="flex items-start gap-4">
              <div>
                <div className="inline-flex rounded-full bg-[#ffe6d5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4b2d]">
                  One-time tip
                </div>
                <h2 className="display-title mt-4 text-3xl leading-tight tracking-[-0.03em] text-slate-950">
                  Send a single boost
                </h2>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-[#f0c9ad] bg-white/80 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Amount ({currency})
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={oneTimeAmount}
                onChange={event => {
                  setOneTimeAmount(cleanAmountInput(event.target.value))
                  setCheckoutState(current => ({ ...current, error: null }))
                }}
                placeholder="5000"
                aria-label="One-time tip amount"
                className="mt-2 w-full border-0 bg-transparent p-0 text-[clamp(2.6rem,6vw,3.75rem)] leading-none tracking-[-0.05em] text-slate-950 outline-none placeholder:text-slate-300"
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {oneTimePresets.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setOneTimeAmount(String(amount))}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                    normalizeAmount(oneTimeAmount) === amount
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-black/10 bg-white text-slate-700 hover:border-black/20 hover:bg-slate-50'
                  }`}
                >
                  {formatMoney(amount, currency)}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={checkoutPending}
              onClick={() => openCheckoutModal('one-time')}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Tip once
            </button>
          </section>

          <section className="rounded-[2.25rem] border border-[#c8ded3] bg-[#f2fbf6] p-6 shadow-[0_12px_30px_rgba(15,23,42,0.07)] sm:p-7">
            <div className="flex items-start gap-4">
              <div>
                <div className="inline-flex rounded-full bg-[#dff3e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#246247]">
                  Recurring tip
                </div>
                <h2 className="display-title mt-4 text-3xl leading-tight tracking-[-0.03em] text-slate-950">
                  Back the project on repeat
                </h2>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-[#c8ded3] bg-white/80 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Amount ({currency})
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={recurringAmount}
                onChange={event => {
                  setRecurringAmount(cleanAmountInput(event.target.value))
                  setCheckoutState(current => ({ ...current, error: null }))
                }}
                placeholder="5000"
                aria-label="Recurring tip amount"
                className="mt-2 w-full border-0 bg-transparent p-0 text-[clamp(2.6rem,6vw,3.75rem)] leading-none tracking-[-0.05em] text-slate-950 outline-none placeholder:text-slate-300"
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {recurringPresets.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setRecurringAmount(String(amount))}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                    normalizeAmount(recurringAmount) === amount
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-black/10 bg-white text-slate-700 hover:border-black/20 hover:bg-slate-50'
                  }`}
                >
                  {formatMoney(amount, currency)}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={checkoutPending}
              onClick={() => openCheckoutModal('recurring')}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Tip regularly
            </button>
          </section>
        </section>

        <section className="mx-auto w-full max-w-3xl pb-6">
          <div className="rounded-[2rem] border border-[#e7dfd2] bg-white px-6 py-6 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:px-8">
            <div className="landing-kicker">More Ways To Support</div>
            <h2 className="display-title mt-4 text-3xl tracking-[-0.03em] text-slate-950">
              Not in Nigeria?
            </h2>
            <div className="mt-6 flex justify-center">
              <a
                href="https://buymeacoffee.com/akinkunmi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-[16rem] items-center justify-center rounded-full border border-[#e0b200] bg-[#ffdd00] px-6 py-3 text-sm font-semibold text-[#3b2f00] shadow-[0_10px_22px_rgba(255,221,0,0.22)] transition hover:-translate-y-0.5 hover:border-[#caa000] hover:bg-[#ffd000] hover:shadow-[0_14px_28px_rgba(255,221,0,0.28)]"
              >
                Support on Buy Me a Coffee
              </a>
            </div>
          </div>
        </section>
      </div>

      {activeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close checkout modal"
            className="absolute inset-0 bg-black/30"
            onClick={() => setActiveModal(null)}
          />
          <div className="relative z-[1] w-full max-w-lg rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="landing-kicker">
                  {activeModal === 'one-time' ? 'One-time tip' : 'Recurring tip'}
                </div>
                <h2 className="display-title mt-4 text-3xl leading-tight tracking-[-0.03em] text-slate-950">
                  {activeModal === 'one-time'
                    ? 'Finish your one-time tip'
                    : 'Finish your recurring tip'}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-full border border-black/10 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-black/[0.04] hover:text-slate-950"
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 text-[clamp(2.5rem,6vw,3.4rem)] leading-none tracking-[-0.05em] text-slate-950">
              {formatMoney(Math.max(100, normalizeAmount(modalAmount) || 0), currency)}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {activeModal === 'one-time'
                ? 'Your chosen amount will be used for this checkout.'
                : `Renews every ${intervalLabel(recurringInterval).toLowerCase()}.`}
            </div>

            <label className="mt-6 block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={activeModal === 'one-time' ? oneTimeEmail : recurringEmail}
                onChange={event =>
                  activeModal === 'one-time'
                    ? setOneTimeEmail(event.target.value)
                    : setRecurringEmail(event.target.value)
                }
                placeholder="you@example.com"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-slate-950 outline-none ring-0 transition focus:border-black/25"
              />
            </label>

            {activeModal === 'recurring' ? (
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Renewal interval
                <select
                  value={recurringInterval}
                  onChange={event => setRecurringInterval(event.target.value as SponsorInterval)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-slate-950 outline-none ring-0 transition focus:border-black/25"
                >
                  {recurringIntervals.map(interval => (
                    <option key={interval} value={interval}>
                      {intervalLabel(interval)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <button
              type="button"
              disabled={checkoutPending}
              onClick={() =>
                beginCheckout({
                  mode: activeModal,
                  email: activeModal === 'one-time' ? oneTimeEmail : recurringEmail,
                  amount: activeModal === 'one-time' ? oneTimeAmount : recurringAmount,
                  interval: activeModal === 'recurring' ? recurringInterval : undefined,
                })
              }
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {checkoutState.mode === activeModal
                ? 'Opening Paystack...'
                : activeModal === 'one-time'
                  ? 'Continue to Paystack'
                  : 'Start recurring tip'}
            </button>
          </div>
        </div>
      ) : null}

      {statusModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-[rgba(14,19,38,0.36)] backdrop-blur-[2px]" />
          <div className="relative z-[1] w-full max-w-xl overflow-hidden rounded-[2.2rem] border border-black/8 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.22)]">
            <div className="px-6 pb-7 pt-6 sm:px-8 sm:pb-8 sm:pt-7">
              {verification.kind === 'loading' ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#fff1d6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9a651f]">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#f59e0b] animate-pulse" />
                      Confirming tip
                    </div>
                  </div>

                  <div className="mt-6 flex items-start gap-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-[#f5d7a4] bg-[#fff7e7]">
                      <div className="h-7 w-7 rounded-full border-[3px] border-slate-300 border-t-[#f59e0b] animate-spin" />
                    </div>
                    <div className="flex-1">
                      <h2 className="display-title text-4xl leading-[0.95] tracking-[-0.04em] text-slate-950">
                        Checking your payment
                      </h2>
                      <p className="mt-3 text-base leading-7 text-slate-600">
                        Hang tight while we confirm your Paystack checkout. This usually takes a few
                        seconds.
                      </p>
                      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Reference:{' '}
                        <span className="font-medium text-slate-900">{verification.reference}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : verification.kind === 'error' ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-800">
                      Verification issue
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-black/10 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-black/[0.04] hover:text-slate-950"
                      onClick={closeStatusModal}
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-6 flex items-start gap-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-rose-200 bg-rose-50 text-3xl">
                      !
                    </div>
                    <div className="flex-1">
                      <h2 className="display-title text-4xl leading-[0.95] tracking-[-0.04em] text-slate-950">
                        We couldn&apos;t confirm it yet
                      </h2>
                      <p className="mt-3 text-base leading-7 text-slate-600">
                        {verification.message}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3.5 text-base font-semibold text-white transition hover:bg-slate-800"
                    onClick={closeStatusModal}
                  >
                    Back to sponsor page
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        verification.payment.status === 'success'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {verification.payment.status === 'success'
                        ? verification.payment.mode === 'recurring'
                          ? 'Recurring tip live'
                          : 'Tip received'
                        : 'Payment update'}
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-black/10 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-black/[0.04] hover:text-slate-950"
                      onClick={closeStatusModal}
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-6 flex items-start gap-5">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-[1.4rem] text-3xl ${
                        verification.payment.status === 'success'
                          ? 'border border-emerald-200 bg-emerald-50'
                          : 'border border-slate-200 bg-slate-50'
                      }`}
                    >
                      {verification.payment.status === 'success' ? '✓' : '•'}
                    </div>
                    <div className="flex-1">
                      <h2 className="display-title text-4xl leading-[0.95] tracking-[-0.04em] text-slate-950">
                        {verification.payment.status === 'success'
                          ? 'Thank you for backing Avnac'
                          : 'Your payment update'}
                      </h2>
                      <p className="mt-3 text-base leading-7 text-slate-600">
                        {verification.payment.status === 'success'
                          ? verification.payment.mode === 'recurring'
                            ? `${formatMoney(verification.payment.amount, verification.payment.currency)} will now renew ${
                                verification.payment.interval
                                  ? intervalLabel(verification.payment.interval).toLowerCase()
                                  : 'on your chosen schedule'
                              }.`
                            : `${formatMoney(verification.payment.amount, verification.payment.currency)} was received successfully.`
                          : verification.payment.gatewayResponse ||
                            'Your payment was not marked successful yet.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Reference
                      </div>
                      <div className="mt-2 break-all text-sm leading-6 text-slate-900">
                        {verification.payment.reference}
                      </div>
                    </div>
                    {verification.payment.email ? (
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Email
                        </div>
                        <div className="mt-2 break-all text-sm leading-6 text-slate-900">
                          {verification.payment.email}
                        </div>
                      </div>
                    ) : null}
                    {formatPaidAt(verification.payment.paidAt) ? (
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 sm:col-span-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Confirmed at
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-900">
                          {formatPaidAt(verification.payment.paidAt)}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-7">
                    <a
                      href="https://github.com/akinloluwami/avnac"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-full border border-black/10 bg-slate-950 px-5 py-3.5 text-base font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_18px_30px_rgba(15,23,42,0.18)]"
                    >
                      View project on GitHub
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
