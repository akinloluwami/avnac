import { type RefObject, useCallback, useLayoutEffect, useState } from 'react'

export function measureViewportPopoverPlacement(
  anchor: HTMLElement,
  panel: HTMLElement | null,
  estimatedHeightPx: number,
  horizontal: 'center' | 'left' = 'center',
): { openUpward: boolean; shiftX: number } {
  const gap = 8
  const pad = 8
  const rr = anchor.getBoundingClientRect()
  const below = window.innerHeight - rr.bottom - gap - pad
  const above = rr.top - gap - pad
  const menuH = panel?.getBoundingClientRect().height ?? estimatedHeightPx

  let openUpward: boolean
  if (above >= menuH) openUpward = true
  else if (below >= menuH) openUpward = false
  else openUpward = above > below

  let shiftX = 0
  if (panel) {
    const pr = panel.getBoundingClientRect()
    if (horizontal === 'center') {
      const w = pr.width
      const rootCx = rr.left + rr.width / 2
      if (rootCx - w / 2 < pad) shiftX = pad - (rootCx - w / 2)
      else if (rootCx + w / 2 > window.innerWidth - pad)
        shiftX = window.innerWidth - pad - (rootCx + w / 2)
    } else {
      if (pr.right > window.innerWidth - pad) shiftX = window.innerWidth - pad - pr.right
      else if (pr.left < pad) shiftX = pad - pr.left
    }
  }

  return { openUpward, shiftX }
}

/** Like {@link measureViewportPopoverPlacement} but clamps to a scroll container (e.g. editor canvas viewport). */
export function measurePopoverPlacementInContainer(
  container: HTMLElement,
  anchor: HTMLElement,
  panel: HTMLElement | null,
  estimatedHeightPx: number,
  horizontal: 'center' | 'left' | 'right' = 'center',
): { openUpward: boolean; shiftX: number } {
  const gap = 8
  const pad = 8
  const rr = anchor.getBoundingClientRect()
  const vr = container.getBoundingClientRect()
  const below = vr.bottom - rr.bottom - gap - pad
  const above = rr.top - vr.top - gap - pad
  const menuH = panel?.getBoundingClientRect().height ?? estimatedHeightPx

  let openUpward: boolean
  if (above >= menuH) openUpward = true
  else if (below >= menuH) openUpward = false
  else openUpward = above > below

  let shiftX = 0
  if (panel) {
    const pr = panel.getBoundingClientRect()
    if (horizontal === 'center') {
      const w = pr.width
      const rootCx = rr.left + rr.width / 2
      if (rootCx - w / 2 < vr.left + pad) shiftX = vr.left + pad - (rootCx - w / 2)
      else if (rootCx + w / 2 > vr.right - pad) shiftX = vr.right - pad - (rootCx + w / 2)
    } else if (horizontal === 'right') {
      if (pr.right > vr.right - pad) shiftX = vr.right - pad - pr.right
      else if (pr.left < vr.left + pad) shiftX = vr.left + pad - pr.left
    } else {
      if (pr.right > vr.right - pad) shiftX = vr.right - pad - pr.right
      else if (pr.left < vr.left + pad) shiftX = vr.left + pad - pr.left
    }
  }

  return { openUpward, shiftX }
}

/** Clamp a panel that opens horizontally (e.g. `left-full` from anchor) inside the viewport rect. */
export function measureHorizontalFlyoutInContainer(
  container: HTMLElement,
  panel: HTMLElement,
  pad: number = 8,
): { shiftX: number; shiftY: number } {
  const vr = container.getBoundingClientRect()
  const pr = panel.getBoundingClientRect()
  let shiftX = 0
  let shiftY = 0
  if (pr.right > vr.right - pad) shiftX += vr.right - pad - pr.right
  if (pr.left + shiftX < vr.left + pad) shiftX += vr.left + pad - (pr.left + shiftX)
  if (pr.bottom + shiftY > vr.bottom - pad) shiftY += vr.bottom - pad - (pr.bottom + shiftY)
  if (pr.top + shiftY < vr.top + pad) shiftY += vr.top + pad - (pr.top + shiftY)
  return { shiftX, shiftY }
}

export function useContainedHorizontalPopoverPlacement(
  open: boolean,
  viewportRef: RefObject<HTMLElement | null>,
  pickPanel: () => HTMLElement | null,
) {
  const [shift, setShift] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    if (!open) {
      setShift({ x: 0, y: 0 })
      return
    }

    function sync() {
      const viewport = viewportRef.current
      const panel = pickPanel()
      if (!viewport || !panel) return
      const { shiftX, shiftY } = measureHorizontalFlyoutInContainer(viewport, panel)
      setShift({ x: shiftX, y: shiftY })
    }

    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [open, viewportRef, pickPanel])

  return shift
}

export function useContainedViewportPopoverPlacement(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  viewportRef: RefObject<HTMLElement | null>,
  estimatedHeightPx: number,
  pickPanel: () => HTMLElement | null,
  horizontal: 'center' | 'left' | 'right' = 'center',
) {
  const [openUpward, setOpenUpward] = useState(true)
  const [shiftX, setShiftX] = useState(0)

  useLayoutEffect(() => {
    if (!open) {
      setOpenUpward(true)
      setShiftX(0)
      return
    }

    function sync() {
      const anchor = anchorRef.current
      const viewport = viewportRef.current
      if (!anchor || !viewport) return
      const { openUpward: up, shiftX: sx } = measurePopoverPlacementInContainer(
        viewport,
        anchor,
        pickPanel(),
        estimatedHeightPx,
        horizontal,
      )
      setOpenUpward(up)
      setShiftX(sx)
    }

    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [open, estimatedHeightPx, anchorRef, viewportRef, pickPanel, horizontal])

  return { openUpward, shiftX }
}

/**
 * `openUpward === true` → attach with `bottom-full` + margin (popover above anchor).
 * Also returns horizontal `shiftX` for `translateX(calc(-50% + shiftXpx))` when centered under `left-1/2`.
 */
export function useViewportAwarePopoverPlacement(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  estimatedHeightPx: number,
  pickPanel: () => HTMLElement | null,
  horizontal: 'center' | 'left' = 'center',
) {
  const [openUpward, setOpenUpward] = useState(true)
  const [shiftX, setShiftX] = useState(0)

  useLayoutEffect(() => {
    if (!open) {
      setOpenUpward(true)
      setShiftX(0)
      return
    }

    function sync() {
      const root = anchorRef.current
      if (!root) return
      const { openUpward: up, shiftX: sx } = measureViewportPopoverPlacement(
        root,
        pickPanel(),
        estimatedHeightPx,
        horizontal,
      )
      setOpenUpward(up)
      setShiftX(sx)
    }

    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [open, estimatedHeightPx, anchorRef, pickPanel, horizontal])

  return { openUpward, shiftX }
}

export function useStablePickPanel(
  strokePanelOpen: boolean,
  strokePanelRef: RefObject<HTMLDivElement | null>,
  lineTypePanelRef: RefObject<HTMLDivElement | null>,
): () => HTMLElement | null {
  return useCallback(() => {
    return strokePanelOpen ? strokePanelRef.current : lineTypePanelRef.current
  }, [strokePanelOpen, strokePanelRef, lineTypePanelRef])
}
