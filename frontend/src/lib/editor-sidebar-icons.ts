import type { IconSvgElement } from '@hugeicons/react'
import {
  AiMagicIcon,
  Album02Icon,
  CloudUploadIcon,
  DashboardCircleIcon,
  Layers02Icon,
  PenTool01Icon,
} from '@hugeicons/core-free-icons'

export type EditorSidebarIconId =
  | 'layers'
  | 'uploads'
  | 'images'
  | 'vector-board'
  | 'apps'
  | 'ai'

export type EditorSidebarIconDefinition = {
  icon: IconSvgElement
  activeIcon: IconSvgElement
}

export type EditorSidebarIconSet = Record<
  EditorSidebarIconId,
  EditorSidebarIconDefinition
>

/**
 * Default, contributor-friendly icon set.
 * Vite swaps this module for `editor-sidebar-icons.pro.ts` when the
 * optional Hugeicons Pro package is installed.
 */
export const editorSidebarIcons: EditorSidebarIconSet = {
  layers: { icon: Layers02Icon, activeIcon: Layers02Icon },
  uploads: { icon: CloudUploadIcon, activeIcon: CloudUploadIcon },
  images: { icon: Album02Icon, activeIcon: Album02Icon },
  'vector-board': { icon: PenTool01Icon, activeIcon: PenTool01Icon },
  apps: { icon: DashboardCircleIcon, activeIcon: DashboardCircleIcon },
  ai: { icon: AiMagicIcon, activeIcon: AiMagicIcon },
}
