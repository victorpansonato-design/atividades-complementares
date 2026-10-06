/**
 * Disponibilidade de cada tipo (passo 1) e máximo por pedido (passo 2).
 * Combina saldo do tipo, limite semestral, limite por unidade, atribuição fixa,
 * horas do comprovante, uso único, elegibilidade e janela de entrega.
 */
import type { Budget } from "../types/budget.schema";
import type { ActivityType, Catalog } from "../types/catalog.schema";
import type { Policies, StudentContext } from "../types/student.schema";
import {
   certificateUsage,
   computeMaximumRequest,
   computeReplacementAvailable,
   computeSemesterBalance,
   computeTypeBalance,
   evaluateOneTime,
   isCapRule,
   isFixedAssignment,
   isSemesterRule,
   requiresMode,
   resolveUnitRule,
   type CertificateUsage,
   type EffectiveUnitRule,
   type MaximumRequest,
} from "./budget";
import { computeSubmissionWindow } from "./dates";

export type ActivityBlockReason =
   | "not_eligible"
   | "historical_only"
   | "rule_unavailable"
   | "catalog_unavailable"
   | "approved_limit_reached"
   | "reserved_in_review"
   | "one_time_used"
   | "one_time_in_review"
   | "submission_closed"
   | "course_complete";

export interface ActivityAvailability {
   activity: ActivityType;
   eligible: boolean;
   submittable: boolean;
   blockReason: ActivityBlockReason | null;
   totalLimitMinutes: number | null;
   approvedMinutes: number;
   reservedMinutes: number;
   availableMinutes: number | null;
   oneTime: boolean;
   /** Limite por período (regras "X horas por semestre"). */
   semesterLimitMinutes: number | null;
   /** Saldo no período atual, apenas informativo no passo 1 (o período real é validado no passo 2). */
   currentPeriodAvailableMinutes: number | null;
}

export function isEligible(activity: Pick<ActivityType, "eligibility">, student: Pick<StudentContext, "eligibility">): boolean {
   return activity.eligibility.some(e => student.eligibility.includes(e));
}

function semesterLimitOf(activity: ActivityType): number | null {
   const rule = activity.unitRule;
   if (rule && isSemesterRule(rule.kind)) return rule.limitMinutes;
   return null;
}

export function evaluateActivity(input: {
   activity: ActivityType;
   budget: Budget | undefined;
   student: StudentContext;
   catalog: Pick<Catalog, "submissionAvailable">;
   courseComplete: boolean;
}): ActivityAvailability {
   const { activity, budget, student, catalog, courseComplete } = input;
   const approvedMinutes = budget?.approvedMinutes ?? 0;
   const reservedMinutes = budget?.reservedMinutes ?? 0;
   const balance = computeTypeBalance({ totalLimitMinutes: activity.totalLimitMinutes, approvedMinutes, reservedMinutes });
   const oneTime = activity.unitRule?.kind === "one_time";
   const semesterLimitMinutes = semesterLimitOf(activity);
   const currentUsage = budget?.byPeriod[student.currentAcademicPeriodId];
   const currentPeriodAvailableMinutes =
      semesterLimitMinutes != null
         ? computeSemesterBalance({
              semesterLimitMinutes,
              semesterApprovedMinutes: currentUsage?.approvedMinutes ?? 0,
              semesterReservedMinutes: currentUsage?.reservedMinutes ?? 0,
           })
         : null;

   const eligible = isEligible(activity, student);
   const window = computeSubmissionWindow(student);

   let blockReason: ActivityBlockReason | null = null;
   if (activity.historicalOnly) blockReason = "historical_only";
   else if (!catalog.submissionAvailable) blockReason = "catalog_unavailable";
   else if (!activity.manualSubmission || activity.unitRule == null || activity.totalLimitMinutes == null) blockReason = "rule_unavailable";
   else if (!eligible) blockReason = "not_eligible";
   else if (!window.open) blockReason = "submission_closed";
   else if (courseComplete && !student.policies.allowNewRequestsAfterCompletion) blockReason = "course_complete";
   else {
      const oneTimeCheck = evaluateOneTime({
         oneTime,
         approvedUses: budget?.approvedUses ?? 0,
         activeUses: budget?.activeUses ?? 0,
      });
      if (!oneTimeCheck.canSubmit) blockReason = oneTimeCheck.reason === "one_time_used" ? "one_time_used" : "one_time_in_review";
      else if (balance.reason === "approved_limit_reached") blockReason = "approved_limit_reached";
      else if (balance.reason === "reserved_in_review") blockReason = "reserved_in_review";
   }

   return {
      activity,
      eligible,
      submittable: blockReason === null,
      blockReason,
      totalLimitMinutes: activity.totalLimitMinutes,
      approvedMinutes,
      reservedMinutes,
      availableMinutes: balance.availableMinutes,
      oneTime,
      semesterLimitMinutes,
      currentPeriodAvailableMinutes,
   };
}

/* ------------------------------------------------------------------ */
/* Máximo para um pedido concreto                                      */
/* ------------------------------------------------------------------ */

export interface SelfReservation {
   /** Reserva atual do próprio pedido (correção): sai do somatório. */
   reservedMinutes: number;
   periodId: string;
}

export interface RequestLimits {
   rule: EffectiveUnitRule | null;
   needsMode: boolean;
   certificateUsage: CertificateUsage;
   typeAvailableMinutes: number | null;
   semesterLimitMinutes: number | null;
   semesterAvailableMinutes: number | null;
   unitLimitMinutes: number | null;
   fixedAssignmentMinutes: number | null;
   maximum: MaximumRequest;
   /** Saldo menor que a atribuição fixa: pedido parcial depende da análise (configurável). */
   partialFixedAssignment: boolean;
}

export function computeRequestLimits(input: {
   activity: ActivityType;
   modeId: string | null;
   budget: Budget | undefined;
   periodId: string | null;
   certificateMinutes: number | null;
   self?: SelfReservation | null;
   policies: Pick<Policies, "partialCreditForFixedAssignment">;
}): RequestLimits {
   const { activity, modeId, budget, periodId, certificateMinutes, self, policies } = input;
   const rule = resolveUnitRule(activity, modeId);
   const needsMode = requiresMode(activity) && !rule;
   const usage = certificateUsage(rule);

   const approved = budget?.approvedMinutes ?? 0;
   const reserved = budget?.reservedMinutes ?? 0;
   const typeAvailableMinutes =
      activity.totalLimitMinutes == null
         ? null
         : computeReplacementAvailable({
              totalLimitMinutes: activity.totalLimitMinutes,
              approvedMinutes: approved,
              reservedMinutesIncludingSelf: reserved,
              selfReservedMinutes: self?.reservedMinutes ?? 0,
           });

   let semesterLimitMinutes: number | null = null;
   let semesterAvailableMinutes: number | null = null;
   if (rule && isSemesterRule(rule.kind) && rule.limitMinutes != null) {
      semesterLimitMinutes = rule.limitMinutes;
      if (periodId) {
         const periodUsage = budget?.byPeriod[periodId];
         const selfInPeriod = self && self.periodId === periodId ? self.reservedMinutes : 0;
         semesterAvailableMinutes = computeSemesterBalance({
            semesterLimitMinutes: rule.limitMinutes,
            semesterApprovedMinutes: periodUsage?.approvedMinutes ?? 0,
            semesterReservedMinutes: Math.max(0, (periodUsage?.reservedMinutes ?? 0) - selfInPeriod),
         });
      }
   }

   const isCap = rule != null && isCapRule(rule.kind);
   const unitLimitMinutes = isCap ? (rule?.limitMinutes ?? null) : null;
   const fixedAssignmentMinutes = rule && isFixedAssignment(rule.kind) && !isSemesterRule(rule.kind) ? rule.limitMinutes : null;
   const appliedCertificate = usage === "hidden" ? null : certificateMinutes;

   let maximum = computeMaximumRequest({
      typeAvailableMinutes: rule ? typeAvailableMinutes : null,
      semesterAvailableMinutes,
      unitLimitMinutes,
      fixedAssignmentMinutes,
      certificateMinutes: appliedCertificate,
   });

   const fixedReference = fixedAssignmentMinutes ?? semesterLimitMinutes;
   let partialFixedAssignment =
      fixedReference != null && maximum.maximumMinutes != null && maximum.maximumMinutes < fixedReference && maximum.maximumMinutes > 0;
   if (partialFixedAssignment && policies.partialCreditForFixedAssignment === "block") {
      maximum = { ...maximum, maximumMinutes: 0 };
      partialFixedAssignment = false;
   }

   return {
      rule,
      needsMode,
      certificateUsage: usage,
      typeAvailableMinutes,
      semesterLimitMinutes,
      semesterAvailableMinutes,
      unitLimitMinutes,
      fixedAssignmentMinutes,
      maximum,
      partialFixedAssignment,
   };
}
