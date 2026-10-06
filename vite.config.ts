import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const VENDOR_CHUNKS: Record<string, string[]> = {
   "vendor-react": ["react", "react-dom", "react-router-dom"],
   "vendor-form": ["react-hook-form", "@hookform/resolvers", "zod"],
   "vendor-ui": [
      "@tanstack/react-query",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "lucide-react",
      "embla-carousel-react",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "cmdk",
      "vaul",
      "sonner",
      "react-virtuoso",
      "react-day-picker",
      "date-fns",
   ],
   "vendor-utils": ["axios", "next-themes", "zustand"],
};

function resolveVendorChunk(id: string): string | undefined {
   const normalized = id.replace(/\\/g, "/");
   if (!normalized.includes("/node_modules/")) return undefined;
   for (const [chunk, pkgs] of Object.entries(VENDOR_CHUNKS)) {
      if (pkgs.some(pkg => normalized.includes(`/node_modules/${pkg}/`))) return chunk;
   }
   return undefined;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
   const env = loadEnv(mode, process.cwd(), "");
   return {
      base: env.VITE_BASE_URL || "/atividades-complementares/",
      plugins: [react(), tailwindcss()],
      test: {
         environment: "jsdom",
         include: ["tests/**/*.{test,spec}.{ts,tsx}"],
         setupFiles: ["./tests/setup.ts"],
         restoreMocks: true,
         coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/vite-env.d.ts"],
         },
      },
      build: {
         minify: "terser",
         terserOptions: {
            format: {
               comments: false,
            },
            compress: {
               pure_funcs: ["console.log", "console.debug", "console.info", "alert"],
            },
         },
         rollupOptions: {
            treeshake: {
               moduleSideEffects: "no-external",
               propertyReadSideEffects: false,
            },
            output: {
               manualChunks: resolveVendorChunk,
            },
         },
      },
      resolve: {
         alias: {
            "@": path.resolve(__dirname, "./src"),
         },
      },
      server: {
         proxy: {
            "/atividades-complementares/api/v1": {
               target: "http://localhost",
               changeOrigin: true,
               secure: false,
            },
         },
      },
   };
});
