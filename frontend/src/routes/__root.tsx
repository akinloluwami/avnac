import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PostHogProvider } from "posthog-js/react";

import NativeTitleTooltip from "../components/native-title-tooltip";

export const Route = createRootRoute({
  component: RootLayout,
});

const THEME_STORAGE_KEY = "avnac-theme";

type ThemeMode = "light" | "dark";

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function RootLayout() {
  const [theme, setTheme] = useState<ThemeMode>(getPreferredTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN!}
      options={{
        api_host: "/ingest",
        ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: "2026-01-30",
        capture_exceptions: true,
        debug: import.meta.env.DEV,
      }}
    >
      <button
        type="button"
        className="theme-toggle"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        aria-pressed={theme === "dark"}
        onClick={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
      >
        <span className="theme-toggle-label">
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </span>
      </button>
      <NativeTitleTooltip />
      <Outlet />
    </PostHogProvider>
  );
}
