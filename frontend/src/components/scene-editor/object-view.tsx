import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import {
  type SceneArrow,
  type SceneObject,
  type SceneText,
} from '../../lib/avnac-scene'
import {
  bgValueToSceneCss,
  blurPxFromPct,
  layoutSceneText,
  renderVectorBoardDocumentToCanvas,
  sceneTextLineHeight,
} from '../../lib/avnac-scene-render'
import type { VectorBoardDocument } from '../../lib/avnac-vector-board-document'
import type { BgValue } from '../background-popover'

function objectFilterCss(obj: SceneObject) {
  const filters: string[] = []
  const blur = blurPxFromPct(obj.blurPct)
  if (blur > 0) filters.push(`blur(${blur}px)`)
  if (obj.shadow) {
    const alpha = Math.max(0, Math.min(100, obj.shadow.opacityPct)) / 100
    const hex = obj.shadow.colorHex.replace('#', '')
    const r = Number.parseInt(hex.slice(0, 2), 16) || 0
    const g = Number.parseInt(hex.slice(2, 4), 16) || 0
    const b = Number.parseInt(hex.slice(4, 6), 16) || 0
    filters.push(
      `drop-shadow(${obj.shadow.offsetX}px ${obj.shadow.offsetY}px ${obj.shadow.blur}px rgba(${r},${g},${b},${alpha}))`,
    )
  }
  return filters.length > 0 ? filters.join(' ') : undefined
}

function gradientEndpoints(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const tx = dx !== 0 ? 0.5 / Math.abs(dx) : Number.POSITIVE_INFINITY
  const ty = dy !== 0 ? 0.5 / Math.abs(dy) : Number.POSITIVE_INFINITY
  const halfLen = Math.min(tx, ty)
  return {
    x1: `${(0.5 - dx * halfLen) * 100}%`,
    y1: `${(0.5 - dy * halfLen) * 100}%`,
    x2: `${(0.5 + dx * halfLen) * 100}%`,
    y2: `${(0.5 + dy * halfLen) * 100}%`,
  }
}

function svgGradientDef(id: string, value: BgValue) {
  if (value.type !== 'gradient') return null
  const ends = gradientEndpoints(value.angle)
  return (
    <linearGradient id={id} x1={ends.x1} y1={ends.y1} x2={ends.x2} y2={ends.y2}>
      {value.stops.map((stop) => (
        <stop
          key={`${id}-${stop.offset}-${stop.color}`}
          offset={`${stop.offset * 100}%`}
          stopColor={stop.color}
        />
      ))}
    </linearGradient>
  )
}

function svgPaintUrl(id: string, value: BgValue) {
  return value.type === 'solid' ? value.color : `url(#${id})`
}

function objectTransformStyle(obj: SceneObject): CSSProperties {
  return {
    position: 'absolute',
    left: obj.x,
    top: obj.y,
    width: obj.width,
    height: obj.height,
    transform: `rotate(${obj.rotation}deg)`,
    transformOrigin: 'center center',
    opacity: obj.opacity,
    filter: objectFilterCss(obj),
    overflow: 'visible',
  }
}

function VectorBoardObjectPreview({
  doc,
  width,
  height,
}: {
  doc: VectorBoardDocument | undefined
  width: number
  height: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    if (!doc) return
    renderVectorBoardDocumentToCanvas(ctx, doc, width, height, {
      fillBackground: false,
    })
  }, [doc, width, height])

  return <canvas ref={ref} className="block h-full w-full rounded-xl" aria-hidden />
}

export function SceneObjectView({
  obj,
  vectorBoardDocs,
  textEditingId,
  textDraft,
  onObjectPointerDown,
  onObjectHoverChange,
  onTextDoubleClick,
  onTextDraftChange,
  onTextDraftCommit,
}: {
  obj: SceneObject
  vectorBoardDocs: Record<string, VectorBoardDocument>
  textEditingId: string | null
  textDraft: string
  onObjectPointerDown: (e: ReactPointerEvent<HTMLDivElement>, obj: SceneObject) => void
  onObjectHoverChange: (id: string, hovering: boolean) => void
  onTextDoubleClick: (obj: SceneText) => void
  onTextDraftChange: (value: string) => void
  onTextDraftCommit: () => void
}) {
  const isEditing = obj.type === 'text' && textEditingId === obj.id
  const style = objectTransformStyle(obj)
  const defsIdBase = obj.id.replace(/[^a-zA-Z0-9_-]/g, '')
  const hoverProps = {
    onPointerMove: () => onObjectHoverChange(obj.id, true),
    onPointerOver: () => onObjectHoverChange(obj.id, true),
    onPointerEnter: () => onObjectHoverChange(obj.id, true),
    onPointerLeave: () => onObjectHoverChange(obj.id, false),
  }

  if (obj.type === 'group') {
    return (
      <div
        style={style}
        data-avnac-scene-object
        onPointerDown={(e) => onObjectPointerDown(e, obj)}
        {...hoverProps}
        title={obj.locked ? 'Locked group' : undefined}
      >
        {obj.children.map((child) => (
          <div key={child.id} style={{ pointerEvents: 'none' }}>
            <SceneObjectView
              obj={child}
              vectorBoardDocs={vectorBoardDocs}
              textEditingId={textEditingId}
              textDraft={textDraft}
              onObjectPointerDown={onObjectPointerDown}
              onObjectHoverChange={onObjectHoverChange}
              onTextDoubleClick={onTextDoubleClick}
              onTextDraftChange={onTextDraftChange}
              onTextDraftCommit={onTextDraftCommit}
            />
          </div>
        ))}
      </div>
    )
  }

  if (obj.type === 'image') {
    const scaleX = obj.width / Math.max(1, obj.crop.width)
    const scaleY = obj.height / Math.max(1, obj.crop.height)
    return (
      <div
        style={style}
        data-avnac-scene-object
        onPointerDown={(e) => onObjectPointerDown(e, obj)}
        {...hoverProps}
        title={obj.locked ? 'Locked image' : undefined}
      >
        <div
          className="relative h-full w-full overflow-hidden"
          style={{ borderRadius: obj.cornerRadius }}
        >
          <img
            src={obj.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{
              left: -obj.crop.x * scaleX,
              top: -obj.crop.y * scaleY,
              width: obj.naturalWidth * scaleX,
              height: obj.naturalHeight * scaleY,
              maxWidth: 'none',
            }}
          />
        </div>
      </div>
    )
  }

  if (obj.type === 'vector-board') {
    return (
      <div
        style={style}
        data-avnac-scene-object
        onPointerDown={(e) => onObjectPointerDown(e, obj)}
        {...hoverProps}
        title={obj.locked ? 'Locked vector board' : undefined}
      >
        <VectorBoardObjectPreview
          doc={vectorBoardDocs[obj.boardId]}
          width={obj.width}
          height={obj.height}
        />
      </div>
    )
  }

  if (obj.type === 'text') {
    const layout = layoutSceneText(obj)
    const draftLayout = isEditing
      ? layoutSceneText({ ...obj, text: textDraft })
      : layout
    const lineHeight = sceneTextLineHeight(obj)
    return (
      <div
        style={
          isEditing
            ? {
                ...style,
                height: Math.max(obj.height, draftLayout.height),
              }
            : style
        }
        data-avnac-scene-object
        onPointerDown={
          isEditing ? undefined : (e) => onObjectPointerDown(e, obj)
        }
        onDoubleClick={() => onTextDoubleClick(obj)}
        {...hoverProps}
        title={obj.locked ? 'Locked text' : undefined}
      >
        {isEditing ? (
          <textarea
            value={textDraft}
            onChange={(e) => onTextDraftChange(e.target.value)}
            onBlur={onTextDraftCommit}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            autoFocus
            spellCheck={false}
            className="h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none select-text"
            style={{
              fontFamily: `"${obj.fontFamily}", sans-serif`,
              fontSize: obj.fontSize,
              fontStyle: obj.fontStyle,
              fontWeight: String(obj.fontWeight),
              textAlign: obj.textAlign,
              color: obj.fill.type === 'solid' ? obj.fill.color : '#171717',
              lineHeight: String(lineHeight),
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div
            className="pointer-events-none h-full w-full whitespace-pre-wrap break-words"
            style={{
              fontFamily: `"${obj.fontFamily}", sans-serif`,
              fontSize: obj.fontSize,
              fontStyle: obj.fontStyle,
              fontWeight: String(obj.fontWeight),
              textAlign: obj.textAlign,
              lineHeight,
              height: Math.max(layout.height, obj.height),
              color: obj.fill.type === 'solid' ? obj.fill.color : 'transparent',
              backgroundImage:
                obj.fill.type === 'gradient' ? bgValueToSceneCss(obj.fill) : undefined,
              WebkitBackgroundClip:
                obj.fill.type === 'gradient' ? 'text' : undefined,
              backgroundClip:
                obj.fill.type === 'gradient' ? 'text' : undefined,
              textDecoration: obj.underline ? 'underline' : undefined,
              textDecorationThickness: obj.underline ? Math.max(1, obj.fontSize * 0.06) : undefined,
              WebkitTextStroke:
                obj.strokeWidth > 0 && obj.stroke.type === 'solid'
                  ? `${obj.strokeWidth}px ${obj.stroke.color}`
                  : undefined,
            }}
          >
            {obj.text}
          </div>
        )}
      </div>
    )
  }

  const fillId = `${defsIdBase}-fill`
  const strokeId = `${defsIdBase}-stroke`
  const strokeWidth = 'strokeWidth' in obj ? obj.strokeWidth : 0
  const shapeSvgStyle: CSSProperties = { display: 'block', overflow: 'visible' }

  if (obj.type === 'rect') {
    const inset = strokeWidth > 0 ? strokeWidth / 2 : 0
    return (
      <div
        style={style}
        data-avnac-scene-object
        onPointerDown={(e) => onObjectPointerDown(e, obj)}
        {...hoverProps}
        title={obj.locked ? 'Locked shape' : undefined}
      >
        <svg width={obj.width} height={obj.height} style={shapeSvgStyle}>
          <defs>
            {svgGradientDef(fillId, obj.fill)}
            {svgGradientDef(strokeId, obj.stroke)}
          </defs>
          <rect
            x={inset}
            y={inset}
            width={Math.max(1, obj.width - inset * 2)}
            height={Math.max(1, obj.height - inset * 2)}
            rx={Math.min(obj.cornerRadius, Math.min(obj.width, obj.height) / 2)}
            fill={svgPaintUrl(fillId, obj.fill)}
            stroke={strokeWidth > 0 ? svgPaintUrl(strokeId, obj.stroke) : 'transparent'}
            strokeWidth={strokeWidth}
          />
        </svg>
      </div>
    )
  }

  if (obj.type === 'ellipse') {
    const rx = Math.max(1, obj.width / 2 - strokeWidth / 2)
    const ry = Math.max(1, obj.height / 2 - strokeWidth / 2)
    return (
      <div
        style={style}
        data-avnac-scene-object
        onPointerDown={(e) => onObjectPointerDown(e, obj)}
        {...hoverProps}
      >
        <svg width={obj.width} height={obj.height} style={shapeSvgStyle}>
          <defs>
            {svgGradientDef(fillId, obj.fill)}
            {svgGradientDef(strokeId, obj.stroke)}
          </defs>
          <ellipse
            cx={obj.width / 2}
            cy={obj.height / 2}
            rx={rx}
            ry={ry}
            fill={svgPaintUrl(fillId, obj.fill)}
            stroke={strokeWidth > 0 ? svgPaintUrl(strokeId, obj.stroke) : 'transparent'}
            strokeWidth={strokeWidth}
          />
        </svg>
      </div>
    )
  }

  if (obj.type === 'polygon' || obj.type === 'star') {
    const pts =
      obj.type === 'polygon'
        ? Array.from({ length: Math.max(3, obj.sides) }, (_, i) => {
            const a = -Math.PI / 2 + (i / Math.max(3, obj.sides)) * Math.PI * 2
            return [
              obj.width / 2 + Math.cos(a) * obj.width / 2,
              obj.height / 2 + Math.sin(a) * obj.height / 2,
            ]
          })
        : Array.from({ length: Math.max(4, obj.points) * 2 }, (_, i) => {
            const a = -Math.PI / 2 + (i / (Math.max(4, obj.points) * 2)) * Math.PI * 2
            const r = i % 2 === 0 ? 1 : 0.45
            return [
              obj.width / 2 + Math.cos(a) * obj.width / 2 * r,
              obj.height / 2 + Math.sin(a) * obj.height / 2 * r,
            ]
          })
    return (
      <div
        style={style}
        data-avnac-scene-object
        onPointerDown={(e) => onObjectPointerDown(e, obj)}
        {...hoverProps}
      >
        <svg width={obj.width} height={obj.height} style={shapeSvgStyle}>
          <defs>
            {svgGradientDef(fillId, obj.fill)}
            {svgGradientDef(strokeId, obj.stroke)}
          </defs>
          <polygon
            points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
            fill={svgPaintUrl(fillId, obj.fill)}
            stroke={strokeWidth > 0 ? svgPaintUrl(strokeId, obj.stroke) : 'transparent'}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }

  if (obj.type === 'line') {
    return (
      <div
        style={style}
        data-avnac-scene-object
        onPointerDown={(e) => onObjectPointerDown(e, obj)}
        {...hoverProps}
      >
        <svg width={obj.width} height={obj.height} style={shapeSvgStyle}>
          <defs>{svgGradientDef(strokeId, obj.stroke)}</defs>
          <line
            x1={obj.strokeWidth / 2}
            y1={obj.height / 2}
            x2={obj.width - obj.strokeWidth / 2}
            y2={obj.height / 2}
            stroke={svgPaintUrl(strokeId, obj.stroke)}
            strokeWidth={obj.strokeWidth}
            strokeLinecap={obj.roundedEnds ? 'round' : 'square'}
            strokeDasharray={
              obj.lineStyle === 'dashed'
                ? `${obj.strokeWidth * 3} ${obj.strokeWidth * 2}`
                : obj.lineStyle === 'dotted'
                  ? `${obj.strokeWidth * 0.5} ${obj.strokeWidth * 1.8}`
                  : undefined
            }
          />
        </svg>
      </div>
    )
  }

  const arrow = obj as SceneArrow
  const centerY = arrow.height / 2
  const tipX = arrow.width - arrow.strokeWidth * 0.6
  const tailX = arrow.strokeWidth / 2
  const shaftTipX = Math.max(tailX + 1, tipX - arrow.strokeWidth * 3.2 * arrow.headSize)
  const controlX = tailX + (shaftTipX - tailX) * arrow.curveT
  const controlY = centerY - arrow.curveBulge
  const headLen = Math.max(arrow.strokeWidth * 2, arrow.strokeWidth * 4 * arrow.headSize)
  const headSpread = Math.max(arrow.strokeWidth * 1.8, arrow.strokeWidth * 3 * arrow.headSize)
  const d =
    arrow.pathType === 'curved'
      ? `M ${tailX} ${centerY} Q ${controlX} ${controlY} ${shaftTipX} ${centerY}`
      : `M ${tailX} ${centerY} L ${shaftTipX} ${centerY}`

  return (
    <div
      style={style}
      data-avnac-scene-object
      onPointerDown={(e) => onObjectPointerDown(e, obj)}
      {...hoverProps}
    >
      <svg width={arrow.width} height={arrow.height} style={shapeSvgStyle}>
        <defs>{svgGradientDef(strokeId, arrow.stroke)}</defs>
        <path
          d={d}
          fill="none"
          stroke={svgPaintUrl(strokeId, arrow.stroke)}
          strokeWidth={arrow.strokeWidth}
          strokeLinecap={arrow.roundedEnds ? 'round' : 'square'}
          strokeLinejoin="round"
          strokeDasharray={
            arrow.lineStyle === 'dashed'
              ? `${arrow.strokeWidth * 3} ${arrow.strokeWidth * 2}`
              : arrow.lineStyle === 'dotted'
                ? `${arrow.strokeWidth * 0.5} ${arrow.strokeWidth * 1.8}`
                : undefined
          }
        />
        <polygon
          points={`${tipX},${centerY} ${tipX - headLen},${centerY - headSpread / 2} ${tipX - headLen * 0.82},${centerY} ${tipX - headLen},${centerY + headSpread / 2}`}
          fill={svgPaintUrl(strokeId, arrow.stroke)}
        />
      </svg>
    </div>
  )
}
