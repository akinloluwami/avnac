/**
 * Stable runtime surface that the Tambo agent uses to manipulate the main
 * design scene. Built inside `SceneEditor` where it can close over the
 * editor state; consumers receive it as a React ref (null until editor is
 * mounted) so they can defensively no-op when missing.
 */

export type AiObjectKind =
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'line'
  | 'image'
  | 'polygon'
  | 'star'
  | 'arrow'
  | 'group'
  | 'vector-board'
  | 'other'

export type AiObjectSummary = {
  id: string
  kind: AiObjectKind
  label: string
  left: number
  top: number
  width: number
  height: number
  angle: number
  fill: string | null
  stroke: string | null
  text: string | null
}

export type AiCanvasInfo = {
  width: number
  height: number
  background: string | null
  objectCount: number
  objects: AiObjectSummary[]
}

export type AiPlacement = {
  x?: number
  y?: number
  origin?: 'center' | 'top-left'
}

export type AiRectSpec = AiPlacement & {
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  cornerRadius?: number
  rotation?: number
  opacity?: number
}

export type AiEllipseSpec = AiPlacement & {
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  rotation?: number
  opacity?: number
}

export type AiTextSpec = AiPlacement & {
  text: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: number | 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  fill?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  width?: number
  rotation?: number
  opacity?: number
}

export type AiLineSpec = {
  x1: number
  y1: number
  x2: number
  y2: number
  stroke?: string
  strokeWidth?: number
  opacity?: number
}

export type AiImageSpec = AiPlacement & {
  /** HTTPS/HTTP image URL or `data:image/*;base64,...` */
  url: string
  width?: number
  height?: number
  rotation?: number
  opacity?: number
}

export type AiUpdateSpec = {
  left?: number
  top?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  angle?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  text?: string
  fontSize?: number
}

export type AiDesignController = {
  getCanvas: () => AiCanvasInfo | null
  addRectangle: (spec: AiRectSpec) => { id: string } | null
  addEllipse: (spec: AiEllipseSpec) => { id: string } | null
  addText: (spec: AiTextSpec) => { id: string } | null
  addLine: (spec: AiLineSpec) => { id: string } | null
  addImageFromUrl: (spec: AiImageSpec) => Promise<{ id: string } | null>
  updateObject: (id: string, patch: AiUpdateSpec) => boolean
  deleteObject: (id: string) => boolean
  selectObjects: (ids: string[]) => number
  setBackgroundColor: (color: string) => void
  clearCanvas: () => number
}
