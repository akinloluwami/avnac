import { describe, expect, it, vi } from 'vitest'
import { renderVectorBoardDocumentToCanvas } from '../lib/avnac-scene-render'
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
})
