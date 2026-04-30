import {
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react'

import {
  getObjectFill,
  getObjectStroke,
  objectDisplayName,
  objectSupportsFill,
  objectSupportsOutlineStroke,
  setObjectFill,
  setObjectStroke,
  setObjectStrokeWidth,
  type AvnacDocument,
  type SceneLine,
  type SceneObject,
  type SceneText,
} from '../../lib/avnac-scene'
import type {
  AiDesignController,
  AiObjectKind,
  AiObjectSummary,
} from '../../lib/avnac-ai-controller'
import {
  layoutSceneText,
  sceneTextLineHeight,
} from '../../lib/avnac-scene-render'
import { angleFromPoints } from '../../scene-engine/primitives'

type PlaceImageObject = (
  rawUrl: string,
  opts?: {
    x?: number
    y?: number
    width?: number
    height?: number
    origin?: 'center' | 'top-left'
  },
) => Promise<string | null>

type UseAiDesignControllerArgs = {
  addObjects: (objectsToAdd: SceneObject[]) => void
  artboardH: number
  artboardW: number
  doc: AvnacDocument
  placeImageObject: PlaceImageObject
  setDoc: Dispatch<SetStateAction<AvnacDocument>>
  setSelectedIds: Dispatch<SetStateAction<string[]>>
}

const AI_DEFAULT_STROKE = { type: 'solid', color: 'transparent' } as const

function leftFromSpec(
  spec: { x?: number; origin?: 'center' | 'top-left' },
  fallbackCenter: number,
  width: number,
) {
  return spec.origin === 'top-left'
    ? spec.x ?? fallbackCenter
    : (spec.x ?? fallbackCenter) - width / 2
}

function topFromSpec(
  spec: { y?: number; origin?: 'center' | 'top-left' },
  fallbackCenter: number,
  height: number,
) {
  return spec.origin === 'top-left'
    ? spec.y ?? fallbackCenter
    : (spec.y ?? fallbackCenter) - height / 2
}

export function useAiDesignController({
  addObjects,
  artboardH,
  artboardW,
  doc,
  placeImageObject,
  setDoc,
  setSelectedIds,
}: UseAiDesignControllerArgs) {
  return useMemo<AiDesignController>(
    () => ({
      getCanvas: () => ({
        width: doc.artboard.width,
        height: doc.artboard.height,
        background: doc.bg.type === 'solid' ? doc.bg.color : doc.bg.css,
        objectCount: doc.objects.length,
        objects: doc.objects.map<AiObjectSummary>((obj) => ({
          id: obj.id,
          kind:
            obj.type === 'vector-board'
              ? 'vector-board'
              : obj.type === 'group'
                ? 'group'
                : (obj.type as AiObjectKind),
          label: objectDisplayName(obj),
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          angle: obj.rotation,
          fill: (() => {
            const fill = objectSupportsFill(obj) ? getObjectFill(obj) : null
            return fill?.type === 'solid' ? fill.color : null
          })(),
          stroke: (() => {
            const stroke = objectSupportsOutlineStroke(obj)
              ? getObjectStroke(obj)
              : null
            return stroke?.type === 'solid' ? stroke.color : null
          })(),
          text: obj.type === 'text' ? obj.text : null,
        })),
      }),
      addRectangle: (spec) => {
        const obj: SceneObject = {
          id: crypto.randomUUID(),
          type: 'rect',
          x: leftFromSpec(spec, artboardW / 2, spec.width),
          y: topFromSpec(spec, artboardH / 2, spec.height),
          width: spec.width,
          height: spec.height,
          rotation: spec.rotation ?? 0,
          opacity: spec.opacity ?? 1,
          visible: true,
          locked: false,
          blurPct: 0,
          shadow: null,
          fill: { type: 'solid', color: spec.fill ?? '#262626' },
          stroke: { type: 'solid', color: spec.stroke ?? 'transparent' },
          strokeWidth: spec.strokeWidth ?? 0,
          cornerRadius: spec.cornerRadius ?? 0,
        }
        addObjects([obj])
        return { id: obj.id }
      },
      addEllipse: (spec) => {
        const obj: SceneObject = {
          id: crypto.randomUUID(),
          type: 'ellipse',
          x: leftFromSpec(spec, artboardW / 2, spec.width),
          y: topFromSpec(spec, artboardH / 2, spec.height),
          width: spec.width,
          height: spec.height,
          rotation: spec.rotation ?? 0,
          opacity: spec.opacity ?? 1,
          visible: true,
          locked: false,
          blurPct: 0,
          shadow: null,
          fill: { type: 'solid', color: spec.fill ?? '#262626' },
          stroke: { type: 'solid', color: spec.stroke ?? 'transparent' },
          strokeWidth: spec.strokeWidth ?? 0,
        }
        addObjects([obj])
        return { id: obj.id }
      },
      addText: (spec) => {
        const width = spec.width ?? 320
        const fontSize = spec.fontSize ?? 64
        const obj: SceneText = {
          id: crypto.randomUUID(),
          type: 'text',
          x: leftFromSpec(spec, artboardW / 2, width),
          y: topFromSpec(spec, artboardH / 2, fontSize * 2),
          width,
          height: fontSize,
          rotation: spec.rotation ?? 0,
          opacity: spec.opacity ?? 1,
          visible: true,
          locked: false,
          blurPct: 0,
          shadow: null,
          text: spec.text,
          fill: { type: 'solid', color: spec.fill ?? '#171717' },
          stroke: AI_DEFAULT_STROKE,
          strokeWidth: 0,
          fontFamily: spec.fontFamily ?? 'Inter',
          fontSize,
          lineHeight: 1.22,
          fontWeight: spec.fontWeight ?? 'normal',
          fontStyle: spec.fontStyle ?? 'normal',
          underline: false,
          textAlign: spec.textAlign ?? 'left',
        }
        obj.height = Math.max(
          layoutSceneText(obj).height,
          obj.fontSize * sceneTextLineHeight(obj),
        )
        addObjects([obj])
        return { id: obj.id }
      },
      addLine: (spec) => {
        const width = Math.max(1, Math.hypot(spec.x2 - spec.x1, spec.y2 - spec.y1))
        const height = Math.max(24, (spec.strokeWidth ?? 4) * 3)
        const centerX = (spec.x1 + spec.x2) / 2
        const centerY = (spec.y1 + spec.y2) / 2
        const obj: SceneLine = {
          id: crypto.randomUUID(),
          type: 'line',
          x: centerX - width / 2,
          y: centerY - height / 2,
          width,
          height,
          rotation: angleFromPoints(spec.x1, spec.y1, spec.x2, spec.y2),
          opacity: spec.opacity ?? 1,
          visible: true,
          locked: false,
          blurPct: 0,
          shadow: null,
          stroke: { type: 'solid', color: spec.stroke ?? '#262626' },
          strokeWidth: spec.strokeWidth ?? 4,
          lineStyle: 'solid',
          roundedEnds: true,
        }
        addObjects([obj])
        return { id: obj.id }
      },
      addImageFromUrl: async (spec) => {
        const id = await placeImageObject(spec.url, {
          x: spec.x,
          y: spec.y,
          origin: spec.origin,
          width: spec.width,
          height: spec.height,
        })
        return id ? { id } : null
      },
      updateObject: (id, patch) => {
        let changed = false
        setDoc((prev) => ({
          ...prev,
          objects: prev.objects.map((obj) => {
            if (obj.id !== id) return obj
            changed = true
            let next: SceneObject = { ...obj }
            if (patch.left !== undefined) next.x = patch.left
            if (patch.top !== undefined) next.y = patch.top
            if (patch.width !== undefined) next.width = patch.width
            if (patch.height !== undefined) next.height = patch.height
            if (patch.angle !== undefined) next.rotation = patch.angle
            if (patch.opacity !== undefined)
              next.opacity = Math.max(0, Math.min(1, patch.opacity))
            if (patch.fill !== undefined)
              next = setObjectFill(next, { type: 'solid', color: patch.fill })
            if (patch.stroke !== undefined)
              next = setObjectStroke(next, { type: 'solid', color: patch.stroke })
            if (patch.strokeWidth !== undefined)
              next = setObjectStrokeWidth(next, patch.strokeWidth)
            if (next.type === 'text') {
              if (patch.text !== undefined) next.text = patch.text
              if (patch.fontSize !== undefined) next.fontSize = patch.fontSize
              next.height = Math.max(
                layoutSceneText(next).height,
                next.fontSize * sceneTextLineHeight(next),
              )
            }
            return next
          }),
        }))
        return changed
      },
      deleteObject: (id) => {
        const exists = doc.objects.some((obj) => obj.id === id)
        if (!exists) return false
        setDoc((prev) => ({
          ...prev,
          objects: prev.objects.filter((obj) => obj.id !== id),
        }))
        return true
      },
      selectObjects: (ids) => {
        const valid = ids.filter((id) => doc.objects.some((obj) => obj.id === id))
        setSelectedIds(valid)
        return valid.length
      },
      setBackgroundColor: (color) =>
        setDoc((prev) => ({ ...prev, bg: { type: 'solid', color } })),
      clearCanvas: () => {
        const count = doc.objects.length
        setDoc((prev) => ({ ...prev, objects: [] }))
        setSelectedIds([])
        return count
      },
    }),
    [
      addObjects,
      artboardH,
      artboardW,
      doc,
      placeImageObject,
      setDoc,
      setSelectedIds,
    ],
  )
}
