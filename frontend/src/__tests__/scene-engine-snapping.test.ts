import { describe, expect, it } from 'vitest'
import { sceneSnapThreshold } from '../scene-engine/primitives/snapping'

describe('sceneSnapThreshold', () => {
  it('keeps snapping assistive rather than overly magnetic on common artboards', () => {
    expect(sceneSnapThreshold(1080, 1350)).toBe(8)
    expect(sceneSnapThreshold(1200, 900)).toBe(8)
    expect(sceneSnapThreshold(4000, 4000)).toBe(10)
  })
})
