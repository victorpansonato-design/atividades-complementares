# Arquitetura Frontend

Referência **conceitual** do template. Para o passo a passo operacional (como criar uma feature, rodar, commitar), veja [CONTRIBUTING.md](./CONTRIBUTING.md).

**Stack:** React 19 · TanStack Query v5 · React Hook Form · Zod v4 · Zustand v5 · Tailwind v4 · Vite · React Router 7.

---

## 1. O princípio central: separação de estado

Este stack só funciona bem se **cada ferramenta cuidar do que é dela**. A causa nº 1 de complexidade desnecessária em React é misturar esses domínios - em especial, espelhar dados de servidor em estado client.

| Tipo de estado                           | Ferramenta                     | Exemplos                                                  |
| ---------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| **Server state** (dados do backend)      | **React Query**                | listas, detalhes, mutations, cache, refetch, invalidation |
| **Form state** (efêmero de formulário)   | **React Hook Form + Zod**      | inputs, validação, dirty/touched, submit                  |
| **URL state** (estado na rota)           | **Router** (`useSearchParams`) | filtros, paginação, aba ativa, ordenação                  |
| **Global client state** (UI transversal) | **Zustand**                    | tema, sidebar, modais globais, wizard multi-step          |
| **Local state** (componente)             | `useState` / `useReducer`      | toggle, hover, controle de um único componente            |

> **Regra de ouro:** dado que veio do servidor mora no React Query, **nunca** no Zustand. O React Query _é_ o cache de servidor. Duplicar isso em Zustand gera dessincronização garantida.

### Matriz de decisão - "onde coloco esse estado?"

1. **Veio do backend e pode ser refetchado?** → React Query.
2. **É um formulário?** → RHF + Zod.
3. **Faz sentido estar na URL (compartilhável/bookmarkável)?** → search params do router.
4. **É UI global usada por várias telas?** → Zustand.
5. **Senão** → `useState` local.

A feature de exemplo [`src/features/users`](./src/features/users) demonstra os quatro primeiros tipos convivendo sem se misturarem.

---

## 2. Estrutura: Bulletproof React (este template)

A maior parte do código vive em `features/`. Só sobe para o nível compartilhado o que é **realmente** usado por 2+ features.

```
src/
├── routes/         # router, private-route          ─┐
├── providers/      # query-provider, etc.            │ camada APP
├── layout/         # shell autenticado/público       │ (composição, infra de tela)
├── pages/          # composição de features por rota ─┘
│
├── features/       # ⬅ a maior parte do código vive aqui
│   └── <feature>/
│       ├── api/        # queryKey factory, queries, mutations (React Query)
│       ├── components/ # componentes da feature
│       ├── hooks/      # hooks da feature (ex.: URL state)
│       ├── stores/     # stores Zustand da feature
│       ├── types/      # schemas Zod + tipos inferidos
│       └── index.ts    # API PÚBLICA do slice
│
├── components/     # ui/ (shadcn) + core/            ─┐
├── services/       # api.ts (axios pré-configurado)   │
├── lib/            # utils, helpers                    │ camada SHARED
├── stores/         # stores globais (theme)            │ (sem regra de negócio)
├── hooks/          # hooks globais (use-auth)          │
├── contexts/       # auth-context                      │
├── types/          # tipos globais                     │
└── config/         # env, constantes centralizadas    ─┘
```

### Regra de import: `app → feature → shared`

As dependências caminham de cima para baixo:

- **app** pode importar `feature` e `shared`.
- **feature** pode importar `shared` e a própria feature. **Nunca** outra feature pelo interior.
- **shared** só importa `shared`. Nunca conhece `feature` nem `app`.

Uma feature **nunca** importa o interior de outra - só a sua **API pública** (`features/<nome>/index.ts`). Isso força encapsulamento: ninguém depende de detalhes internos de um slice.

> **Arquitetura validada por lint.** Essas regras são impostas pelo `eslint-plugin-boundaries` em [`eslint.config.js`](./eslint.config.js). Um import proibido **quebra o `npm run lint`** (e o CI). Arquitetura que não é validada por lint vira convenção que ninguém segue.

---

## 3. Papel de cada ferramenta

### React Query - camada de servidor

- É o **cache** e a fonte de verdade dos dados remotos.
- Encapsule cada recurso em hooks (`useUsers`, `useCreateUser`); nunca chame `useQuery` cru espalhado nos componentes.
- Centralize as chaves por entidade numa **query key factory** (ver `userKeys`) para invalidation consistente.
- Faça **`parse` do Zod dentro da `queryFn`** - o tipo que entra na aplicação é validado em runtime.

### React Hook Form + Zod - camada de formulário

- RHF com `zodResolver` é o padrão. O schema Zod é a fonte única de validação **e** de tipos.
- `defaultValues` derivados do schema; submit tipado por `z.infer`.
- Formulário **não-controlado** por padrão (onde RHF ganha performance); `Controller` só para UI controlada.

### Zustand - estado client global

- Para UI transversal e sessão, **não** para dados de servidor.
- Prefira **múltiplas stores pequenas** por domínio a uma store monolítica.
- Consuma com **seletores** (`useStore(s => s.x)`) para evitar re-renders.

### Zod - fonte única da verdade

Defina o schema **uma vez** e derive tudo:

```
schema Zod  ──► z.infer<>           (tipos TypeScript)
            ──► zodResolver(schema) (validação RHF)
            ──► schema.parse(res)   (validação da resposta da API)
            ──► defaultValues       (estado inicial do form)
```

Nunca declare `interface User` à mão quando o Zod pode inferir.

### Tailwind - camada de estilo

- Tokens semânticos no `@theme` / `src/index.css` = design system.
- Primitivos em `components/ui` (shadcn) usando `cva` + `tailwind-merge` para variantes.

### Motion - camada de animação

- Toda animação usa [Motion](https://motion.dev) (`motion/react`); não crie keyframes CSS próprios.
- `MotionConfig reducedMotion="user"` no `main.tsx` aplica `prefers-reduced-motion` globalmente.
- A troca de estados assíncronos (loading/erro/vazio/conteúdo) passa pelo componente `AsyncState` (`components/ui/async-state`), que anima entrada e saída via `AnimatePresence` - nunca ternário manual no JSX.

---

## 4. Camada de API / dados (padrão concreto)

A referência viva é [`src/features/users/api`](./src/features/users/api). Fluxo de uma query tipada e validada:

```ts
// types/user.schema.ts - fonte única
export const UserSchema = z.object({ id: z.string(), nome: z.string(), email: z.string().email() });
export type User = z.infer<typeof UserSchema>;

// api/user.keys.ts - query key factory
export const userKeys = {
   all: ["users"] as const,
   lists: () => [...userKeys.all, "list"] as const,
   detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

// api/user.queries.ts - parse no boundary
export function useUser(id: string) {
   return useQuery({
      queryKey: userKeys.detail(id),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>(`/users/${id}`);
         return UserSchema.parse(data.data); // valida o contrato em runtime
      },
   });
}
```

**Benefício:** se o backend mudar o contrato, o erro **estoura no `parse`** (no boundary), não três telas depois com `undefined`.

> As respostas das APIs Anchieta vêm no envelope `ApiResponse<T>` (`{ success, data, message }`) - por isso o `parse` valida `data.data`.

---

## 5. Anti-padrões (o que evitar)

- **Espelhar dados de servidor no Zustand.** Use o cache do React Query.
- **Declarar tipos à mão tendo Zod.** Use `z.infer`.
- **Validar só no formulário.** Valide também a resposta da API (`schema.parse`).
- **Uma única store Zustand gigante.** Quebre em stores por domínio.
- **Pastas globais como depósito.** `components/`, `lib/`, `hooks/` viram lixeira - mantenha o código na feature.
- **Importar o interior de outra feature.** Use a API pública (`index.ts`). O lint bloqueia.
- **Lógica de fetch direto no componente.** Encapsule em hooks (`useX`).
- **Context API para estado global de alta frequência.** Causa re-render em cascata; use Zustand.

---

## 6. Quando migrar para Feature-Sliced Design (FSD)

> **Este template usa Bulletproof React** - pragmático, baixa cerimônia, entrega ~90% do valor para apps pequenos e médios. É a escolha certa para a maioria dos sistemas internos e MVPs.
>
> **Para sistemas maiores e que exigem mais robustez - produto institucional de longa duração, vários domínios, vários times, padronização entre múltiplos repositórios - a recomendação é Feature-Sliced Design (FSD).** O custo inicial de aprendizado compensa: torna a arquitetura **igual em todo repo**, auditável por lint e independente de quem escreveu - o mais próximo de um "design system de arquitetura".

O princípio (separação de estado + import unidirecional + API pública por slice) é **o mesmo** nas duas abordagens; o FSD apenas o formaliza com mais camadas e rigor.

| Escala do projeto                       | Estrutura recomendada                         |
| --------------------------------------- | --------------------------------------------- |
| MVP / app pequeno                       | Bulletproof (este template), Zustand mínimo   |
| Médio / vários domínios                 | Bulletproof com `features/` bem definidas     |
| **Grande / institucional / multi-time** | **Feature-Sliced Design + ESLint boundaries** |

### Camadas do FSD

O FSD organiza por camadas com import estritamente unidirecional (uma camada só importa das **abaixo**):

```
app → pages → widgets → features → entities → shared
```

```
src/
├── app/        # init, providers, router, estilos globais
├── pages/      # páginas (composição de widgets e features)
├── widgets/    # blocos de UI compostos e independentes (Header, Sidebar)
├── features/   # interações que entregam valor (login, add-to-cart, filtro)
├── entities/   # entidades de negócio (user, product, invoice)
└── shared/     # código sem regra de negócio (ui-kit, libs, config)
```

Dentro de cada slice, divide-se por **segmentos**: `ui/`, `model/` (store, lógica), `api/`, `lib/` e `index.ts` (API pública).

### Mapeamento mental: Bulletproof (aqui) → FSD

| Aqui (Bulletproof)                                                | Equivalente em FSD                             |
| ----------------------------------------------------------------- | ---------------------------------------------- |
| `routes/`, `providers/`                                           | `app/`                                         |
| `pages/`                                                          | `pages/`                                       |
| `layout/`                                                         | `widgets/`                                     |
| `features/<x>` (api/components/hooks/stores/types)                | `features/<x>` + `entities/<x>` (ui/model/api) |
| `components/`, `services/`, `lib/`, `config/`, `hooks/`, `types/` | `shared/`                                      |

A diferença principal ao migrar é **separar `features` de `entities`** (a entidade de negócio e seus dados vs. a interação que entrega valor) e introduzir `widgets`. O `eslint-plugin-boundaries` já usado aqui suporta a regra de camadas do FSD - basta redefinir `boundaries/elements`.

---

## 7. Antes de produção - confira a doc da versão fixada

As APIs evoluem rápido; confirme contra a doc da versão em uso:

- **TanStack Query v5** - object form de `useQuery`/`useMutation`, `queryOptions`.
- **@hookform/resolvers** - `zodResolver` e compatibilidade com a major do Zod.
- **Zod v4** - diferenças de API frente à v3.
- **Zustand v5** - `create`, middleware (`persist`), seletores.
