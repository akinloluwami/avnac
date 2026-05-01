import type { SceneObject } from '../../lib/avnac-scene'

export type ResizeHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const RESIZE_HANDLES: ResizeHandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export type TransformDimensionUi = {
  left: number
  top: number
  text: string
}

export type SceneBounds = {
  left: number
  top: number
  width: number
  height: number
}

export type MarqueeRect = {
  left: number
  top: number
  width: number
  height: number
}

export type LayerReorderKind = 'front' | 'back' | 'forward' | 'backward'
export type SceneSnapGuide = { axis: 'v' | 'h'; pos: number }

export type DragState =
  | {
      kind: 'move'
      ids: string[]
      startSceneX: number
      startSceneY: number
      initial: Map<string, { x: number; y: number }>
      initialBounds: SceneBounds | null
      snapTargets: SceneBounds[]
    }
  | {
      kind: 'resize'
      id: string
      handle: ResizeHandleId
      initial: SceneObject
    }
  | {
      kind: 'rotate'
      id: string
      initialRotation: number
      center: { x: number; y: number }
      startAngle: number
    }
  | {
      kind: 'marquee'
      startSceneX: number
      startSceneY: number
      additive: boolean
      initialSelection: string[]
      objects: SceneObject[]
    }
