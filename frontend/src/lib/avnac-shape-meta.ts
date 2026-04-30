export type AvnacShapeKind =
  | 'rect'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'line'
  | 'arrow'

export type ArrowLineStyle = 'solid' | 'dashed' | 'dotted'

export type ArrowPathType = 'straight' | 'curved'

export type AvnacShapeMeta = {
  kind: AvnacShapeKind
  polygonSides?: number
  starPoints?: number
  arrowHead?: number
  arrowEndpoints?: { x1: number; y1: number; x2: number; y2: number }
  arrowStrokeWidth?: number
  arrowLineStyle?: ArrowLineStyle
  arrowRoundedEnds?: boolean
  arrowPathType?: ArrowPathType
  arrowCurveBulge?: number
  arrowCurveT?: number
}

type MaybeShapeMetaCarrier = {
  avnacShape?: AvnacShapeMeta | null
}

export function getAvnacShapeMeta(
  obj: MaybeShapeMetaCarrier | undefined | null,
): AvnacShapeMeta | null {
  if (!obj) return null
  const meta = obj.avnacShape
  return meta && typeof meta === 'object' && 'kind' in meta ? meta : null
}

export function setAvnacShapeMeta(
  obj: MaybeShapeMetaCarrier,
  meta: AvnacShapeMeta | null,
): void {
  obj.avnacShape = meta
}

export function isAvnacStrokeLineLike(
  meta: AvnacShapeMeta | null | undefined,
): boolean {
  if (!meta) return false
  if (meta.kind === 'arrow') return true
  return (
    meta.kind === 'line' &&
    !!meta.arrowEndpoints &&
    meta.arrowStrokeWidth != null
  )
}

export function avnacStrokeLineHeadFrac(meta: AvnacShapeMeta): number {
  return meta.kind === 'line' ? 0 : (meta.arrowHead ?? 1)
}
