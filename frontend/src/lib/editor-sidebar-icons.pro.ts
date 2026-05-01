import {
  AiMagicIcon,
  Album02Icon,
  CloudUploadIcon,
  DashboardCircleIcon,
  Layers02Icon,
  PenTool01Icon,
} from '@hugeicons/core-free-icons'
import {
  AiMagicIcon as AiMagicSolidRoundedIcon,
  Album02Icon as Album02SolidRoundedIcon,
  CloudUploadIcon as CloudUploadSolidRoundedIcon,
  DashboardCircleIcon as DashboardCircleSolidRoundedIcon,
  Layers02Icon as Layers02SolidRoundedIcon,
  PenTool01Icon as PenTool01SolidRoundedIcon,
} from '@hugeicons-pro/core-solid-rounded'
import type { EditorSidebarIconSet } from './editor-sidebar-icons'

export const editorSidebarIcons: EditorSidebarIconSet = {
  layers: { icon: Layers02Icon, activeIcon: Layers02SolidRoundedIcon },
  uploads: { icon: CloudUploadIcon, activeIcon: CloudUploadSolidRoundedIcon },
  images: { icon: Album02Icon, activeIcon: Album02SolidRoundedIcon },
  'vector-board': { icon: PenTool01Icon, activeIcon: PenTool01SolidRoundedIcon },
  apps: { icon: DashboardCircleIcon, activeIcon: DashboardCircleSolidRoundedIcon },
  ai: { icon: AiMagicIcon, activeIcon: AiMagicSolidRoundedIcon },
}
