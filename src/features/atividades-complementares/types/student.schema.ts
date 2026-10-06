/**
 * Contexto do aluno/matrícula: perfil, matriz, catálogo aplicável, elegibilidade,
 * calendário acadêmico (mockado) e políticas configuráveis.
 *
 * Os dados do mock são FICTÍCIOS. Em produção, identidade e matrícula virão da
 * autenticação do portal e do backend institucional.
 */
import { z } from "zod";

export const ModalitySchema = z.enum(["presencial", "ead", "hibrido"]);
export type Modality = z.infer<typeof ModalitySchema>;

export const AcademicPeriodSchema = z.object({
   id: z.string(),
   label: z.string(),
   startDate: z.string(),
   endDate: z.string(),
});
export type AcademicPeriod = z.infer<typeof AcademicPeriodSchema>;

export const PoliciesSchema = z.object({
   dataMode: z.string(),
   /** Pendência continua reservando horas (política provisória). */
   pendingCorrectionReserves: z.boolean(),
   /** Reconsideração reserva uma única vez por linhagem (política provisória). */
   reconsiderationReservesOncePerLineage: z.boolean(),
   /** Total do curso concluído não bloqueia novos pedidos sem configuração institucional. */
   globalCourseLimitBlocksNewRequests: z.boolean(),
   maxUploadBytesPerFile: z.number().int().positive(),
   maxFilesPerRequest: z.number().int().positive(),
   uploadLimitsAreMock: z.boolean(),
   analysisSlaBusinessDays: z.number().int().positive().nullable(),
   /** Sem calendário institucional não se calcula data de "dias úteis". */
   institutionalHolidayCalendar: z.unknown().nullable(),
   /** Enquadramento do híbrido para prazo de concluinte (não definido no regulamento). */
   hybridConclusionPolicy: z.string().nullable(),
   automaticApproval: z.literal(false),
   /** Atividade anterior ao ingresso em tipos gerais: avisar ou bloquear. */
   preAdmissionActivities: z.enum(["warn", "block"]).default("warn"),
   /** Sugerir período acadêmico a partir das datas (somente quando o calendário permite). */
   suggestPeriodFromDates: z.boolean().default(true),
   /** Atribuição fixa (2/3/15/20/40h) com saldo menor: permitir pedido parcial com aviso. */
   partialCreditForFixedAssignment: z.enum(["allow_with_notice", "block"]).default("allow_with_notice"),
   /** Tentativas de reconsideração por pedido (provisório). */
   reconsiderationMaxAttempts: z.number().int().positive().default(1),
   /** Documentos na reconsideração: opcionais ou exigidos. */
   reconsiderationDocuments: z.enum(["optional", "required"]).default("optional"),
   /** Novos pedidos depois de cumprir a carga exigida. */
   allowNewRequestsAfterCompletion: z.boolean().default(true),
   /** Uso único: pedido recusado libera nova tentativa (provisório). */
   oneTimeRejectedAllowsRetry: z.boolean().default(true),
});
export type Policies = z.infer<typeof PoliciesSchema>;

export const InstitutionalRecordStateSchema = z.enum(["confirmed", "not_found", "unknown"]);
export type InstitutionalRecordState = z.infer<typeof InstitutionalRecordStateSchema>;

export const StudentContextSchema = z.object({
   id: z.string(),
   ra: z.string(),
   name: z.string(),
   course: z.string(),
   modality: ModalitySchema,
   matrixId: z.string(),
   admissionDate: z.string(),
   catalogVersion: z.string(),
   /** Carga exigida pela matriz. Pode faltar: não dividir por zero. */
   requiredMinutes: z.number().int().nonnegative().nullable(),
   eligibility: z.array(z.string()),
   isConcluding: z.boolean(),
   expectedConclusionDate: z.string().nullable(),
   /** Prazo de entrega do concluinte (arts. 6º e 7º). Vem do calendário institucional. */
   submissionDeadlineDate: z.string().nullable(),
   deadlineIsMock: z.boolean(),
   currentAcademicPeriodId: z.string(),
   periodsAreMock: z.boolean(),
   academicPeriods: z.array(AcademicPeriodSchema),
   /** Estado de requisitos cumpridos por registro institucional (chave do requisito → estado). */
   institutionalRecords: z.record(z.string(), InstitutionalRecordStateSchema),
   /** "Hoje" do gateway. No mock, data fixa do fixture para demonstrações reproduzíveis. */
   referenceDate: z.string(),
   timeZone: z.string(),
   policies: PoliciesSchema,
   /** Identifica o cenário de demonstração (somente mock). */
   scenarioId: z.string().nullable(),
});
export type StudentContext = z.infer<typeof StudentContextSchema>;
