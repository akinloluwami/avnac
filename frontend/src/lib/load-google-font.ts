const loaded = new Set<string>()
const fontReadyPromises = new Map<string, Promise<void>>()

function normalizeFontFamilyKey(css: string): string {
  const first = css.split(',')[0]?.trim() ?? ''
  return first.replace(/^["']|["']$/g, '')
}

function linkId(familyKey: string) {
  return `gf-${familyKey.replace(/[^a-zA-Z0-9]+/g, '-')}`
}

function waitForStylesheetLink(link: HTMLLinkElement): Promise<void> {
  return new Promise(resolve => {
    try {
      if (link.sheet) {
        resolve()
        return
      }
    } catch {
      /* cross-origin access to sheet may throw */
    }
    const done = () => resolve()
    link.addEventListener('load', done, { once: true })
    link.addEventListener('error', done, { once: true })
  })
}

export function loadGoogleFontFamily(family: string): void {
  const key = normalizeFontFamilyKey(family)
  if (!key) return
  if (loaded.has(key)) return

  const id = linkId(key)
  if (document.getElementById(id)) {
    loaded.add(key)
    return
  }

  loaded.add(key)
  const q = encodeURIComponent(key).replace(/%20/g, '+')
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${q}:wght@400;500;600;700&display=swap`
  document.head.appendChild(link)
}

/**
 * Ensures the Google Fonts stylesheet is loaded and the family is registered in document.fonts.
 */
export function ensureGoogleFontFamilyReady(family: string): Promise<void> {
  const key = normalizeFontFamilyKey(family)
  if (!key) return Promise.resolve()

  const inflight = fontReadyPromises.get(key)
  if (inflight) return inflight

  const task = (async () => {
    loadGoogleFontFamily(family)
    const id = linkId(key)
    const link = document.getElementById(id) as HTMLLinkElement | null
    if (link) await waitForStylesheetLink(link)
    try {
      await Promise.all(
        ['400', '500', '600', '700'].map(w => document.fonts.load(`${w} 40px "${key}"`)),
      )
    } catch {
      /* ignore */
    }
  })()

  fontReadyPromises.set(key, task)
  void task.finally(() => {
    if (fontReadyPromises.get(key) === task) fontReadyPromises.delete(key)
  })
  return task
}

export async function ensureGoogleFontsForFamilies(families: Iterable<string>): Promise<void> {
  const keys = [...new Set([...families].map(normalizeFontFamilyKey).filter(k => k.length > 0))]
  await Promise.all(keys.map(ensureGoogleFontFamilyReady))
}

export function isGoogleFontLoaded(family: string): boolean {
  return loaded.has(normalizeFontFamilyKey(family))
}
