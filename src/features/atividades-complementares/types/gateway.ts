/**
 * Fronteira de dados da feature. Os componentes nunca conhecem a implementação:
 * hooks do React Query chamam o gateway, que hoje é o adapter mock assíncrono.
 *
 * O futuro adapter de backend implementará esta mesma interface com contratos
 * revisados pelo TI (ver docs/CONTRATO.md). Todas as respostas passam por Zod.
 */
import type { BudgetSnapshot, CourseSummary } from "./budget.schema";
import type { Catalog } from "./catalog.schema";
import type { ActivityRequest, Attachment, Draft } from "./request.schema";
import type { StudentContext } from "./student.schema";

export interface SubmitRequestInput {
   activityLocalId: string;
   catalogVersion: string;
   modeId: string | null;
   title: string;
   organizer: string | null;
   details: string | null;
   /** Descrição legada composta. O adapter não trunca: rejeita acima do limite. */
   description: string;
   academicPeriodId: string;
   startDate: string;
   endDate: string;
   certificateMinutes: number | null;
   requestedMinutes: number;
   attachments: Attachment[];
   declarationAccepted: boolean;
   /** Rascunho de origem, excluído após o envio. */
   draftId: string | null;
}

export interface CorrectionReplyInput extends Omit<SubmitRequestInput, "activityLocalId" | "catalogVersion" | "draftId"> {
   studentResponse: string | null;
}

export interface ReconsiderationInput {
   justification: string;
   attachments: Attachment[];
   declarationAccepted: boolean;
}

export interface MutationOptions {
   /** Mesma chave em retry/duplo clique devolve o mesmo resultado, sem duplicar. */
   idempotencyKey: string;
   /** Revisão de saldo vista pelo aluno; o gateway revalida no envio. */
   budgetRevision?: string | null;
}

export interface SaveDraftInput {
   id: string | null;
   activityLocalId: string | null;
   title: string | null;
   values: Record<string, unknown>;
}

export interface AtividadesGateway {
   getStudentContext(): Promise<StudentContext>;
   listActivityTypes(): Promise<Catalog>;
   getSummary(): Promise<CourseSummary>;
   getBudgets(): Promise<BudgetSnapshot>;
   listRequests(): Promise<ActivityRequest[]>;
   getRequest(id: string): Promise<ActivityRequest>;
   listDrafts(): Promise<Draft[]>;
   getDraft(id: string): Promise<Draft>;
   saveDraft(input: SaveDraftInput): Promise<Draft>;
   deleteDraft(id: string): Promise<void>;
   createRequest(input: SubmitRequestInput, options: MutationOptions): Promise<ActivityRequest>;
   replyToCorrection(requestId: string, input: CorrectionReplyInput, options: MutationOptions): Promise<ActivityRequest>;
   requestReconsideration(requestId: string, input: ReconsiderationInput, options: MutationOptions): Promise<ActivityRequest>;
   /** Bytes do comprovante quando disponíveis; `null` quando só há metadados. */
   getAttachment(attachmentId: string): Promise<Blob | null>;
   /** Guarda os bytes de um arquivo anexado localmente (no backend real: upload). */
   storeAttachment(attachmentId: string, file: Blob): Promise<{ persisted: boolean }>;
   discardAttachment(attachmentId: string): Promise<void>;
}

/** Erros tipados que a interface sabe explicar. */
export type GatewayErrorCode =
   | "saldo_alterado"
   | "prazo_encerrado"
   | "requisito_ausente"
   | "formato_invalido"
   | "regra_indisponivel"
   | "nao_elegivel"
   | "estado_invalido"
   | "nao_encontrado"
   | "falha_temporaria";

export class GatewayError extends Error {
   readonly code: GatewayErrorCode;
   readonly details: Record<string, unknown>;

   constructor(code: GatewayErrorCode, message: string, details: Record<string, unknown> = {}) {
      super(message);
      this.name = "GatewayError";
      this.code = code;
      this.details = details;
   }
}

export function isGatewayError(error: unknown): error is GatewayError {
   return error instanceof GatewayError;
}

/* ------------------------------------------------------------------------- */
/* Controles exclusivos do modo de demonstração (não fazem parte do contrato). */
/* ------------------------------------------------------------------------- */

export type SimulatedDecision =
   | { kind: "aprovar"; approvedMinutes: number; reason: string | null }
   | { kind: "pedir_correcao"; reason: string; deadlineDate: string | null }
   | { kind: "nao_aprovar"; reason: string; deadlineDate: string | null };

export interface DemoSimulationSettings {
   /** Latência de cada chamada, em ms. */
   latencyMs: number;
   /** Primeira tentativa de cada envio falha; o retry com a mesma chave funciona. */
   failFirstSubmitAttempt: boolean;
   /** Listagem de pedidos falha (para demonstrar o estado de erro). */
   failRequestList: boolean;
   /** Sobrescreve prazos de pendência/reconsideração com uma data vencida. */
   expiredActionDeadlines: boolean;
}

export interface DemoScenarioInfo {
   id: string;
   label: string;
}

export interface DemoState {
   scenarioId: string;
   scenarios: DemoScenarioInfo[];
   settings: DemoSimulationSettings;
   storageVersion: number;
   bytesPersistence: "indexeddb" | "memory";
}

export interface DemoControls {
   getDemoState(): Promise<DemoState>;
   selectScenario(scenarioId: string): Promise<void>;
   updateSettings(settings: Partial<DemoSimulationSettings>): Promise<void>;
   simulateDecision(requestId: string, decision: SimulatedDecision): Promise<ActivityRequest>;
   reset(): Promise<void>;
}
