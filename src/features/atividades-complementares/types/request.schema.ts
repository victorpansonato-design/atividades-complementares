/**
 * Solicitação/registro de atividade, comprovantes, histórico e rascunhos.
 *
 * Estados técnicos de domínio LOCAL. O adapter real fará o mapeamento para a
 * nomenclatura institucional (ver docs/CONTRATO.md).
 */
import { z } from "zod";

export const RequestStatusSchema = z.enum(["em_analise", "precisa_correcao", "reconsideracao_em_analise", "aprovada", "nao_aprovada"]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const RequestOriginSchema = z.enum(["manual", "institutional"]);
export type RequestOrigin = z.infer<typeof RequestOriginSchema>;

/** Metadados do comprovante. Os bytes ficam separados (IndexedDB no mock). */
export const AttachmentSchema = z.object({
   id: z.string(),
   name: z.string(),
   extension: z.string().nullable().default(null),
   mimeType: z.string().nullable().default(null),
   sizeBytes: z.number().int().nonnegative().nullable().default(null),
   /** Requisitos que o aluno indicou que este arquivo comprova. */
   requirementKeys: z.array(z.string()).default([]),
   /** Item ilustrativo do seed: não há arquivo real para abrir. */
   demoOnly: z.boolean().default(false),
   /** Se os bytes estão disponíveis para visualizar/baixar. */
   bytesAvailable: z.boolean().default(false),
   addedAt: z.string().nullable().default(null),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const HistoryEventTypeSchema = z.enum([
   "enviada",
   "em_analise",
   "precisa_correcao",
   "correcao_enviada",
   "aprovada",
   "nao_aprovada",
   "reconsideracao_enviada",
]);
export type HistoryEventType = z.infer<typeof HistoryEventTypeSchema>;

export const HistoryEventSchema = z.object({
   event: HistoryEventTypeSchema,
   occurredAt: z.string(),
   note: z.string().nullable().default(null),
});
export type HistoryEvent = z.infer<typeof HistoryEventSchema>;

/** Campos editáveis de uma versão do pedido (correção preserva as anteriores). */
export const RequestContentSchema = z.object({
   title: z.string(),
   organizer: z.string().nullable().default(null),
   details: z.string().nullable().default(null),
   /** Descrição legada composta (nome + organizador + detalhes), máx. 6.000. */
   description: z.string(),
   academicPeriodId: z.string(),
   startDate: z.string(),
   endDate: z.string(),
   modeId: z.string().nullable().default(null),
   certificateMinutes: z.number().int().nonnegative().nullable().default(null),
   requestedMinutes: z.number().int().positive().nullable(),
   attachments: z.array(AttachmentSchema).default([]),
});
export type RequestContent = z.infer<typeof RequestContentSchema>;

export const RequestVersionSchema = RequestContentSchema.extend({
   version: z.number().int().positive(),
   submittedAt: z.string().nullable(),
   correctionReason: z.string().nullable().default(null),
   studentResponse: z.string().nullable().default(null),
});
export type RequestVersion = z.infer<typeof RequestVersionSchema>;

export const ReconsiderationAttemptSchema = z.object({
   attempt: z.number().int().positive(),
   justification: z.string(),
   attachments: z.array(AttachmentSchema).default([]),
   submittedAt: z.string(),
   status: z.enum(["em_analise", "aprovada", "nao_aprovada"]),
   decisionReason: z.string().nullable().default(null),
   decidedAt: z.string().nullable().default(null),
});
export type ReconsiderationAttempt = z.infer<typeof ReconsiderationAttemptSchema>;

export const ActivityRequestSchema = RequestContentSchema.extend({
   id: z.string(),
   /** Linhagem: pedido, versões de correção e reconsiderações compartilham a mesma reserva. */
   lineageId: z.string(),
   activityLocalId: z.string(),
   catalogVersion: z.string(),
   status: RequestStatusSchema,
   origin: RequestOriginSchema,
   /** Ausente em registros automáticos. */
   protocol: z.string().nullable().default(null),
   /** Registro institucional automático. EventId não é protocolo. */
   eventId: z.string().nullable().default(null),
   /** Computadas na decisão. `null` enquanto não há decisão. */
   approvedMinutes: z.number().int().nonnegative().nullable(),
   decisionReason: z.string().nullable().default(null),
   correctionReason: z.string().nullable().default(null),
   /** Prazo para responder pendência/pedir reconsideração, retornado pelo gateway. */
   actionDeadlineDate: z.string().nullable().default(null),
   deadlineIsMock: z.boolean().default(false),
   fixtureNotice: z.string().nullable().default(null),
   submittedAt: z.string().nullable().default(null),
   updatedAt: z.string(),
   currentVersion: z.number().int().positive().default(1),
   previousVersions: z.array(RequestVersionSchema).default([]),
   reconsiderations: z.array(ReconsiderationAttemptSchema).default([]),
   history: z.array(HistoryEventSchema),
   /** Minutos reservados no saldo agora (calculado pelo gateway). */
   reservedMinutes: z.number().int().nonnegative().default(0),
});
export type ActivityRequest = z.infer<typeof ActivityRequestSchema>;

export const RequestListSchema = z.array(ActivityRequestSchema);

/** Rascunho local: não reserva saldo. */
export const DraftSchema = z.object({
   id: z.string(),
   activityLocalId: z.string().nullable(),
   catalogVersion: z.string(),
   title: z.string().nullable(),
   /** Valores do formulário serializados (sem bytes de arquivos). */
   values: z.record(z.string(), z.unknown()),
   createdAt: z.string(),
   updatedAt: z.string(),
});
export type Draft = z.infer<typeof DraftSchema>;
export const DraftListSchema = z.array(DraftSchema);
