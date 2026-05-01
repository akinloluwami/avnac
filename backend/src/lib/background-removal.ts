export const BACKGROUND_REMOVAL_PROVIDERS = ['rembg', 'bria'] as const

export type BackgroundRemovalProvider =
  (typeof BACKGROUND_REMOVAL_PROVIDERS)[number]

export const DEFAULT_BACKGROUND_REMOVAL_PROVIDER: BackgroundRemovalProvider =
  'bria'

export function isSupportedBackgroundRemovalProvider(
  value: string,
): value is BackgroundRemovalProvider {
  return BACKGROUND_REMOVAL_PROVIDERS.includes(
    value as BackgroundRemovalProvider,
  )
}
