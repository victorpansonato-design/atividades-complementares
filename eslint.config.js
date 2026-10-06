import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
   {
      ignores: ["build", "dist", "node_modules", "scripts"],
   },
   js.configs.recommended,
   ...tseslint.configs.recommended,
   {
      files: ["**/*.{ts,tsx}"],
      languageOptions: {
         ecmaVersion: 2022,
         globals: globals.browser,
      },
      plugins: {
         "react-hooks": reactHooks,
         "react-refresh": reactRefresh,
      },
      rules: {
         ...reactHooks.configs.recommended.rules,
         "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      },
   },

   // Arquitetura validada por lint (Bulletproof React): regra de import entre
   // camadas. Sem isso, a arquitetura vira convenção que ninguém segue.
   // Camadas: app → feature → shared (de cima para baixo).
   {
      files: ["src/**/*.{ts,tsx}"],
      plugins: {
         boundaries,
      },
      settings: {
         // Resolve o alias "@/..." (tsconfig paths) para que o boundaries
         // consiga mapear cada import ao seu elemento/camada.
         "import/resolver": {
            typescript: {
               project: "./tsconfig.app.json",
            },
         },
         // Mapeamento de pastas → camadas. Ordem: mais específico primeiro.
         "boundaries/elements": [
            { type: "feature", mode: "folder", pattern: "src/features/*", capture: ["featureName"] },
            { type: "app", mode: "file", pattern: "src/main.tsx" },
            { type: "app", mode: "folder", pattern: ["src/routes", "src/providers", "src/layout", "src/pages"] },
            {
               type: "shared",
               mode: "folder",
               pattern: ["src/components", "src/services", "src/lib", "src/stores", "src/hooks", "src/contexts", "src/types", "src/config"],
            },
         ],
         // Não analisar arquivos fora das camadas (css, assets, vite-env, etc.).
         "boundaries/ignore": ["src/index.css", "src/vite-env.d.ts", "src/assets/**"],
      },
      rules: {
         // Regra única de dependência entre camadas (boundaries v6).
         // default disallow: o que não está explicitamente liberado é proibido.
         // A última regra que casa vence - por isso o encapsulamento vem por último.
         "boundaries/dependencies": [
            2,
            {
               default: "disallow",
               rules: [
                  // app compõe tudo: importa features e shared (e a própria camada app).
                  { from: { type: "app" }, allow: { to: { type: ["app", "feature", "shared"] } } },
                  // feature usa shared e a própria feature.
                  { from: { type: "feature" }, allow: { to: { type: ["feature", "shared"] } } },
                  // shared é a base: só importa shared. Nunca feature nem app.
                  { from: { type: "shared" }, allow: { to: { type: "shared" } } },
                  // Encapsulamento: de FORA, um slice só é importável pelo seu index.ts.
                  // (Imports internos do próprio slice não cruzam fronteira e não são checados.)
                  {
                     from: { type: ["app", "feature"] },
                     disallow: { to: { type: "feature", internalPath: "!index.ts" } },
                     message: "Importe a feature apenas pela sua API pública (features/<nome>/index.ts).",
                  },
               ],
            },
         ],
      },
   },

   {
      files: ["*.config.{js,ts}", "vite.config.ts"],
      languageOptions: {
         globals: globals.node,
      },
   },
);
