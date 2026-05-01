/**
 * Tambo tool definitions that expose the Avnac design canvas to the agent.
 *
 * All tools are built lazily from a `MutableRefObject<AiDesignController | null>`
 * so they survive panel remounts and always talk to the live canvas.
 */

import type { TamboTool } from '@tambo-ai/react'
import type { MutableRefObject } from 'react'
import { z } from 'zod'
import type { AiDesignController } from './avnac-ai-controller'
import type { UnsplashPhoto } from './unsplash-api'
import {
  fetchUnsplashPopular,
  fetchUnsplashSearch,
  scaleUnsplashToPlaceBox,
  trackUnsplashDownload,
} from './unsplash-api'

const placementSchema = z
  .object({
    x: z.number().describe('X in artboard pixels.').optional(),
    y: z.number().describe('Y in artboard pixels.').optional(),
    origin: z
      .enum(['top-left', 'center'])
      .describe("Whether x/y refers to the object's top-left corner (default) or geometric center.")
      .optional(),
  })
  .describe('Placement of the object on the artboard.')

const colorSchema = z
  .string()
  .describe('CSS color in hex (#rrggbb / #rrggbbaa), rgb(), rgba(), hsl(), or a named color.')

const okResultSchema = z.object({
  ok: z.boolean(),
  id: z.string().nullable(),
  note: z.string().optional(),
})

const countResultSchema = z.object({
  ok: z.boolean(),
  count: z.number(),
})

type OkResult = z.infer<typeof okResultSchema>

const fail = (note: string): OkResult => ({ ok: false, id: null, note })

function isImageSourceString(s: string): boolean {
  const t = s.trim()
  if (t.length === 0) return false
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(t)) return true
  try {
    const u = new URL(t)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const imageSourceSchema = z
  .string()
  .min(1)
  .describe(
    'Direct image address: HTTPS/HTTP URL to an image file, or data:image/*;base64,... Inline PNG/JPEG/WebP from tools or pasted assets must use this form.',
  )
  .refine(isImageSourceString, {
    message: 'Must be http(s) URL or data:image/*;base64,...',
  })

function isUnsplashApiDownloadUrl(s: string): boolean {
  try {
    const u = new URL(s.trim())
    return u.protocol === 'https:' && u.hostname === 'api.unsplash.com'
  } catch {
    return false
  }
}

function isLikelyUnsplashImageUrl(s: string): boolean {
  try {
    const u = new URL(s.trim())
    return u.protocol === 'https:' && u.hostname.endsWith('unsplash.com')
  } catch {
    return false
  }
}

const unsplashDownloadLocationSchema = z
  .string()
  .min(1)
  .describe('Exact download_location string from search_unsplash for the chosen photo.')
  .refine(isUnsplashApiDownloadUrl, {
    message: 'Must be an https://api.unsplash.com/... URL from search_unsplash.',
  })

const unsplashImageUrlSchema = z
  .string()
  .min(1)
  .describe('Exact image_url from search_unsplash for the chosen photo.')
  .refine(isLikelyUnsplashImageUrl, {
    message: 'Must be an Unsplash image URL from search_unsplash.',
  })

function unsplashPhotoForAgent(p: UnsplashPhoto) {
  return {
    id: p.id,
    width: p.width,
    height: p.height,
    description: p.description,
    alt_description: p.alt_description,
    image_url: p.urls.regular,
    download_location: p.links.download_location,
    photographer: p.user.name,
    photographer_url: p.user.links.html,
    unsplash_photo_page: p.links.html,
  }
}

const unsplashSearchOutputSchema = z.object({
  ok: z.boolean(),
  note: z.string().optional(),
  has_more: z.boolean(),
  results: z.array(
    z.object({
      id: z.string(),
      width: z.number(),
      height: z.number(),
      description: z.string().nullable(),
      alt_description: z.string().nullable(),
      image_url: z.string(),
      download_location: z.string(),
      photographer: z.string(),
      photographer_url: z.string(),
      unsplash_photo_page: z.string(),
    }),
  ),
})

export function buildAvnacTamboTools(
  controllerRef: MutableRefObject<AiDesignController | null>,
): TamboTool[] {
  const withCtl = <T, F>(fn: (ctl: AiDesignController) => T, fallback: F): T | F => {
    const ctl = controllerRef.current
    if (!ctl) return fallback
    return fn(ctl)
  }

  const describeCanvas: TamboTool = {
    name: 'describe_canvas',
    description:
      'Return the current artboard dimensions, background, and a summary of every object on the canvas. Use this to orient yourself before making edits or to answer questions about the current design.',
    tool: async () => {
      return withCtl(
        ctl => {
          const info = ctl.getCanvas()
          if (!info) return { ok: false as const, note: 'Canvas not ready.', canvas: null }
          return { ok: true as const, canvas: info }
        },
        { ok: false as const, note: 'Canvas not ready.', canvas: null },
      )
    },
    inputSchema: z.object({}).describe('No arguments.'),
    outputSchema: z.object({
      ok: z.boolean(),
      note: z.string().optional(),
      canvas: z
        .object({
          width: z.number(),
          height: z.number(),
          background: z.string().nullable(),
          objectCount: z.number(),
          objects: z.array(
            z.object({
              id: z.string(),
              kind: z.string(),
              label: z.string(),
              left: z.number(),
              top: z.number(),
              width: z.number(),
              height: z.number(),
              angle: z.number(),
              fill: z.string().nullable(),
              stroke: z.string().nullable(),
              text: z.string().nullable(),
            }),
          ),
        })
        .nullable(),
    }),
  }

  const searchUnsplash: TamboTool = {
    name: 'search_unsplash',
    description:
      'Search Unsplash for stock photos (Avnac backend must have UNSPLASH_ACCESS_KEY). Returns candidates with image_url, download_location, width, height — pick one best match, then call add_unsplash_photo with those fields. If query is omitted or empty, returns popular photos.',
    tool: async (args: { query?: string; page?: number; per_page?: number }) => {
      const page = args.page ?? 1
      const perPage = Math.min(15, Math.max(1, args.per_page ?? 8))
      const q = args.query?.trim() ?? ''
      const res = q
        ? await fetchUnsplashSearch(q, page, perPage)
        : await fetchUnsplashPopular(page, perPage)
      if (res.error) {
        return {
          ok: false as const,
          note: res.error,
          has_more: false,
          results: [],
        }
      }
      return {
        ok: true as const,
        has_more: res.hasMore,
        results: res.photos.map(unsplashPhotoForAgent),
      }
    },
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe('Keywords (e.g. "workspace laptop"). Leave empty for popular/trending.'),
      page: z.number().int().min(1).optional().describe('Result page, default 1.'),
      per_page: z
        .number()
        .int()
        .min(1)
        .max(15)
        .optional()
        .describe('How many photos to return (max 15, default 8).'),
    }),
    outputSchema: unsplashSearchOutputSchema,
  }

  const addUnsplashPhoto: TamboTool = {
    name: 'add_unsplash_photo',
    description:
      'Place one Unsplash photo on the artboard after search_unsplash. Copy image_url, download_location, width, and height from the chosen search result (same row). This triggers required download tracking. Prefer this over add_image for Unsplash URLs.',
    tool: async (args: {
      download_location: string
      image_url: string
      natural_width: number
      natural_height: number
      x?: number
      y?: number
      origin?: 'top-left' | 'center'
      width?: number
      height?: number
      rotation?: number
      opacity?: number
    }): Promise<OkResult> => {
      const ctl = controllerRef.current
      if (!ctl) return fail('Canvas not ready.')
      const hasCustomSize =
        args.width != null && args.height != null && args.width > 0 && args.height > 0
      const sized = hasCustomSize
        ? { width: args.width!, height: args.height! }
        : scaleUnsplashToPlaceBox(args.natural_width, args.natural_height)
      try {
        try {
          await trackUnsplashDownload(args.download_location.trim())
        } catch {
          /* same as Images panel: still try to place */
        }
        const r = await ctl.addImageFromUrl({
          url: args.image_url.trim(),
          x: args.x,
          y: args.y,
          origin: args.origin ?? 'center',
          width: sized.width,
          height: sized.height,
          rotation: args.rotation,
          opacity: args.opacity,
        })
        return r ? { ok: true, id: r.id } : fail('Failed to load Unsplash image.')
      } catch {
        return fail('Failed to load Unsplash image.')
      }
    },
    inputSchema: z
      .object({
        download_location: unsplashDownloadLocationSchema,
        image_url: unsplashImageUrlSchema,
        natural_width: z
          .number()
          .positive()
          .describe('width from the search result for this photo.'),
        natural_height: z
          .number()
          .positive()
          .describe('height from the search result for this photo.'),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
        rotation: z.number().optional(),
        opacity: z.number().min(0).max(1).optional(),
      })
      .merge(placementSchema)
      .superRefine((val, ctx) => {
        const w = val.width
        const h = val.height
        if ((w == null) !== (h == null)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Provide both width and height, or neither (to auto-scale).',
          })
        }
      }),
    outputSchema: okResultSchema,
  }

  const addRectangle: TamboTool = {
    name: 'add_rectangle',
    description:
      'Add a rectangle to the artboard. Good for backgrounds, cards, buttons, input fields, and containers.',
    tool: async (args: {
      width: number
      height: number
      x?: number
      y?: number
      origin?: 'top-left' | 'center'
      fill?: string
      stroke?: string
      strokeWidth?: number
      cornerRadius?: number
      rotation?: number
      opacity?: number
    }): Promise<OkResult> => {
      return withCtl(ctl => {
        const r = ctl.addRectangle(args)
        return r ? { ok: true, id: r.id } : fail('Canvas not ready.')
      }, fail('Canvas not ready.'))
    },
    inputSchema: placementSchema.extend({
      width: z.number().positive(),
      height: z.number().positive(),
      fill: colorSchema.optional(),
      stroke: colorSchema.optional(),
      strokeWidth: z.number().min(0).optional(),
      cornerRadius: z.number().min(0).optional(),
      rotation: z.number().describe('Rotation in degrees.').optional(),
      opacity: z.number().min(0).max(1).optional(),
    }),
    outputSchema: okResultSchema,
  }

  const addEllipse: TamboTool = {
    name: 'add_ellipse',
    description:
      'Add an ellipse (or circle, when width = height) to the artboard. Good for avatars, badges, icons, and accents.',
    tool: async (args: {
      width: number
      height: number
      x?: number
      y?: number
      origin?: 'top-left' | 'center'
      fill?: string
      stroke?: string
      strokeWidth?: number
      rotation?: number
      opacity?: number
    }): Promise<OkResult> => {
      return withCtl(ctl => {
        const r = ctl.addEllipse(args)
        return r ? { ok: true, id: r.id } : fail('Canvas not ready.')
      }, fail('Canvas not ready.'))
    },
    inputSchema: placementSchema.extend({
      width: z.number().positive(),
      height: z.number().positive(),
      fill: colorSchema.optional(),
      stroke: colorSchema.optional(),
      strokeWidth: z.number().min(0).optional(),
      rotation: z.number().optional(),
      opacity: z.number().min(0).max(1).optional(),
    }),
    outputSchema: okResultSchema,
  }

  const addText: TamboTool = {
    name: 'add_text',
    description:
      'Add a text layer to the artboard. Use this for headings, body copy, labels, and captions. Remember to choose a font size that fits the artboard dimensions.',
    tool: async (args: {
      text: string
      x?: number
      y?: number
      origin?: 'top-left' | 'center'
      fontSize?: number
      fontFamily?: string
      fontWeight?: number | 'normal' | 'bold'
      fontStyle?: 'normal' | 'italic'
      fill?: string
      textAlign?: 'left' | 'center' | 'right' | 'justify'
      width?: number
      rotation?: number
      opacity?: number
    }): Promise<OkResult> => {
      return withCtl(ctl => {
        const r = ctl.addText(args)
        return r ? { ok: true, id: r.id } : fail('Canvas not ready.')
      }, fail('Canvas not ready.'))
    },
    inputSchema: placementSchema.extend({
      text: z.string(),
      fontSize: z.number().positive().optional(),
      fontFamily: z.string().optional(),
      fontWeight: z.union([z.number(), z.literal('normal'), z.literal('bold')]).optional(),
      fontStyle: z.enum(['normal', 'italic']).optional(),
      fill: colorSchema.optional(),
      textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
      width: z
        .number()
        .positive()
        .describe('Textbox width; text wraps inside this width.')
        .optional(),
      rotation: z.number().optional(),
      opacity: z.number().min(0).max(1).optional(),
    }),
    outputSchema: okResultSchema,
  }

  const addLine: TamboTool = {
    name: 'add_line',
    description:
      'Add a straight line between two points. Useful for dividers, strokes, and connectors.',
    tool: async (args: {
      x1: number
      y1: number
      x2: number
      y2: number
      stroke?: string
      strokeWidth?: number
      opacity?: number
    }): Promise<OkResult> => {
      return withCtl(ctl => {
        const r = ctl.addLine(args)
        return r ? { ok: true, id: r.id } : fail('Canvas not ready.')
      }, fail('Canvas not ready.'))
    },
    inputSchema: z.object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number(),
      stroke: colorSchema.optional(),
      strokeWidth: z.number().min(0).optional(),
      opacity: z.number().min(0).max(1).optional(),
    }),
    outputSchema: okResultSchema,
  }

  const addImage: TamboTool = {
    name: 'add_image',
    description:
      'Place a raster image from an arbitrary URL or data URL. For Unsplash stock photos, use search_unsplash then add_unsplash_photo (required for API compliance). For other hosts (logos, Wikimedia, picsum, user URLs), use add_image. Pass https URL or data:image/...;base64,... Size defaults to native pixels; set width/height to fit the artboard.',
    tool: async (args: {
      url: string
      x?: number
      y?: number
      origin?: 'top-left' | 'center'
      width?: number
      height?: number
      rotation?: number
      opacity?: number
    }): Promise<OkResult> => {
      const ctl = controllerRef.current
      if (!ctl) return fail('Canvas not ready.')
      const r = await ctl.addImageFromUrl({ ...args, url: args.url.trim() })
      return r ? { ok: true, id: r.id } : fail('Failed to load image.')
    },
    inputSchema: placementSchema.extend({
      url: imageSourceSchema,
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      rotation: z.number().optional(),
      opacity: z.number().min(0).max(1).optional(),
    }),
    outputSchema: okResultSchema,
  }

  const updateObject: TamboTool = {
    name: 'update_object',
    description:
      'Mutate an existing object by its id (returned from add_* tools or describe_canvas). Only provide fields you want to change.',
    tool: async (args: {
      id: string
      left?: number
      top?: number
      width?: number
      height?: number
      scaleX?: number
      scaleY?: number
      angle?: number
      fill?: string
      stroke?: string
      strokeWidth?: number
      opacity?: number
      text?: string
      fontSize?: number
    }): Promise<OkResult> => {
      return withCtl(ctl => {
        const { id, ...patch } = args
        const ok = ctl.updateObject(id, patch)
        return ok ? { ok: true, id } : { ok: false, id, note: 'Object not found.' }
      }, fail('Canvas not ready.'))
    },
    inputSchema: z.object({
      id: z.string(),
      left: z.number().optional(),
      top: z.number().optional(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      scaleX: z.number().positive().optional(),
      scaleY: z.number().positive().optional(),
      angle: z.number().optional(),
      fill: colorSchema.optional(),
      stroke: colorSchema.optional(),
      strokeWidth: z.number().min(0).optional(),
      opacity: z.number().min(0).max(1).optional(),
      text: z.string().optional(),
      fontSize: z.number().positive().optional(),
    }),
    outputSchema: okResultSchema,
  }

  const deleteObject: TamboTool = {
    name: 'delete_object',
    description: 'Remove an object from the canvas by its id.',
    tool: async (args: { id: string }): Promise<OkResult> => {
      return withCtl(ctl => {
        const ok = ctl.deleteObject(args.id)
        return ok
          ? { ok: true, id: args.id }
          : { ok: false, id: args.id, note: 'Object not found.' }
      }, fail('Canvas not ready.'))
    },
    inputSchema: z.object({ id: z.string() }),
    outputSchema: okResultSchema,
  }

  const setBackground: TamboTool = {
    name: 'set_background',
    description: 'Set the artboard background to a solid color.',
    tool: async (args: { color: string }) => {
      return withCtl(
        ctl => {
          ctl.setBackgroundColor(args.color)
          return { ok: true as const }
        },
        { ok: false as const },
      )
    },
    inputSchema: z.object({ color: colorSchema }),
    outputSchema: z.object({ ok: z.boolean() }),
  }

  const clearCanvas: TamboTool = {
    name: 'clear_canvas',
    description:
      'Remove every object from the artboard. Use sparingly and confirm the intent in your message before calling.',
    tool: async () => {
      return withCtl(ctl => ({ ok: true as const, count: ctl.clearCanvas() }), {
        ok: false as const,
        count: 0,
      })
    },
    inputSchema: z.object({}),
    outputSchema: countResultSchema,
  }

  const selectObjects: TamboTool = {
    name: 'select_objects',
    description:
      "Select one or more objects by id so the user can see them highlighted after the agent's edits.",
    tool: async (args: { ids: string[] }) => {
      return withCtl(ctl => ({ ok: true as const, count: ctl.selectObjects(args.ids) }), {
        ok: false as const,
        count: 0,
      })
    },
    inputSchema: z.object({ ids: z.array(z.string()) }),
    outputSchema: countResultSchema,
  }

  return [
    describeCanvas,
    searchUnsplash,
    addUnsplashPhoto,
    addRectangle,
    addEllipse,
    addText,
    addLine,
    addImage,
    updateObject,
    deleteObject,
    setBackground,
    clearCanvas,
    selectObjects,
  ]
}
