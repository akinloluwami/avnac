import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SHOW_DELAY_MS = 450
const GAP = 8
const VIEWPORT_PAD = 8

type TipState = {
  text: string
  left: number
  top: number
  placeAbove: boolean
}

function positionTip(el: Element, text: string): TipState {
  const r = el.getBoundingClientRect()
  const midX = r.left + r.width / 2
  const estH = 36
  const belowY = r.bottom + GAP
  const placeAbove = belowY + estH > window.innerHeight - VIEWPORT_PAD
  const top = placeAbove ? r.top - GAP - estH : belowY
  return {
    text,
    left: midX,
    top,
    placeAbove,
  }
}

/**
 * Replaces delayed native `title` tooltips with a styled floating label.
 * Elements can opt out with `data-no-native-title-tooltip`.
 */
export default function NativeTitleTooltip() {
  const [tip, setTip] = useState<TipState | null>(null)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduledElRef = useRef<Element | null>(null)
  const activeTargetRef = useRef<Element | null>(null)
  const stashRef = useRef(new WeakMap<Element, string>())

  useEffect(() => {
    const clearShowTimer = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current)
        showTimerRef.current = null
      }
    }

    const restoreTitle = (el: Element | null) => {
      if (!el) return
      const v = stashRef.current.get(el)
      if (v !== undefined) {
        el.setAttribute('title', v)
        stashRef.current.delete(el)
      }
    }

    const hide = () => {
      clearShowTimer()
      if (scheduledElRef.current) {
        restoreTitle(scheduledElRef.current)
        scheduledElRef.current = null
      }
      restoreTitle(activeTargetRef.current)
      activeTargetRef.current = null
      setTip(null)
    }

    const stashTitle = (el: Element, text: string) => {
      if (!stashRef.current.has(el)) stashRef.current.set(el, text)
      el.removeAttribute('title')
    }

    const show = (el: Element) => {
      if (!document.contains(el)) return
      const text = stashRef.current.get(el)
      if (!text) return
      activeTargetRef.current = el
      setTip(positionTip(el, text))
    }

    const scheduleShow = (el: Element, text: string) => {
      clearShowTimer()
      if (activeTargetRef.current && activeTargetRef.current !== el) {
        restoreTitle(activeTargetRef.current)
        activeTargetRef.current = null
        setTip(null)
      }
      stashTitle(el, text)
      scheduledElRef.current = el
      showTimerRef.current = setTimeout(() => {
        showTimerRef.current = null
        scheduledElRef.current = null
        show(el)
      }, SHOW_DELAY_MS)
    }

    const onMouseOver = (e: MouseEvent) => {
      const t = e.target
      if (!(t instanceof Element)) return
      const el = t.closest('[title]')
      if (!el || el.closest('[data-no-native-title-tooltip]')) return
      const text = el.getAttribute('title')?.trim()
      if (!text) return
      scheduleShow(el, text)
    }

    const onMouseOut = (e: MouseEvent) => {
      const rel = e.relatedTarget as Node | null
      const scheduled = scheduledElRef.current
      if (scheduled) {
        if (!rel || !scheduled.contains(rel)) {
          clearShowTimer()
          restoreTitle(scheduled)
          scheduledElRef.current = null
        }
      }
      const active = activeTargetRef.current
      if (active) {
        if (rel && active.contains(rel)) return
        hide()
      }
    }

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target
      if (!(t instanceof Element)) return
      const el = t.closest('[title]')
      if (!el || el.closest('[data-no-native-title-tooltip]')) return
      const text = el.getAttribute('title')?.trim()
      if (!text) return
      scheduleShow(el, text)
    }

    const onFocusOut = (e: FocusEvent) => {
      const rel = e.relatedTarget as Node | null
      const scheduled = scheduledElRef.current
      if (scheduled) {
        if (!rel || !scheduled.contains(rel)) {
          clearShowTimer()
          restoreTitle(scheduled)
          scheduledElRef.current = null
        }
      }
      const active = activeTargetRef.current
      if (active) {
        if (rel && active.contains(rel)) return
        hide()
      }
    }

    const onScrollOrResize = () => hide()

    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mouseout', onMouseOut)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('mouseout', onMouseOut)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      hide()
    }
  }, [])

  if (!tip) return null

  return createPortal(
    <div
      className="pointer-events-none fixed z-[2147483647] max-w-[min(20rem,calc(100vw-1rem))] rounded-lg bg-neutral-900 px-2.5 py-1.5 text-center text-xs font-medium leading-snug text-white shadow-lg"
      style={{
        left: tip.left,
        top: tip.top,
        transform: tip.placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
      role="tooltip"
    >
      {tip.text}
    </div>,
    document.body,
  )
}
