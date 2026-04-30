import type { SceneBounds, SceneSnapGuide } from './types'

export const SNAP_DEADBAND_PX = 0.25

const SNAP_SWITCH_HYSTERESIS_PX = 1.5
const SNAP_RELEASE_MULTIPLIER = 1.6

export function sceneSnapThreshold(boardW: number, boardH: number) {
  return Math.max(8, Math.round(Math.min(boardW, boardH) * 0.0025))
}

export function computeSceneSnap(
  movingBounds: SceneBounds,
  snapTargets: SceneBounds[],
  boardW: number,
  boardH: number,
  threshold: number,
  prevGuideX: number | null,
  prevGuideY: number | null,
): { guides: SceneSnapGuide[]; dx: number; dy: number } {
  const left = movingBounds.left
  const right = movingBounds.left + movingBounds.width
  const top = movingBounds.top
  const bottom = movingBounds.top + movingBounds.height
  const centerX = left + movingBounds.width / 2
  const centerY = top + movingBounds.height / 2

  let bestDx = 0
  let bestXScore = Number.POSITIVE_INFINITY
  let guideX: number | null = null
  const releaseThresholdX = threshold * SNAP_RELEASE_MULTIPLIER

  const tryX = (myX: number, theirX: number) => {
    const delta = theirX - myX
    const absDelta = Math.abs(delta)
    const sticky = prevGuideX !== null && Math.abs(theirX - prevGuideX) < 0.5
    const limit = sticky ? releaseThresholdX : threshold
    if (absDelta > limit) return
    const score = absDelta - (sticky ? SNAP_SWITCH_HYSTERESIS_PX : 0)
    if (score < bestXScore) {
      bestXScore = score
      bestDx = delta
      guideX = theirX
    }
  }

  for (const target of snapTargets) {
    const targetLeft = target.left
    const targetCenter = target.left + target.width / 2
    const targetRight = target.left + target.width
    for (const targetX of [targetLeft, targetCenter, targetRight]) {
      tryX(left, targetX)
      tryX(centerX, targetX)
      tryX(right, targetX)
    }
  }
  tryX(centerX, boardW / 2)

  let bestDy = 0
  let bestYScore = Number.POSITIVE_INFINITY
  let guideY: number | null = null
  const releaseThresholdY = threshold * SNAP_RELEASE_MULTIPLIER

  const tryY = (myY: number, theirY: number) => {
    const delta = theirY - myY
    const absDelta = Math.abs(delta)
    const sticky = prevGuideY !== null && Math.abs(theirY - prevGuideY) < 0.5
    const limit = sticky ? releaseThresholdY : threshold
    if (absDelta > limit) return
    const score = absDelta - (sticky ? SNAP_SWITCH_HYSTERESIS_PX : 0)
    if (score < bestYScore) {
      bestYScore = score
      bestDy = delta
      guideY = theirY
    }
  }

  for (const target of snapTargets) {
    const targetTop = target.top
    const targetCenter = target.top + target.height / 2
    const targetBottom = target.top + target.height
    for (const targetY of [targetTop, targetCenter, targetBottom]) {
      tryY(top, targetY)
      tryY(centerY, targetY)
      tryY(bottom, targetY)
    }
  }
  tryY(centerY, boardH / 2)

  const guides: SceneSnapGuide[] = []
  if (guideX !== null) guides.push({ axis: 'v', pos: guideX })
  if (guideY !== null) guides.push({ axis: 'h', pos: guideY })
  return { guides, dx: bestDx, dy: bestDy }
}
