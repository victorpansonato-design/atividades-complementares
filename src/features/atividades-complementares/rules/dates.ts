/**
 * Datas acadêmicas, ingresso e prazos.
 *
 * Datas de atividade são ISO `YYYY-MM-DD` (comparação lexicográfica). O período
 * acadêmico é dado da ATIVIDADE, não a data do envio. Sem calendário institucional
 * não se calcula "dias úteis" nem se distribui atividade entre períodos.
 */
import type { ActivityType } from "../types/catalog.schema";
import type { ActivityRequest } from "../types/request.schema";
import type { AcademicPeriod, StudentContext } from "../types/student.schema";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): value is string {
   if (!value || !ISO_DATE.test(value)) return false;
   const [y, m, d] = value.split("-").map(Number);
   const date = new Date(Date.UTC(y!, m! - 1, d!));
   return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d;
}

/** "2026-03-19" → "19/03/2026" sem conversão de fuso. */
export function formatIsoDate(value: string | null | undefined): string {
   if (!value) return "";
   const datePart = value.slice(0, 10);
   if (!isIsoDate(datePart)) return value;
   const [y, m, d] = datePart.split("-");
   return `${d}/${m}/${y}`;
}

/** Timestamp com fuso → data e hora pt-BR em America/Sao_Paulo. */
export function formatTimestamp(value: string | null | undefined, timeZone = "America/Sao_Paulo"): string {
   if (!value) return "";
   if (isIsoDate(value)) return formatIsoDate(value);
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return value;
   return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone }).format(date);
}

export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
   if (!start) return "";
   if (!end || end === start) return formatIsoDate(start);
   return `${formatIsoDate(start)} a ${formatIsoDate(end)}`;
}

/* ------------------------------------------------------------------ */
/* Períodos acadêmicos                                                 */
/* ------------------------------------------------------------------ */

export function findPeriodForDate(periods: AcademicPeriod[], date: string): AcademicPeriod | null {
   return periods.find(p => p.startDate <= date && date <= p.endDate) ?? null;
}

export function periodsBetween(periods: AcademicPeriod[], start: string, end: string): AcademicPeriod[] {
   return periods.filter(p => p.startDate <= end && start <= p.endDate);
}

/** Só sugerimos período pelo calendário presencial mockado; EAD/híbrido não derivam módulos por mês. */
export function canSuggestPeriod(student: Pick<StudentContext, "modality" | "policies">): boolean {
   return student.policies.suggestPeriodFromDates && student.modality === "presencial";
}

export type PeriodSuggestion =
   | { kind: "suggested"; periodId: string }
   | { kind: "spans_multiple"; periodIds: string[] }
   | { kind: "no_period" }
   | { kind: "not_available" };

export function suggestPeriod(
   student: Pick<StudentContext, "modality" | "policies" | "academicPeriods">,
   start: string,
   end: string,
): PeriodSuggestion {
   if (!canSuggestPeriod(student) || !isIsoDate(start) || !isIsoDate(end) || end < start) return { kind: "not_available" };
   const overlapping = periodsBetween(student.academicPeriods, start, end);
   if (overlapping.length === 0) return { kind: "no_period" };
   if (overlapping.length > 1) return { kind: "spans_multiple", periodIds: overlapping.map(p => p.id) };
   return { kind: "suggested", periodId: overlapping[0]!.id };
}

export type PeriodConsistency = "ok" | "mismatch" | "spans_multiple" | "unchecked";

/** Período incompatível com as datas gera conflito. Intervalo entre períodos é sinalizado, não distribuído. */
export function checkPeriodConsistency(
   student: Pick<StudentContext, "modality" | "policies" | "academicPeriods">,
   periodId: string,
   start: string,
   end: string,
): PeriodConsistency {
   if (!canSuggestPeriod(student) || !periodId || !isIsoDate(start) || !isIsoDate(end) || end < start) return "unchecked";
   const overlapping = periodsBetween(student.academicPeriods, start, end);
   if (!overlapping.some(p => p.id === periodId)) return "mismatch";
   return overlapping.length > 1 ? "spans_multiple" : "ok";
}

/* ------------------------------------------------------------------ */
/* Ingresso                                                            */
/* ------------------------------------------------------------------ */

const ADMISSION_EXEMPT_ELIGIBILITY = new Set(["transferencia", "retorno", "portador_de_diploma", "transferencia_externa"]);

/** Tipos de aproveitamento seguem análise própria; a regra geral do ingresso não os bloqueia. */
export function isAdmissionExempt(activity: Pick<ActivityType, "eligibility">): boolean {
   return activity.eligibility.some(e => ADMISSION_EXEMPT_ELIGIBILITY.has(e));
}

export type AdmissionCheck = "ok" | "before_admission" | "crosses_admission" | "exempt" | "unchecked";

export function checkAdmission(
   activity: Pick<ActivityType, "eligibility">,
   admissionDate: string,
   start: string,
   end: string,
): AdmissionCheck {
   if (isAdmissionExempt(activity)) return "exempt";
   if (!isIsoDate(start) || !isIsoDate(end)) return "unchecked";
   if (end < admissionDate) return "before_admission";
   if (start < admissionDate) return "crosses_admission";
   return "ok";
}

/* ------------------------------------------------------------------ */
/* Prazos                                                              */
/* ------------------------------------------------------------------ */

export function isPastDeadline(deadline: string | null | undefined, referenceDate: string): boolean {
   return !!deadline && referenceDate.slice(0, 10) > deadline.slice(0, 10);
}

/**
 * Prazo efetivo para responder pendência ou pedir reconsideração: o do pedido,
 * limitado pelo prazo de entrega do concluinte (arts. 5º §3º, 6º e 7º).
 */
export function effectiveActionDeadline(
   request: Pick<ActivityRequest, "actionDeadlineDate">,
   student: Pick<StudentContext, "isConcluding" | "submissionDeadlineDate">,
): string | null {
   const candidates = [request.actionDeadlineDate, student.isConcluding ? student.submissionDeadlineDate : null].filter(
      (d): d is string => !!d,
   );
   if (candidates.length === 0) return null;
   return candidates.sort()[0]!;
}

export type SubmissionWindow =
   | { open: true; deadline: string | null; deadlineIsMock: boolean }
   | { open: true; deadline: null; hybridPolicyUnknown: true }
   | { open: false; deadline: string; deadlineIsMock: boolean };

/** Janela de entrega de novos pedidos. O prazo de análise (30 dias úteis) NÃO amplia este prazo. */
export function computeSubmissionWindow(
   student: Pick<StudentContext, "isConcluding" | "submissionDeadlineDate" | "deadlineIsMock" | "modality" | "referenceDate" | "policies">,
): SubmissionWindow {
   if (!student.isConcluding) return { open: true, deadline: null, deadlineIsMock: false };
   if (!student.submissionDeadlineDate) {
      if (student.modality === "hibrido" && !student.policies.hybridConclusionPolicy) {
         return { open: true, deadline: null, hybridPolicyUnknown: true };
      }
      return { open: true, deadline: null, deadlineIsMock: false };
   }
   if (isPastDeadline(student.submissionDeadlineDate, student.referenceDate)) {
      return { open: false, deadline: student.submissionDeadlineDate, deadlineIsMock: student.deadlineIsMock };
   }
   return { open: true, deadline: student.submissionDeadlineDate, deadlineIsMock: student.deadlineIsMock };
}
