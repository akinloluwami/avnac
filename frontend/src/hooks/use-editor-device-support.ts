import { useEffect, useState } from 'react'

function detectEditorUnsupportedOnThisDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  const nav = navigator as Navigator & {
    userAgentData?: { mobile?: boolean }
  }

  const uaDataMobile = nav.userAgentData?.mobile === true
  const uaMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(
      navigator.userAgent,
    )
  const coarseCompact =
    window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches ||
    (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024)

  return uaDataMobile || uaMobile || coarseCompact
}

export function useEditorUnsupportedOnThisDevice(): boolean {
  const [unsupported, setUnsupported] = useState(() => detectEditorUnsupportedOnThisDevice())

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px) and (pointer: coarse)')
    const update = () => setUnsupported(detectEditorUnsupportedOnThisDevice())

    update()
    window.addEventListener('resize', update)
    media.addEventListener?.('change', update)

    return () => {
      window.removeEventListener('resize', update)
      media.removeEventListener?.('change', update)
    }
  }, [])

  return unsupported
}
