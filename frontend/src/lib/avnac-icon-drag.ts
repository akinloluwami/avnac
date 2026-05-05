import { normalizeIconSvg, type SceneIconSvg } from './avnac-icon'

export const AVNAC_ICON_DRAG_MIME = 'application/x-avnac-icon'

export type AvnacIconDragPayload = {
  iconName: string
  label: string
  svg: SceneIconSvg
}

function cleanPayload(raw: unknown): AvnacIconDragPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const iconName = typeof row.iconName === 'string' ? row.iconName.trim() : ''
  const label = typeof row.label === 'string' ? row.label.trim() : ''
  const svg = normalizeIconSvg(row.svg)
  if (!iconName || !label || !svg) return null
  return { iconName, label, svg }
}

export function serializeIconDragPayload(payload: AvnacIconDragPayload): string {
  return JSON.stringify(payload)
}

export function parseIconDragPayload(dataTransfer: DataTransfer): AvnacIconDragPayload | null {
  const raw = dataTransfer.getData(AVNAC_ICON_DRAG_MIME)
  if (!raw) return null
  try {
    return cleanPayload(JSON.parse(raw))
  } catch {
    return null
  }
}
