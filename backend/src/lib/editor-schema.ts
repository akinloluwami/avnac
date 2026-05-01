import { z } from 'zod'

const gradientStopSchema = z.object({
  color: z.string(),
  offset: z.number(),
})

const bgValueSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('solid'),
    color: z.string(),
  }),
  z.object({
    type: z.literal('gradient'),
    css: z.string(),
    stops: z.array(gradientStopSchema),
    angle: z.number(),
  }),
])

const sceneShadowSchema = z.object({
  blur: z.number(),
  offsetX: z.number(),
  offsetY: z.number(),
  colorHex: z.string(),
  opacityPct: z.number(),
})

const sceneObjectBaseSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number(),
  visible: z.boolean(),
  locked: z.boolean(),
  name: z.string().optional(),
  blurPct: z.number(),
  shadow: sceneShadowSchema.nullable(),
})

const scenePaintShapeSchema = z.object({
  fill: bgValueSchema,
  stroke: bgValueSchema,
  strokeWidth: z.number(),
})

const legacyDocumentSchema = z.object({
  v: z.literal(1),
  artboard: z.object({
    width: z.number(),
    height: z.number(),
  }),
  bg: bgValueSchema,
  fabric: z.record(z.string(), z.unknown()),
})

const sceneObjectSchema: z.ZodType = z.lazy(() =>
  z.discriminatedUnion('type', [
    sceneObjectBaseSchema.extend({
      type: z.literal('rect'),
      ...scenePaintShapeSchema.shape,
      cornerRadius: z.number(),
    }),
    sceneObjectBaseSchema.extend({
      type: z.literal('ellipse'),
      ...scenePaintShapeSchema.shape,
    }),
    sceneObjectBaseSchema.extend({
      type: z.literal('polygon'),
      ...scenePaintShapeSchema.shape,
      sides: z.number(),
    }),
    sceneObjectBaseSchema.extend({
      type: z.literal('star'),
      ...scenePaintShapeSchema.shape,
      points: z.number(),
    }),
    sceneObjectBaseSchema.extend({
      type: z.literal('line'),
      stroke: bgValueSchema,
      strokeWidth: z.number(),
      lineStyle: z.enum(['solid', 'dashed', 'dotted']),
      roundedEnds: z.boolean(),
    }),
    sceneObjectBaseSchema.extend({
      type: z.literal('arrow'),
      stroke: bgValueSchema,
      strokeWidth: z.number(),
      lineStyle: z.enum(['solid', 'dashed', 'dotted']),
      roundedEnds: z.boolean(),
      pathType: z.enum(['straight', 'curved']),
      headSize: z.number(),
      curveBulge: z.number(),
      curveT: z.number(),
    }),
    sceneObjectBaseSchema.extend({
      type: z.literal('text'),
      text: z.string(),
      fill: bgValueSchema,
      stroke: bgValueSchema,
      strokeWidth: z.number(),
      fontFamily: z.string(),
      fontSize: z.number(),
      fontWeight: z.union([z.number(), z.literal('normal'), z.literal('bold')]),
      fontStyle: z.enum(['normal', 'italic']),
      underline: z.boolean(),
      textAlign: z.enum(['left', 'center', 'right', 'justify']),
    }),
    sceneObjectBaseSchema.extend({
      type: z.literal('image'),
      src: z.string(),
      naturalWidth: z.number(),
      naturalHeight: z.number(),
      crop: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      cornerRadius: z.number(),
    }),
    sceneObjectBaseSchema.extend({
      type: z.literal('vector-board'),
      boardId: z.string().min(1),
    }),
    sceneObjectBaseSchema.extend({
      type: z.literal('group'),
      children: z.array(sceneObjectSchema),
    }),
  ]),
)

const sceneDocumentSchema = z.object({
  v: z.literal(2),
  artboard: z.object({
    width: z.number(),
    height: z.number(),
  }),
  bg: bgValueSchema,
  objects: z.array(sceneObjectSchema),
})

export const avnacDocumentSchema = z.union([legacyDocumentSchema, sceneDocumentSchema])

const vectorPenAnchorSchema = z.object({
  x: z.number(),
  y: z.number(),
  inX: z.number().optional(),
  inY: z.number().optional(),
  outX: z.number().optional(),
  outY: z.number().optional(),
})

const vectorStrokeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['pen', 'line', 'rect', 'ellipse', 'arrow', 'polygon']),
  points: z.array(z.tuple([z.number(), z.number()])),
  penAnchors: z.array(vectorPenAnchorSchema).optional(),
  penClosed: z.boolean().optional(),
  stroke: z.string(),
  strokeWidthN: z.number(),
  fill: z.string(),
})

const vectorBoardLayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  visible: z.boolean(),
  strokes: z.array(vectorStrokeSchema),
})

const vectorBoardDocumentV2Schema = z.object({
  v: z.literal(2),
  layers: z.array(vectorBoardLayerSchema),
  activeLayerId: z.string().min(1),
})

const vectorBoardDocumentV1Schema = z.object({
  v: z.literal(1),
  strokes: z.array(
    z.object({
      id: z.string().min(1),
      points: z.array(z.tuple([z.number(), z.number()])),
      stroke: z.string(),
      strokeWidthN: z.number(),
    }),
  ),
})

export const vectorBoardDocumentSchema = z.union([
  vectorBoardDocumentV2Schema,
  vectorBoardDocumentV1Schema,
])

export const vectorBoardMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.number().int(),
})

export const documentPayloadSchema = z.object({
  document: avnacDocumentSchema,
  vectorBoards: z.array(vectorBoardMetaSchema),
  vectorBoardDocs: z.record(z.string(), vectorBoardDocumentSchema),
})

export type DocumentPayload = z.infer<typeof documentPayloadSchema>
