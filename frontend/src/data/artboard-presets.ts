export type ArtboardPreset = {
  id: string
  label: string
  category: ArtboardPresetCategory
  width: number
  height: number
}

export type ArtboardPresetCategory = 'general' | 'social-media' | 'presentation' | 'print'

export const ARTBOARD_PRESETS: readonly ArtboardPreset[] = [
  {
    id: 'custom-4000',
    label: 'Large square (4000)',
    category: 'general',
    width: 4000,
    height: 4000,
  },
  {
    id: 'ig-square',
    label: 'Instagram square (1080)',
    category: 'social-media',
    width: 1080,
    height: 1080,
  },
  {
    id: 'ig-portrait',
    label: 'Instagram portrait (1080×1350)',
    category: 'social-media',
    width: 1080,
    height: 1350,
  },
  {
    id: 'ig-story',
    label: 'Story / Reels (1080×1920)',
    category: 'social-media',
    width: 1080,
    height: 1920,
  },
  {
    id: 'twitter-post',
    label: 'X / Twitter post (1200×675)',
    category: 'social-media',
    width: 1200,
    height: 675,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn share (1200×627)',
    category: 'social-media',
    width: 1200,
    height: 627,
  },
  {
    id: 'youtube-thumb',
    label: 'YouTube thumbnail (1280×720)',
    category: 'social-media',
    width: 1280,
    height: 720,
  },
  {
    id: 'hd',
    label: 'HD (1920×1080)',
    category: 'presentation',
    width: 1920,
    height: 1080,
  },
  {
    id: 'a4-300',
    label: 'Print A4 @300dpi (2480×3508)',
    category: 'print',
    width: 2480,
    height: 3508,
  },
] as const
