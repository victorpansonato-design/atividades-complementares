# Como desenvolver neste projeto

Guia **operacional**. Para o _porquê_ das decisões de arquitetura, leia [ARCHITECTURE.md](./ARCHITECTURE.md). Para convenções e evolução dos testes, leia [TESTING.md](./TESTING.md).

---

## Setup

```bash
npm install
npm run setup       # renomeia o template para o seu projeto (base path, URLs, proxy). Rode UMA vez.
npm run dev
```

> Rode `npm run setup` **antes de escrever código** - ele ajusta nome, base path e URLs em todos os lugares. Começar antes significa refazer ajustes depois.

---

## Fluxo: criar uma nova feature

Toda funcionalidade de domínio vive em `src/features/<nome>/`. Crie a estrutura do slice:

```
src/features/<nome>/
├── api/        # user.keys.ts (query key factory), user.queries.ts, user.mutations.ts
├── components/ # componentes da feature
├── hooks/      # hooks da feature
├── stores/     # stores Zustand da feature (UI transversal)
├── types/      # <nome>.schema.ts (Zod) + tipos inferidos
└── index.ts    # API PÚBLICA: exporta só o que outras camadas podem usar
```

Use [`src/features/users`](./src/features/users) como molde - é uma feature de exemplo completa e funcional.

**Ordem recomendada:**

1. **Schema Zod primeiro** (`types/<nome>.schema.ts`). É a fonte única de tipos e validação. Derive tudo dele com `z.infer`.
2. **Camada de API** (`api/`): a query key factory, depois queries/mutations - sempre com `schema.parse()` dentro da `queryFn`.
3. **Componentes** (`components/`): consomem os hooks; compõem primitivos de `components/ui`. Estados de loading/erro/vazio ficam dentro de `<AsyncState>` (`components/ui/async-state`) - nunca ternário manual.
4. **Estado**: filtro/paginação na URL (`useSearchParams`); UI transversal em store Zustand; resto local (`useState`).
5. **API pública** (`index.ts`): exporte apenas componentes, hooks e tipos que outras camadas precisam. **Não** reexporte o interior.
6. **Testes** (`tests/`): espelhe o caminho de `src/` e proteja as regras e os comportamentos observáveis introduzidos pela feature.

**Wire-up da feature:**

- Crie a página em `src/pages/protected/<nome>.tsx` (ou `public/`) compondo a feature pela API pública.
- Registre a rota em [`src/routes/app.routes.tsx`](./src/routes/app.routes.tsx).
- Adicione o item de menu em [`src/layout/app-sidebar.tsx`](./src/layout/app-sidebar.tsx).

---

## Regras de import entre camadas

`app → feature → shared` (de cima para baixo). Resumo:

| De \ Pode importar                                                             | app |               feature                | shared |
| ------------------------------------------------------------------------------ | :-: | :----------------------------------: | :----: |
| **app** (routes, providers, layout, pages)                                     | ✅  |         ✅ (via `index.ts`)          |   ✅   |
| **feature**                                                                    | ❌  | própria ✅ / outra só via `index.ts` |   ✅   |
| **shared** (components, services, lib, stores, hooks, contexts, types, config) | ❌  |                  ❌                  |   ✅   |

**Por quê:** isso mantém `shared` reutilizável (não conhece negócio) e os slices desacoplados (não dependem de detalhes internos uns dos outros). **O ESLint força essas regras** (`eslint-plugin-boundaries`): um import proibido quebra o `npm run lint` e o CI. Importar outra feature? Só pela API pública (`@/features/<nome>`).

Onde mora cada estado: veja a [matriz de decisão no ARCHITECTURE.md](./ARCHITECTURE.md#matriz-de-decisão--onde-coloco-esse-estado).

---

## Convenções

- **Arquivos e pastas:** `kebab-case` (`user-list.tsx`, `use-user-filters.ts`).
- **Componentes:** `PascalCase`. **Hooks:** começam com `use`.
- **Schemas:** sufixo `.schema.ts`. **Serviços:** `.service.ts`. **Stores:** `.store.ts`. **Rotas:** `.routes.tsx`.
- **Tipos:** derive de Zod com `z.infer`. **Não** declare `interface`/`type` à mão quando o schema já cobre o contrato.
- **Variáveis de ambiente:** leia sempre via [`src/config/env.ts`](./src/config/env.ts), nunca `import.meta.env` espalhado.
- **Componentes `shadcn`** ficam em `components/ui` e são tratados como código vendido - não reformate (estão no `.prettierignore`).
- **Estados assíncronos:** use `<AsyncState>` para loading/erro/vazio/conteúdo. **Animações** novas usam Motion (`motion/react`); o `MotionConfig` global do `main.tsx` já trata `prefers-reduced-motion`.

---

## Testes

- Testes unitários ficam em `tests/unit/`; testes de componentes, em `tests/components/`.
- Nomeie arquivos como `*.test.ts` ou `*.test.tsx` e espelhe o caminho do arquivo em `src/`.
- Prefira comportamento observável a detalhes de implementação e use mocks somente em fronteiras externas.
- Rode `npm test` durante o desenvolvimento e `npm run test:coverage` quando precisar analisar lacunas.

Consulte [TESTING.md](./TESTING.md) para exemplos, prioridade de consultas, providers compartilhados e critérios para adicionar MSW, Playwright ou metas de cobertura.

---

## Qualidade antes do PR

Rode (e garanta que passam):

```bash
npm test            # Vitest em execução única
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (inclui as regras de camada)
npm run format      # prettier --check  (use format:fix para corrigir)
npm run build       # build de produção
```

---

## Commits

Conventional Commits em **pt-BR**, seguindo o histórico do repo:

```
feat(users): adicionar listagem com filtro por URL
fix(auth): corrigir redirect pós-logout
docs(architecture): explicar quando migrar para FSD
refactor(config): centralizar leitura de env
```

Tipos comuns: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`. O escopo entre parênteses costuma ser a feature ou a camada afetada.
