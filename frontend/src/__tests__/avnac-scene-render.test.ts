import { describe, expect, it, vi } from 'vitest'
import type { SceneText } from '../lib/avnac-scene'
import { layoutSceneText, renderVectorBoardDocumentToCanvas } from '../lib/avnac-scene-render'
import type { VectorBoardDocument } from '../lib/avnac-vector-board-document'

function makeVectorDoc(): VectorBoardDocument {
  return {
    v: 2,
    activeLayerId: 'layer-1',
    layers: [
      {
        id: 'layer-1',
        name: 'Layer 1',
        visible: true,
        strokes: [],
      },
    ],
  }
}

function makeText(overrides: Partial<SceneText> = {}): SceneText {
  return {
    id: 'text-1',
    type: 'text',
    x: 0,
    y: 0,
    width: 55,
    height: 80,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blurPct: 0,
    shadow: null,
    text: 'AB CD',
    fill: { type: 'solid', color: '#171717' },
    stroke: { type: 'solid', color: 'transparent' },
    strokeWidth: 0,
    fontFamily: 'Inter',
    fontSize: 20,
    letterSpacing: 0,
    lineHeight: 1.22,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    textAlign: 'left',
    ...overrides,
  }
}

describe('renderVectorBoardDocumentToCanvas', () => {
  it('skips the baked-in preview background when asked for transparent output', () => {
    const fillRect = vi.fn()
    const ctx = {
      fillStyle: '',
      fillRect,
    } as unknown as CanvasRenderingContext2D

    renderVectorBoardDocumentToCanvas(ctx, makeVectorDoc(), 320, 240, {
      fillBackground: false,
    })

    expect(fillRect).not.toHaveBeenCalled()
  })

  it('wraps text earlier when letter spacing increases', () => {
    const measure = {
      font: '',
      measureText: (text: string) => ({ width: Array.from(text).length * 10 }),
    } as unknown as CanvasRenderingContext2D

    expect(layoutSceneText(makeText(), measure).lines).toEqual(['AB CD'])
    expect(layoutSceneText(makeText({ letterSpacing: 4 }), measure).lines).toEqual(['AB', 'CD'])
  })

  it('splits oversized words when letter spacing forces hard wraps', () => {
    const measure = {
      font: '',
      measureText: (text: string) => ({ width: Array.from(text).length * 10 }),
    } as unknown as CanvasRenderingContext2D

    expect(
      layoutSceneText(makeText({ text: 'THIS', width: 30, letterSpacing: 4 }), measure).lines,
    ).toEqual(['TH', 'IS'])
  })
})
