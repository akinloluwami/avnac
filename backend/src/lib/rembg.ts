export const REMBG_MODELS = [
  'birefnet-general',
  'birefnet-general-lite',
  'birefnet-portrait',
  'birefnet-dis',
  'birefnet-hrsod',
  'birefnet-cod',
  'birefnet-massive',
  'isnet-anime',
  'dis_custom',
  'isnet-general-use',
  'sam',
  'silueta',
  'u2net_cloth_seg',
  'u2net_custom',
  'u2net_human_seg',
  'u2net',
  'u2netp',
  'bria-rmbg',
  'ben_custom',
] as const

export type RembgModel = (typeof REMBG_MODELS)[number]

export const DEFAULT_REMBG_MODEL: RembgModel = 'birefnet-general-lite'

export function isSupportedRembgModel(value: string): value is RembgModel {
  return REMBG_MODELS.includes(value as RembgModel)
}
