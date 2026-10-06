/**
 * Ações permitidas por estado. Pedido enviado só é editável nos estados previstos:
 * correção (pendência) e reconsideração (recusa), dentro do prazo.
 */
import type { ActivityRequest } from "../types/request.schema";
import type { StudentContext } from "../types/student.schema";
import { effectiveActionDeadline, isPastDeadline } from "./dates";

export type CorrectionAvailability =
   { allowed: true; deadline: string | null } | { allowed: false; reason: "not_pending" | "deadline_expired"; deadline: string | null };

export function correctionAvailability(request: ActivityRequest, student: StudentContext): CorrectionAvailability {
   const deadline = effectiveActionDeadline(request, student);
   if (request.status !== "precisa_correcao") return { allowed: false, reason: "not_pending", deadline };
   if (isPastDeadline(deadline, student.referenceDate)) return { allowed: false, reason: "deadline_expired", deadline };
   return { allowed: true, deadline };
}

export type ReconsiderationAvailability =
   | { allowed: true; deadline: string; attemptsUsed: number }
   | {
        allowed: false;
        reason: "not_rejected" | "institutional" | "active_attempt" | "attempts_exhausted" | "deadline_expired" | "deadline_unknown";
        deadline: string | null;
        attemptsUsed: number;
     };

export function reconsiderationAvailability(request: ActivityRequest, student: StudentContext): ReconsiderationAvailability {
   const attemptsUsed = request.reconsiderations.length;
   const deadline = effectiveActionDeadline(request, student);
   if (request.status === "reconsideracao_em_analise") return { allowed: false, reason: "active_attempt", deadline, attemptsUsed };
   if (request.status !== "nao_aprovada") return { allowed: false, reason: "not_rejected", deadline, attemptsUsed };
   if (request.origin === "institutional") return { allowed: false, reason: "institutional", deadline, attemptsUsed };
   if (attemptsUsed >= student.policies.reconsiderationMaxAttempts) {
      return { allowed: false, reason: "attempts_exhausted", deadline, attemptsUsed };
   }
   // Sem prazo retornado pelo gateway não há como garantir o "semestre subsequente".
   if (!deadline) return { allowed: false, reason: "deadline_unknown", deadline, attemptsUsed };
   if (isPastDeadline(deadline, student.referenceDate)) return { allowed: false, reason: "deadline_expired", deadline, attemptsUsed };
   return { allowed: true, deadline, attemptsUsed };
}

/** Prioridade de ordenação: o que precisa de ação do aluno vem primeiro. */
export function actionPriority(request: ActivityRequest, student: StudentContext): number {
   if (request.status === "precisa_correcao") return 0;
   if (request.status === "nao_aprovada" && reconsiderationAvailability(request, student).allowed) return 2;
   if (request.status === "em_analise" || request.status === "reconsideracao_em_analise") return 3;
   return 4;
}

export function needsStudentAction(request: ActivityRequest, student: StudentContext): boolean {
   return correctionAvailability(request, student).allowed;
}

/** Aprovação parcial: aprovada com menos horas que o solicitado. */
export function isPartialApproval(request: Pick<ActivityRequest, "status" | "requestedMinutes" | "approvedMinutes">): boolean {
   return (
      request.status === "aprovada" &&
      request.requestedMinutes != null &&
      request.approvedMinutes != null &&
      request.approvedMinutes < request.requestedMinutes
   );
}
