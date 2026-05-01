import { createRootRoute, Outlet } from '@tanstack/react-router'
import { PostHogProvider } from 'posthog-js/react'

import NativeTitleTooltip from '../components/native-title-tooltip'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST
  const posthogApiHost = import.meta.env.DEV ? '/ingest' : posthogHost

  return (
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN!}
      options={{
        api_host: posthogApiHost,
        ui_host: posthogHost,
        defaults: '2026-01-30',
        capture_exceptions: true,
        debug: import.meta.env.DEV,
      }}
    >
      <NativeTitleTooltip />
      <Outlet />
    </PostHogProvider>
  )
}
