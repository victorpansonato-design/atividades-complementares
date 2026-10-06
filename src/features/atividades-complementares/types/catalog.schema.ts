/**
 * Catálogo de tipos de atividade (regra). Fonte: anexo do regulamento geral de 2025,
 * transcrito em `mock/fixtures/catalogo-2025.json`.
 *
 * `localId` é chave LOCAL de briefing, não ID oficial do backend. O orçamento é
 * identificado por `budgetKey` + `catalogVersion`; nunca pelo título.
 */
import { z } from "zod";

export const UnitRuleKindSchema = z.enum([
   "project_assignment",
   "event_cap",
   "publication_cap",
   "presentation_cap",
   "activity_cap",
   "semester_assignment",
   "event_assignment",
   "activity_assignment",
   "certificate_hours",
   "one_time",
   "review_assignment",
   "participation_duration",
   "mode_dependent",
]);
export type UnitRuleKind = z.infer<typeof UnitRuleKindSchema>;

export const UnitRuleModeSchema = z.object({
   id: z.string(),
   label: z.string(),
   kind: UnitRuleKindSchema.exclude(["mode_dependent"]),
   limitMinutes: z.number().int().nonnegative().nullable(),
});
export type UnitRuleMode = z.infer<typeof UnitRuleModeSchema>;

export const UnitRuleSchema = z.object({
   kind: UnitRuleKindSchema,
   limitMinutes: z.number().int().nonnegative().nullable(),
   modes: z.array(UnitRuleModeSchema).optional(),
});
export type UnitRule = z.infer<typeof UnitRuleSchema>;

/** "Este documento" ou "uma destas alternativas" (anyOf). */
export const UploadRequirementSchema = z.object({
   key: z.string(),
   anyOf: z.array(z.string()).min(1),
   canShareFileWithOtherRequirements: z.boolean(),
});
export type UploadRequirement = z.infer<typeof UploadRequirementSchema>;

/** Requisito cumprido por registro institucional (ex.: cadastro do representante). */
export const InstitutionalRequirementSchema = z.object({
   key: z.string(),
   source: z.literal("institutional_record"),
   description: z.string(),
   studentUploadRequired: z.literal(false),
});
export type InstitutionalRequirement = z.infer<typeof InstitutionalRequirementSchema>;

/** Requisitos que dependem da modalidade escolhida (ex.: audiência x comissão). */
export const ConditionalRequirementSchema = z.object({
   key: z.string(),
   conditional: z.literal(true),
   modes: z.record(z.string(), z.array(UploadRequirementSchema)),
});

export const DocumentRequirementSchema = z.union([InstitutionalRequirementSchema, ConditionalRequirementSchema, UploadRequirementSchema]);
export type DocumentRequirement = z.infer<typeof DocumentRequirementSchema>;

export const ActivityTypeSchema = z.object({
   localId: z.string(),
   regulationCode: z.string(),
   variant: z.string().nullable(),
   systemCode: z.string().nullable(),
   displayName: z.string(),
   catalogVersion: z.string(),
   budgetKey: z.string(),
   budgetSharingConfirmed: z.boolean(),
   totalLimitMinutes: z.number().int().nonnegative().nullable(),
   unitRule: UnitRuleSchema.nullable(),
   documentRequirements: z.array(DocumentRequirementSchema),
   eligibility: z.array(z.string()),
   exclusions: z.array(z.string()),
   source: z
      .object({
         file: z.string(),
         page: z.number().int().optional(),
         additionalPages: z.array(z.number().int()).optional(),
      })
      .nullable(),
   /** `false` = não pode ser enviado pelo aluno (histórico, registro automático ou regra desconhecida). */
   manualSubmission: z.boolean(),
   /** Tipo só aparece no histórico; não vira opção de envio. */
   historicalOnly: z.boolean().default(false),
   /** Observação de origem quando a regra não está no regulamento fornecido. */
   provenanceNote: z.string().nullable().default(null),
});
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const CatalogSchema = z.object({
   catalogVersion: z.string(),
   /** Tipos que o aluno pode consultar/solicitar na sua versão de catálogo. */
   activities: z.array(ActivityTypeSchema),
   /** Tipos conhecidos apenas pelo histórico (outras versões, códigos institucionais). */
   historicalTypes: z.array(ActivityTypeSchema),
   /** Versão do catálogo indisponível para envio (ex.: matriz antiga sem regra). */
   submissionAvailable: z.boolean(),
   unavailableReason: z.string().nullable(),
});
export type Catalog = z.infer<typeof CatalogSchema>;
