import {
  cloneSceneObject,
  getObjectCornerRadius,
  maxCornerRadiusForObject,
  objectSupportsCornerRadius,
  setObjectCornerRadius,
  type SceneImage,
  type SceneObject,
} from '../../lib/avnac-scene'
import { layoutSceneText } from '../../lib/avnac-scene-render'
import { isCornerHandle, isSideHandle } from './geometry'
import type { LayerReorderKind, ResizeHandleId } from './types'

export function renameWithFreshIds(obj: SceneObject): SceneObject {
  const next = cloneSceneObject(obj)
  next.id = crypto.randomUUID()
  if (next.type === 'group') {
    next.children = next.children.map((child) => renameWithFreshIds(child))
  }
  return next
}

function scaleGroupChildren(
  children: SceneObject[],
  scaleX: number,
  scaleY: number,
): SceneObject[] {
  return children.map((child) => {
    const next = cloneSceneObject(child)
    next.x *= scaleX
    next.y *= scaleY
    next.width = Math.max(1, next.width * scaleX)
    next.height = Math.max(1, next.height * scaleY)
    if (next.type === 'group') {
      next.children = scaleGroupChildren(next.children, scaleX, scaleY)
    }
    if (objectSupportsCornerRadius(next)) {
      return setObjectCornerRadius(
        next,
        Math.min(getObjectCornerRadius(next) * Math.max(scaleX, scaleY), maxCornerRadiusForObject(next)),
      )
    }
    return next
  })
}

export function isPerfectShapeObject(obj: SceneObject): boolean {
  return (
    obj.type === 'rect' ||
    obj.type === 'ellipse' ||
    obj.type === 'polygon' ||
    obj.type === 'star'
  )
}

const IMAGE_MIN_CROP_SIZE = 1
const IMAGE_MIN_SCALE = 0.0001

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizedImageCrop(image: SceneImage): SceneImage['crop'] {
  const naturalWidth = Math.max(
    IMAGE_MIN_CROP_SIZE,
    image.naturalWidth || image.width,
  )
  const naturalHeight = Math.max(
    IMAGE_MIN_CROP_SIZE,
    image.naturalHeight || image.height,
  )
  const width = clampNumber(
    image.crop.width || naturalWidth,
    IMAGE_MIN_CROP_SIZE,
    naturalWidth,
  )
  const height = clampNumber(
    image.crop.height || naturalHeight,
    IMAGE_MIN_CROP_SIZE,
    naturalHeight,
  )
  return {
    x: clampNumber(image.crop.x || 0, 0, Math.max(0, naturalWidth - width)),
    y: clampNumber(image.crop.y || 0, 0, Math.max(0, naturalHeight - height)),
    width,
    height,
  }
}

function fitImageCropToAspect(
  image: SceneImage,
  crop: SceneImage['crop'],
  targetAspect: number,
): SceneImage['crop'] {
  const naturalWidth = Math.max(
    IMAGE_MIN_CROP_SIZE,
    image.naturalWidth || image.width,
  )
  const naturalHeight = Math.max(
    IMAGE_MIN_CROP_SIZE,
    image.naturalHeight || image.height,
  )
  const safeAspect = Math.max(IMAGE_MIN_CROP_SIZE / naturalHeight, targetAspect || 1)
  const naturalAspect = naturalWidth / naturalHeight
  const maxWidth =
    safeAspect >= naturalAspect ? naturalWidth : naturalHeight * safeAspect
  const maxHeight =
    safeAspect >= naturalAspect ? naturalWidth / safeAspect : naturalHeight
  let width = crop.width
  let height = crop.height
  if (width / height > safeAspect) {
    width = height * safeAspect
  } else {
    height = width / safeAspect
  }
  if (width > maxWidth) {
    width = maxWidth
    height = width / safeAspect
  }
  if (height > maxHeight) {
    height = maxHeight
    width = height * safeAspect
  }
  width = clampNumber(
    width,
    IMAGE_MIN_CROP_SIZE,
    Math.max(IMAGE_MIN_CROP_SIZE, maxWidth),
  )
  height = clampNumber(
    height,
    IMAGE_MIN_CROP_SIZE,
    Math.max(IMAGE_MIN_CROP_SIZE, maxHeight),
  )
  const centerX = crop.x + crop.width / 2
  const centerY = crop.y + crop.height / 2
  return {
    x: clampNumber(centerX - width / 2, 0, Math.max(0, naturalWidth - width)),
    y: clampNumber(centerY - height / 2, 0, Math.max(0, naturalHeight - height)),
    width,
    height,
  }
}

function cropImageFromSideHandle(
  image: SceneImage,
  box: { x: number; y: number; width: number; height: number },
  handle: ResizeHandleId,
  centeredScaling: boolean,
): SceneImage {
  const next = cloneSceneObject(image) as SceneImage
  const crop = normalizedImageCrop(image)
  const naturalWidth = Math.max(
    IMAGE_MIN_CROP_SIZE,
    image.naturalWidth || image.width,
  )
  const naturalHeight = Math.max(
    IMAGE_MIN_CROP_SIZE,
    image.naturalHeight || image.height,
  )
  const displayRight = image.x + image.width
  const displayBottom = image.y + image.height
  const displayCenterX = image.x + image.width / 2
  const displayCenterY = image.y + image.height / 2

  if (handle === 'e' || handle === 'w') {
    const scale = Math.max(
      IMAGE_MIN_SCALE,
      image.height / Math.max(IMAGE_MIN_CROP_SIZE, crop.height),
    )
    const cropCenterX = crop.x + crop.width / 2
    const requestedWidth = box.width / scale
    let width = clampNumber(requestedWidth, IMAGE_MIN_CROP_SIZE, naturalWidth)
    let x = crop.x
    if (centeredScaling) {
      x = clampNumber(
        cropCenterX - width / 2,
        0,
        Math.max(0, naturalWidth - width),
      )
      width = Math.min(width, naturalWidth)
      next.x =
        Math.abs(width - requestedWidth) < 0.001
          ? box.x
          : displayCenterX - (width * scale) / 2
    } else if (handle === 'w') {
      const cropRight = crop.x + crop.width
      width = Math.min(width, cropRight)
      x = cropRight - width
      next.x =
        Math.abs(width - requestedWidth) < 0.001
          ? box.x
          : displayRight - width * scale
    } else {
      width = Math.min(width, naturalWidth - crop.x)
      next.x = Math.abs(width - requestedWidth) < 0.001 ? box.x : image.x
    }
    next.y = box.y
    next.width = Math.max(1, width * scale)
    next.height = image.height
    next.crop = {
      x: clampNumber(x, 0, Math.max(0, naturalWidth - width)),
      y: crop.y,
      width,
      height: crop.height,
    }
    return next
  }

  if (handle === 'n' || handle === 's') {
    const scale = Math.max(
      IMAGE_MIN_SCALE,
      image.width / Math.max(IMAGE_MIN_CROP_SIZE, crop.width),
    )
    const cropCenterY = crop.y + crop.height / 2
    const requestedHeight = box.height / scale
    let height = clampNumber(
      requestedHeight,
      IMAGE_MIN_CROP_SIZE,
      naturalHeight,
    )
    let y = crop.y
    if (centeredScaling) {
      y = clampNumber(
        cropCenterY - height / 2,
        0,
        Math.max(0, naturalHeight - height),
      )
      height = Math.min(height, naturalHeight)
      next.y =
        Math.abs(height - requestedHeight) < 0.001
          ? box.y
          : displayCenterY - (height * scale) / 2
    } else if (handle === 'n') {
      const cropBottom = crop.y + crop.height
      height = Math.min(height, cropBottom)
      y = cropBottom - height
      next.y =
        Math.abs(height - requestedHeight) < 0.001
          ? box.y
          : displayBottom - height * scale
    } else {
      height = Math.min(height, naturalHeight - crop.y)
      next.y = Math.abs(height - requestedHeight) < 0.001 ? box.y : image.y
    }
    next.x = box.x
    next.width = image.width
    next.height = Math.max(1, height * scale)
    next.crop = {
      x: crop.x,
      y: clampNumber(y, 0, Math.max(0, naturalHeight - height)),
      width: crop.width,
      height,
    }
    return next
  }

  return next
}

export function reorderTopLevelObjects(
  objects: SceneObject[],
  selectedIds: string[],
  kind: LayerReorderKind,
): SceneObject[] {
  if (selectedIds.length === 0) return objects
  const selected = new Set(selectedIds)
  if (kind === 'front' || kind === 'back') {
    const picked = objects.filter((obj) => selected.has(obj.id))
    if (picked.length === 0) return objects
    const rest = objects.filter((obj) => !selected.has(obj.id))
    const next =
      kind === 'front' ? [...rest, ...picked] : [...picked, ...rest]
    return next.every((obj, index) => obj === objects[index]) ? objects : next
  }
  const next = [...objects]
  let changed = false
  if (kind === 'forward') {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (!selected.has(next[index].id) || selected.has(next[index + 1].id)) {
        continue
      }
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      changed = true
    }
    return changed ? next : objects
  }
  for (let index = 1; index < next.length; index += 1) {
    if (!selected.has(next[index].id) || selected.has(next[index - 1].id)) {
      continue
    }
    ;[next[index], next[index - 1]] = [next[index - 1], next[index]]
    changed = true
  }
  return changed ? next : objects
}

export function resizeObjectWithBox(
  obj: SceneObject,
  box: {
    x: number
    y: number
    width: number
    height: number
  },
  opts?: {
    handle?: ResizeHandleId
    initial?: SceneObject
    centered?: boolean
  },
): SceneObject {
  const next = cloneSceneObject(obj)
  next.x = box.x
  next.y = box.y
  next.width = Math.max(1, box.width)
  next.height = Math.max(1, box.height)
  if (next.type === 'text') {
    const initialText =
      opts?.initial?.type === 'text' ? opts.initial : next
    if (opts?.handle && isCornerHandle(opts.handle)) {
      const scaleFactor = Math.max(
        0.1,
        Math.max(
          box.width / Math.max(1, initialText.width),
          box.height / Math.max(1, initialText.height),
        ),
      )
      next.fontSize = Math.max(8, Math.round(initialText.fontSize * scaleFactor))
    }
    next.width = Math.max(24, box.width)
    const layout = layoutSceneText(next)
    next.height = Math.max(layout.height, box.height)
    return next
  }
  if (next.type === 'image') {
    const initialImage =
      opts?.initial?.type === 'image' ? opts.initial : next
    if (opts?.handle && isSideHandle(opts.handle)) {
      return cropImageFromSideHandle(
        initialImage,
        box,
        opts.handle,
        Boolean(opts.centered),
      )
    }
    next.crop = fitImageCropToAspect(
      next,
      normalizedImageCrop(next),
      next.width / Math.max(1, next.height),
    )
    return next
  }
  if (next.type === 'group') {
    next.children = scaleGroupChildren(
      next.children,
      next.width / obj.width,
      next.height / obj.height,
    )
  }
  if (objectSupportsCornerRadius(next)) {
    return setObjectCornerRadius(
      next,
      Math.min(getObjectCornerRadius(next), maxCornerRadiusForObject(next)),
    )
  }
  return next
}
