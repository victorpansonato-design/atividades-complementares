/**
 * Regras puras de saldo e limite (ver 03-REGRAS: "Cálculos em minutos").
 *
 *   saldoTipo      = max(0, T - A - P)
 *   saldoSemestre  = max(0, S - AS - PS)                 // só com regra por período
 *   maximoPedido   = min(saldoTipo, saldoSemestre?, limiteUnidade?, horasComprovante?)
 *
 * `?` = fator não aplicável é IGNORADO (nunca tratado como zero).
 * O saldo do tipo é independente do total do curso: não há bloqueio global.
 */
import type { Budget, CourseSummary, PeriodUsage } from "../types/budget.schema";
import type { ActivityType, UnitRuleKind } from "../types/catalog.schema";
import type { ActivityRequest, RequestStatus } from "../types/request.schema";
import type { Policies, StudentContext } from "../types/student.schema";

/* ------------------------------------------------------------------ */
/* Saldo do tipo                                                       */
/* ------------------------------------------------------------------ */

export type BalanceReason = "available" | "approved_limit_reached" | "reserved_in_review" | "unknown_limit";

export interface TypeBalanceInput {
   totalLimitMinutes: number | null;
   approvedMinutes: number;
   reservedMinutes: number;
}

export interface TypeBalance {
   availableMinutes: number | null;
   reason: BalanceReason;
}

export function computeTypeBalance({ totalLimitMinutes, approvedMinutes, reservedMinutes }: TypeBalanceInput): TypeBalance {
   if (totalLimitMinutes == null) return { availableMinutes: null, reason: "unknown_limit" };
   const availableMinutes = Math.max(0, totalLimitMinutes - approvedMinutes - reservedMinutes);
   if (availableMinutes > 0) return { availableMinutes, reason: "available" };
   // Aprovadas sozinhas atingem o teto → limite atingido; senão o saldo está reservado em análise.
   return { availableMinutes: 0, reason: approvedMinutes >= totalLimitMinutes ? "approved_limit_reached" : "reserved_in_review" };
}

export interface SemesterBalanceInput {
   semesterLimitMinutes: number;
   semesterApprovedMinutes: number;
   semesterReservedMinutes: number;
}

export function computeSemesterBalance({
   semesterLimitMinutes,
   semesterApprovedMinutes,
   semesterReservedMinutes,
}: SemesterBalanceInput): number {
   return Math.max(0, semesterLimitMinutes - semesterApprovedMinutes - semesterReservedMinutes);
}

/** Em correção, o próprio pedido sai do somatório antes de validar o substituto. */
export function computeReplacementAvailable(input: {
   totalLimitMinutes: number;
   approvedMinutes: number;
   reservedMinutesIncludingSelf: number;
   selfReservedMinutes: number;
}): number {
   const others = Math.max(0, input.reservedMinutesIncludingSelf - input.selfReservedMinutes);
   return Math.max(0, input.totalLimitMinutes - input.approvedMinutes - others);
}

/* ------------------------------------------------------------------ */
/* Máximo por pedido                                                   */
/* ------------------------------------------------------------------ */

export type LimitFactorKind = "type_balance" | "semester_balance" | "unit_limit" | "fixed_assignment" | "certificate";

export interface LimitFactor {
   kind: LimitFactorKind;
   minutes: number;
}

export interface MaximumRequestInput {
   typeAvailableMinutes: number | null;
   semesterAvailableMinutes?: number | null;
   unitLimitMinutes?: number | null;
   fixedAssignmentMinutes?: number | null;
   certificateMinutes?: number | null;
}

export interface MaximumRequest {
   /** `null` = não há teto conhecido para calcular (regra indisponível). */
   maximumMinutes: number | null;
   factors: LimitFactor[];
   /** Fator que define o máximo (o menor). */
   binding: LimitFactor | null;
}

export function computeMaximumRequest(input: MaximumRequestInput): MaximumRequest {
   const factors: LimitFactor[] = [];
   if (input.typeAvailableMinutes != null) factors.push({ kind: "type_balance", minutes: input.typeAvailableMinutes });
   if (input.semesterAvailableMinutes != null) factors.push({ kind: "semester_balance", minutes: input.semesterAvailableMinutes });
   if (input.unitLimitMinutes != null) factors.push({ kind: "unit_limit", minutes: input.unitLimitMinutes });
   if (input.fixedAssignmentMinutes != null) factors.push({ kind: "fixed_assignment", minutes: input.fixedAssignmentMinutes });
   if (input.certificateMinutes != null) factors.push({ kind: "certificate", minutes: input.certificateMinutes });
   if (input.typeAvailableMinutes == null) return { maximumMinutes: null, factors, binding: null };
   const binding = factors.reduce((min, f) => (f.minutes < min.minutes ? f : min), factors[0]!);
   return { maximumMinutes: binding.minutes, factors, binding };
}

/* ------------------------------------------------------------------ */
/* Unidade da regra (evento, projeto, semestre, comprovante…)          */
/* ------------------------------------------------------------------ */

export interface EffectiveUnitRule {
   kind: Exclude<UnitRuleKind, "mode_dependent">;
   limitMinutes: number | null;
}

/** Resolve a regra efetiva. Tipos com modalidade exigem `modeId`. */
export function resolveUnitRule(activity: ActivityType, modeId: string | null | undefined): EffectiveUnitRule | null {
   const rule = activity.unitRule;
   if (!rule) return null;
   if (rule.kind !== "mode_dependent") return { kind: rule.kind, limitMinutes: rule.limitMinutes };
   const mode = rule.modes?.find(m => m.id === modeId);
   return mode ? { kind: mode.kind, limitMinutes: mode.limitMinutes } : null;
}

export function requiresMode(activity: ActivityType): boolean {
   return activity.unitRule?.kind === "mode_dependent" && (activity.unitRule.modes?.length ?? 0) > 0;
}

/** Limite máximo por unidade (evento/publicação/atividade/projeto). */
const CAP_KINDS: ReadonlySet<string> = new Set(["event_cap", "publication_cap", "presentation_cap", "activity_cap", "project_assignment"]);
/** Atribuição prevista fixa (2/3/15/20/40h): depende da análise; não é crédito automático. */
const FIXED_KINDS: ReadonlySet<string> = new Set(["event_assignment", "activity_assignment", "semester_assignment"]);

export function isCapRule(kind: string): boolean {
   return CAP_KINDS.has(kind);
}

export function isFixedAssignment(kind: string): boolean {
   return FIXED_KINDS.has(kind);
}

export function isSemesterRule(kind: string): boolean {
   return kind === "semester_assignment";
}

/** Como o campo "Horas do comprovante" se aplica à regra. */
export type CertificateUsage = "required" | "optional" | "hidden";

export function certificateUsage(rule: EffectiveUnitRule | null): CertificateUsage {
   if (!rule) return "hidden";
   switch (rule.kind) {
      case "certificate_hours":
      case "participation_duration":
         return "required";
      case "event_cap":
      case "presentation_cap":
      case "activity_cap":
         return "optional";
      default:
         return "hidden";
   }
}

/* ------------------------------------------------------------------ */
/* Reservas e orçamentos a partir dos pedidos                          */
/* ------------------------------------------------------------------ */

/** Pedido enviado ainda sem decisão final. */
export function isActiveStatus(status: RequestStatus): boolean {
   return status === "em_analise" || status === "precisa_correcao" || status === "reconsideracao_em_analise";
}

/** Política provisória do mock (03-REGRAS): análise, pendência e reconsideração reservam. */
export function reservesBudget(status: RequestStatus, policies: Pick<Policies, "pendingCorrectionReserves">): boolean {
   if (status === "em_analise" || status === "reconsideracao_em_analise") return true;
   if (status === "precisa_correcao") return policies.pendingCorrectionReserves;
   return false;
}

/** Reserva atual de um pedido. Uma linhagem reserva uma única vez. */
export function reservedMinutesOf(
   request: Pick<ActivityRequest, "status" | "requestedMinutes">,
   policies: Pick<Policies, "pendingCorrectionReserves">,
): number {
   return reservesBudget(request.status, policies) ? (request.requestedMinutes ?? 0) : 0;
}

/** Mantém um registro por linhagem (o mais recente), para nunca reservar duas vezes. */
export function latestPerLineage<T extends Pick<ActivityRequest, "lineageId" | "updatedAt">>(requests: T[]): T[] {
   const byLineage = new Map<string, T>();
   for (const request of requests) {
      const current = byLineage.get(request.lineageId);
      if (!current || request.updatedAt > current.updatedAt) byLineage.set(request.lineageId, request);
   }
   return [...byLineage.values()];
}

function emptyUsage(): PeriodUsage {
   return { approvedMinutes: 0, reservedMinutes: 0 };
}

/**
 * Agrega aprovadas/reservadas por orçamento (budgetKey + versão) e por período.
 * Registros automáticos aprovados consomem o saldo do seu tipo. Rejeitadas e
 * rascunhos não consomem. Tipos sem regra conhecida não recebem saldo fictício.
 */
export function buildBudgets(
   requests: ActivityRequest[],
   activities: ActivityType[],
   policies: Pick<Policies, "pendingCorrectionReserves">,
): Budget[] {
   const activityById = new Map(activities.map(a => [`${a.catalogVersion}::${a.localId}`, a]));
   const budgets = new Map<string, Budget>();

   for (const activity of activities) {
      const key = `${activity.catalogVersion}::${activity.budgetKey}`;
      if (!budgets.has(key)) {
         budgets.set(key, {
            budgetKey: activity.budgetKey,
            catalogVersion: activity.catalogVersion,
            totalLimitMinutes: activity.totalLimitMinutes,
            approvedMinutes: 0,
            reservedMinutes: 0,
            availableMinutes: null,
            byPeriod: {},
            approvedUses: 0,
            activeUses: 0,
         });
      }
   }

   for (const request of latestPerLineage(requests)) {
      const activity = activityById.get(`${request.catalogVersion}::${request.activityLocalId}`);
      if (!activity) continue;
      const budget = budgets.get(`${activity.catalogVersion}::${activity.budgetKey}`)!;
      const period = (budget.byPeriod[request.academicPeriodId] ??= emptyUsage());
      if (request.status === "aprovada") {
         const approved = request.approvedMinutes ?? 0;
         budget.approvedMinutes += approved;
         period.approvedMinutes += approved;
         budget.approvedUses += 1;
      } else {
         const reserved = reservedMinutesOf(request, policies);
         if (isActiveStatus(request.status)) budget.activeUses += 1;
         budget.reservedMinutes += reserved;
         period.reservedMinutes += reserved;
      }
   }

   for (const budget of budgets.values()) {
      budget.availableMinutes = computeTypeBalance(budget).availableMinutes;
   }
   return [...budgets.values()];
}

export function findBudget(budgets: Budget[], activity: ActivityType): Budget | undefined {
   return budgets.find(b => b.budgetKey === activity.budgetKey && b.catalogVersion === activity.catalogVersion);
}

/* ------------------------------------------------------------------ */
/* Resumo do curso                                                     */
/* ------------------------------------------------------------------ */

export function computeCourseProgress(input: { requiredMinutes: number | null; approvedMinutes: number }) {
   const { requiredMinutes, approvedMinutes } = input;
   if (!requiredMinutes) return { remainingMinutes: null, progressRatio: null, isComplete: false };
   const remainingMinutes = Math.max(0, requiredMinutes - approvedMinutes);
   const progressRatio = Math.min(1, Math.max(0, approvedMinutes / requiredMinutes));
   return { remainingMinutes, progressRatio, isComplete: remainingMinutes === 0 };
}

/** Progresso usa SOMENTE horas aprovadas (de qualquer origem). Pendentes ficam à parte. */
export function computeCourseSummary(
   requests: ActivityRequest[],
   student: Pick<StudentContext, "requiredMinutes" | "policies">,
): CourseSummary {
   let approvedMinutes = 0;
   let awaitingMinutes = 0;
   let awaitingInCorrectionMinutes = 0;
   for (const request of latestPerLineage(requests)) {
      if (request.status === "aprovada") approvedMinutes += request.approvedMinutes ?? 0;
      const reserved = reservedMinutesOf(request, student.policies);
      awaitingMinutes += reserved;
      if (request.status === "precisa_correcao") awaitingInCorrectionMinutes += reserved;
   }
   const progress = computeCourseProgress({ requiredMinutes: student.requiredMinutes, approvedMinutes });
   return {
      requiredMinutes: student.requiredMinutes,
      approvedMinutes,
      remainingMinutes: progress.remainingMinutes,
      progressRatio: progress.progressRatio,
      awaitingMinutes,
      awaitingInCorrectionMinutes,
      isComplete: progress.isComplete,
      analysisSlaBusinessDays: student.policies.analysisSlaBusinessDays,
   };
}

/* ------------------------------------------------------------------ */
/* Uso único                                                           */
/* ------------------------------------------------------------------ */

export type OneTimeReason = "available" | "one_time_used" | "one_time_in_review";

export function evaluateOneTime(input: { oneTime: boolean; approvedUses: number; activeUses: number }): {
   canSubmit: boolean;
   reason: OneTimeReason;
} {
   if (!input.oneTime) return { canSubmit: true, reason: "available" };
   if (input.approvedUses > 0) return { canSubmit: false, reason: "one_time_used" };
   if (input.activeUses > 0) return { canSubmit: false, reason: "one_time_in_review" };
   return { canSubmit: true, reason: "available" };
}
