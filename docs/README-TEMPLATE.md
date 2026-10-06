# Template React

Template base para aplicações React corporativas da Anchieta, construído como SPA com autenticação integrada à Intranet, rotas protegidas, layout autenticado com sidebar, camada HTTP centralizada, cache de dados com TanStack Query e design system baseado em Tailwind CSS v4 + shadcn/ui.

O projeto serve como ponto de partida para sistemas internos que precisam de uma estrutura previsível, escalável e simples de evoluir. A arquitetura atual separa responsabilidades por camada, mantém a infraestrutura isolada dos componentes de tela e prioriza composição de UI sobre implementação manual de componentes.

---

## Visão Geral

Este template não implementa login próprio. A autenticação é delegada ao SSO. O frontend consulta a API em `/funcionarios/me` usando cookies de sessão. Quando não há sessão válida, a API responde `401` e o interceptor HTTP redireciona o usuário para a URL de login do SSO (configurada em `VITE_LOGIN_URL`) - que, após autenticar, traz o usuário de volta ao app por conta própria.

O shell autenticado é composto por:

- `MainLayout`, responsável pela estrutura principal da área logada.
- `AppSidebar`, responsável pelo menu lateral, identidade visual do app e menu do usuário.
- `PrivateRoute`, responsável por bloquear rotas internas quando não há usuário autenticado.
- `AuthProvider`, responsável por carregar e expor o usuário atual.
- `QueryProvider`, responsável por configurar cache, retry e Devtools do TanStack Query.

A aplicação foi desenhada para crescer por módulos e domínios, mantendo as integrações externas em `services`, o estado global em `contexts`, as rotas em `routes` e as páginas em `pages`.

---

## Stack Atual

| Área            | Tecnologia               | Papel no projeto                                                           |
| --------------- | ------------------------ | -------------------------------------------------------------------------- |
| Build           | Vite                     | Servidor de desenvolvimento, build de produção e configuração de base path |
| UI              | React 19                 | Renderização da interface                                                  |
| Linguagem       | TypeScript               | Tipagem estática e contratos entre camadas                                 |
| Rotas           | React Router DOM 7       | Roteamento público, protegido e fallback                                   |
| Data fetching   | TanStack Query 5         | Cache, retry, revalidação e estado assíncrono                              |
| HTTP            | Axios                    | Cliente HTTP centralizado com interceptors                                 |
| Estilos         | Tailwind CSS v4          | Utilitários, tokens e tema global                                          |
| Componentes     | shadcn/ui                | Componentes versionados dentro do próprio projeto                          |
| Primitivos UI   | Radix UI                 | Base acessível para componentes interativos                                |
| Ícones          | lucide-react             | Ícones funcionais da interface                                             |
| Toasts          | Sonner                   | Feedback de erros e ações                                                  |
| Animações       | Motion (`motion/react`)  | Transição animada de estados assíncronos, entrada de páginas e sidebar     |
| Formulários     | React Hook Form          | Form state com `zodResolver` (ver feature `users`)                         |
| Validação       | Zod                      | Fonte única de tipos e validação (schema → tipos, form e resposta da API)  |
| Estado global   | Zustand                  | Estado client de UI transversal (tema; UI por feature)                     |
| Testes          | Vitest + Testing Library | Testes unitários e de componentes em ambiente jsdom                        |
| Qualidade       | ESLint + Prettier + TS   | Regras estáticas, formatação e regras de camada (eslint-plugin-boundaries) |
| Build otimizado | Terser + manual chunks   | Minificação, remoção de logs e separação de vendors                        |

---

## Estrutura Atual de Pastas

O projeto segue **arquitetura por features (Bulletproof React)**: a maior parte do código vive em `src/features/`, e o nível compartilhado (`components`, `services`, `lib`, etc.) guarda só o que é usado por 2+ features. As camadas são `app → feature → shared`, com a regra de import validada por lint.

```text
.
├── src/
│   ├── routes/         # router, private-route          ─┐
│   ├── providers/      # query-provider                  │ camada APP
│   ├── layout/         # shell autenticado, sidebar       │
│   ├── pages/          # composição de features por rota  │
│   │   ├── protected/  #   home.tsx, users.tsx           ─┘
│   │   └── public/
│   │
│   ├── features/       # ⬅ a maior parte do código vive aqui
│   │   └── users/      #   feature de EXEMPLO (referência viva)
│   │       ├── api/        # user.keys / user.queries / user.mutations
│   │       ├── components/ # user-list, user-form
│   │       ├── hooks/      # use-user-filters (URL state)
│   │       ├── stores/     # users-ui.store (Zustand)
│   │       ├── types/      # user.schema (Zod) → tipos
│   │       └── index.ts    # API pública do slice
│   │
│   ├── components/     # ui/ (shadcn) + core/             ─┐
│   ├── services/       # api.ts (axios), auth.service      │
│   ├── lib/            # utils                              │ camada SHARED
│   ├── stores/         # theme.store (global)              │
│   ├── hooks/          # use-auth, use-mobile              │
│   ├── contexts/       # auth-context                       │
│   ├── types/          # auth.types (global)               │
│   ├── config/         # env.ts (leitura tipada de env)    ─┘
│   ├── index.css
│   └── main.tsx
│
├── tests/               # testes unitários e de componentes; espelha src/
│   ├── setup.ts        # jest-dom e limpeza global
│   ├── unit/
│   └── components/
│
├── ARCHITECTURE.md     # referência conceitual da arquitetura
├── CONTRIBUTING.md     # como desenvolver (fluxo de feature, regras, commits)
├── TESTING.md          # como escrever e evoluir os testes
├── .prettierrc / .prettierignore
├── eslint.config.js    # inclui as regras de camada (eslint-plugin-boundaries)
├── components.json
├── package.json
└── vite.config.ts
```

> **Comece por aqui:** [ARCHITECTURE.md](./ARCHITECTURE.md) explica o _porquê_ (separação de estado, camadas, padrão da API, quando migrar para FSD). [CONTRIBUTING.md](./CONTRIBUTING.md) explica o _como_ (criar uma feature, regras de import, qualidade, commits). [TESTING.md](./TESTING.md) define como escrever e evoluir os testes.

---

## Arquitetura

### Estilo arquitetural

> Esta seção é um resumo. A referência conceitual completa - separação de estado, papel de cada ferramenta, padrão da camada de API e **quando migrar para Feature-Sliced Design (FSD)** - está em **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

O projeto segue **arquitetura por features (Bulletproof React)** com separação estrita das camadas de estado (server = React Query, form = RHF + Zod, url = router, global = Zustand, local = `useState`). A regra de import entre camadas (`app → feature → shared`) é **validada por lint** via `eslint-plugin-boundaries`. A ideia principal é manter a UI dependente de contratos e serviços bem definidos, sem espalhar detalhes de API, sessão, navegação externa ou infraestrutura pelas páginas.

As dependências caminham de fora para dentro:

- `main.tsx` monta a aplicação e compõe os providers.
- `routes` decide quais páginas entram em cada fluxo.
- `layout` fornece o shell visual das rotas autenticadas.
- `pages` renderizam experiências de usuário e orquestram componentes.
- `hooks` expõem acesso controlado a estados e contextos.
- `contexts` guardam estado global de aplicação.
- `services` concentram comunicação externa.
- `types` formalizam contratos compartilhados.
- `components/ui` contém componentes de design system.
- `lib` guarda utilitários genéricos e pequenos helpers.

Essa separação evita que uma tela saiba detalhes sobre interceptors Axios, política de retry, cálculo de URL da Intranet ou estrutura interna do contexto de autenticação.

### Camadas e responsabilidades

| Camada        | Diretório           | Responsabilidade                                    |
| ------------- | ------------------- | --------------------------------------------------- |
| Bootstrap     | `src/main.tsx`      | Montar React, StrictMode e providers globais        |
| Providers     | `src/providers`     | Configurar bibliotecas transversais da aplicação    |
| Roteamento    | `src/routes`        | Declarar rotas, guards e fallback                   |
| Layout        | `src/layout`        | Definir shell autenticado, sidebar, header e outlet |
| Páginas       | `src/pages`         | Compor views públicas e protegidas                  |
| Estado global | `src/contexts`      | Centralizar estado compartilhado de aplicação       |
| Hooks         | `src/hooks`         | Expor APIs reutilizáveis para componentes           |
| Serviços      | `src/services`      | Isolar chamadas HTTP e tratamento de erro           |
| Tipos         | `src/types`         | Definir contratos globais de domínio/frontend       |
| UI base       | `src/components/ui` | Componentes shadcn/ui instalados no projeto         |
| Utilitários   | `src/lib`           | Funções reutilizáveis independentes de domínio      |
| Configuração  | `src/config`        | Constantes de configuração em runtime               |

### Padrão para novas features

Toda funcionalidade de domínio vive em `src/features/<nome>/`, com os segmentos `api/`, `components/`, `hooks/`, `stores/`, `types/` e um `index.ts` que é a **API pública** do slice. A feature [`src/features/users`](./src/features/users) é uma referência viva, completa e funcional - use-a como molde.

O passo a passo detalhado (ordem de criação, wire-up de rota/menu, regras de import) está em **[CONTRIBUTING.md](./CONTRIBUTING.md)**. Em resumo:

- Defina o **schema Zod primeiro** (fonte única de tipos e validação).
- Encapsule dados de servidor em hooks do React Query (`api/`), com `schema.parse()` na `queryFn`.
- Exponha só o necessário pelo `index.ts`; **nunca** importe o interior de outra feature (o lint bloqueia).
- Componha primitivos de `components/ui`; mantenha esse diretório reservado ao shadcn/ui.
- Registre a rota em `src/routes/app.routes.tsx` e o item de menu em `src/layout/app-sidebar.tsx`.

---

## Bootstrap da Aplicação

O ponto de entrada é `src/main.tsx`.

A árvore de providers atual é:

1. `StrictMode`
2. `MotionConfig` (`reducedMotion="user"`)
3. `QueryProvider`
4. `AuthProvider`
5. `AppRoute`

Essa ordem é importante:

- `MotionConfig` faz todas as animações do Motion respeitarem o `prefers-reduced-motion` do sistema automaticamente, sem tratamento caso a caso.
- `AuthProvider` usa TanStack Query, portanto precisa estar dentro de `QueryProvider`.
- As rotas dependem de autenticação, portanto ficam dentro de `AuthProvider`.
- Páginas e layouts acessam o usuário via `useAuth`.

---

## Roteamento

As rotas estão centralizadas em `src/routes/app.routes.tsx`.

| Path         | Tipo      | Componente      | Comportamento                                                        |
| ------------ | --------- | --------------- | -------------------------------------------------------------------- |
| `/`          | Redirect  | `Navigate`      | Redireciona para `/dashboard`; sem sessão, o interceptor leva ao SSO |
| `/dashboard` | Protegida | `ProtectedHome` | Página inicial da área autenticada dentro de `MainLayout`            |
| `*`          | Fallback  | `Navigate`      | Qualquer rota desconhecida volta para `/dashboard`                   |

O `BrowserRouter` usa `basename` vindo de `VITE_BASE_URL`. Se a variável não existir, o fallback atual é `/template/`.

Rotas protegidas ficam dentro de `PrivateRoute` e `MainLayout`. Isso mantém a checagem de autenticação e o shell visual fora das páginas de negócio.

---

## Autenticação

### Modelo atual

A autenticação atual é baseada em sessão de SSO (cookie), não em token local.

Não há:

- rota `/login` no frontend;
- formulário de login próprio;
- página pública/landing com botão `Entrar`;
- armazenamento de token em `localStorage`;
- interceptor adicionando `Authorization`.

Há:

- redirecionamento automático ao SSO via `VITE_LOGIN_URL` quando não autenticado;
- chamada `GET /funcionarios/me` para resolver o usuário atual;
- envio de cookies com `withCredentials: true`;
- logout via `POST /logout`;
- limpeza do cache do TanStack Query no logout;
- retorno para o base path da aplicação após sair.

### Fluxo de entrada

1. O usuário acessa qualquer rota (ex.: `/` redireciona para `/dashboard`).
2. `AuthProvider` consulta `GET /funcionarios/me`.
3. Se já existe sessão válida, o usuário é resolvido e as rotas protegidas são liberadas.
4. Se não há sessão, a API responde `401`.
5. O interceptor em `src/services/api.ts` redireciona via `window.location.href = VITE_LOGIN_URL`.
6. O SSO autentica o usuário fora deste frontend e retorna ao app por conta própria.
7. Com a sessão válida, `AuthProvider` resolve `/funcionarios/me` e libera o app.

### Fluxo de proteção

`PrivateRoute` consome `useAuth`.

- Enquanto a autenticação está carregando, ele exibe um loader.
- Se não há usuário, o interceptor de `api.ts` já disparou o redirect ao SSO; `PrivateRoute` mantém o loader durante a navegação.
- Se há usuário autenticado, ele renderiza o `Outlet`.

### Fluxo de logout

O logout é exposto por `useAuth` e chamado pelo menu de usuário na sidebar.

O fluxo atual:

1. Chama `POST /logout`.
2. Limpa todo o cache do TanStack Query.
3. Redireciona para `VITE_BASE_URL` ou `/template/`.
4. Em caso de erro, usa `handleApiError` para exibir toast via Sonner.

### Contrato de usuário

O usuário autenticado atual possui:

| Campo     | Obrigatório | Descrição                                        |
| --------- | ----------- | ------------------------------------------------ |
| `usuario` | Sim         | Identificador do usuário                         |
| `nome`    | Sim         | Nome exibido no header e menu                    |
| `email`   | Sim         | E-mail exibido na sidebar                        |
| `setor`   | Não         | Setor exibido no header e menu quando disponível |

---

## Camada HTTP

O cliente HTTP central está em `src/services/api.ts`.

Configuração atual:

- `baseURL`: `VITE_API_URL` ou `http://localhost:3000/api/`.
- `timeout`: 5000 ms.
- `withCredentials`: `true`.
- Headers padrão para JSON.
- Interceptor de request com metadado de início da requisição.
- Interceptor de response com logs detalhados em desenvolvimento.
- Normalização de erro com `statusCode` e `responseData`.
- Helper `handleApiError` para mensagens de erro e toast.

### Convenção de resposta

Respostas de sucesso seguem o tipo genérico `ApiResponse<T>`:

| Campo     | Descrição                  |
| --------- | -------------------------- |
| `success` | Indica sucesso da operação |
| `data`    | Payload tipado da resposta |
| `message` | Mensagem opcional da API   |

Erros seguem `ApiErrorResponse`:

| Campo           | Descrição                                  |
| --------------- | ------------------------------------------ |
| `success`       | Sempre `false`                             |
| `error.code`    | Código interno do erro                     |
| `error.message` | Mensagem legível                           |
| `debug.file`    | Arquivo de origem, quando enviado pela API |
| `debug.line`    | Linha de origem, quando enviada pela API   |
| `debug.trace`   | Trace opcional em desenvolvimento          |

### Serviços por domínio

`auth.service.ts` é o serviço de autenticação atual. Ele encapsula:

- carregamento do usuário autenticado;
- envio da URL de destino para a API;
- logout.

Novas integrações devem seguir o mesmo padrão: a página ou hook não deve montar URLs, conhecer endpoints espalhados ou tratar detalhes de Axios diretamente.

---

## TanStack Query

`QueryProvider` cria o `QueryClient` com defaults globais.

Configuração atual para queries:

- `staleTime`: 5 minutos.
- `gcTime`: 10 minutos.
- `retry`: até uma nova tentativa.
- Sem retry para erros HTTP 400, 401, 403, 404 e 422.
- `retryDelay`: 500 ms.
- `refetchOnWindowFocus`: `false`.

Configuração atual para mutations:

- retry limitado a uma nova tentativa.
- sem retry para 400, 401, 403, 404 e 422.

Em desenvolvimento, o projeto exibe `ReactQueryDevtools` no canto inferior esquerdo.

O usuário autenticado tem configuração especial em `AuthProvider`:

- `queryKey`: `["authUser"]`;
- `staleTime`: infinito;
- `gcTime`: infinito.

Essa decisão evita revalidações inesperadas da sessão durante a navegação. O cache é limpo explicitamente no logout.

---

## Layout Autenticado

`MainLayout` define o shell das rotas protegidas.

Elementos atuais:

- `SidebarProvider` como contexto da sidebar.
- `AppSidebar` como navegação lateral.
- `SidebarInset` como área principal.
- Header fixo no topo com blur e borda.
- `SidebarTrigger` para expandir/recolher o menu.
- Nome do app no header.
- Dados do usuário no canto direito em telas `sm` ou maiores.
- Conteúdo principal centralizado com padding responsivo.
- Largura máxima configurada via classe utilitária.
- Conteúdo do `Outlet` com animação de entrada (fade + deslize) a cada navegação, via `motion.div` com `key={pathname}`.

Esse layout deve ser mantido como infraestrutura visual. Páginas de negócio devem renderizar dentro do `Outlet`, sem recriar header, sidebar ou wrappers globais.

---

## Sidebar e Navegação

`AppSidebar` usa o componente `Sidebar` do shadcn/ui e organiza:

- cabeçalho com identidade do app;
- menu principal;
- suporte a itens simples;
- suporte a grupos colapsáveis;
- estado ativo baseado em `useLocation`;
- rodapé com avatar e menu do usuário;
- ação de logout;
- comportamento colapsável por ícone;
- animação de entrada do conteúdo (fade + deslize da esquerda) no primeiro carregamento, via Motion.

O menu atual possui `Painel` e `Usuários`.

Quando novas rotas forem adicionadas, a navegação deve continuar centralizada na sidebar. Se o menu crescer, a melhor evolução é extrair os itens para `src/config/navigation.ts` ou um arquivo dedicado em `src/config`, mantendo `AppSidebar` focada em renderização.

---

## Design System

### shadcn/ui

O projeto usa shadcn/ui com componentes versionados dentro de `src/components/ui`.

Configuração atual em `components.json`:

| Configuração         | Valor             |
| -------------------- | ----------------- |
| Estilo               | `new-york`        |
| RSC                  | `false`           |
| TSX                  | `true`            |
| Tailwind CSS         | `src/index.css`   |
| Base color           | `neutral`         |
| CSS variables        | habilitado        |
| Icon library         | `lucide`          |
| Alias de componentes | `@/components`    |
| Alias de UI          | `@/components/ui` |
| Alias de utils       | `@/lib/utils`     |
| Alias de hooks       | `@/hooks`         |
| Registry customizado | `@anchieta`       |

### Registry `@anchieta`

O `components.json` registra um registry interno chamado `@anchieta`, apontando para `https://app.anchieta.br/design-system/public/r/{name}.json`.

Esse registry conecta o projeto ao design system corporativo da Anchieta dentro do fluxo do shadcn/ui. Na prática, ele permite que componentes, blocos ou padrões publicados pelo design system interno sejam adicionados ao projeto pelo CLI do shadcn usando o namespace `@anchieta`.

O papel do `@anchieta` neste template é:

- priorizar componentes alinhados ao padrão visual institucional;
- reduzir criação manual de UI quando já existe solução no design system interno;
- manter consistência entre sistemas Anchieta;
- permitir distribuição de componentes como código-fonte versionado dentro do projeto;
- evitar dependência direta de uma biblioteca fechada em runtime;
- facilitar revisão, adaptação e manutenção local depois que o componente é instalado.

Regra prática: quando houver necessidade de um componente, bloco de tela ou padrão visual que pode existir no design system Anchieta, procure primeiro no registry `@anchieta`. Se não existir, use os componentes shadcn já instalados ou avalie outro registry explicitamente.

Componentes adicionados por registry passam a fazer parte do repositório. Depois de adicionados, eles devem ser tratados como código local:

- revisar os arquivos gerados antes de usar em produção;
- conferir imports e aliases para garantir compatibilidade com `@/components`, `@/components/ui`, `@/lib/utils` e `@/hooks`;
- preservar tokens semânticos do tema atual;
- remover estilos hardcoded quando houver token equivalente;
- validar acessibilidade e composição dos componentes Radix/shadcn;
- evitar sobrescrever componentes já customizados sem comparar diferenças;
- manter componentes de design system em `src/components/ui` quando forem base;
- manter componentes de domínio fora de `src/components/ui`.

O registry deve ser usado de forma explícita. Não assuma que todo componente vem do `@anchieta`, do shadcn oficial ou de outro registry. A origem precisa estar clara para evitar misturar padrões visuais diferentes no mesmo produto.

Atualizações futuras de componentes vindos do `@anchieta` devem seguir o mesmo cuidado de qualquer atualização shadcn: verificar o que será alterado, comparar com customizações locais e só então aplicar a mudança. Como o componente instalado vira código do projeto, o registry não atualiza a aplicação automaticamente.

Componentes shadcn instalados atualmente:

- `avatar`
- `button`
- `card`
- `collapsible`
- `dropdown-menu`
- `input`
- `label`
- `separator`
- `sheet`
- `sidebar`
- `skeleton`
- `tooltip`

### Regra para componentes

`src/components/ui` é a camada de componentes base. Ela deve conter apenas componentes de design system, normalmente adicionados ou atualizados via shadcn. O template também mantém ali alguns componentes base próprios (ex.: `empty-state`, `async-state`) por serem primitivos de design system, mesmo sem origem shadcn.

Componentes específicos de domínio devem ficar fora de `components/ui`. Exemplos:

- componentes de uma tela específica podem ficar perto da página;
- componentes reutilizáveis de um domínio podem ficar em uma pasta própria do domínio;
- componentes compartilhados que não são shadcn podem ficar em `src/components`, mas não dentro de `ui`.

### Composição visual

O padrão atual privilegia composição:

- `Card` para blocos de conteúdo e métricas.
- `Sidebar` para navegação persistente.
- `DropdownMenu` para ações do usuário.
- `Avatar` para identificação.
- `Separator` para divisões estruturais.
- `Button` para ações claras.
- `Skeleton` para estados de carregamento (dentro de `AsyncState`).
- `EmptyState` para estados vazios e de erro (dentro de `AsyncState`).
- `Tooltip` quando ações icônicas precisarem de descrição.

Evite criar marcação visual manual quando um componente shadcn existente resolver o problema.

---

## Tema e Tokens

O tema global fica em `src/index.css`.

O projeto usa Tailwind CSS v4 com:

- `@import "tailwindcss"`;
- `@import "tw-animate-css"`;
- `@theme inline`;
- tokens CSS em `:root`;
- variante customizada para dark mode;
- tokens específicos de sidebar;
- fonte `Geist`;
- fonte mono `Geist Mono`;
- tokens semânticos para background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input e ring.

### Paleta

A paleta principal usa OKLCH e é centrada em tons neutros com primary azul corporativo. Há tokens adicionais para:

- gráficos;
- sidebar;
- escala de cinza;
- sombras;
- estados semânticos como sucesso e danger background.

### Dark mode

Existe bloco `.dark` com tokens escuros para todos os principais papéis visuais. A ativação do tema escuro não está ligada a um provider dedicado neste template, mas a base de tokens já existe.

### Regras de estilo

Ao evoluir a UI:

- use tokens semânticos (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`);
- evite cores hardcoded quando houver token equivalente;
- preserve a escala de raio baseada em `--radius`;
- use `cn()` para composição condicional de classes;
- prefira `gap` para espaçamento entre elementos;
- mantenha componentes shadcn customizados por composição, não por reescrita desnecessária;
- preserve acessibilidade dos componentes Radix/shadcn.

---

## Utilitários e Hooks

### `cn`

`src/lib/utils.ts` expõe `cn`, que combina `clsx` com `tailwind-merge`.

Use esse helper para:

- classes condicionais;
- extensão de componentes;
- composição de variantes;
- evitar conflitos entre utilitários Tailwind.

### `useAuth`

`src/hooks/use-auth.ts` encapsula o acesso ao `AuthContext`.

Ele garante que componentes consumam autenticação somente dentro de `AuthProvider`. Se usado fora do provider, lança erro explícito.

### `useIsMobile`

`src/hooks/use-mobile.ts` expõe detecção responsiva baseada em `useSyncExternalStore` e `matchMedia`.

O breakpoint atual é 768 px.

---

## Configuração de Ambiente

Arquivo de referência: `.env.example`.

| Variável         | Exemplo                                            | Uso                                                                                                                                                             |
| ---------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_BASE_URL`  | `/template/`                                       | Base path do Vite e do React Router                                                                                                                             |
| `VITE_API_URL`   | `/template/api/v1/`                                | URL base usada pelo Axios. Mantenha **relativa** para que o proxy de dev atue (ver seção "Proxy de desenvolvimento").                                           |
| `VITE_LOGIN_URL` | `/intranet/intranet/build/index.html#/funcionario` | URL do SSO para onde o interceptor redireciona no `401`. Em dev, use absoluta para o backend (`http://localhost/intranet/...`); em prod, relativa (mesmo host). |
| `DEV`            | `true`                                             | Variável validada no pipeline de review; o código cliente usa o modo nativo `import.meta.env.DEV`                                                               |

Regras importantes:

- Variáveis usadas pelo frontend precisam começar com `VITE_`.
- `VITE_BASE_URL` deve terminar com `/`.
- Em produção, o pipeline define `VITE_BASE_URL` como `/${CI_PROJECT_NAME}/`.
- Em review apps, o pipeline define `VITE_BASE_URL` como `/${CI_PROJECT_NAME}/${CI_COMMIT_REF_SLUG}/`.
- O fallback local do app continua sendo `/template/`.

---

## Build e Vite

`vite.config.ts` concentra as decisões de build.

Configuração atual:

- Plugin React.
- Plugin Tailwind CSS v4.
- Alias `@` apontando para `./src`.
- `base` vindo de `VITE_BASE_URL` com fallback `/template/`.
- Saída de build em `build`.
- Minificação com `terser`.
- Remoção de `console.log`, `console.debug`, `console.info` e `alert` no build.
- Remoção de comentários no bundle minificado.
- Tree shaking configurado no Rollup.
- Separação manual de chunks de vendor.
- Proxy de desenvolvimento para `/template/api/v1` (apenas em `npm run dev`).

Chunks manuais atuais:

| Chunk          | Bibliotecas                                                        |
| -------------- | ------------------------------------------------------------------ |
| `vendor-react` | React, React DOM, React Router                                     |
| `vendor-form`  | React Hook Form, resolvers, Zod                                    |
| `vendor-ui`    | TanStack Query, Radix, lucide, shadcn helpers, Sonner e libs de UI |
| `vendor-utils` | Axios e utilitários previstos                                      |

Algumas bibliotecas listadas nos chunks podem não estar em uso direto no template inicial, mas a configuração já prepara o bundle para crescimento comum de aplicações internas.

### Proxy de desenvolvimento

`vite.config.ts` define um proxy em `server.proxy` que atua somente durante `npm run dev`. Essa configuração não vai para o bundle e não tem nenhum efeito em produção.

A configuração atual encaminha todas as requisições iniciadas com `/template/api/v1` para `http://localhost`

O objetivo é contornar CORS em desenvolvimento. O frontend roda em `localhost:5173` e, sem o proxy, chamadas diretas à API em outra origem seriam bloqueadas pelo navegador. Com o proxy, o navegador enxerga a mesma origem e o Vite repassa a requisição ao backend nos bastidores.

> **Importante:** o proxy só funciona se `VITE_API_URL` for **relativo** (ex.: `/template/api/v1/`). Uma URL absoluta (`http://localhost/template/api/v1/`) faz o navegador chamar o backend diretamente, ignorando o proxy e reintroduzindo o CORS - quebrando o fluxo de login SSO (redirect a `localhost:80` e retorno a `localhost:5173`). A URL relativa também é a correta em produção, pois o frontend é servido pelo mesmo host do backend.

Pontos importantes:

- `changeOrigin: true` reescreve o header `Host` para o host do target. O retorno pós-login é governado pelo parâmetro `destination` (a URL em `:5173`), não pelo header `Host`, então o usuário volta corretamente ao dev server.
- `secure: false` ignora validação de certificado TLS.
- Em produção, esse roteamento é responsabilidade do servidor real (Apache/Nginx), não do Vite.

O prefixo `/template/api/v1` está acoplado ao base path padrão do template. Ao criar um novo projeto, ele deve ser ajustado junto com `VITE_BASE_URL` e `VITE_API_URL`, normalmente para `/${nome-do-projeto}/api/v1`.

---

## Scripts

Scripts atuais do `package.json`:

| Script                  | Função                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run setup`         | Configura um novo projeto a partir do template: nome, base path, URLs, proxy e arquivos de ambiente |
| `npm run dev`           | Inicia o Vite em modo desenvolvimento                                                               |
| `npm run build`         | Gera build em `build/`                                                                              |
| `npm test`              | Executa os testes uma vez                                                                           |
| `npm run test:watch`    | Executa os testes em modo interativo                                                                |
| `npm run test:coverage` | Gera cobertura no terminal e em `coverage/`                                                         |
| `npm run typecheck`     | Executa TypeScript sem emitir arquivos                                                              |
| `npm run lint`          | Executa ESLint                                                                                      |
| `npm run lint:fix`      | Executa ESLint com correção automática                                                              |
| `npm run format`        | Executa verificação de formatação com Prettier                                                      |
| `npm run format:fix`    | Executa formatação com Prettier                                                                     |
| `npm run preview`       | Serve o build localmente via Vite                                                                   |

Observação: o Prettier está declarado como dependência de desenvolvimento. A configuração fica em `.prettierrc` (3 espaços, aspas duplas, ponto-e-vírgula, `printWidth` 140); o `.prettierignore` exclui `build`, dependências e `src/components/ui` (código vendido pelo shadcn, mantido no estilo original do registry).

---

## TypeScript e Qualidade

O projeto usa TypeScript em modo estrito.

Configurações importantes:

- `target` da aplicação em ES2022.
- `target` de tooling em ES2023.
- `moduleResolution` em modo `bundler`.
- JSX com `react-jsx`.
- `strict` habilitado.
- `noUnusedLocals` habilitado.
- `noUnusedParameters` habilitado.
- `noFallthroughCasesInSwitch` habilitado.
- `noUncheckedSideEffectImports` habilitado.
- `erasableSyntaxOnly` habilitado.
- alias `@/*` apontando para `src/*`.

ESLint usa:

- regras recomendadas do JavaScript;
- regras recomendadas do TypeScript ESLint;
- regras de React Hooks;
- regra de React Refresh com `allowConstantExport`.

Antes de abrir merge request, rode pelo menos:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run build`

As convenções, os exemplos e o caminho de evolução da infraestrutura estão em [TESTING.md](./TESTING.md).

---

## CI/CD GitLab

O pipeline está em `.gitlab-ci.yml`.

Stages atuais:

1. `prepare`
2. `build`
3. `deploy`

### Variáveis exigidas

Variáveis comuns:

- `SERVER_PASS`
- `SERVER_USER`
- `SERVER_HOST`
- `SERVER_DOMAIN`
- `REPO_DIR`

Variáveis de review:

- `VITE_API_URL`
- `DEV`

Variáveis de produção:

- `VITE_API_URL`

### Review apps

Branches diferentes de `main` geram ambiente de review.

Comportamento:

- instala Node 20 via NVM;
- executa `npm ci --legacy-peer-deps`;
- executa `npm run build`;
- define `VITE_BASE_URL` com nome do projeto e slug da branch;
- publica em uma pasta por branch;
- cria `.htaccess` com `RewriteBase` específico da branch;
- copia `index.html` e `assets`;
- expõe ambiente em `https://${SERVER_DOMAIN}/${CI_PROJECT_NAME}/${CI_COMMIT_REF_SLUG}/`;
- inclui job manual `stop_review` para remover a pasta da branch.

### Produção

A branch `main` gera build e deploy de produção.

Comportamento:

- instala Node 20 via NVM;
- executa `npm ci --legacy-peer-deps`;
- executa `npm run build`;
- define `VITE_BASE_URL` como `/${CI_PROJECT_NAME}/`;
- cria `.htaccess` com fallback para `index.html`;
- substitui assets e index antigos;
- publica em `https://${SERVER_DOMAIN}/${CI_PROJECT_NAME}/`.

---

## Setup de um Novo Projeto

### Primeiro passo obrigatório: `npm run setup`

> **Rode `npm run setup` logo após instalar as dependências e antes de escrever qualquer código.** O script renomeia o projeto em todos os lugares onde o template usa `template` (base path, URLs, proxy, `package.json`, `<title>` e textos de UI) e gera os arquivos de ambiente. Começar a desenvolver antes disso significa codar em cima do nome errado e ter que refazer ajustes manualmente depois.

**Modo interativo (humanos):**

```bash
npm run setup
```

O terminal pergunta o nome de exibição (ex.: `Portal do Aluno`), sugere um slug derivado (`portal-do-aluno`, que você confirma ou ajusta), mostra um resumo e só aplica após confirmação.

**Modo não interativo (CI ou agentes de IA):**

```bash
npm run setup -- --name "Portal do Aluno"
npm run setup -- --name "Portal do Aluno" --slug portal-aluno
```

Quando `--name` é informado, o script roda sem prompts e aplica direto. O slug é derivado do nome quando `--slug` não é passado.

O que o script altera:

- `package.json` → campo `name`.
- `index.html` → `<title>`.
- `vite.config.ts` → `base` e o prefixo do proxy (`/<slug>/api/v1`).
- `.env.example` → `VITE_BASE_URL` e `VITE_API_URL`.
- `src/contexts/auth/auth-context.tsx` e `src/routes/app.routes.tsx` → fallbacks de base path.
- `src/layout/main-layout.tsx`, `src/layout/app-sidebar.tsx` → textos de UI.
- Gera `.env.local` (`DEV=true`) e `.env.production` (`DEV=false`) se ainda não existirem.

O script não toca `package-lock.json` (resolvido no próximo `npm install`) nem este `README.md`, e não reescreve a descrição livre da home - esses pontos ficam no checklist manual abaixo.

### Caminho recomendado: fork

Use fork quando quiser manter vínculo com o template e facilitar futuras incorporações de melhorias.

Passos:

1. Criar o fork no GitLab a partir do template.
2. Clonar o novo repositório.
3. Instalar dependências com `npm install`.
4. Rodar `npm run setup` e informar o nome do projeto (ajusta nome, URLs, proxy e gera os arquivos de ambiente).
5. Rodar `npm run dev`.
6. Revisar os pontos do checklist manual abaixo.

### Caminho independente: clone

Use clone quando o projeto não deve manter vínculo com o template.

Passos:

1. Criar um repositório vazio no GitLab.
2. Clonar o template localmente com o nome do novo projeto.
3. Remover o remote original.
4. Adicionar o remote do novo repositório.
5. Fazer commit inicial.
6. Enviar para a branch principal.
7. Instalar dependências.
8. Rodar `npm run setup` para ajustar nome, URLs e gerar os arquivos de ambiente.
9. Rodar a aplicação.

### Checklist após criar o projeto

Feito automaticamente por `npm run setup`:

- Renomear `name` em `package.json`.
- Alterar o `<title>` em `index.html`.
- Alterar os textos `Template` e `Template React` nas telas/layouts.
- Ajustar `VITE_BASE_URL` e `VITE_API_URL`.
- Ajustar o prefixo do proxy `/template/api/v1` em `server.proxy` no `vite.config.ts`.
- Gerar `.env.local` e `.env.production`.

Manual, conforme a necessidade do projeto:

- Rodar `npm install` para atualizar o nome no `package-lock.json`.
- Atualizar itens da sidebar.
- Remover cards placeholder do dashboard quando a primeira feature real entrar.
- Adicionar testes para as regras e os componentes da primeira feature, seguindo [TESTING.md](./TESTING.md).
- Configurar variáveis do GitLab CI/CD.
- Validar build em ambiente de review antes da produção.

---

## Padrões de Desenvolvimento

### Nomenclatura

- Pastas e arquivos em kebab-case.
- Componentes React em PascalCase.
- Hooks iniciando com `use`.
- Serviços com sufixo `.service.ts`.
- Tipos globais com sufixo `.types.ts`.
- Arquivos de rota com sufixo `.routes.tsx`.
- Componentes shadcn preservados em `components/ui`.

### Separação de responsabilidades

- Páginas não devem conhecer detalhes de Axios.
- Componentes visuais não devem chamar API diretamente quando a lógica puder ficar em hook ou serviço.
- Serviços não devem renderizar UI nem disparar navegação.
- Contextos devem expor uma API pequena e clara.
- Tipos compartilhados devem morar fora das páginas.
- Rotas devem centralizar proteção e composição de layouts.

### DRY e escalabilidade

- Extraia lógica repetida para hooks.
- Extraia chamadas externas para serviços.
- Extraia contratos reutilizados para `types`.
- Reutilize componentes shadcn antes de criar componentes novos.
- Evite duplicar strings de endpoints em várias telas.
- Evite duplicar regras de autenticação em páginas.
- Evite criar abstrações antes de existir repetição real.

### Formulários

React Hook Form e Zod já estão instalados para formulários futuros.

Padrão recomendado:

- schemas de validação devem ficar próximos do domínio que os usa;
- mensagens de erro devem ser tratadas pela camada de formulário;
- chamadas de submit devem ir para services ou mutations;
- componentes de input devem compor os componentes shadcn existentes;
- validações de API devem ser normalizadas com `handleApiError`.

### Data fetching

Use TanStack Query para dados remotos.

Recomendações:

- queries para leitura;
- mutations para criação, alteração e remoção;
- query keys previsíveis e organizadas por domínio;
- invalidação explícita após mutations;
- tratamento de erro via helper central quando fizer sentido;
- evitar `useEffect` para buscar dados que podem ser queries.

### Erros e feedback

O padrão atual de erro passa por `handleApiError` e Sonner.

Use esse fluxo para:

- mensagens de API;
- timeout;
- erros de rede;
- erros inesperados em actions;
- feedback de logout e mutations.

Evite tratar erro HTTP de forma duplicada em cada componente.

---

## Padrões de UI

### Componentes

Use shadcn/ui como primeira escolha para botões, cards, menus, inputs, sidebar, tooltips e estados de carregamento.

Boas práticas:

- prefira composição a customização profunda;
- preserve acessibilidade dos componentes;
- use `AvatarFallback` sempre que usar avatar;
- use `CardHeader`, `CardTitle`, `CardDescription` e `CardContent` quando o card tiver estrutura;
- use `Separator` em vez de bordas manuais para divisões semânticas;
- use `Skeleton` para placeholders;
- use ícones de `lucide-react`.

### Estados assíncronos e animações

O template usa **Motion** (`motion/react`) como camada única de animação, com `MotionConfig reducedMotion="user"` global no `main.tsx` — toda animação respeita `prefers-reduced-motion` sem tratamento caso a caso.

O padrão obrigatório para blocos que dependem de dados remotos é o componente `AsyncState` (`src/components/ui/async-state.tsx`). Ele centraliza o ternário loading/erro/vazio/conteúdo e anima a troca entre estados (entrada e saída, via `AnimatePresence`):

```tsx
<AsyncState
   isLoading={isLoading}
   isError={isError}
   isEmpty={!items || items.length === 0}
   loading={<Skeleton className="h-11 w-full" />}
   error={<EmptyState tone="error" title="..." />}
   empty={<EmptyState title="..." />}
>
   <Table>...</Table>
</AsyncState>
```

Regras:

- **Nunca** escreva ternário manual `isLoading ? ... : isError ? ...` em JSX — use `AsyncState`.
- A prioridade de renderização é `loading → error → empty → children`.
- Animações novas devem usar Motion; não crie keyframes CSS próprios (os antigos `.anchieta-enter`/`anchieta-fade-up` foram removidos de propósito).
- Use a prop `className` do `AsyncState` (ex.: `min-h-64`) para reduzir pulo de layout entre estados de alturas diferentes.
- Referência viva: [`user-list.tsx`](./src/features/users/components/user-list.tsx).

### Layout

O template atual favorece interfaces de sistema:

- densas, mas legíveis;
- com navegação lateral persistente;
- header funcional;
- cards objetivos;
- pouco ruído visual;
- hierarquia tipográfica clara;
- foco em produtividade e leitura rápida.

Evite transformar sistemas internos em landing pages decorativas. A primeira tela autenticada deve ser útil para operação.

### Responsividade

O layout já considera:

- sidebar colapsável;
- header compacto;
- dados do usuário ocultos em telas pequenas;
- grid responsivo no dashboard;
- padding diferente entre mobile e desktop;
- hook `useIsMobile` disponível para comportamentos condicionais.

---

## Como Evoluir a Arquitetura

Cada nova funcionalidade já nasce como uma feature em `src/features/<nome>/` (ex.: `usuarios`, `documentos`, `relatorios`), com seus próprios componentes, hooks, schemas, stores e tipos locais. A infraestrutura compartilhada continua em `src/services`, `src/providers`, `src/routes`, `src/layout` e `src/components/ui`.

**Este template usa Bulletproof React** - pragmático e adequado para a maioria dos sistemas internos. **Para sistemas maiores e que exigem mais robustez** (produto institucional de longa duração, vários domínios, vários times, padronização entre repositórios), **a recomendação é migrar para Feature-Sliced Design (FSD)**. O princípio é o mesmo; o FSD apenas o formaliza com mais camadas e rigor.

Quando e como migrar (incluindo o mapeamento Bulletproof → FSD) está documentado em **[ARCHITECTURE.md § 6](./ARCHITECTURE.md#6-quando-migrar-para-feature-sliced-design-fsd)**.

---

## Estado Atual do Template

O template entrega hoje:

- SPA React com Vite.
- Roteamento público e protegido.
- Autenticação integrada à Intranet.
- Consulta de usuário autenticado em `/funcionarios/me`.
- Logout em `/logout`.
- Layout autenticado com sidebar.
- Página pública de entrada.
- Dashboard placeholder protegido.
- Cliente Axios centralizado.
- Tratamento centralizado de erros de API.
- TanStack Query configurado.
- Devtools de Query em desenvolvimento.
- shadcn/ui configurado.
- Tailwind CSS v4 com tokens globais.
- Tema claro customizado e tokens de dark mode.
- Build otimizado com chunks de vendor.
- Pipeline GitLab com review apps e produção.
- Animações padronizadas com Motion: `AsyncState` para estados assíncronos, transição de entrada de páginas e sidebar, com `prefers-reduced-motion` respeitado globalmente.
- Arquitetura por features (Bulletproof) com a regra de camadas validada por lint (`eslint-plugin-boundaries`).
- Feature de exemplo `users` cobrindo React Query (com `parse` Zod), RHF + Zod, URL state e Zustand.
- Prettier instalado e configurado (`.prettierrc` / `.prettierignore`).
- Vitest, jsdom, Testing Library e cobertura V8 configurados, com exemplos unitário e de componente.
- Documentação de arquitetura (`ARCHITECTURE.md`), contribuição (`CONTRIBUTING.md`) e testes (`TESTING.md`).

O template não entrega hoje:

- login próprio;
- gerenciamento de permissões por perfil;
- refresh token;
- módulo de domínio real (a feature `users` é apenas um exemplo/molde, com endpoint placeholder);
- testes de integração HTTP e testes E2E.

Esses pontos devem ser adicionados conforme a necessidade real do projeto que usar o template.
