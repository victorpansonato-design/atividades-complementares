/**
 * Modelo do formulário (RHF + Zod). O schema base define a forma dos valores; a
 * validação contextual (saldo, limites, período, documentos) é adicionada com
 * `superRefine` a partir do contexto atual (catálogo, saldos, perfil).
 */
import { z } from "zod";
import type { BudgetSnapshot } from "../../types/budget.schema";
import type { ActivityType, Catalog } from "../../types/catalog.schema";
import type { Attachment } from "../../types/request.schema";
import type { StudentContext } from "../../types/student.schema";
import type { SubmitRequestInput } from "../../types/gateway";
import { presentActivity } from "../../content/catalog-presentation";
import { BLOCK_REASON } from "../../content/texts";
import { findBudget } from "../../rules/budget";
import { checkAdmission, checkPeriodConsistency, isIsoDate } from "../../rules/dates";
import { composeLegacyDescription, LEGACY_DESCRIPTION_LIMIT } from "../../rules/description";
import { formatMinutes, minutesToFields, parseDurationFields } from "../../rules/duration";
import { computeRequestLimits, evaluateActivity, type RequestLimits, type SelfReservation } from "../../rules/limits";
import { evaluateCoverage, requirementLabel, resolveRequirements, type ResolvedRequirement } from "../../rules/requirements";

export const DurationFieldsSchema = z.object({ hours: z.string(), minutes: z.string() });

export const FormAttachmentSchema = z.object({
   id: z.string(),
   name: z.string(),
   extension: z.string().nullable(),
   mimeType: z.string().nullable(),
   sizeBytes: z.number().nullable(),
   requirementKeys: z.array(z.string()),
   demoOnly: z.boolean(),
   /** "ready": bytes disponíveis; "missing": precisa reanexar; "kept": enviado em versão anterior. */
   state: z.enum(["ready", "missing", "kept"]),
   addedAt: z.string().nullable(),
});
export type FormAttachment = z.infer<typeof FormAttachmentSchema>;

export const RequestFormSchema = z.object({
   activityLocalId: z.string(),
   modeId: z.string().nullable(),
   title: z.string(),
   organizer: z.string(),
   /** Atividade de um dia só (padrão): uma data, e a final acompanha a inicial. */
   singleDay: z.boolean(),
   startDate: z.string(),
   endDate: z.string(),
   academicPeriodId: z.string(),
   /** Período veio da sugestão pelas datas (o aluno ainda pode confirmar/alterar). */
   periodSuggested: z.boolean(),
   certificate: DurationFieldsSchema,
   requested: DurationFieldsSchema,
   /** "auto": horas solicitadas acompanham o máximo calculado; "manual": o aluno digitou. */
   requestedMode: z.enum(["auto", "manual"]),
   details: z.string(),
   attachments: z.array(FormAttachmentSchema),
   declaration: z.boolean(),
   /** Somente na correção: resposta à coordenação. */
   studentResponse: z.string(),
});
export type RequestFormValues = z.infer<typeof RequestFormSchema>;

export const EMPTY_FORM: RequestFormValues = {
   activityLocalId: "",
   modeId: null,
   title: "",
   organizer: "",
   singleDay: true,
   startDate: "",
   endDate: "",
   academicPeriodId: "",
   periodSuggested: false,
   certificate: { hours: "", minutes: "" },
   requested: { hours: "", minutes: "" },
   requestedMode: "auto",
   details: "",
   attachments: [],
   declaration: false,
   studentResponse: "",
};

export const STEP_FIELDS = {
   1: ["activityLocalId", "modeId"],
   2: [
      "title",
      "organizer",
      "startDate",
      "endDate",
      "academicPeriodId",
      "certificate",
      "requested",
      "details",
      "attachments",
      "studentResponse",
   ],
   3: ["declaration"],
} as const satisfies Record<number, readonly (keyof RequestFormValues)[]>;

export type WizardStep = 1 | 2 | 3;

/** Ids dos campos, para foco e para o resumo de erros. */
export const FIELD_ID: Record<keyof RequestFormValues, string> = {
   activityLocalId: "ac-activity-search",
   modeId: "ac-mode",
   title: "ac-title",
   organizer: "ac-organizer",
   singleDay: "ac-single-day",
   startDate: "ac-start-date",
   endDate: "ac-end-date",
   academicPeriodId: "ac-period",
   periodSuggested: "ac-period",
   certificate: "ac-certificate-hours",
   requested: "ac-requested-hours",
   requestedMode: "ac-requested-hours",
   details: "ac-details",
   attachments: "ac-attachments",
   declaration: "ac-declaration",
   studentResponse: "ac-student-response",
};

export const FIELD_LABEL: Record<keyof RequestFormValues, string> = {
   activityLocalId: "Atividade",
   modeId: "Tipo de participação",
   title: "Nome do curso, evento ou atividade",
   organizer: "Instituição ou organizador",
   singleDay: "Data",
   startDate: "Data inicial",
   endDate: "Data final",
   academicPeriodId: "Ano e período",
   periodSuggested: "Ano e período",
   certificate: "Horas do comprovante",
   requested: "Horas que deseja solicitar",
   requestedMode: "Horas que deseja solicitar",
   details: "Informações complementares",
   attachments: "Comprovantes",
   declaration: "Declaração",
   studentResponse: "Resposta à coordenação",
};

/* ------------------------------------------------------------------ */
/* Contexto de validação                                               */
/* ------------------------------------------------------------------ */

export interface FormContext {
   mode: "create" | "correction";
   student: StudentContext;
   catalog: Catalog;
   budgets: BudgetSnapshot;
   courseComplete: boolean;
   /** Correção: reserva do próprio pedido sai do somatório. */
   self: SelfReservation | null;
}

export interface DerivedState {
   activity: ActivityType | undefined;
   requirements: ResolvedRequirement[] | null;
   limits: RequestLimits | null;
   certificateMinutes: number | null;
   requestedMinutes: number | null;
   description: string;
}

export function findActivity(ctx: Pick<FormContext, "catalog">, localId: string): ActivityType | undefined {
   return ctx.catalog.activities.find(a => a.localId === localId);
}

export function deriveState(values: RequestFormValues, ctx: FormContext): DerivedState {
   const activity = findActivity(ctx, values.activityLocalId);
   const certificate = parseDurationFields(values.certificate);
   const requested = parseDurationFields(values.requested);
   const certificateMinutes = certificate.ok ? certificate.minutes : null;
   const limits = activity
      ? computeRequestLimits({
           activity,
           modeId: values.modeId,
           budget: findBudget(ctx.budgets.items, activity),
           periodId: values.academicPeriodId || null,
           certificateMinutes,
           self: ctx.self,
           policies: ctx.student.policies,
        })
      : null;
   return {
      activity,
      requirements: activity ? resolveRequirements(activity, values.modeId) : null,
      limits,
      certificateMinutes,
      requestedMinutes: requested.ok ? requested.minutes : null,
      description: composeLegacyDescription({ title: values.title, organizer: values.organizer, details: values.details }),
   };
}

function overLimitMessage(limits: RequestLimits): string {
   const max = limits.maximum.maximumMinutes ?? 0;
   if (max === 0) {
      if (limits.maximum.binding?.kind === "semester_balance") return "Você já utilizou o limite deste tipo no período selecionado.";
      return "Não há saldo disponível para este tipo de atividade.";
   }
   return `Neste pedido você pode solicitar até ${formatMinutes(max)}. Ajuste as horas.`;
}

export function buildFormSchema(ctx: FormContext) {
   return RequestFormSchema.superRefine((values, issue) => {
      const add = (path: keyof RequestFormValues, message: string) => issue.addIssue({ code: "custom", path: [path], message });
      const derived = deriveState(values, ctx);
      const { activity, limits } = derived;

      // Passo 1
      if (!values.activityLocalId) {
         add("activityLocalId", "Escolha a atividade que você realizou.");
         return;
      }
      if (!activity) {
         add("activityLocalId", "Esta atividade não está mais disponível. Escolha outra.");
         return;
      }
      if (ctx.mode === "create") {
         const availability = evaluateActivity({
            activity,
            budget: findBudget(ctx.budgets.items, activity),
            student: ctx.student,
            catalog: ctx.catalog,
            courseComplete: ctx.courseComplete,
         });
         if (availability.blockReason) add("activityLocalId", BLOCK_REASON[availability.blockReason].hint);
      }
      if (limits?.needsMode) add("modeId", "Escolha qual opção descreve a sua participação.");

      // Passo 2
      const presentation = presentActivity(activity);
      if (!values.title.trim()) add("title", "Informe o nome do curso, evento ou atividade.");
      if (presentation.organizer === "required" && !values.organizer.trim())
         add("organizer", `Informe: ${presentation.organizerLabel.toLowerCase()}.`);

      const startOk = isIsoDate(values.startDate);
      const endOk = isIsoDate(values.endDate);
      if (!startOk) add("startDate", "Informe a data inicial.");
      if (!endOk) add("endDate", "Informe a data final.");
      if (startOk && endOk && values.endDate < values.startDate) add("endDate", "A data final não pode ser anterior à data inicial.");
      if (
         startOk &&
         endOk &&
         ctx.student.policies.preAdmissionActivities === "block" &&
         checkAdmission(activity, ctx.student.admissionDate, values.startDate, values.endDate) === "before_admission"
      ) {
         add("startDate", "Atividades realizadas antes do ingresso não podem ser enviadas para este tipo.");
      }

      if (!values.academicPeriodId) add("academicPeriodId", "Selecione o ano e o período da atividade.");
      else if (
         startOk &&
         endOk &&
         checkPeriodConsistency(ctx.student, values.academicPeriodId, values.startDate, values.endDate) === "mismatch"
      ) {
         add("academicPeriodId", "O período selecionado não corresponde às datas informadas. Confira as datas ou o período.");
      }

      const certificate = parseDurationFields(values.certificate);
      if (limits && limits.certificateUsage !== "hidden") {
         if (!certificate.ok) add("certificate", "Use horas inteiras e minutos de 0 a 59.");
         else if (limits.certificateUsage === "required" && !certificate.minutes)
            add("certificate", "Informe as horas que constam no comprovante.");
      }

      const requested = parseDurationFields(values.requested);
      if (!requested.ok) add("requested", "Use horas inteiras e minutos de 0 a 59.");
      else if (requested.minutes == null) add("requested", "Informe quantas horas deseja solicitar.");
      else if (requested.minutes === 0) add("requested", "As horas solicitadas devem ser maiores que zero.");
      else if (limits && !limits.needsMode && limits.maximum.maximumMinutes != null && requested.minutes > limits.maximum.maximumMinutes) {
         add("requested", overLimitMessage(limits));
      }

      if (derived.description.length > LEGACY_DESCRIPTION_LIMIT) {
         add(
            "details",
            `A descrição completa passou de ${LEGACY_DESCRIPTION_LIMIT.toLocaleString("pt-BR")} caracteres. Reduza ${(derived.description.length - LEGACY_DESCRIPTION_LIMIT).toLocaleString("pt-BR")} caracteres.`,
         );
      }

      if (derived.requirements) {
         const usable = values.attachments.filter(a => a.state !== "missing");
         const missingFiles = values.attachments.filter(a => a.state === "missing");
         const coverage = evaluateCoverage(derived.requirements, usable, ctx.student.institutionalRecords);
         if (missingFiles.length > 0) {
            add(
               "attachments",
               `Reanexe ${missingFiles.map(f => `“${f.name}”`).join(", ")}: o arquivo não está mais disponível neste dispositivo.`,
            );
         } else if (!coverage.allCovered) {
            const missing = coverage.items.filter(i => !i.covered).map(i => requirementLabel(i.requirement));
            add("attachments", `Falta anexar: ${missing.join("; ")}.`);
         }
         if (values.attachments.length > ctx.student.policies.maxFilesPerRequest) {
            add("attachments", `Envie no máximo ${ctx.student.policies.maxFilesPerRequest} arquivos neste pedido.`);
         }
      }

      // Passo 3
      if (!values.declaration) add("declaration", "Confirme a declaração para enviar.");
   });
}

/**
 * Horas sugeridas automaticamente: o próprio máximo do pedido, quando ele vem de
 * um valor conhecido (horas do comprovante ou atribuição fixa/semestral). Em regras
 * "até X por evento" sem comprovante informado não há como saber: o aluno digita.
 */
export function suggestRequestedMinutes(limits: RequestLimits | null, certificateMinutes: number | null): number | null {
   if (!limits || limits.needsMode || !limits.rule) return null;
   const max = limits.maximum.maximumMinutes;
   if (max == null || max <= 0) return null;
   const fromCertificate = limits.certificateUsage !== "hidden" && certificateMinutes != null && certificateMinutes > 0;
   const fromFixedRule = limits.fixedAssignmentMinutes != null || limits.semesterLimitMinutes != null;
   return fromCertificate || fromFixedRule ? max : null;
}

/* ------------------------------------------------------------------ */
/* Conversões                                                          */
/* ------------------------------------------------------------------ */

export function toAttachments(list: FormAttachment[]): Attachment[] {
   return list
      .filter(a => a.state !== "missing")
      .map(a => ({
         id: a.id,
         name: a.name,
         extension: a.extension,
         mimeType: a.mimeType,
         sizeBytes: a.sizeBytes,
         requirementKeys: a.requirementKeys,
         demoOnly: a.demoOnly,
         bytesAvailable: a.state === "ready",
         addedAt: a.addedAt,
      }));
}

export function fromAttachments(list: Attachment[]): FormAttachment[] {
   return list.map(a => ({
      id: a.id,
      name: a.name,
      extension: a.extension,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      requirementKeys: a.requirementKeys,
      demoOnly: a.demoOnly,
      state: "kept",
      addedAt: a.addedAt,
   }));
}

export function toSubmitInput(values: RequestFormValues, ctx: FormContext, draftId: string | null): SubmitRequestInput {
   const derived = deriveState(values, ctx);
   return {
      activityLocalId: values.activityLocalId,
      catalogVersion: ctx.catalog.catalogVersion,
      modeId: values.modeId,
      title: values.title.trim(),
      organizer: values.organizer.trim() || null,
      details: values.details.trim() || null,
      description: derived.description,
      academicPeriodId: values.academicPeriodId,
      startDate: values.startDate,
      endDate: values.endDate,
      certificateMinutes: derived.limits?.certificateUsage === "hidden" ? null : derived.certificateMinutes,
      requestedMinutes: derived.requestedMinutes ?? 0,
      attachments: toAttachments(values.attachments),
      declarationAccepted: values.declaration,
      draftId,
   };
}

/** Valores serializáveis para rascunho (sem bytes; anexos viram metadados). */
export function toDraftValues(values: RequestFormValues): Record<string, unknown> {
   return { ...values, declaration: false };
}

export function fromDraftValues(raw: Record<string, unknown>): RequestFormValues {
   const parsed = RequestFormSchema.safeParse({ ...EMPTY_FORM, ...raw });
   return parsed.success ? parsed.data : EMPTY_FORM;
}

export { minutesToFields };
