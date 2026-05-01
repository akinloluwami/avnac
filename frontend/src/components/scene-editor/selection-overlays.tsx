import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import type { SceneImage, SceneObject } from '../../lib/avnac-scene'
import {
  cursorForHandle,
  RESIZE_HANDLES,
  type ResizeHandleId,
  type SceneSnapGuide,
} from '../../scene-engine/primitives'

const SELECT_ACCENT = 'var(--accent)'

export function ImageRemovalOverlay({
  object,
  phase,
}: {
  object: SceneImage
  phase: 'running' | 'success'
}) {
  return (
    <div
      className="pointer-events-none absolute z-[20]"
      style={{
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
        transform: `rotate(${object.rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      <div
        className="avnac-remove-bg-overlay absolute inset-0 overflow-hidden"
        data-phase={phase}
        style={{ borderRadius: object.cornerRadius }}
      >
        <div className="avnac-remove-bg-overlay__wash" />
        <div className="avnac-remove-bg-overlay__beam" />
        <div className="avnac-remove-bg-overlay__edge" />
      </div>
    </div>
  )
}

export function SelectionOverlay({
  object,
  scale,
  onHandlePointerDown,
  onRotatePointerDown,
}: {
  object: SceneObject
  scale: number
  onHandlePointerDown: (e: ReactPointerEvent<HTMLButtonElement>, handle: ResizeHandleId) => void
  onRotatePointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void
}) {
  const screenScale = Math.max(scale, 0.01)
  const borderWidth = 1.5 / screenScale
  const cornerHandleSize = 12 / screenScale
  const sideHandleLength = 22 / screenScale
  const sideHandleThickness = 8 / screenScale
  const cornerHitSize = 24 / screenScale
  const sideHitLength = 32 / screenScale
  const sideHitThickness = 24 / screenScale
  const rotateHitSize = 28 / screenScale
  const rotateHandleSize = 16 / screenScale
  const rotateCenterOffset = 30 / screenScale
  const handleChromeClass =
    'block border border-[#aeb0bd] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.18),0_0_0_1px_rgba(255,255,255,0.95)] transition-[transform,border-color,box-shadow] duration-150 group-hover:scale-110 group-hover:border-[#ff9f6e] group-hover:shadow-[0_2px_8px_rgba(15,23,42,0.22),0_0_0_3px_rgba(255,159,110,0.18)]'
  return (
    <div
      className="pointer-events-none absolute z-[22]"
      style={{
        left: object.x,
        top: object.y,
        width: object.width,
        height: object.height,
        transform: `rotate(${object.rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      <div
        className="absolute inset-0 rounded-[6px]"
        style={{
          border: `${borderWidth}px solid ${SELECT_ACCENT}`,
          boxShadow: `0 0 0 ${1 / screenScale}px rgba(255,255,255,0.9), 0 0 0 ${2.5 / screenScale}px color-mix(in srgb, ${SELECT_ACCENT} 16%, transparent)`,
        }}
      />
      {RESIZE_HANDLES.map(handle => {
        const horizontalSide = handle === 'e' || handle === 'w'
        const verticalSide = handle === 'n' || handle === 's'
        const side = horizontalSide || verticalSide
        const hitWidth = horizontalSide ? sideHitLength : side ? sideHitThickness : cornerHitSize
        const hitHeight = verticalSide ? sideHitLength : side ? sideHitThickness : cornerHitSize
        const visualWidth = horizontalSide
          ? sideHandleLength
          : verticalSide
            ? sideHandleThickness
            : cornerHandleSize
        const visualHeight = verticalSide
          ? sideHandleLength
          : horizontalSide
            ? sideHandleThickness
            : cornerHandleSize
        const hitOffsetX = -hitWidth / 2
        const hitOffsetY = -hitHeight / 2
        const common =
          'group pointer-events-auto absolute z-[2] flex items-center justify-center rounded-full bg-transparent p-0 outline-none touch-none'
        const pos: Record<ResizeHandleId, CSSProperties> = {
          nw: { left: hitOffsetX, top: hitOffsetY },
          n: { left: '50%', top: hitOffsetY, marginLeft: hitOffsetX },
          ne: { right: hitOffsetX, top: hitOffsetY },
          e: { right: hitOffsetX, top: '50%', marginTop: hitOffsetY },
          se: { right: hitOffsetX, bottom: hitOffsetY },
          s: { left: '50%', bottom: hitOffsetY, marginLeft: hitOffsetX },
          sw: { left: hitOffsetX, bottom: hitOffsetY },
          w: { left: hitOffsetX, top: '50%', marginTop: hitOffsetY },
        }
        return (
          <button
            key={handle}
            type="button"
            tabIndex={-1}
            className={common}
            style={{
              ...pos[handle],
              width: hitWidth,
              height: hitHeight,
              cursor: cursorForHandle(handle),
            }}
            onPointerDown={e => onHandlePointerDown(e, handle)}
          >
            <span
              aria-hidden="true"
              className={handleChromeClass}
              style={{
                width: visualWidth,
                height: visualHeight,
                borderRadius: side ? `${sideHandleThickness}px` : '9999px',
              }}
            />
          </button>
        )
      })}
      <div
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          bottom: -rotateCenterOffset,
          width: Math.max(1 / screenScale, borderWidth),
          height: rotateCenterOffset,
          background: SELECT_ACCENT,
          boxShadow: `0 0 0 ${1 / screenScale}px rgba(255,255,255,0.85)`,
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        className="group pointer-events-auto absolute left-1/2 z-[2] flex -translate-x-1/2 items-center justify-center rounded-full bg-transparent p-0 outline-none touch-none"
        style={{
          bottom: -(rotateCenterOffset + rotateHitSize / 2),
          width: rotateHitSize,
          height: rotateHitSize,
          cursor: 'grab',
        }}
        onPointerDown={onRotatePointerDown}
      >
        <span
          aria-hidden="true"
          className={handleChromeClass}
          style={{
            width: rotateHandleSize,
            height: rotateHandleSize,
            borderRadius: '9999px',
          }}
        />
      </button>
    </div>
  )
}

export function SelectionBoundsOverlay({
  bounds,
  scale,
  dashed = false,
  fill = false,
}: {
  bounds: { left: number; top: number; width: number; height: number }
  scale: number
  dashed?: boolean
  fill?: boolean
}) {
  const screenScale = Math.max(scale, 0.01)
  const borderWidth = 1.5 / screenScale
  return (
    <div
      className="pointer-events-none absolute z-[21] rounded-[6px]"
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        border: `${borderWidth}px ${dashed ? 'dashed' : 'solid'} ${SELECT_ACCENT}`,
        background: fill ? `color-mix(in srgb, ${SELECT_ACCENT} 12%, transparent)` : 'transparent',
        boxShadow: dashed
          ? undefined
          : `0 0 0 ${1 / screenScale}px color-mix(in srgb, ${SELECT_ACCENT} 18%, transparent)`,
      }}
    />
  )
}

export function SnapGuidesOverlay({
  guides,
  scale,
  artboardW,
  artboardH,
}: {
  guides: SceneSnapGuide[]
  scale: number
  artboardW: number
  artboardH: number
}) {
  if (guides.length === 0) return null
  const screenScale = Math.max(scale, 0.01)
  const lineThickness = 1 / screenScale
  return (
    <>
      {guides.map((guide, index) =>
        guide.axis === 'v' ? (
          <div
            key={`snap-v-${guide.pos}-${index}`}
            className="pointer-events-none absolute z-[19] bg-[var(--accent)]"
            style={{
              left: guide.pos - lineThickness / 2,
              top: 0,
              width: lineThickness,
              height: artboardH,
            }}
          />
        ) : (
          <div
            key={`snap-h-${guide.pos}-${index}`}
            className="pointer-events-none absolute z-[19] bg-[var(--accent)]"
            style={{
              left: 0,
              top: guide.pos - lineThickness / 2,
              width: artboardW,
              height: lineThickness,
            }}
          />
        ),
      )}
    </>
  )
}
