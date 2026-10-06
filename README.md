# Atividades Complementares | UniAnchieta

Front-end do aluno para **solicitar e acompanhar o aproveitamento de Atividades Complementares**. Protótipo navegável com **dados mockados e fictícios**,
construído sobre o template oficial (React 19, TypeScript, Vite, Tailwind v4, shadcn/Radix, TanStack Query, React Hook Form + Zod, Zustand).

> **Estado:** front completo com camada de dados simulada. **Não há backend, SSO, cookie ou chamada institucional.** As regras implementadas servem ao
> protótipo e à prevenção de erros de preenchimento; a autoridade sobre catálogo, saldos, prazos e deferimento será o backend definido pelo TI. A
> coordenação continua decidindo pertinência e horas — não há aprovação automática.

## Experiência do aluno (princípios)

- **A resposta vem primeiro.** A tela inicial mostra "Faltam Xh", as horas em análise e quantos itens precisam do aluno. A lista vem agrupada em
  _Precisa de você_, _Em análise_ e _Concluídos_, e o cartão inteiro abre o pedido.
- **O sistema calcula, o aluno confirma.** Período deduzido das datas, data única por padrão e horas solicitadas preenchidas a partir do comprovante e
  do limite, com a explicação ("É o total do comprovante", "É o saldo que resta neste tipo"). O aluno pode pedir menos.
- **Atalhos e linguagem simples.** O passo 1 começa pelas atividades mais comuns. Ao tocar, um resumo mostra quanto conta e o que anexar, com o botão
  para seguir. Código, regra completa e saldo detalhado ficam em "Regra completa".
- **Comprovante primeiro.** Cada documento exigido tem o próprio botão "Anexar arquivo" (e arrastar e soltar no computador), com "Usar o mesmo arquivo"
  quando um documento comprova dois itens. Não é possível avançar enquanto um arquivo ainda está sendo preparado.
- **Celular primeiro.** Botão de ação fixo ao alcance do polegar, gaveta inferior para os detalhes, uma coluna, alvos de 44px e campos com fonte de
  16px (sem zoom automático no iOS).
- **Revisão como recibo.** Um único resumo: quanto vai pedir, o quê, quando e quais arquivos, com "Editar" em cada linha.

Mobile: barra inferior com **Minhas horas · Solicitar · Bagagens · Ajuda** (oculta nos formulários). A barra de horas segue as cores do portal
(cumpridas em verde, restantes em vermelho). Perguntas e respostas que guiaram o desenho: [`docs/EXPERIENCIA-DO-ALUNO.md`](docs/EXPERIENCIA-DO-ALUNO.md).

## Executar

```bash
npm ci            # usa o package-lock.json
npm run dev       # http://localhost:5173/atividades-complementares/
```

| Script                            | Uso                                                    |
| --------------------------------- | ------------------------------------------------------ |
| `npm run dev`                     | Desenvolvimento (Vite)                                 |
| `npm run build`                   | Build de produção em `build/`                          |
| `npm run preview`                 | Servir o build localmente (mesmo base path)            |
| `npm test`                        | Vitest (regras, adapter mock e telas)                  |
| `npm run typecheck`               | `tsc -b --noEmit` (verifica os projetos referenciados) |
| `npm run lint` / `npm run format` | ESLint (inclui regras de camada) e Prettier            |

Não foi feito deploy. `npm run deploy:local` continua existindo (template), mas não foi executado.

## Base path, roteamento e hospedagem

- Base path: `VITE_BASE_URL` (padrão `/atividades-complementares/`). O Vite usa esse valor e o React Router usa o mesmo valor sem a barra final como
  `basename`.
- Rotas (relativas ao base path):

| Rota                        | Tela                                                               |
| --------------------------- | ------------------------------------------------------------------ |
| `/`                         | Acompanhamento                                                     |
| `/solicitar`                | Formulário em 3 passos (abre direto no passo 1)                    |
| `/pedidos/:id`              | Detalhes e histórico                                               |
| `/pedidos/:id/corrigir`     | Correção de pendência (mesmo protocolo)                            |
| `/pedidos/:id/reconsiderar` | Pedido de reconsideração (vinculado ao pedido recusado)            |
| `/bagagens`                 | Bagagens: cursos grátis de 15h, com botão para o AVA               |
| `/ajuda`                    | Dúvidas, regulamento e documentos por atividade                    |
| `/entrada-portal`           | **Entrada local de demonstração** que representa o botão do portal |

- URL direta e recarregar funcionam no `dev`, no `preview` e no Apache via `public/.htaccess` (fallback para `index.html` com `RewriteBase` no base path).
- **Voltar ao portal:** usa `VITE_PORTAL_RETURN_URL`. Vazio (padrão) = volta para `/entrada-portal`. Nenhuma URL de produção foi inventada.
- O regulamento fornecido é servido localmente em `public/regulamento/regulamento-geral-2025.pdf`.

### Variáveis (`.env.example`)

| Variável                         | Padrão                        | Observação                                                            |
| -------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `VITE_BASE_URL`                  | `/atividades-complementares/` | Base do Vite e do router                                              |
| `VITE_DATA_MODE`                 | `mock`                        | Único adapter existente. O padrão é `mock` também no build            |
| `VITE_PORTAL_RETURN_URL`         | vazio                         | Destino de "Voltar ao portal"                                         |
| `VITE_BAGAGENS_URL`              | link do AVA                   | Destino do botão "Fazer uma Bagagem no AVA"                           |
| `VITE_QUERY_DEVTOOLS`            | `false`                       | Botão do TanStack Devtools no `npm run dev`                           |
| `VITE_DEMO_TOOLS`                | `true`                        | Mostra o painel discreto de demonstração                              |
| `VITE_API_URL`, `VITE_LOGIN_URL` | —                             | Referências do template para o futuro adapter; **não usadas no mock** |

## Modo de demonstração

No rodapé da barra lateral, **"Modo de demonstração"** abre um painel (fora do fluxo do aluno) para:

- **Cenários** do fixture: fluxos principais (26h/160h), limite aprovado, saldo reservado, limite semestral, uso único, carga concluída, aluno sem
  registros, concluinte com prazo, histórico legado. Trocar de cenário recarrega o fixture, limpa cache, rascunhos e arquivos — registros não se misturam.
- **Simulações:** carregamento lento, falha na primeira tentativa de envio (o retry reutiliza a chave de idempotência), falha na lista de pedidos e prazos
  vencidos (30/09/2026, com referência em 05/10/2026).
- **Decisões simuladas** (aprovar total/parcial, pedir correção, não aprovar). Nada é decidido por tempo ou por abrir uma tela.
- **Restaurar dados de demonstração** (reset).

**Persistência local:** pedidos, rascunhos, chaves de idempotência e ajustes ficam em `localStorage` (`atividades-complementares:demo-state`, com versão
de schema). Os **bytes** dos anexos ficam separados, em **IndexedDB**. Sem IndexedDB (ex.: navegação privada), ficam só em memória e, depois de recarregar,
o formulário pede para **reanexar**. Anexos do fixture são metadados ilustrativos ("arquivo de demonstração") e nunca aparecem como arquivo para abrir.

Com `VITE_DEMO_TOOLS=false` o painel some; os dados continuam mockados.

## Arquitetura

`app → feature → shared`, validado por `eslint-plugin-boundaries`. Toda a lógica está em `src/features/atividades-complementares/`, importada apenas pela API
pública (`index.ts`):

```
src/features/atividades-complementares/
├── types/      # schemas Zod (catálogo, aluno, pedidos, saldos) + interface do gateway e erros tipados
├── rules/      # regras PURAS em minutos inteiros: saldo, limites, períodos, prazos, documentos, arquivos, busca
├── api/        # gateway.ts (PONTO DE TROCA), query keys, queries e mutations (TanStack Query)
├── mock/       # adapter mock assíncrono, fixtures do briefing, estado versionado, bytes em IndexedDB
├── content/    # microcopy, rótulos de situação, apresentação do catálogo (UX), ajuda
├── hooks/      # filtros na URL, object URL, media query, armazenamento de anexos
└── components/ # acompanhamento, formulário (3 passos), detalhe, correção, reconsideração, ajuda, demonstração
```

- **Server state** no TanStack Query; **formulário** com RHF + Zod (schema base + validação contextual de saldo/limites); **filtros** na URL;
  componentes não leem JSON nem `localStorage` — passam por hooks e gateway.
- **Sessão:** `src/providers/mock-session-provider.tsx` fornece um **aluno fictício** pelo contrato `src/contexts/session`. O `AuthProvider` do template
  (que chamava `/funcionarios/me`, `/logout` e redirecionava ao SSO de funcionário) foi removido. `src/services/api.ts` foi mantido como base para o futuro
  cliente HTTP, mas não é importado.
- O shell (sidebar/cabeçalho) fica na camada app. Para montar o módulo dentro do portal, retira-se o shell e se reutilizam as telas da feature.

### Trocar o mock por um backend

1. Implementar `AtividadesGateway` (`src/features/atividades-complementares/types/gateway.ts`) em um novo adapter HTTP, validando cada resposta com os
   schemas Zod existentes.
2. Selecioná-lo em `src/features/atividades-complementares/api/gateway.ts` quando `VITE_DATA_MODE=api`.
3. Substituir o `MockSessionProvider` pela autenticação real do aluno no portal, mantendo o contrato de sessão.

Contrato proposto: [`docs/CONTRATO.md`](docs/CONTRATO.md). Decisões provisórias e pendências: [`docs/DECISOES-PARA-O-TI.md`](docs/DECISOES-PARA-O-TI.md).

## Dados

- Catálogo: **38 linhas/subtipos** do anexo do regulamento de 26/03/2025 (`mock/fixtures/catalogo-2025.json`). IDs locais **não** são IDs do backend.
  Só `25_003a`/`25_003b` têm sufixo de sistema confirmado.
- Aluno e pedidos: **fictícios** (`mock/fixtures/perfis-e-solicitacoes.mock.json`). Os prints de referência (com dados reais) **não** estão no repositório.
- Código `25_030` aparece só no histórico, sem teto nem envio. Códigos legados (`007`, `18_007`, `18_008`, `18_021`) mantêm os limites observados, sem
  migração para 2025.

## Documentação do template

`ARCHITECTURE.md`, `CONTRIBUTING.md`, `DESIGN-SYSTEM.md`, `SHADCN.md` e `TESTING.md` são do template e continuam válidos. O README original do template
(que descreve a autenticação de funcionário) está em `docs/README-TEMPLATE.md`.
