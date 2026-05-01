import { describe, expect, it } from 'vitest'
import type { SceneImage } from '../lib/avnac-scene'
import { resizeObjectWithBox } from '../scene-engine/primitives/objects'

function makeImage(overrides: Partial<SceneImage> = {}): SceneImage {
  return {
    id: 'image-1',
    type: 'image',
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blurPct: 0,
    shadow: null,
    src: 'data:image/png;base64,abc',
    naturalWidth: 800,
    naturalHeight: 600,
    crop: {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    },
    cornerRadius: 0,
    ...overrides,
  }
}

function expectImageScaleToMatch(image: SceneImage) {
  expect(image.width / image.crop.width).toBeCloseTo(image.height / image.crop.height, 5)
}

describe('resizeObjectWithBox image transforms', () => {
  it('fits the image crop to the new corner-scaled frame aspect', () => {
    const image = makeImage()

    const resized = resizeObjectWithBox(
      image,
      { x: 0, y: 0, width: 240, height: 160 },
      { handle: 'se', initial: image },
    ) as SceneImage

    expect(resized.width).toBe(240)
    expect(resized.height).toBe(160)
    expectImageScaleToMatch(resized)
  })

  it('uses side handles to crop horizontally instead of stretching', () => {
    const image = makeImage()

    const resized = resizeObjectWithBox(
      image,
      { x: 0, y: 0, width: 200, height: 300 },
      { handle: 'e', initial: image },
    ) as SceneImage

    expect(resized.x).toBe(0)
    expect(resized.y).toBe(0)
    expect(resized.width).toBe(200)
    expect(resized.height).toBe(300)
    expect(resized.crop).toMatchObject({
      x: 0,
      y: 0,
      width: 400,
      height: 600,
    })
    expectImageScaleToMatch(resized)
  })

  it('anchors the opposite edge when cropping from the left', () => {
    const image = makeImage()

    const resized = resizeObjectWithBox(
      image,
      { x: 200, y: 0, width: 200, height: 300 },
      { handle: 'w', initial: image },
    ) as SceneImage

    expect(resized.x).toBe(200)
    expect(resized.width).toBe(200)
    expect(resized.crop.x).toBe(400)
    expect(resized.crop.width).toBe(400)
    expectImageScaleToMatch(resized)
  })
})
