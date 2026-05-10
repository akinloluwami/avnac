function envFlagEnabled(value: unknown): boolean {
  return (
    String(value ?? '')
      .trim()
      .toLowerCase() === 'true'
  )
}

export const REMOVE_BG_FEATURE_ENABLED = envFlagEnabled(import.meta.env.VITE_REMOVE_BG_ENABLED)

export const REMOVE_BG_UNAVAILABLE_MESSAGE =
  'We have taken background removal down because the server cost is too high for a free and open-source project. If Avnac is useful to you, please consider sponsoring the project so we can bring it back.'
