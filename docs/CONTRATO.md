# Contrato proposto do front (gateway)

Proposta de fronteira entre as telas e os dados. **Não é a definição do backend.** O TI pode ajustar envelope, IDs, autenticação e nomes de estados; o adapter
fará o mapeamento. Fonte: `src/features/atividades-complementares/types/`.

## Interface `AtividadesGateway`

| Método                                                        | Retorno           | Observações                                                                    |
| ------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| `getStudentContext()`                                         | `StudentContext`  | Matrícula, matriz, catálogo, carga exigida, elegibilidade, períodos, políticas |
| `listActivityTypes()`                                         | `Catalog`         | Tipos da versão do aluno + tipos só de histórico; `submissionAvailable`        |
| `getSummary()`                                                | `CourseSummary`   | Aprovadas, exigidas, restante, aguardando (separado), SLA                      |
| `getBudgets()`                                                | `BudgetSnapshot`  | Saldo por `budgetKey` + versão, uso por período, usos únicos, `revision`       |
| `listRequests()` / `getRequest(id)`                           | `ActivityRequest` | Pedidos manuais e registros institucionais                                     |
| `listDrafts()` / `getDraft` / `saveDraft` / `deleteDraft`     | `Draft`           | Rascunhos não reservam saldo                                                   |
| `createRequest(input, { idempotencyKey, budgetRevision })`    | `ActivityRequest` | Revalida saldo, documentos e regras; mesma chave → mesmo resultado             |
| `replyToCorrection(id, input, { idempotencyKey })`            | `ActivityRequest` | Mesmo protocolo; versão anterior preservada; sem segunda reserva               |
| `requestReconsideration(id, input, { idempotencyKey })`       | `ActivityRequest` | Vinculada ao pedido; uma tentativa ativa por linhagem                          |
| `getAttachment(id)` / `storeAttachment` / `discardAttachment` | `Blob \| null`    | Bytes separados dos metadados (no backend: upload/download)                    |

Controles **somente do mock** (`DemoControls`): `getDemoState`, `selectScenario`, `updateSettings`, `simulateDecision`, `reset`.

## Entidades (resumo)

- **StudentContext:** `id`, `ra` (fictício), `name`, `course`, `modality`, `matrixId`, `admissionDate`, `catalogVersion`, `requiredMinutes` (pode ser
  `null`), `eligibility[]`, `isConcluding`, `submissionDeadlineDate`, `academicPeriods[]`, `institutionalRecords`, `referenceDate`, `policies`.
- **ActivityType:** `localId`, `regulationCode`, `variant`, `systemCode`, `catalogVersion`, `budgetKey`, `totalLimitMinutes`, `unitRule` (tipo e limite;
  modalidades), `documentRequirements` (anyOf / institucional / por modalidade), `eligibility`, `exclusions`, `manualSubmission`, `historicalOnly`.
- **ActivityRequest:** `id`, `lineageId`, `activityLocalId`, `catalogVersion`, `status`, `origin` (`manual`/`institutional`), `protocol?`, `eventId?`,
  conteúdo (título, organizador, detalhes, descrição composta, período, datas, modalidade, `certificateMinutes?`, `requestedMinutes?`, anexos),
  `approvedMinutes?`, motivos, `actionDeadlineDate`, `previousVersions[]`, `reconsiderations[]`, `history[]`, `reservedMinutes`.
- **Attachment:** `id`, `name`, `extension`, `mimeType`, `sizeBytes`, `requirementKeys[]`, `demoOnly`, `bytesAvailable`.

Todas as durações são **minutos inteiros**. `HH:mm` só no adapter legado (`toLegacyHHmm`). A descrição legada é composta (nome + organizador + detalhes),
até **6.000** caracteres no total, e nunca é truncada pelo adapter.

## Estados

| Estado técnico local         | Rótulo para o aluno         | Reserva saldo no mock     |
| ---------------------------- | --------------------------- | ------------------------- |
| (rascunho, entidade própria) | Rascunho                    | Não                       |
| `em_analise`                 | Em análise                  | Sim                       |
| `precisa_correcao`           | Precisa de correção         | Sim (provisório)          |
| `reconsideracao_em_analise`  | Reconsideração em análise   | Sim, uma vez por linhagem |
| `aprovada`                   | Aprovada                    | Só as horas computadas    |
| `aprovada` + `institutional` | Registrada pela instituição | Só as horas computadas    |
| `nao_aprovada`               | Não aprovada                | Não                       |

## Fórmulas

```
saldoTipo     = max(0, T - A - P)                      // por budgetKey + versão de catálogo
saldoSemestre = max(0, S - AS - PS)                    // regras "X horas por semestre", agregadas por período
maximoPedido  = min(saldoTipo, saldoSemestre?, limiteUnidade?, atribuiçãoFixa?, horasComprovante?)   // fator ausente é ignorado
correção      = o próprio pedido sai de P/PS antes de validar o substituto
progresso     = aprovadas (qualquer origem) / exigidas; pendências ficam fora
```

## Erros tipados

`saldo_alterado` (com `maximumMinutes`), `prazo_encerrado`, `requisito_ausente`, `formato_invalido`, `regra_indisponivel`, `nao_elegivel`,
`estado_invalido`, `nao_encontrado`, `falha_temporaria`. A interface explica cada um sem stack trace e preserva o formulário.

## Idempotência e concorrência

O envio gera uma chave por tentativa de formulário e a reutiliza em retry e duplo clique. O mock valida, reserva e grava sem `await` intermediário e guarda
o resultado por chave. Concorrência entre abas **não** é garantida no mock: o backend deve ser a autoridade (transação/revisão de saldo).
