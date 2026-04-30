import { HugeiconsIcon } from '@hugeicons/react'
import {
  AlignBottomIcon,
  AlignHorizontalCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignSelectionIcon,
  AlignTopIcon,
  AlignVerticalCenterIcon,
  ArrowRight01Icon,
  Copy01Icon,
  Delete02Icon,
  FilePasteIcon,
  GroupItemsIcon,
  Layers02Icon,
  More01Icon,
  UngroupItemsIcon,
  SquareLock01Icon,
  SquareUnlock01Icon,
} from '@hugeicons/core-free-icons'
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type RefObject,
} from 'react'
import {
  measureHorizontalFlyoutInContainer,
  useContainedHorizontalPopoverPlacement,
} from '../hooks/use-viewport-aware-popover'
import {
  FloatingToolbarDivider,
  FloatingToolbarShell,
  floatingToolbarIconButton,
  floatingToolbarPopoverClass,
  floatingToolbarPopoverMenuClass,
} from './floating-toolbar-shell'

export type CanvasAlignKind =
  | 'left'
  | 'centerH'
  | 'right'
  | 'top'
  | 'centerV'
  | 'bottom'

const VIEWPORT_CONTAIN_PAD = 8

function containmentDeltaForRect(
  rect: DOMRect,
  vp: DOMRect,
  pad: number,
): { x: number; y: number } {
  const innerL = vp.left + pad
  const innerR = vp.right - pad
  const innerT = vp.top + pad
  const innerB = vp.bottom - pad
  const maxW = innerR - innerL
  const maxH = innerB - innerT

  let dx = 0
  let dy = 0

  if (rect.width > maxW) {
    dx = innerL - rect.left
  } else {
    if (rect.left < innerL) dx = innerL - rect.left
    else if (rect.right > innerR) dx = innerR - rect.right
  }

  if (rect.height > maxH) {
    dy = innerT - rect.top
  } else {
    if (rect.top < innerT) dy = innerT - rect.top
    else if (rect.bottom > innerB) dy = innerB - rect.bottom
  }

  return { x: dx, y: dy }
}

type CanvasElementToolbarProps = {
  style: CSSProperties
  placement: 'above' | 'below'
  viewportRef: RefObject<HTMLElement | null>
  locked: boolean
  onDuplicate: () => void
  onToggleLock: () => void
  onDelete: () => void
  onCopy: () => void
  onPaste: () => void
  onAlign: (kind: CanvasAlignKind) => void
  alignAlreadySatisfied: Record<CanvasAlignKind, boolean>
  canGroup: boolean
  canAlignElements: boolean
  canUngroup: boolean
  onGroup: () => void
  onAlignElements: (kind: CanvasAlignKind) => void
  onUngroup: () => void
}

const CanvasElementToolbar = forwardRef<HTMLDivElement, CanvasElementToolbarProps>(
  function CanvasElementToolbar(
    {
      style,
      placement,
      viewportRef,
      locked,
      onDuplicate,
      onToggleLock,
      onDelete,
      onCopy,
      onPaste,
      onAlign,
      alignAlreadySatisfied,
      canGroup,
      canAlignElements,
      canUngroup,
      onGroup,
      onAlignElements,
      onUngroup,
    },
    ref,
  ) {
    const [moreOpen, setMoreOpen] = useState(false)
    const [alignOpen, setAlignOpen] = useState(false)
    const [alignElementsOpen, setAlignElementsOpen] = useState(false)
    const moreWrapRef = useRef<HTMLDivElement>(null)
    const morePanelRef = useRef<HTMLDivElement>(null)
    const alignElementsFlyoutRef = useRef<HTMLDivElement>(null)
    const alignPageFlyoutRef = useRef<HTMLDivElement>(null)
    const pickMorePanel = useCallback(
      () => morePanelRef.current,
      [],
    )
    const morePopoverShift = useContainedHorizontalPopoverPlacement(
      moreOpen,
      viewportRef,
      pickMorePanel,
    )
    const [alignElementsFlyoutShift, setAlignElementsFlyoutShift] = useState({
      x: 0,
      y: 0,
    })
    const [alignPageFlyoutShift, setAlignPageFlyoutShift] = useState({
      x: 0,
      y: 0,
    })
    const [viewportNudge, setViewportNudge] = useState({ x: 0, y: 0 })
    const rootRef = useRef<HTMLDivElement | null>(null)
    const prevAnchorRef = useRef<{
      left: CSSProperties['left']
      top: CSSProperties['top']
      placement: 'above' | 'below'
    } | null>(null)

    const assignRootRef = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ;(ref as MutableRefObject<HTMLDivElement | null>).current = node
        }
      },
      [ref],
    )

    useLayoutEffect(() => {
      const el = rootRef.current
      const vp = viewportRef.current
      if (!el || !vp) return

      const cur = {
        left: style.left,
        top: style.top,
        placement,
      }
      const prev = prevAnchorRef.current
      const anchorMoved =
        !prev ||
        prev.left !== cur.left ||
        prev.top !== cur.top ||
        prev.placement !== cur.placement
      prevAnchorRef.current = cur

      if (anchorMoved) {
        setViewportNudge({ x: 0, y: 0 })
      }

      const rect = el.getBoundingClientRect()
      const vpRect = vp.getBoundingClientRect()
      const d = containmentDeltaForRect(rect, vpRect, VIEWPORT_CONTAIN_PAD)

      if (anchorMoved) {
        setViewportNudge({ x: d.x, y: d.y })
      } else if (d.x !== 0 || d.y !== 0) {
        setViewportNudge((prevNudge) => ({
          x: prevNudge.x + d.x,
          y: prevNudge.y + d.y,
        }))
      }

      const clampAfterScrollOrResize = () => {
        const node = rootRef.current
        const vport = viewportRef.current
        if (!node || !vport) return
        const r = node.getBoundingClientRect()
        const vr = vport.getBoundingClientRect()
        const delta = containmentDeltaForRect(r, vr, VIEWPORT_CONTAIN_PAD)
        if (Math.abs(delta.x) < 0.25 && Math.abs(delta.y) < 0.25) return
        setViewportNudge((prevNudge) => ({
          x: prevNudge.x + delta.x,
          y: prevNudge.y + delta.y,
        }))
      }

      const ro = new ResizeObserver(() => clampAfterScrollOrResize())
      ro.observe(el)
      vp.addEventListener('scroll', clampAfterScrollOrResize, { passive: true })
      window.addEventListener('resize', clampAfterScrollOrResize)
      return () => {
        ro.disconnect()
        vp.removeEventListener('scroll', clampAfterScrollOrResize)
        window.removeEventListener('resize', clampAfterScrollOrResize)
      }
    }, [
      viewportRef,
      placement,
      style.left,
      style.top,
      locked,
      canGroup,
      canUngroup,
      canAlignElements,
      moreOpen,
      alignOpen,
      alignElementsOpen,
    ])

    useLayoutEffect(() => {
      if (!moreOpen) {
        setAlignElementsFlyoutShift({ x: 0, y: 0 })
        setAlignPageFlyoutShift({ x: 0, y: 0 })
        return
      }

      function sync() {
        const viewport = viewportRef.current
        if (!viewport) return
        if (alignElementsOpen) {
          const panel = alignElementsFlyoutRef.current
          if (panel) {
            const { shiftX, shiftY } = measureHorizontalFlyoutInContainer(
              viewport,
              panel,
            )
            setAlignElementsFlyoutShift({ x: shiftX, y: shiftY })
          }
        } else {
          setAlignElementsFlyoutShift({ x: 0, y: 0 })
        }
        if (alignOpen) {
          const panel = alignPageFlyoutRef.current
          if (panel) {
            const { shiftX, shiftY } = measureHorizontalFlyoutInContainer(
              viewport,
              panel,
            )
            setAlignPageFlyoutShift({ x: shiftX, y: shiftY })
          }
        } else {
          setAlignPageFlyoutShift({ x: 0, y: 0 })
        }
      }

      sync()
      window.addEventListener('resize', sync)
      window.addEventListener('scroll', sync, true)
      return () => {
        window.removeEventListener('resize', sync)
        window.removeEventListener('scroll', sync, true)
      }
    }, [
      moreOpen,
      alignElementsOpen,
      alignOpen,
      viewportRef,
    ])

    useEffect(() => {
      if (!moreOpen && !alignOpen && !alignElementsOpen) return
      const onDown = (e: MouseEvent) => {
        const t = e.target as Node
        if (moreWrapRef.current?.contains(t)) return
        setMoreOpen(false)
        setAlignOpen(false)
        setAlignElementsOpen(false)
      }
      document.addEventListener('mousedown', onDown)
      return () => document.removeEventListener('mousedown', onDown)
    }, [moreOpen, alignOpen, alignElementsOpen])

    useEffect(() => {
      if (!locked) return
      setMoreOpen(false)
      setAlignOpen(false)
      setAlignElementsOpen(false)
    }, [locked])

    useEffect(() => {
      if (!canAlignElements) setAlignElementsOpen(false)
    }, [canAlignElements])

    const transformY =
      placement === 'above'
        ? `calc(-100% - 10px + ${viewportNudge.y}px)`
        : `calc(10px + ${viewportNudge.y}px)`

    return (
      <div
        ref={assignRootRef}
        className="pointer-events-auto z-[35]"
        style={{
          position: 'absolute',
          transform: `translate(calc(-50% + ${viewportNudge.x}px), ${transformY})`,
          ...style,
        }}
      >
        <FloatingToolbarShell role="toolbar" aria-label="Element actions">
          <div
            ref={moreWrapRef}
            className="relative flex items-stretch overflow-visible"
          >
            {locked ? (
              <button
                type="button"
                className={[
                  floatingToolbarIconButton(true, { wide: true }),
                  'gap-1.5 px-2.5',
                ].join(' ')}
                title="Unlock"
                aria-label="Unlock"
                aria-pressed={true}
                onClick={onToggleLock}
              >
                <HugeiconsIcon
                  icon={SquareUnlock01Icon}
                  size={18}
                  strokeWidth={1.75}
                />
                <span className="text-[13px] font-medium">Unlock</span>
              </button>
            ) : (
              <>
                {canGroup ? (
                  <>
                    <button
                      type="button"
                      className={[
                        floatingToolbarIconButton(false, { wide: true }),
                        'gap-1.5 px-2.5',
                      ].join(' ')}
                      title="Group selection (Cmd/Ctrl+G)"
                      aria-label="Group selection"
                      onClick={onGroup}
                    >
                      <HugeiconsIcon
                        icon={GroupItemsIcon}
                        size={18}
                        strokeWidth={1.75}
                      />
                      <span className="text-[13px] font-medium">Group</span>
                    </button>
                    <FloatingToolbarDivider />
                  </>
                ) : null}
                {canUngroup ? (
                  <>
                    <button
                      type="button"
                      className={[
                        floatingToolbarIconButton(false, { wide: true }),
                        'gap-1.5 px-2.5',
                      ].join(' ')}
                      title="Ungroup (Cmd/Ctrl+Shift+G)"
                      aria-label="Ungroup selection"
                      onClick={onUngroup}
                    >
                      <HugeiconsIcon
                        icon={UngroupItemsIcon}
                        size={18}
                        strokeWidth={1.75}
                      />
                      <span className="text-[13px] font-medium">Ungroup</span>
                    </button>
                    <FloatingToolbarDivider />
                  </>
                ) : null}
                <button
                  type="button"
                  className={floatingToolbarIconButton(false)}
                  title="Duplicate"
                  aria-label="Duplicate"
                  onClick={onDuplicate}
                >
                  <HugeiconsIcon
                    icon={Layers02Icon}
                    size={18}
                    strokeWidth={1.75}
                  />
                </button>
                <button
                  type="button"
                  className={floatingToolbarIconButton(false)}
                  title="Lock"
                  aria-label="Lock"
                  aria-pressed={false}
                  onClick={onToggleLock}
                >
                  <HugeiconsIcon
                    icon={SquareLock01Icon}
                    size={18}
                    strokeWidth={1.75}
                  />
                </button>
                <button
                  type="button"
                  className={floatingToolbarIconButton(false)}
                  title="Delete"
                  aria-label="Delete"
                  onClick={onDelete}
                >
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    size={18}
                    strokeWidth={1.75}
                  />
                </button>
                <FloatingToolbarDivider />
                <div className="relative flex items-center pr-1">
              <button
                type="button"
                className={floatingToolbarIconButton(moreOpen)}
                title="More options"
                aria-label="More options"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setMoreOpen((o) => !o)
                  setAlignOpen(false)
                  setAlignElementsOpen(false)
                }}
              >
                <HugeiconsIcon icon={More01Icon} size={18} strokeWidth={1.75} />
              </button>
              {moreOpen ? (
                <div
                  ref={morePanelRef}
                  role="menu"
                  className={[
                    'absolute left-0 top-full z-[60] mt-1.5 min-w-[11rem] py-1',
                    floatingToolbarPopoverMenuClass,
                  ].join(' ')}
                  style={{
                    transform:
                      morePopoverShift.x !== 0 || morePopoverShift.y !== 0
                        ? `translate(${morePopoverShift.x}px, ${morePopoverShift.y}px)`
                        : undefined,
                  }}
                >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-neutral-800 hover:bg-black/[0.05]"
                  onClick={() => {
                    onCopy()
                    setMoreOpen(false)
                  }}
                >
                  <HugeiconsIcon
                    icon={Copy01Icon}
                    size={18}
                    strokeWidth={1.75}
                    className="shrink-0 text-neutral-600"
                  />
                  Copy
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-neutral-800 hover:bg-black/[0.05]"
                  onClick={() => {
                    void onPaste()
                    setMoreOpen(false)
                  }}
                >
                  <HugeiconsIcon
                    icon={FilePasteIcon}
                    size={18}
                    strokeWidth={1.75}
                    className="shrink-0 text-neutral-600"
                  />
                  Paste
                </button>
                <div className="my-1 h-px bg-black/[0.06]" aria-hidden />
                {canAlignElements ? (
                  <div className="relative w-full shrink-0">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] font-medium text-neutral-800 hover:bg-black/[0.05]"
                      aria-expanded={alignElementsOpen}
                      onClick={() => {
                        setAlignElementsOpen((a) => !a)
                        setAlignOpen(false)
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={AlignSelectionIcon}
                          size={18}
                          strokeWidth={1.75}
                          className="shrink-0 text-neutral-600"
                        />
                        Align elements
                      </span>
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={14}
                        strokeWidth={1.75}
                        className={`shrink-0 transition-transform ${alignElementsOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {alignElementsOpen ? (
                      <div
                        ref={alignElementsFlyoutRef}
                        role="menu"
                        className={[
                          'absolute left-full top-0 z-[61] ml-1.5 min-w-[10.5rem] py-1',
                          floatingToolbarPopoverClass,
                        ].join(' ')}
                        style={{
                          transform:
                            alignElementsFlyoutShift.x !== 0 ||
                            alignElementsFlyoutShift.y !== 0
                              ? `translate(${alignElementsFlyoutShift.x}px, ${alignElementsFlyoutShift.y}px)`
                              : undefined,
                        }}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05]"
                          onClick={() => {
                            onAlignElements('left')
                            setAlignElementsOpen(false)
                            setMoreOpen(false)
                          }}
                        >
                          <HugeiconsIcon
                            icon={AlignLeftIcon}
                            size={16}
                            strokeWidth={1.75}
                            className="text-neutral-600"
                          />
                          Left
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05]"
                          onClick={() => {
                            onAlignElements('centerH')
                            setAlignElementsOpen(false)
                            setMoreOpen(false)
                          }}
                        >
                          <HugeiconsIcon
                            icon={AlignHorizontalCenterIcon}
                            size={16}
                            strokeWidth={1.75}
                            className="text-neutral-600"
                          />
                          Center
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05]"
                          onClick={() => {
                            onAlignElements('right')
                            setAlignElementsOpen(false)
                            setMoreOpen(false)
                          }}
                        >
                          <HugeiconsIcon
                            icon={AlignRightIcon}
                            size={16}
                            strokeWidth={1.75}
                            className="text-neutral-600"
                          />
                          Right
                        </button>
                        <div className="my-1 h-px bg-black/[0.06]" aria-hidden />
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05]"
                          onClick={() => {
                            onAlignElements('top')
                            setAlignElementsOpen(false)
                            setMoreOpen(false)
                          }}
                        >
                          <HugeiconsIcon
                            icon={AlignTopIcon}
                            size={16}
                            strokeWidth={1.75}
                            className="text-neutral-600"
                          />
                          Top
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05]"
                          onClick={() => {
                            onAlignElements('centerV')
                            setAlignElementsOpen(false)
                            setMoreOpen(false)
                          }}
                        >
                          <HugeiconsIcon
                            icon={AlignVerticalCenterIcon}
                            size={16}
                            strokeWidth={1.75}
                            className="text-neutral-600"
                          />
                          Middle
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05]"
                          onClick={() => {
                            onAlignElements('bottom')
                            setAlignElementsOpen(false)
                            setMoreOpen(false)
                          }}
                        >
                          <HugeiconsIcon
                            icon={AlignBottomIcon}
                            size={16}
                            strokeWidth={1.75}
                            className="text-neutral-600"
                          />
                          Bottom
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="relative w-full shrink-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] font-medium text-neutral-800 hover:bg-black/[0.05]"
                    aria-expanded={alignOpen}
                    onClick={() => {
                      setAlignOpen((a) => !a)
                      setAlignElementsOpen(false)
                    }}
                  >
                    <span>Align to page</span>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={14}
                      strokeWidth={1.75}
                      className={`shrink-0 transition-transform ${alignOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {alignOpen ? (
                    <div
                      ref={alignPageFlyoutRef}
                      role="menu"
                      className={[
                        'absolute left-full top-0 z-[61] ml-1.5 min-w-[11rem] py-1',
                        floatingToolbarPopoverClass,
                      ].join(' ')}
                      style={{
                        transform:
                          alignPageFlyoutShift.x !== 0 ||
                          alignPageFlyoutShift.y !== 0
                            ? `translate(${alignPageFlyoutShift.x}px, ${alignPageFlyoutShift.y}px)`
                            : undefined,
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        disabled={alignAlreadySatisfied.left}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        onClick={() => {
                          onAlign('left')
                          setAlignOpen(false)
                          setMoreOpen(false)
                        }}
                      >
                        <HugeiconsIcon
                          icon={AlignLeftIcon}
                          size={16}
                          strokeWidth={1.75}
                          className="text-neutral-600"
                        />
                        Left
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={alignAlreadySatisfied.centerH}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        onClick={() => {
                          onAlign('centerH')
                          setAlignOpen(false)
                          setMoreOpen(false)
                        }}
                      >
                        <HugeiconsIcon
                          icon={AlignHorizontalCenterIcon}
                          size={16}
                          strokeWidth={1.75}
                          className="text-neutral-600"
                        />
                        Center horizontally
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={alignAlreadySatisfied.right}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        onClick={() => {
                          onAlign('right')
                          setAlignOpen(false)
                          setMoreOpen(false)
                        }}
                      >
                        <HugeiconsIcon
                          icon={AlignRightIcon}
                          size={16}
                          strokeWidth={1.75}
                          className="text-neutral-600"
                        />
                        Right
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={alignAlreadySatisfied.top}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        onClick={() => {
                          onAlign('top')
                          setAlignOpen(false)
                          setMoreOpen(false)
                        }}
                      >
                        <HugeiconsIcon
                          icon={AlignTopIcon}
                          size={16}
                          strokeWidth={1.75}
                          className="text-neutral-600"
                        />
                        Top
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={alignAlreadySatisfied.centerV}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        onClick={() => {
                          onAlign('centerV')
                          setAlignOpen(false)
                          setMoreOpen(false)
                        }}
                      >
                        <HugeiconsIcon
                          icon={AlignVerticalCenterIcon}
                          size={16}
                          strokeWidth={1.75}
                          className="text-neutral-600"
                        />
                        Center vertically
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={alignAlreadySatisfied.bottom}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-neutral-800 hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        onClick={() => {
                          onAlign('bottom')
                          setAlignOpen(false)
                          setMoreOpen(false)
                        }}
                      >
                        <HugeiconsIcon
                          icon={AlignBottomIcon}
                          size={16}
                          strokeWidth={1.75}
                          className="text-neutral-600"
                        />
                        Bottom
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              ) : null}
                </div>
              </>
            )}
          </div>
        </FloatingToolbarShell>
      </div>
    )
  },
)

export default CanvasElementToolbar
