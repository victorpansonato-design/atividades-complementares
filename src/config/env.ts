/**
 * Leitura centralizada e tipada das variáveis de ambiente (`import.meta.env`).
 *
 * Toda a aplicação deve importar daqui em vez de acessar `import.meta.env.VITE_*`
 * diretamente. Isso concentra os fallbacks, facilita o `npm run setup` (que
 * reescreve o base path padrão `/atividades-complementares/` neste arquivo) e dá um único ponto
 * de verdade tipado para configuração de runtime.
 *
 * Variáveis usadas pelo frontend precisam ter o prefixo `VITE_`.
 */

/** Adapters de dados conhecidos. Só `mock` existe neste protótipo. */
export type DataMode = "mock" | "api";

function readDataMode(value: string | undefined): DataMode {
   return value === "api" ? "api" : "mock";
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
   if (value === undefined || value === "") return fallback;
   return value === "true" || value === "1";
}

export const env = {
   /** URL base do futuro cliente HTTP. Não é usada no modo mock. */
   apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3000/api/",

   /** Base path do Vite e do React Router. Deve terminar com "/". */
   baseUrl: import.meta.env.VITE_BASE_URL || "/atividades-complementares/",

   /**
    * Camada de dados. O padrão é `mock` inclusive no build, para que a demonstração
    * nunca dependa de backend, SSO ou `import.meta.env.DEV`.
    */
   dataMode: readDataMode(import.meta.env.VITE_DATA_MODE),

   /**
    * Destino de "Voltar ao portal". Vazio = entrada local de demonstração.
    * Não existe URL de produção confirmada; o TI deve configurá-la.
    */
   portalReturnUrl: (import.meta.env.VITE_PORTAL_RETURN_URL as string | undefined)?.trim() || null,

   /**
    * SSO para o futuro cliente HTTP (401). Sem padrão: o template apontava para o
    * login de FUNCIONÁRIO, que não se aplica ao aluno. Não é usado no modo mock.
    */
   loginUrl: (import.meta.env.VITE_LOGIN_URL as string | undefined)?.trim() || null,

   /** Catálogo de Bagagens no AVA (link fornecido pelo CX). Abre fora do módulo. */
   bagagensUrl: (import.meta.env.VITE_BAGAGENS_URL as string | undefined)?.trim() || "https://ava.anchieta.br/d2l/le/discovery/view/",

   /** Exibe o painel de demonstração (cenários, decisões simuladas, reset). */
   demoTools: readBoolean(import.meta.env.VITE_DEMO_TOOLS, true),

   /** Botão do TanStack Query Devtools (somente `vite dev`). Desligado para não cobrir a navegação nas demonstrações. */
   queryDevtools: readBoolean(import.meta.env.VITE_QUERY_DEVTOOLS, false),

   /** `true` em desenvolvimento (`vite`), `false` no build de produção. */
   isDev: import.meta.env.DEV,
} as const;
