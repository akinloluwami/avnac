import { defineConfig, loadEnv } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const standardJsonEsm = fileURLToPath(
  new URL(
    "./node_modules/@standard-community/standard-json/dist/index.js",
    import.meta.url,
  ),
);

const proEditorSidebarIconsModule = fileURLToPath(
  new URL("./src/lib/editor-sidebar-icons.pro.ts", import.meta.url),
);

const hasHugeiconsPro = (() => {
  try {
    require.resolve("@hugeicons-pro/core-solid-rounded/package.json");
    return true;
  } catch {
    return false;
  }
})();

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  console.info(
    `[icons] ${hasHugeiconsPro ? "Hugeicons Pro detected" : "Hugeicons Pro not installed; using free fallback"}`,
  );
  return {
    base: "/",
    resolve: {
      tsconfigPaths: true,
      alias: [
        ...(hasHugeiconsPro
          ? [
              {
                find: /^@\/lib\/editor-sidebar-icons$/,
                replacement: proEditorSidebarIconsModule,
              },
            ]
          : []),
        // Rolldown/Vite 8 can't parse `.cjs` files that contain dynamic
        // `await import(...)`. Force this dep to its ESM entry so the
        // `require` condition from @tambo-ai/client never pulls the CJS
        // shards through the production client build.
        {
          find: /^@standard-community\/standard-json$/,
          replacement: standardJsonEsm,
        },
      ],
    },
    plugins: [tanstackRouter({ target: "react" }), tailwindcss(), viteReact()],
    server: {
      proxy: {
        "/ingest": {
          target: env.VITE_PUBLIC_POSTHOG_HOST,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/ingest/, ""),
        },
        // Mirrors production: Vercel mounts the backend at /api (vercel.json).
        // Browser uses same-origin /api; only the dev server proxies to localhost.
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});

export default config;
