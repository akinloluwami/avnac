import { describe, expect, it } from 'vitest'
import { getAvnacDocumentStorageKind, parseAvnacDocument } from '../lib/avnac-scene'

describe('parseAvnacDocument', () => {
  it('detects current vs legacy stored document formats', () => {
    expect(
      getAvnacDocumentStorageKind({
        v: 2,
        artboard: { width: 1200, height: 900 },
        bg: { type: 'solid', color: '#ffffff' },
        objects: [],
      }),
    ).toBe('current')

    expect(
      getAvnacDocumentStorageKind({
        v: 1,
        artboard: { width: 1200, height: 900 },
        bg: { type: 'solid', color: '#ffffff' },
        fabric: { objects: [] },
      }),
    ).toBe('legacy')

    expect(getAvnacDocumentStorageKind({ v: 99 })).toBe('invalid')
  })

  it('migrates legacy Fabric-based v1 documents into the scene format', () => {
    const legacy = {
      v: 1,
      artboard: { width: 1200, height: 900 },
      bg: { type: 'solid', color: '#ffffff' },
      fabric: {
        objects: [
          {
            type: 'circle',
            left: 220,
            top: 180,
            originX: 'left',
            originY: 'top',
            width: 220,
            height: 220,
            scaleX: 1,
            scaleY: 1,
            fill: '#262626',
            stroke: 'transparent',
            strokeWidth: 0,
            angle: 0,
            opacity: 1,
            visible: true,
            avnacLayerId: 'legacy-circle',
          },
          {
            type: 'textbox',
            left: 420,
            top: 300,
            originX: 'left',
            originY: 'top',
            width: 420,
            height: 120,
            scaleX: 1,
            scaleY: 1,
            fill: '#171717',
            stroke: 'transparent',
            strokeWidth: 0,
            angle: -26,
            opacity: 1,
            visible: true,
            text: 'Legacy fabric text',
            fontFamily: 'Inter',
            fontSize: 96,
            textAlign: 'left',
            avnacLayerId: 'legacy-text',
          },
        ],
      },
    }

    const document = parseAvnacDocument(legacy)

    expect(document).not.toBeNull()
    expect(document).toMatchObject({
      v: 2,
      artboard: { width: 1200, height: 900 },
      objects: [
        {
          id: 'legacy-circle',
          type: 'ellipse',
          x: 220,
          y: 180,
          width: 220,
          height: 220,
        },
        {
          id: 'legacy-text',
          type: 'text',
          x: 420,
          y: 300,
          width: 420,
          height: 120,
          rotation: -26,
          text: 'Legacy fabric text',
          fontFamily: 'Inter',
          fontSize: 96,
        },
      ],
    })
  })

  it('accepts Fabric 6 capitalized legacy object types', () => {
    const legacy = {
      v: 1,
      artboard: { width: 1080, height: 1350 },
      bg: { type: 'solid', color: '#ffffff' },
      fabric: {
        objects: [
          {
            type: 'Image',
            left: 946.341,
            top: 1201,
            width: 512,
            height: 512,
            scaleX: 0.2754,
            scaleY: 0.2754,
            originX: 'center',
            originY: 'center',
            src: 'data:image/png;base64,abc',
            avnacLayerId: 'legacy-qr',
          },
          {
            type: 'Rect',
            left: 13.86,
            top: 10.8456,
            width: 216,
            height: 162,
            scaleX: 4.74,
            scaleY: 7.9066,
            originX: 'left',
            originY: 'top',
            fill: 'transparent',
            stroke: '#fcc419',
            strokeWidth: 6,
            avnacShape: { kind: 'rect' },
            avnacLayerId: 'legacy-frame',
          },
          {
            type: 'Textbox',
            left: 546.4596,
            top: 673,
            width: 147.9595,
            height: 161.3188,
            scaleX: 5.2555,
            scaleY: 5.2555,
            originX: 'center',
            originY: 'center',
            fill: '#fcc419',
            stroke: '#fcc419',
            strokeWidth: 0,
            text: 'HELLO\nFROM\nHERE',
            fontFamily: 'Aclonica',
            fontSize: 43,
            fontWeight: '700',
            lineHeight: 1.16,
            avnacLayerId: 'legacy-text',
          },
        ],
      },
    }

    const document = parseAvnacDocument(legacy)

    expect(document).not.toBeNull()
    expect(document?.objects).toHaveLength(3)
    expect(document?.objects.map(obj => obj.type)).toEqual(['image', 'rect', 'text'])
    expect(document?.objects[0]).toMatchObject({
      id: 'legacy-qr',
      type: 'image',
      src: 'data:image/png;base64,abc',
    })
    expect(document?.objects[1]).toMatchObject({
      id: 'legacy-frame',
      type: 'rect',
    })
    expect(document?.objects[2]).toMatchObject({
      id: 'legacy-text',
      type: 'text',
      text: 'HELLO\nFROM\nHERE',
      fontFamily: 'Aclonica',
      fontWeight: 700,
      lineHeight: 1.16,
    })
    expect((document?.objects[1] as { strokeWidth?: number } | undefined)?.strokeWidth).toBeCloseTo(
      36.73,
      2,
    )
    expect((document?.objects[2] as { fontSize?: number } | undefined)?.fontSize).toBeCloseTo(
      225.9865,
      4,
    )
  })
})
