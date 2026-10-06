# Design system — Template Anchieta

> Guia de transferência visual para reproduzir este template em outro sistema. Os valores são transcritos do CSS e dos componentes locais; quando uma escolha é inferida do uso visual, ela é descrita como padrão observado.

## 1. Direção visual e fonte de verdade

- Interface administrativa corporativa, funcional e sóbria, voltada a cadastros, consultas e operação.
- Paleta de neutros levemente azulados, azul institucional para ações e seleção, amarelo institucional como detalhe de marca e indicadores de estado.
- O layout separa a moldura do aplicativo (`shell`) da superfície de trabalho (`canvas`), com sidebar persistente, barra superior enxuta e conteúdo em blocos.
- Configuração: shadcn/ui estilo `new-york`, Tailwind CSS v4, CSS variables, primitives Radix e ícones Lucide. Existe um registry interno `@anchieta`.
- Fonte da verdade: `src/index.css` para tokens e estilos globais; `src/components/ui` para variantes e medidas dos componentes.
- O README menciona Geist, mas está desatualizado: o CSS atual carrega **Inter** e **JetBrains Mono**.
- Cores abaixo em OKLCH são literais do CSS. Prefira manter OKLCH no sistema de destino, sem conversões aproximadas para HEX.

## 2. Tokens de cor

### Marca

| Token                   | Valor claro                     | Papel                                      |
| ----------------------- | ------------------------------- | ------------------------------------------ |
| `--brand-blue`          | `oklch(39.341% 0.16812 263.91)` | Azul institucional principal.              |
| `--brand-blue-strong`   | `oklch(32% 0.17 263.91)`        | Azul mais profundo para ênfase.            |
| `--brand-blue-soft`     | `oklch(95% 0.025 263.91)`       | Fundo azul sutil.                          |
| `--brand-yellow`        | `oklch(82% 0.165 86)`           | Assinatura e acento institucional.         |
| `--brand-yellow-strong` | `oklch(72% 0.155 82)`           | Amarelo escurecido, base de warning claro. |
| `--brand-yellow-soft`   | `oklch(96% 0.05 95)`            | Fundo amarelo sutil.                       |

### Tema claro (`:root`)

| Token                                       | Valor                            | Papel visual                                                |
| ------------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| `--background`                              | `oklch(99.2% 0.003 264)`         | Fundo global.                                               |
| `--foreground`                              | `oklch(18% 0.025 264)`           | Texto principal.                                            |
| `--surface`                                 | `oklch(98.621% 0.00693 248.267)` | Preenchimento sutil de blocos; CSS indica aprox. `#eef2fa`. |
| `--surface-foreground`                      | `oklch(18% 0.025 264)`           | Texto sobre surface.                                        |
| `--shell`                                   | `oklch(95.8% 0.008 264)`         | Moldura externa e fundo da sidebar.                         |
| `--shell-foreground`                        | `oklch(22% 0.03 264)`            | Texto da moldura.                                           |
| `--canvas`                                  | `oklch(100% 0 0)`                | Janela branca do conteúdo principal.                        |
| `--canvas-foreground`                       | `oklch(18% 0.025 264)`           | Texto sobre canvas.                                         |
| `--card`, `--popover`                       | `oklch(100% 0 0)`                | Superfícies de cards e popovers.                            |
| `--card-foreground`, `--popover-foreground` | `oklch(18% 0.025 264)`           | Texto nessas superfícies.                                   |
| `--primary`                                 | `var(--brand-blue)`              | Ação/seleção principal.                                     |
| `--primary-foreground`                      | `oklch(99% 0.005 264)`           | Texto sobre primary.                                        |
| `--primary-soft`                            | `var(--brand-blue-soft)`         | Fundo azul suave.                                           |
| `--secondary`                               | `oklch(95.5% 0.008 264)`         | Ação/fundo neutro secundário.                               |
| `--secondary-foreground`                    | `oklch(22% 0.03 264)`            | Conteúdo secundário.                                        |
| `--muted`                                   | `oklch(96.5% 0.006 264)`         | Fundo neutro atenuado.                                      |
| `--muted-foreground`                        | `oklch(48% 0.022 264)`           | Descrições, metadados, placeholders e ícones secundários.   |
| `--accent`                                  | `var(--brand-yellow)`            | Acento de marca e realce de primitives.                     |
| `--accent-foreground`                       | `oklch(22% 0.04 86)`             | Conteúdo sobre accent.                                      |
| `--accent-soft`                             | `var(--brand-yellow-soft)`       | Acento suave.                                               |
| `--destructive`                             | `oklch(58% 0.21 27)`             | Erro e ação destrutiva.                                     |
| `--destructive-foreground`                  | `oklch(99% 0.005 264)`           | Texto sobre destructive sólido.                             |
| `--destructive-soft`                        | `oklch(96% 0.03 27)`             | Fundo de erro suave.                                        |
| `--success`                                 | `oklch(56% 0.13 152)`            | Estado positivo.                                            |
| `--success-foreground`                      | `oklch(99% 0.005 264)`           | Texto sobre success sólido.                                 |
| `--success-soft`                            | `oklch(95% 0.04 152)`            | Fundo de sucesso suave.                                     |
| `--warning`                                 | `var(--brand-yellow-strong)`     | Estado de aviso.                                            |
| `--warning-foreground`                      | `oklch(30% 0.08 82)`             | Texto sobre warning claro.                                  |
| `--warning-soft`                            | `var(--brand-yellow-soft)`       | Fundo de aviso.                                             |
| `--border`                                  | `oklch(92% 0.01 264)`            | Bordas e divisores sutis.                                   |
| `--border-strong`                           | `oklch(86% 0.014 264)`           | Bordas de maior contraste e scrollbar.                      |
| `--input`                                   | `oklch(92% 0.01 264)`            | Contorno de controles de formulário.                        |
| `--ring`                                    | `oklch(55% 0.13 263.91)`         | Foco visível.                                               |

### Tema escuro (`.dark`)

| Token                                       | Valor                    |
| ------------------------------------------- | ------------------------ |
| `--background`                              | `oklch(15% 0.022 264)`   |
| `--foreground`                              | `oklch(96% 0.006 264)`   |
| `--surface`                                 | `oklch(19% 0.025 264)`   |
| `--surface-foreground`                      | `oklch(96% 0.006 264)`   |
| `--shell`                                   | `oklch(12.5% 0.02 264)`  |
| `--shell-foreground`                        | `oklch(92% 0.006 264)`   |
| `--canvas`                                  | `oklch(19.5% 0.026 264)` |
| `--canvas-foreground`                       | `oklch(96% 0.006 264)`   |
| `--card`, `--popover`                       | `oklch(20% 0.028 264)`   |
| `--card-foreground`, `--popover-foreground` | `oklch(96% 0.006 264)`   |
| `--primary`                                 | `oklch(65% 0.15 263.91)` |
| `--primary-foreground`                      | `oklch(15% 0.025 264)`   |
| `--primary-soft`                            | `oklch(28% 0.08 263.91)` |
| `--secondary`                               | `oklch(24% 0.03 264)`    |
| `--secondary-foreground`                    | `oklch(96% 0.006 264)`   |
| `--muted`                                   | `oklch(22% 0.025 264)`   |
| `--muted-foreground`                        | `oklch(68% 0.018 264)`   |
| `--accent`                                  | `oklch(82% 0.165 86)`    |
| `--accent-foreground`                       | `oklch(18% 0.04 86)`     |
| `--accent-soft`                             | `oklch(28% 0.07 86)`     |
| `--destructive`                             | `oklch(65% 0.2 27)`      |
| `--destructive-foreground`                  | `oklch(96% 0.006 264)`   |
| `--destructive-soft`                        | `oklch(28% 0.08 27)`     |
| `--success`                                 | `oklch(68% 0.14 152)`    |
| `--success-foreground`                      | `oklch(15% 0.025 264)`   |
| `--success-soft`                            | `oklch(26% 0.05 152)`    |
| `--warning`                                 | `oklch(75% 0.16 86)`     |
| `--warning-foreground`                      | `oklch(84% 0.06 92)`     |
| `--warning-soft`                            | `oklch(28% 0.07 86)`     |
| `--border`, `--input`                       | `oklch(26% 0.028 264)`   |
| `--border-strong`                           | `oklch(34% 0.03 264)`    |
| `--ring`                                    | `oklch(65% 0.15 263.91)` |

No modo escuro, a moldura fica mais escura que o canvas, preservando a leitura da área de trabalho como janela. As definições `--brand-*` continuam em `:root`; os tokens semânticos mudam no bloco `.dark`.

### Gráficos e tokens da sidebar

| Token                          | Claro                     | Escuro                    |
| ------------------------------ | ------------------------- | ------------------------- |
| `--chart-1`                    | `var(--brand-blue)`       | `oklch(65% 0.15 263.91)`  |
| `--chart-2`                    | `var(--brand-yellow)`     | `oklch(82% 0.165 86)`     |
| `--chart-3`                    | `oklch(60% 0.13 200)`     | `oklch(70% 0.13 200)`     |
| `--chart-4`                    | `oklch(56% 0.13 152)`     | `oklch(68% 0.14 152)`     |
| `--chart-5`                    | `oklch(58% 0.21 27)`      | `oklch(65% 0.2 27)`       |
| `--sidebar`                    | `var(--shell)`            | `var(--shell)`            |
| `--sidebar-foreground`         | `var(--shell-foreground)` | `var(--shell-foreground)` |
| `--sidebar-primary`            | `var(--brand-blue)`       | `oklch(65% 0.15 263.91)`  |
| `--sidebar-primary-foreground` | `oklch(99% 0.005 264)`    | `oklch(15% 0.025 264)`    |
| `--sidebar-accent`             | `oklch(92% 0.014 264)`    | `oklch(17.5% 0.024 264)`  |
| `--sidebar-accent-foreground`  | `oklch(22% 0.03 264)`     | `oklch(92% 0.006 264)`    |
| `--sidebar-border`             | `oklch(90% 0.014 264)`    | `oklch(21% 0.026 264)`    |
| `--sidebar-ring`               | `var(--brand-blue)`       | `oklch(65% 0.15 263.91)`  |

Papéis práticos: primary para ação, navegação ativa e links; muted-foreground para hierarquia secundária; combinações `*-soft` + texto colorido para estados discretos; versões sólidas para destaque. A seleção de texto usa amarelo de marca com texto `oklch(22% 0.04 86)`. Não depender somente de cor para comunicar estados.

## 3. Tipografia

| Token/função     | Família e uso                                                                         |
| ---------------- | ------------------------------------------------------------------------------------- |
| `--font-sans`    | Inter, system-ui, sans-serif; interface e leitura. Importa pesos 400, 500, 600 e 700. |
| `--font-display` | JetBrains Mono, ui-monospace, monospace; títulos e métricas, tracking `-0.04em`.      |
| `--font-mono`    | JetBrains Mono; identificadores e números tabulares.                                  |

Google Fonts carrega Inter e JetBrains Mono nos pesos 400/500/600/700. OpenType: `html` usa `cv11`, `ss01`, `ss03`; corpo usa `cv11`, `ss01`; display usa `ss01`, `ss02`, `calt`, `zero`; mono usa `tnum`, `zero`.

| Elemento          | Estilo observado                             |
| ----------------- | -------------------------------------------- |
| H1                | 28 px, peso 500, line-height 1.05, display.  |
| H2 de seção       | 15 px, peso 500, line-height tight, display. |
| Título de dialog  | 18 px, peso 600.                             |
| Corpo e controles | 14 px.                                       |
| Descrição/hint    | 12–14 px, muted.                             |
| Eyebrow           | 11 px, 600, uppercase, tracking 0.08em.      |
| Label de campo    | 11 px, 600, uppercase, tracking 0.06em.      |
| Label da sidebar  | 10 px, 600, uppercase, tracking 0.1em.       |
| Métrica de card   | 24 px, display.                              |

Não há escala tipográfica customizada no tema; os tamanhos acima são valores/utilitários explícitos observados nos componentes.

## 4. Raios, sombras e espaçamento

### Raios

Base `--radius: 0.5rem` (8 px). `--radius-sm = radius - 4px` (4 px); `--radius-md = radius - 2px` (6 px); `--radius-lg = radius` (8 px); `--radius-xl = radius + 4px` (12 px). Controles e menus tendem a 6 px; cartões grandes a 12 px; badges são pills; avatares são circulares.

### Sombras

Todas usam a tinta azul `oklch(39.341% 0.16812 263.91)` em opacidades baixas.

| Token               | Valor CSS                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `--shadow-hairline` | `0 0 0 1px oklch(39.341% 0.16812 263.91 / 8%)`                                                             |
| `--shadow-card`     | `0 2px 8px -2px oklch(39.341% 0.16812 263.91 / 5%), 0 0 0 1px oklch(39.341% 0.16812 263.91 / 5%)`          |
| `--shadow-elevated` | `0 8px 24px -6px oklch(39.341% 0.16812 263.91 / 9%), 0 0 0 1px oklch(39.341% 0.16812 263.91 / 5%)`         |
| `--shadow-2xs`      | `0 1px 2px oklch(39.341% 0.16812 263.91 / 4%)`                                                             |
| `--shadow-xs`       | `0 2px 4px -1px oklch(39.341% 0.16812 263.91 / 5%)`                                                        |
| `--shadow-sm`       | `0 2px 6px -1px oklch(39.341% 0.16812 263.91 / 6%), 0 1px 2px -1px oklch(39.341% 0.16812 263.91 / 4%)`     |
| `--shadow`          | Alias de `--shadow-sm`                                                                                     |
| `--shadow-md`       | `0 6px 14px -3px oklch(39.341% 0.16812 263.91 / 7%), 0 2px 5px -2px oklch(39.341% 0.16812 263.91 / 5%)`    |
| `--shadow-lg`       | `0 12px 28px -6px oklch(39.341% 0.16812 263.91 / 9%), 0 4px 10px -4px oklch(39.341% 0.16812 263.91 / 5%)`  |
| `--shadow-xl`       | `0 20px 40px -8px oklch(39.341% 0.16812 263.91 / 11%), 0 8px 16px -8px oklch(39.341% 0.16812 263.91 / 6%)` |
| `--shadow-2xl`      | `0 32px 64px -12px oklch(39.341% 0.16812 263.91 / 14%)`                                                    |

### Espaçamento e layout

- Espaçamento vem da escala Tailwind (unidade usual de 4 px); não há tokens próprios de spacing.
- Shell com altura `100svh`; scroll interno no conteúdo para manter a moldura fixa.
- Sidebar inset. Em desktop, canvas tem borda e sombra elevada.
- Barra global: 56 px de altura, 20 px de padding horizontal; breadcrumb e identidade do usuário.
- Conteúdo: 32 px nas laterais, 8 px no topo, 48 px na base; sem max-width global explícito.
- PageHeader: 8 px de padding superior, 24 px inferior e borda inferior; filete amarelo de 48 × 2 px depois de margem superior de 24 px.
- Grupos de página normalmente usam gap vertical 32 px; toolbar/lista cerca de 16 px. Gaps são o padrão para separar irmãos.
- Grade exemplo: 1 coluna, 2 em `sm`, 4 em `lg`.

## 5. Padrões de componentes

### Botões

- Base: inline centralizado, 40 px de altura, 14 px/500, raio médio, transição de cor, foco com ring 2 px e offset 2 px. Disabled: sem interação e opacidade 50%.
- Variantes: `default` (primary), `destructive`, `outline`, `secondary`, `ghost`, `link`.
- Tamanhos: padrão 40 px/16 px horizontal; `sm` 36 px; `lg` 44 px/32 px horizontal; `icon` 40 × 40 px.
- Hover principal: cor primary a 90%; ícone Lucide normalmente 16 px e antes do rótulo.

### Badges e estados

- Pill; tons `neutral`, `primary`, `success`, `warning`, `danger`; variantes `soft` (padrão), `solid`, `outline`.
- `soft` usa fundo suave + texto do tom; `solid` usa cor preenchida + foreground correspondente; `outline` usa borda colorida e fundo transparente.
- Tamanho `sm`: texto 11 px, padding 8 × 2 px; `md`: 12 px, padding 10 × 4 px. Dot opcional de 6 px como reforço não cromático.

### Cards, página e seções

- Card: background `card`, foreground correspondente, borda, raio 12 px, padding vertical 24 px, sombra sutil; header e conteúdo com padding horizontal 24 px.
- Card de métrica: título 14 px/500, ícone muted 16 px, valor display 24 px, descrição muted e badge de estado.
- PageHeader: eyebrow opcional, H1 display 28 px, descrição 14 px com largura máxima 672 px, ações alinhadas à direita, metadados e filete de marca.
- SectionHeading: título display 15 px; hint 12 px; ações à direita; divisor inferior opcional.
- Breadcrumb: 14 px; segmento atual foreground/medium; ancestrais muted; chevron discreto.

### Formulários e busca

- Input: largura total, altura 40 px, padding horizontal 12 px, fonte 14 px, fundo background, borda border, placeholder muted, raio médio.
- Foco usa ring semântico; erro usa borda destructive e ring vermelho translúcido; disabled tem cursor bloqueado/opacidade 50%.
- Textarea: largura total, mínimo 64 px, padding 12 × 8 px.
- Label: uppercase 11 px/600, tracking 0.06em, muted; obrigatório sinalizado por asterisco warning.
- Formulários agrupam campos com gap 16 px; erro perto do campo; ação de envio alinhada ao fim.
- SearchInput: ícone de lupa 16 px sobreposto à esquerda, input com padding adicional e largura máxima 384 px.
- InputGroup permite prefixo/sufixo, texto, botão e textarea compartilhando uma única borda e estados de foco/erro.

### Sidebar e navegação

- Sidebar herda `shell`, variante inset e colapso para ícones; em mobile funciona como painel e tem controle de fechar.
- Cabeçalho da marca: símbolo 36 × 36 px; nome display 14 px; instituição 11 px uppercase/tracking aberto.
- Rótulo de seção 10 px uppercase e tracking 0.1em; item com ícone de 16 px, texto 14 px e raio médio.
- Inativo: foreground lateral atenuado; hover em sidebar-accent. Ativo: canvas, texto/ícone primary, peso médio, sombra xs e filete amarelo vertical à esquerda.
- Rodapé com divisor sidebar-border; cartão do usuário usa fundo de accent/40%, avatar quadrado primary com iniciais, nome e setor/e-mail; logout é ação discreta destrutiva.
- Preferências de tema em dropdown com opções claro, escuro e sistema.

### Tabelas, vazios e loading

- Tabela 100% da largura, overflow horizontal quando necessário, texto 14 px.
- Cabeçalho com 40 px de altura, padding horizontal 8 px, peso médio e alinhamento à esquerda; células com padding 8 px e alinhamento vertical central.
- Linhas com borda inferior; hover `muted/50`; selecionada `muted`; rodapé pode usar muted/50 e borda superior.
- EmptyState: superfície surface, borda tracejada, raio 12 px, centralizado; ícone opcional em círculo de 48 px; título display 15 px, hint 14 px, ações centralizadas.
- Erro de EmptyState usa fundo/borda/texto destructive e semântica `alert`.
- Skeleton usa fundo accent, raio médio e pulse.
- AsyncState prioriza loading → erro → vazio → conteúdo; transição curta de fade/deslocamento.

### Callouts, menus e overlays

- Callout tem tons info/success/warning/danger e densidades `banner`, `inline`, `compact`. Banner usa borda e padding 16 × 12 px; inline é compacto e tracejado; compact é microtexto monospace uppercase.
- Dropdown/popover: fundo popover, borda, raio médio, sombra md, padding pequeno; itens 14 px, altura compacta, hover/foco accent.
- Dialog: overlay preto 50%; superfície background, borda, raio 8 px, padding 24 px, gap 16 px, sombra lg; máximo geral 512 px e largura com margens de 16 px. Fade/zoom em 200 ms.
- Modal simples usa máximo padrão 425 px, título e descrição.
- Sheet entra de qualquer borda, fundo background e sombra lg; painel lateral tem largura 75% e máximo pequeno em desktop.
- Tooltip: fundo foreground, texto background, raio médio, fonte 12 px, padding 12 × 6 px.

### Avatar e identificadores

- Avatar circular de 32 px, imagem quadrada recortada; fallback muted com iniciais centralizadas.
- Identidade autenticada pode usar 36 px; `AuthHeader` adiciona contorno, primary-soft e iniciais primary.
- Referência/ID: JetBrains Mono 13 px/500, tracking compacto, números tabulares; primary por padrão, muted opcional.

### Outros componentes existentes

Calendar, DatePicker, Select, ComboBox, Command, Collapsible, Switch, FilesInput, Popover, Sheet, Tooltip e primitives de formulário seguem os mesmos papéis: background/popover, foreground, border/input, accent para seleção, destructive para erro e ring para foco.

## 6. Movimento e microinterações

- Mudança de rota: opacidade 0→1, deslocamento Y de 10 px, 350 ms, ease-out.
- Sidebar: transição de itens 180 ms, `cubic-bezier(0.22, 1, 0.36, 1)`; labels entram com fade e 5–6 px horizontais; labels de seção expandem/recolhem em 220 ms.
- Estado assíncrono: 180 ms, entrada Y=6 px e saída Y=-4 px com fade.
- Menus e dialogs usam fade, zoom ou deslizamento curto. Controles usam transições curtas de cor/sombra.
- Easing customizado disponível: `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`.

## 7. Responsividade, acessibilidade e interação

- Breakpoint móvel explícito: largura menor que 768 px. Sidebar muda para painel; ações podem ocupar largura total.
- A partir de `sm`, conteúdo pode dispor título/ações horizontalmente; dashboard expande de 1 para 2 colunas em `sm` e 4 em `lg`.
- Desktop permite sidebar colapsada com tooltip nos ícones. Tabelas preservam estrutura com scroll horizontal.
- Conteúdo volta ao topo após mudança de rota. Ícones Lucide geralmente 16 px em controles, 12–14 px em metadados e 20 px em destaques.
- Preservar ring de foco, teclado e semântica das primitives Radix/shadcn; estados disabled precisam ser distinguíveis.
- Navegação ativa informa também `aria-current`; ícones decorativos são ocultos de leitores de tela; ações só com ícone precisam de rótulo acessível.
- Usar texto/ícone junto à cor em estados. Erros devem estar ligados ao campo e avisos gerais usar semântica de alerta.

## 8. Configuração e portabilidade

O tema é publicado para Tailwind v4 usando `@theme inline`; `components.json` define `new-york`, `baseColor: neutral`, CSS variables, Lucide e aliases locais. Em outro framework, preserve nomes semânticos estáveis e remapeie-os à sintaxe local.

```css
:root {
   --radius: 0.5rem;
   --background: oklch(99.2% 0.003 264);
   --foreground: oklch(18% 0.025 264);
   --primary: oklch(39.341% 0.16812 263.91);
   --primary-foreground: oklch(99% 0.005 264);
   --border: oklch(92% 0.01 264);
   --ring: oklch(55% 0.13 263.91);
}
.dark {
   --background: oklch(15% 0.022 264);
   --foreground: oklch(96% 0.006 264);
   --primary: oklch(65% 0.15 263.91);
   --primary-foreground: oklch(15% 0.025 264);
   --border: oklch(26% 0.028 264);
   --ring: oklch(65% 0.15 263.91);
}
```

O snippet ilustra só uma fração dos tokens; as tabelas anteriores contêm a paleta semântica completa.

## 9. Inventário local de componentes

`async-state`, `auth-header`, `avatar`, `badge`, `button`, `callout`, `calendar`, `card`, `collapsible`, `combo-box`, `command`, `date-picker`, `dialog`, `dropdown-menu`, `empty`, `empty-state`, `field-label`, `files-input`, `form`, `input`, `input-group`, `item`, `label`, `modal`, `page-header`, `popover`, `ref-id`, `search-input`, `section-heading`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `switch`, `table`, `textarea`, `tooltip`.

## 10. Arquivos de referência visual

- `src/index.css`: tokens, tipografia, sombras, radius, modo escuro, seleção, scrollbar e utilitários de marca.
- `components.json`: configuração shadcn e registry.
- `src/components/ui`: medidas, estados e variantes de cada primitiva.
- `src/layout/main-layout.tsx`, `src/layout/app-sidebar.tsx`, `src/layout/sidebar`: moldura, sidebar, navegação e animações.
- `src/pages/protected/home.tsx`, `src/pages/protected/users.tsx`, `src/features/users/components`: exemplos de cards, cabeçalhos, busca, formulário, tabela e estados.
- Ativos de marca: `src/assets/images/logo-dark.svg` e `src/assets/icons/icone_header.png`.

## 12. Tokens e comportamentos globais complementares

- Variante dark customizada: `@custom-variant dark (&:is(.dark *))`; a classe `.dark` no elemento raiz ativa os valores escuros.
- A preferência de aparência aceita `light`, `dark` ou `system`, inicia em `system`, persiste em `localStorage` sob a chave `app-theme` e acompanha `prefers-color-scheme` enquanto estiver no modo sistema.
- `--ease-out-expo` está definido como `cubic-bezier(0.16, 1, 0.3, 1)`.
- `.anchieta-rule` desenha um filete amarelo de 48 px × 2 px sob o elemento; `.anchieta-rule-full` transforma o filete em divisor horizontal com os primeiros 48 px amarelos e o restante na cor de borda.
- `.tabular` aplica `font-variant-numeric: tabular-nums` para alinhar dígitos em tabelas e números.
- A seleção nativa (`::selection`) usa amarelo da marca e texto escuro `oklch(22% 0.04 86)`.
- Scrollbar WebKit: 6 px de largura, 8 px de altura; thumb com `border-strong`, raio `--radius`, hover em `muted-foreground`.
- CSS base aplica borda semântica e ring de outline a elementos; corpo usa fundo/texto semânticos e antialiasing. Campos e botões definem seus próprios tratamentos de foco visível.
- Ajustes globais presentes para Sonner (camada z alta e toast interativo/selecionável) e overlay/conteúdo Radix Dialog (pointer events).
