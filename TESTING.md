# Testes

Este template entrega somente a base comum para testes unitários e de componentes. Casos de autenticação, integrações HTTP e jornadas de navegador devem ser adicionados pelo projeto quando os respectivos contratos existirem.

## Ferramentas

- **Vitest:** runner e API de mocks compatíveis com a configuração do Vite.
- **jsdom:** implementa o ambiente de navegador usado nos testes de componentes.
- **React Testing Library:** renderiza componentes e consulta a interface como o usuário a percebe.
- **jest-dom:** adiciona matchers de DOM, como `toBeInTheDocument`.
- **V8:** gera o relatório de cobertura sem impor uma meta global ao template.

## Comandos

| Comando                 | Uso                                                     |
| ----------------------- | ------------------------------------------------------- |
| `npm test`              | Executa toda a suíte uma vez                            |
| `npm run test:watch`    | Reexecuta testes afetados durante o desenvolvimento     |
| `npm run test:coverage` | Gera resumo no terminal e relatório HTML em `coverage/` |

## Organização

Os testes ficam centralizados em `tests/` e espelham o caminho do arquivo em `src/`:

```text
tests/
├── setup.ts
├── unit/
│   └── lib/
│       └── utils.test.ts
└── components/
    └── ui/
        └── page-header.test.tsx
```

- Use `*.test.ts` para funções, schemas e outros módulos sem JSX.
- Use `*.test.tsx` para componentes e hooks renderizados.
- Mantenha fixtures pequenas no próprio teste. Extraia para `tests/fixtures/` apenas quando houver reuso real.
- Não coloque utilitários exclusivos de teste dentro de `src/`.

## Qual teste escrever

### Teste unitário

Use para uma unidade com entrada e saída observáveis, sem precisar renderizar a interface: normalizadores, schemas Zod, seletores e transformações de dados. O exemplo em `tests/unit/lib/utils.test.ts` protege as regras de caixa, espaços e acentos de `normalizeText`.

### Teste de componente

Use quando o contrato aparece no DOM ou depende da interação do usuário. Verifique semântica, conteúdo, estados e efeitos visíveis; evite testar nomes de classes ou detalhes internos. O exemplo em `tests/components/ui/page-header.test.tsx` protege o nível do título e os slots opcionais do cabeçalho.

Organize cada caso em **Arrange, Act, Assert**. As fases podem ser separadas visualmente quando o teste for longo, mas comentários não são necessários em casos simples.

## Consultas da Testing Library

Prefira consultas que representem como a interface é encontrada por pessoas e tecnologias assistivas:

1. `getByRole` com nome acessível;
2. `getByLabelText` para campos de formulário;
3. `getByText` para conteúdo sem papel semântico adequado;
4. `getByTestId` somente quando não existir alternativa baseada na interface.

Para resultados assíncronos, prefira `findByRole`/`findByText`. Use `queryBy*` para afirmar que algo não está presente.

## Mocks e fronteiras externas

Teste código real sempre que ele for rápido e determinístico. Use mocks somente nas fronteiras que o teste não controla, como rede, relógio, armazenamento do navegador ou navegação externa.

- Não simule componentes filhos apenas para reduzir a árvore renderizada.
- Não afirme apenas que um mock foi criado; valide o comportamento observável produzido pela unidade real.
- Restaure o estado entre casos. A configuração global já limpa o DOM e restaura mocks do Vitest.
- Evite snapshots como padrão. Prefira expectativas pequenas que indiquem exatamente qual contrato quebrou.

## Providers compartilhados

O template não inclui um renderizador global porque os providers necessários mudam conforme o projeto. Quando três ou mais arquivos repetirem o mesmo wrapper, crie `tests/test-utils.tsx`, reexporte a Testing Library e exponha um `render` que componha somente os providers comuns.

Crie instâncias isoladas por teste, especialmente de `QueryClient`, e permita sobrescrever rota, usuário e estado inicial. Não coloque dados fixos de uma feature no helper global.

## Quando evoluir a infraestrutura

- **MSW:** adicione quando houver vários testes exercitando contratos HTTP e o mock manual do Axios/fetch começar a se repetir. Modele respostas de sucesso, erro e dados inválidos conforme o contrato real da API.
- **Playwright:** adicione quando o projeto precisar proteger jornadas completas no navegador, como autenticação, navegação entre telas ou formulários críticos. Mantenha E2E separado da suíte rápida.

Essas ferramentas não fazem parte da base para evitar dependências e convenções sem necessidade comprovada.

## Cobertura

`npm run test:coverage` considera os arquivos TypeScript/TSX de `src/`, exibe um resumo e gera o relatório HTML. `coverage/` não deve ser versionado.

O template não define percentuais mínimos: uma meta arbitrária incentiva testes de pouco valor e penaliza projetos recém-criados. Antes de impor thresholds, o projeto deve:

1. identificar fluxos e regras de maior risco;
2. cobri-los com testes que detectem regressões reais;
3. observar a linha de base estabilizada;
4. definir metas que nunca fiquem abaixo dessa linha de base.

Cobertura mostra código executado, não qualidade das asserções. Revise os casos, não apenas o percentual.

## Checklist para novas funcionalidades

- Escreva o teste junto da regra ou do componente que precisa de proteção.
- Confirme que o teste falha pelo motivo esperado antes da implementação.
- Cubra sucesso e falhas relevantes, sem reproduzir internals.
- Rode `npm test`, `npm run typecheck`, `npm run lint`, `npm run format` e `npm run build` antes do PR.
