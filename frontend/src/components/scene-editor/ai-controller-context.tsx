import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'

import type { AiDesignController } from '../../lib/avnac-ai-controller'

const AiControllerContext = createContext<AiDesignController | null>(null)

export function AiControllerProvider({
  children,
  controller,
}: {
  children: ReactNode
  controller: AiDesignController
}) {
  return (
    <AiControllerContext.Provider value={controller}>
      {children}
    </AiControllerContext.Provider>
  )
}

export function useAiController() {
  const controller = useContext(AiControllerContext)
  if (!controller) {
    throw new Error('useAiController must be used within AiControllerProvider')
  }
  return controller
}
